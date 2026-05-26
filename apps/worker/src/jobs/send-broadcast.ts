import {
  prisma,
  BroadcastStatus,
  BroadcastRecipientStatus,
  MessageDirection,
  MessageStatus,
  MessageType,
} from '@zapai/db';
import { createLogger, decrypt } from '@zapai/shared';
import { createWaClient, type WaTemplateComponent } from '@zapai/wa';
import { env } from '../env';

const log = createLogger('worker:send-broadcast');

export interface SendBroadcastJob {
  workspaceId: string;
  broadcastId: string;
  recipientId: string; // Contact.id
}

export async function processSendBroadcast(data: SendBroadcastJob): Promise<void> {
  const { workspaceId, broadcastId, recipientId } = data;

  const [broadcast, contact] = await Promise.all([
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
  ]);

  if (!broadcast || !contact) {
    log.warn({ broadcastId, recipientId }, 'broadcast ou destinatário não encontrado');
    return;
  }

  if (broadcast.status === BroadcastStatus.CANCELED) {
    await markRecipient(broadcastId, recipientId, BroadcastRecipientStatus.SKIPPED);
    return;
  }

  if (contact.optedOut || contact.deletedAt) {
    await markRecipient(broadcastId, recipientId, BroadcastRecipientStatus.SKIPPED);
    return;
  }

  const waAccount = broadcast.workspace.whatsappAccounts[0];
  if (!waAccount) {
    log.warn({ workspaceId }, 'sem conta WA conectada pra broadcast');
    await markRecipient(broadcastId, recipientId, BroadcastRecipientStatus.FAILED);
    return;
  }

  if (broadcast.template.status !== 'APPROVED') {
    log.warn({ broadcastId }, 'template não aprovado pela Meta');
    await markRecipient(broadcastId, recipientId, BroadcastRecipientStatus.FAILED);
    return;
  }

  let accessToken: string;
  try {
    accessToken = decrypt(waAccount.accessTokenEncrypted, env.ENCRYPTION_KEY);
  } catch (err) {
    log.error({ err: String(err) }, 'falha ao decifrar access token');
    await markRecipient(broadcastId, recipientId, BroadcastRecipientStatus.FAILED);
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
    throw err; // BullMQ vai fazer retry
  }

  // Persistir mensagem no inbox
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

  await markRecipient(broadcastId, recipientId, BroadcastRecipientStatus.SENT, undefined, waMessageId);

  log.info({ broadcastId, recipientId }, 'broadcast enviado');
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
