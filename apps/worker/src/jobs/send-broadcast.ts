import {
  prisma,
  BroadcastStatus,
  BroadcastRecipientStatus,
  MessageDirection,
  MessageStatus,
  MessageType,
} from '@zapfy/db';
import { createLogger, decrypt } from '@zapfy/shared';
import { createWaClient, type WaTemplateComponent } from '@zapfy/wa';
import { env } from '../env';

const log = createLogger('worker:send-broadcast');

export interface SendBroadcastJob {
  workspaceId: string;
  broadcastId: string;
  recipientId: string; // Contact.id
}

export async function processSendBroadcast(
  data: SendBroadcastJob,
  opts: { isFinalAttempt?: boolean } = {},
): Promise<void> {
  const { workspaceId, broadcastId, recipientId } = data;

  const [broadcast, contact, recipient] = await Promise.all([
    prisma.broadcast.findUnique({
      where: { id: broadcastId },
      include: {
        template: true,
        workspace: {
          include: { whatsappAccounts: { where: { status: 'CONNECTED' }, take: 1 } },
        },
      },
    }),
    prisma.contact.findUnique({ where: { id: recipientId } }),
    prisma.broadcastRecipient.findFirst({ where: { broadcastId, contactId: recipientId } }),
  ]);

  if (!broadcast || !contact || !recipient) {
    log.warn({ broadcastId, recipientId }, 'broadcast ou destinatário não encontrado');
    return;
  }

  // Idempotência de retry: SENT/SKIPPED são estados finais — retry depois de
  // falha pós-envio (persistência de inbox, etc.) NÃO pode reenviar o template.
  // FAILED segue adiante de propósito: é o caminho de retry de falha de envio.
  if (
    recipient.status === BroadcastRecipientStatus.SENT ||
    recipient.status === BroadcastRecipientStatus.SKIPPED
  ) {
    log.info({ broadcastId, recipientId, status: recipient.status }, 'recipient já finalizado — ignorando retry');
    return;
  }

  if (broadcast.status === BroadcastStatus.CANCELED) {
    await markRecipient(broadcastId, recipientId, BroadcastRecipientStatus.SKIPPED);
    await maybeCompleteBroadcast(broadcastId);
    return;
  }

  if (contact.optedOut || contact.deletedAt) {
    await markRecipient(broadcastId, recipientId, BroadcastRecipientStatus.SKIPPED);
    await maybeCompleteBroadcast(broadcastId);
    return;
  }

  const waAccount = broadcast.workspace.whatsappAccounts[0];
  if (!waAccount) {
    log.warn({ workspaceId }, 'sem conta WA conectada pra broadcast');
    await markRecipient(broadcastId, recipientId, BroadcastRecipientStatus.FAILED);
    await maybeCompleteBroadcast(broadcastId);
    return;
  }

  if (broadcast.template.status !== 'APPROVED') {
    log.warn({ broadcastId }, 'template não aprovado pela Meta');
    await markRecipient(broadcastId, recipientId, BroadcastRecipientStatus.FAILED);
    await maybeCompleteBroadcast(broadcastId);
    return;
  }

  let accessToken: string;
  try {
    accessToken = decrypt(waAccount.accessTokenEncrypted, env.ENCRYPTION_KEY);
  } catch (err) {
    log.error({ err: String(err) }, 'falha ao decifrar access token');
    await markRecipient(broadcastId, recipientId, BroadcastRecipientStatus.FAILED);
    await maybeCompleteBroadcast(broadcastId);
    return;
  }

  const waClient = createWaClient({ phoneNumberId: waAccount.phoneNumberId, accessToken });

  // Variáveis personalizadas por contato (ex: nome)
  const vars = (broadcast.variables as Record<string, Record<string, string>> | null) ?? {};
  const contactVars = vars[recipientId] ?? {};

  // Monta components do template — substitui variáveis no body se houver
  const templateComponents = broadcast.template.components as Array<{
    type: string;
    text?: string;
    parameters?: unknown[];
  }>;

  const bodyComponent = templateComponents.find((c) => c.type === 'BODY');
  const bodyParams: WaTemplateComponent['parameters'] = Object.values(contactVars).length > 0
    ? Object.values(contactVars).map((v) => ({ type: 'text' as const, text: v }))
    : [];

  const components: WaTemplateComponent[] | undefined = bodyParams && bodyParams.length > 0
    ? [{ type: 'body' as const, parameters: bodyParams }]
    : undefined;

  let waMessageId: string | undefined;

  try {
    const templateInput = components
      ? { name: broadcast.template.name, language: broadcast.template.language, components }
      : { name: broadcast.template.name, language: broadcast.template.language };
    const sent = await waClient.sendTemplate(contact.phoneE164, templateInput);
    waMessageId = sent.messages[0]?.id;
  } catch (err) {
    log.error({ broadcastId, recipientId, err: String(err) }, 'envio falhou');
    await markRecipient(broadcastId, recipientId, BroadcastRecipientStatus.FAILED, String(err));
    // No último attempt ninguém mais vai rodar o completion check deste
    // recipient — fecha o broadcast aqui pra ele não ficar RUNNING eterno.
    if (opts.isFinalAttempt) await maybeCompleteBroadcast(broadcastId);
    throw err; // BullMQ vai fazer retry (attempts restantes)
  }

  // Envio confirmado: marca SENT IMEDIATAMENTE (antes do inbox) — se qualquer
  // passo seguinte falhar, o retry encontra SENT e não reenvia o template.
  await markRecipient(broadcastId, recipientId, BroadcastRecipientStatus.SENT, undefined, waMessageId);

  // Persistir mensagem no inbox. Falha aqui não pode re-lançar: o envio já
  // aconteceu e o retry seria no-op (SENT) — loga alto e segue pro completion.
  try {
    const conversation = await prisma.conversation.findFirst({
      where: { workspaceId, contactId: recipientId, status: { not: 'CLOSED' } },
    }) ?? await prisma.conversation.create({
      data: { workspaceId, contactId: recipientId },
    });

    const bodyText = bodyComponent?.text ?? `[template: ${broadcast.template.name}]`;

    await prisma.message.create({
      data: {
        workspaceId,
        conversationId: conversation.id,
        contactId: recipientId,
        direction: MessageDirection.OUTBOUND,
        type: MessageType.TEXT,
        content: { text: bodyText },
        status: MessageStatus.SENT,
        fromAi: false,
        ...(waMessageId ? { whatsappMessageId: waMessageId } : {}),
      },
    });
  } catch (err) {
    log.error(
      { broadcastId, recipientId, err: String(err) },
      'template enviado mas persistência no inbox falhou — mensagem não aparece na conversa',
    );
  }

  log.info({ broadcastId, recipientId }, 'broadcast enviado');

  await maybeCompleteBroadcast(broadcastId);
}

