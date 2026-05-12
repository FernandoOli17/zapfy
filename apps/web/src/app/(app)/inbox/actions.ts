'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  ConversationStatus,
  MessageDirection,
  MessageStatus,
  MessageType,
  prisma,
  WhatsAppStatus,
  type Prisma,
} from '@zapai/db';
import { AppError, createLogger, decrypt } from '@zapai/shared';
import { createWaClient, isWithin24hWindow, splitText, WaApiError } from '@zapai/wa';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import { env } from '@/env';
import { publishInboxEvent, workspaceChannel } from '@/lib/realtime/pusher-server';

const log = createLogger('inbox-actions');

async function requireWorkspaceAndConversation(conversationId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');
  const member = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    include: { workspace: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!member) redirect('/onboarding');
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, workspaceId: member.workspace.id },
    include: { contact: true },
  });
  if (!conversation) {
    throw new AppError('NOT_FOUND', 404, 'Conversa não encontrada nesse workspace');
  }
  return { user: session.user, workspace: member.workspace, conversation };
}

const sendInput = z.object({
  conversationId: z.string(),
  body: z.string().trim().min(1).max(8000),
});

export type SendMessageResult =
  | { status: 'ok'; messageIds: string[] }
  | { status: 'error'; error: string };

/**
 * Envia mensagem de texto pelo agente humano (assumiu a conversa).
 * - Verifica janela de 24h (fora dela só template HSM, bloqueia aqui)
 * - Quebra em chunks ≤ WA_TEXT_SAFE_LEN
 * - Manda via Cloud API, persiste OUTBOUND com whatsapp_message_id
 */
export async function sendInboxMessage(
  raw: z.infer<typeof sendInput>,
): Promise<SendMessageResult> {
  const parsed = sendInput.safeParse(raw);
  if (!parsed.success) {
    return { status: 'error', error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }
  const { conversation, workspace } = await requireWorkspaceAndConversation(
    parsed.data.conversationId,
  );

  // Janela de 24h
  if (!isWithin24hWindow(conversation.lastIncomingMessageAt)) {
    return {
      status: 'error',
      error:
        'Mensagem fora da janela de 24h. Use um template HSM aprovado pra reiniciar conversa.',
    };
  }

  // Pega WhatsAppAccount conectada do workspace
  const account = await prisma.whatsAppAccount.findFirst({
    where: { workspaceId: workspace.id, status: WhatsAppStatus.CONNECTED },
    orderBy: { connectedAt: 'desc' },
  });
  if (!account) {
    return {
      status: 'error',
      error: 'Nenhum número WhatsApp conectado. Conecta um em /whatsapp.',
    };
  }

  let accessToken: string;
  try {
    accessToken = decrypt(account.accessTokenEncrypted, env.ENCRYPTION_KEY);
  } catch (err) {
    log.error({ accountId: account.id, err: String(err) }, 'decrypt access_token falhou');
    return { status: 'error', error: 'Falha ao decifrar credencial do número.' };
  }

  const client = createWaClient({ phoneNumberId: account.phoneNumberId, accessToken });
  const chunks = splitText(parsed.data.body);
  const created: string[] = [];

  for (const chunk of chunks) {
    let waResult: { messages: Array<{ id: string }> } | null = null;
    try {
      waResult = await client.sendText(conversation.contact.phoneE164, chunk);
    } catch (err) {
      const msg =
        err instanceof WaApiError
          ? `Meta: ${err.userMessage}${err.metaCode ? ` (code ${err.metaCode})` : ''}`
          : err instanceof Error
            ? err.message
            : 'Falha ao enviar';
      log.warn({ conversationId: conversation.id, err: msg }, 'sendText falhou');
      // Cria Message com FAILED pra deixar visível no inbox
      const failed = await prisma.message.create({
        data: {
          workspaceId: workspace.id,
          conversationId: conversation.id,
          contactId: conversation.contactId,
          direction: MessageDirection.OUTBOUND,
          type: MessageType.TEXT,
          content: { text: chunk } as Prisma.InputJsonValue,
          status: MessageStatus.FAILED,
          errorMessage: msg,
          fromAi: false,
        },
      });
      created.push(failed.id);
      return { status: 'error', error: msg };
    }

    const waMessageId = waResult.messages[0]?.id;
    const message = await prisma.message.create({
      data: {
        workspaceId: workspace.id,
        conversationId: conversation.id,
        contactId: conversation.contactId,
        direction: MessageDirection.OUTBOUND,
        type: MessageType.TEXT,
        content: { text: chunk } as Prisma.InputJsonValue,
        status: MessageStatus.SENT,
        ...(waMessageId ? { whatsappMessageId: waMessageId } : {}),
        fromAi: false,
      },
    });
    created.push(message.id);

    await publishInboxEvent(workspace.id, {
      name: 'message.new',
      data: {
        conversationId: conversation.id,
        messageId: message.id,
        contactId: conversation.contactId,
        direction: 'OUTBOUND',
        preview: chunk.slice(0, 140),
        createdAt: new Date().toISOString(),
      },
    });
  }

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date() },
  });

  revalidatePath(`/inbox/${conversation.id}`);
  revalidatePath('/inbox');

  void workspaceChannel; // mantém import vivo pra log
  return { status: 'ok', messageIds: created };
}

