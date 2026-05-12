import { NextResponse, type NextRequest } from 'next/server';
import {
  prisma,
  WhatsAppStatus,
  MessageDirection,
  MessageStatus,
  MessageType,
  ConversationStatus,
  type Prisma,
} from '@zapai/db';
import { AppError, createLogger, decrypt, hashPii } from '@zapai/shared';
import {
  flattenWebhookEvents,
  handleWebhookVerification,
  parseWebhookPayload,
  parseMetaTimestamp,
  verifyWebhookSignature,
  type WaIncomingMessage,
  type WaStatusUpdate,
  type WaMessageType,
} from '@zapai/wa';

import { env } from '@/env';

const log = createLogger('wa-webhook');

interface RouteContext {
  params: Promise<{ phoneNumberId: string }>;
}

/**
 * GET — verificação inicial. Meta envia hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
 * Respondemos com o challenge se o verify_token bater com o do workspace.
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
  const { phoneNumberId } = await ctx.params;
  const params = req.nextUrl.searchParams;
  const mode = params.get('hub.mode');
  const token = params.get('hub.verify_token');
  const challenge = params.get('hub.challenge');

  const account = await prisma.whatsAppAccount.findUnique({
    where: { phoneNumberId },
  });
  if (!account) {
    log.warn({ phoneNumberId }, 'webhook GET pra conta inexistente');
    return new NextResponse('Forbidden', { status: 403 });
  }

  const result = handleWebhookVerification({
    mode,
    token,
    challenge,
    expectedVerifyToken: account.webhookVerifyToken,
  });

  if (!result.ok) {
    log.warn({ phoneNumberId, reason: result.reason }, 'webhook verification falhou');
    return new NextResponse('Forbidden', { status: 403 });
  }

  log.info({ phoneNumberId }, 'webhook verificado pela Meta');
  return new NextResponse(result.challenge, {
    status: 200,
    headers: { 'content-type': 'text/plain' },
  });
}

/**
 * POST — eventos. RAW body validado por HMAC com app_secret do workspace.
 * Persiste contatos/conversas/mensagens/status. Retorna 200 sempre que possível
 * (Meta dá retry agressivo se demorar).
 *
 * Pipeline detalhado:
 *   1. Lê raw body (Buffer/text) ANTES de parsear JSON.
 *   2. Busca WhatsAppAccount pelo phoneNumberId da URL.
 *   3. Decrypt app_secret e verifica HMAC.
 *   4. Parseia payload com schema Zod.
 *   5. Pra cada mensagem: upsert Contact + Conversation + cria Message INBOUND
 *      + enfileira process-message no BullMQ (Fase 5).
 *   6. Pra cada status: atualiza Message.status pelo whatsappMessageId.
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  const { phoneNumberId } = await ctx.params;
  const t0 = Date.now();

  // sempre tente devolver 200 — retry da Meta é caro
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-hub-signature-256');

    const account = await prisma.whatsAppAccount.findUnique({
      where: { phoneNumberId },
    });
    if (!account) {
      log.warn({ phoneNumberId }, 'POST pra conta inexistente — 200 mesmo assim');
      return ack();
    }
    if (account.status === WhatsAppStatus.DISCONNECTED) {
      log.warn({ phoneNumberId }, 'POST pra conta desconectada — 200 mesmo assim');
      return ack();
    }

    // valida HMAC com app_secret cifrado
    let appSecret: string;
    try {
      appSecret = decrypt(account.appSecretEncrypted, env.ENCRYPTION_KEY);
    } catch (err) {
      log.error({ phoneNumberId, err: String(err) }, 'falha ao decifrar app_secret');
      return ack();
    }

    try {
      verifyWebhookSignature(rawBody, signature, appSecret);
    } catch (err) {
      log.warn(
        { phoneNumberId, err: err instanceof AppError ? err.code : String(err) },
        'HMAC falhou',
      );
      // Retorna 200 pra parar de receber retry de payload com assinatura ruim
      return ack();
    }

    // Parse
    let json: unknown;
    try {
      json = JSON.parse(rawBody);
    } catch {
      log.warn({ phoneNumberId }, 'body não é JSON');
      return ack();
    }
    const payload = parseWebhookPayload(json);
    const { byPhoneNumberId } = flattenWebhookEvents(payload);
    const bucket = byPhoneNumberId[phoneNumberId];
    if (!bucket) {
      log.info({ phoneNumberId }, 'payload sem eventos pro phoneNumberId desse path');
      return ack();
    }

    const phoneHashSalt = env.LOG_PII_SALT;

    // Persiste em paralelo (mas sem await all pra retornar rápido — Meta exige <10s, queremos <1s)
    // Mantém handler simples e síncrono no DB; Fase 5 enfileirará processo do agente.
    for (const msg of bucket.messages ?? []) {
      try {
        const contactName = bucket.contacts?.find((c) => c.wa_id === msg.from)?.profile?.name;
        await persistInboundMessage({
          workspaceId: account.workspaceId,
          phoneNumberId,
          message: msg,
          ...(contactName ? { contactName } : {}),
        });
      } catch (err) {
        log.error(
          {
            phoneNumberId,
            phoneHash: hashPii(msg.from, phoneHashSalt),
            err: String(err),
          },
          'persistInboundMessage falhou',
        );
      }
    }

    for (const status of bucket.statuses ?? []) {
      try {
        await applyOutboundStatus({
          workspaceId: account.workspaceId,
          status,
        });
      } catch (err) {
        log.error(
          { phoneNumberId, whatsappMessageId: status.id, err: String(err) },
          'applyOutboundStatus falhou',
        );
      }
    }

    log.info(
      {
        phoneNumberId,
        msgs: bucket.messages?.length ?? 0,
        statuses: bucket.statuses?.length ?? 0,
        tookMs: Date.now() - t0,
      },
      'webhook processado',
    );
    return ack();
  } catch (err) {
    log.error({ phoneNumberId, err: String(err) }, 'webhook handler explodiu');
    return ack();
  }
}

function ack(): NextResponse {
  return new NextResponse('OK', { status: 200 });
}

// =========================================
// persistência
// =========================================

const TYPE_MAP: Record<WaMessageType, MessageType> = {
  text: MessageType.TEXT,
  image: MessageType.IMAGE,
  audio: MessageType.AUDIO,
  document: MessageType.DOC,
  video: MessageType.VIDEO,
  sticker: MessageType.STICKER,
  location: MessageType.LOCATION,
  contacts: MessageType.CONTACTS,
  interactive: MessageType.INTERACTIVE,
  button: MessageType.INTERACTIVE,
  reaction: MessageType.TEXT,
  order: MessageType.INTERACTIVE,
  system: MessageType.SYSTEM,
  unknown: MessageType.SYSTEM,
};

async function persistInboundMessage(input: {
  workspaceId: string;
  phoneNumberId: string;
  message: WaIncomingMessage;
  contactName?: string;
}) {
  const { workspaceId, message: m, contactName } = input;
  const timestamp = parseMetaTimestamp(m.timestamp);
  const messageType = TYPE_MAP[m.type] ?? MessageType.SYSTEM;

  // jsonb content varia por tipo
  const content: Prisma.InputJsonValue = buildContentJson(m);

  await prisma.$transaction(async (tx) => {
    // contact upsert
    const contact = await tx.contact.upsert({
      where: { workspaceId_phoneE164: { workspaceId, phoneE164: m.from } },
      create: {
        workspaceId,
        phoneE164: m.from,
        ...(contactName ? { name: contactName } : {}),
        lastSeenAt: timestamp,
      },
      update: {
        lastSeenAt: timestamp,
        ...(contactName ? { name: contactName } : {}),
      },
    });

    // conversation (1 ativa por contato no MVP)
    const existing = await tx.conversation.findFirst({
      where: { workspaceId, contactId: contact.id, status: { not: ConversationStatus.CLOSED } },
      orderBy: { createdAt: 'desc' },
    });
    const conversation =
      existing ??
      (await tx.conversation.create({
        data: {
          workspaceId,
          contactId: contact.id,
          status: ConversationStatus.AI_HANDLING,
        },
      }));

    // duplicate guard (se Meta retransmite o mesmo evento)
    const dup = await tx.message.findUnique({ where: { whatsappMessageId: m.id } });
    if (dup) return;

    await tx.message.create({
      data: {
        workspaceId,
        conversationId: conversation.id,
        contactId: contact.id,
        direction: MessageDirection.INBOUND,
        type: messageType,
        content,
        status: MessageStatus.DELIVERED,
        whatsappMessageId: m.id,
        createdAt: timestamp,
      },
    });

    await tx.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: timestamp,
        lastIncomingMessageAt: timestamp,
        unreadCount: { increment: 1 },
      },
    });
  });
}

function buildContentJson(m: WaIncomingMessage): Prisma.InputJsonValue {
  switch (m.type) {
    case 'text':
      return { text: m.text?.body ?? '' };
    case 'image':
      return { mediaId: m.image?.id, caption: m.image?.caption, mimeType: m.image?.mime_type };
    case 'audio':
      return { mediaId: m.audio?.id, mimeType: m.audio?.mime_type, voice: m.audio?.voice ?? false };
    case 'video':
      return { mediaId: m.video?.id, caption: m.video?.caption, mimeType: m.video?.mime_type };
    case 'document':
      return {
        mediaId: m.document?.id,
        filename: m.document?.filename,
        caption: m.document?.caption,
        mimeType: m.document?.mime_type,
      };
    case 'sticker':
      return { mediaId: m.sticker?.id, mimeType: m.sticker?.mime_type };
    case 'location':
      return m.location ?? {};
    case 'interactive':
      return m.interactive ?? {};
    case 'button':
      return m.button ?? {};
    case 'contacts':
      return { raw: 'contacts' };
    case 'reaction':
      return { raw: 'reaction' };
    case 'order':
      return { raw: 'order' };
    default:
      return { raw: m.type, errors: m.errors ?? [] };
  }
}

const STATUS_MAP: Record<WaStatusUpdate['status'], MessageStatus> = {
  sent: MessageStatus.SENT,
  delivered: MessageStatus.DELIVERED,
  read: MessageStatus.READ,
  failed: MessageStatus.FAILED,
};

async function applyOutboundStatus(input: {
  workspaceId: string;
  status: WaStatusUpdate;
}) {
  const { workspaceId, status } = input;
  const newStatus = STATUS_MAP[status.status];
  if (!newStatus) return;

  const result = await prisma.message.updateMany({
    where: { workspaceId, whatsappMessageId: status.id },
    data: {
      status: newStatus,
      ...(status.status === 'failed' && status.errors?.[0]
        ? {
            errorCode: String(status.errors[0].code),
            errorMessage: status.errors[0].message ?? status.errors[0].title ?? null,
          }
        : {}),
    },
  });

  if (result.count === 0) {
    log.warn({ whatsappMessageId: status.id }, 'status pra message_id desconhecido');
  }
}