/**
 * Fecha o broadcast quando não resta nenhum recipient PENDING. Roda em TODOS os
 * caminhos terminais (SENT/SKIPPED/FAILED final) — antes só rodava no sucesso e
 * um último recipient falho deixava o broadcast RUNNING pra sempre na UI.
 * `updateMany` condicionado ao status preserva CANCELED/COMPLETED.
 */
async function maybeCompleteBroadcast(broadcastId: string): Promise<void> {
  const remaining = await prisma.broadcastRecipient.count({
    where: { broadcastId, status: BroadcastRecipientStatus.PENDING },
  });
  if (remaining === 0) {
    const updated = await prisma.broadcast.updateMany({
      where: {
        id: broadcastId,
        status: { in: [BroadcastStatus.RUNNING, BroadcastStatus.SCHEDULED] },
      },
      data: { status: BroadcastStatus.COMPLETED, finishedAt: new Date() },
    });
    if (updated.count > 0) log.info({ broadcastId }, 'broadcast completed');
  }
}

async function markRecipient(
  broadcastId: string,
  contactId: string,
  status: BroadcastRecipientStatus,
  errorMessage?: string,
  whatsappMessageId?: string,
): Promise<void> {
  await prisma.broadcastRecipient.updateMany({
    where: { broadcastId, contactId },
    data: {
      status,
      ...(status === BroadcastRecipientStatus.SENT ? { sentAt: new Date() } : {}),
      ...(errorMessage ? { errorMessage } : {}),
      ...(whatsappMessageId ? { whatsappMessageId } : {}),
    },
  });
}