export async function assumeConversation(conversationId: string) {
  const { user, workspace, conversation } = await requireWorkspaceAndConversation(conversationId);
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      status: ConversationStatus.HUMAN_HANDLING,
      assignedToUserId: user.id,
      unreadCount: 0,
    },
  });
  await prisma.auditLog.create({
    data: {
      workspaceId: workspace.id,
      userId: user.id,
      action: 'conversation.assume',
      targetType: 'Conversation',
      targetId: conversation.id,
    },
  });
  await publishInboxEvent(workspace.id, {
    name: 'conversation.updated',
    data: {
      conversationId: conversation.id,
      status: 'HUMAN_HANDLING',
      assignedToUserId: user.id,
    },
  });
  revalidatePath(`/inbox/${conversation.id}`);
  revalidatePath('/inbox');
  return { status: 'ok' as const };
}

export async function returnConversationToAi(conversationId: string) {
  const { user, workspace, conversation } = await requireWorkspaceAndConversation(conversationId);
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      status: ConversationStatus.AI_HANDLING,
      assignedToUserId: null,
    },
  });
  await prisma.auditLog.create({
    data: {
      workspaceId: workspace.id,
      userId: user.id,
      action: 'conversation.return_to_ai',
      targetType: 'Conversation',
      targetId: conversation.id,
    },
  });
  await publishInboxEvent(workspace.id, {
    name: 'conversation.updated',
    data: {
      conversationId: conversation.id,
      status: 'AI_HANDLING',
      assignedToUserId: null,
    },
  });
  revalidatePath(`/inbox/${conversation.id}`);
  revalidatePath('/inbox');
  return { status: 'ok' as const };
}

export async function closeConversation(conversationId: string) {
  const { user, workspace, conversation } = await requireWorkspaceAndConversation(conversationId);
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { status: ConversationStatus.CLOSED, unreadCount: 0 },
  });
  await prisma.auditLog.create({
    data: {
      workspaceId: workspace.id,
      userId: user.id,
      action: 'conversation.close',
      targetType: 'Conversation',
      targetId: conversation.id,
    },
  });
  await publishInboxEvent(workspace.id, {
    name: 'conversation.updated',
    data: {
      conversationId: conversation.id,
      status: 'CLOSED',
      assignedToUserId: conversation.assignedToUserId,
    },
  });
  revalidatePath(`/inbox/${conversation.id}`);
  revalidatePath('/inbox');
  return { status: 'ok' as const };
}

const noteInput = z.object({
  conversationId: z.string(),
  note: z.string().trim().max(2000),
});

export async function setInternalNote(raw: z.infer<typeof noteInput>) {
  const parsed = noteInput.safeParse(raw);
  if (!parsed.success) {
    return { status: 'error' as const, error: parsed.error.issues[0]?.message ?? 'Inválido' };
  }
  const { conversation } = await requireWorkspaceAndConversation(parsed.data.conversationId);
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { internalNotes: parsed.data.note || null },
  });
  revalidatePath(`/inbox/${conversation.id}`);
  return { status: 'ok' as const };
}

const tagsInput = z.object({
  conversationId: z.string(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20),
});

export async function setContactTags(raw: z.infer<typeof tagsInput>) {
  const parsed = tagsInput.safeParse(raw);
  if (!parsed.success) {
    return { status: 'error' as const, error: parsed.error.issues[0]?.message ?? 'Inválido' };
  }
  const { conversation } = await requireWorkspaceAndConversation(parsed.data.conversationId);
  await prisma.contact.update({
    where: { id: conversation.contactId },
    data: { tags: Array.from(new Set(parsed.data.tags)) },
  });
  revalidatePath(`/inbox/${conversation.id}`);
  revalidatePath('/inbox');
  return { status: 'ok' as const };
}

export async function markConversationRead(conversationId: string) {
  const { conversation } = await requireWorkspaceAndConversation(conversationId);
  if (conversation.unreadCount > 0) {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { unreadCount: 0 },
    });
    revalidatePath('/inbox');
  }
  return { status: 'ok' as const };
}
