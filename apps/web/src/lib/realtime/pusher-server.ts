import 'server-only';

import Pusher from 'pusher';
import { createLogger } from '@zapai/shared';

import { env } from '@/env';

const log = createLogger('realtime-server');

/**
 * Singleton do Pusher server-side. Faz no-op se as credenciais não estiverem
 * configuradas (dev sem Pusher) — em vez de quebrar a request, só loga warning.
 */
let cachedClient: Pusher | null = null;
let warned = false;

function getClient(): Pusher | null {
  if (cachedClient) return cachedClient;
  if (!env.PUSHER_APP_ID || !env.PUSHER_KEY || !env.PUSHER_SECRET || !env.PUSHER_CLUSTER) {
    if (!warned) {
      log.warn('Pusher não configurado — eventos real-time serão silenciosamente ignorados');
      warned = true;
    }
    return null;
  }
  cachedClient = new Pusher({
    appId: env.PUSHER_APP_ID,
    key: env.PUSHER_KEY,
    secret: env.PUSHER_SECRET,
    cluster: env.PUSHER_CLUSTER,
    useTLS: true,
  });
  return cachedClient;
}

export interface InboxEventNewMessage {
  conversationId: string;
  messageId: string;
  contactId: string;
  direction: 'INBOUND' | 'OUTBOUND';
  preview: string;
  createdAt: string;
}

export interface InboxEventConversationUpdated {
  conversationId: string;
  status: 'AI_HANDLING' | 'HUMAN_HANDLING' | 'CLOSED';
  assignedToUserId: string | null;
}

export type InboxEvent =
  | { name: 'message.new'; data: InboxEventNewMessage }
  | { name: 'conversation.updated'; data: InboxEventConversationUpdated };

export function workspaceChannel(workspaceId: string): string {
  return `private-workspace-${workspaceId}`;
}

/**
 * Dispara evento pro canal de um workspace. Silenciosamente no-op se Pusher
 * não configurado. Erros são logados mas não propagam — real-time é optimization.
 */
export async function publishInboxEvent(
  workspaceId: string,
  event: InboxEvent,
): Promise<void> {
  const client = getClient();
  if (!client) return;
  try {
    await client.trigger(workspaceChannel(workspaceId), event.name, event.data);
  } catch (err) {
    log.warn({ workspaceId, name: event.name, err: String(err) }, 'pusher trigger falhou');
  }
}

/** Autoriza inscrição num canal privado. Verifica que o user pertence ao workspace. */
export function authorizePrivateChannel(input: {
  socketId: string;
  channel: string;
  workspaceId: string;
}): { auth: string } | null {
  const client = getClient();
  if (!client) return null;
  if (input.channel !== workspaceChannel(input.workspaceId)) return null;
  return client.authorizeChannel(input.socketId, input.channel);
}
