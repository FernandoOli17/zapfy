import 'server-only';

import { createHmac, randomBytes } from 'node:crypto';

import { prisma } from '@zapai/db';
import { createLogger } from '@zapai/shared';

const log = createLogger('webhooks-outgoing');

/**
 * Lista canônica de eventos que clientes podem se inscrever via OutgoingWebhook.
 * Cada evento tem schema fixo no payload — clientes esperam isso.
 */
export const OUTGOING_EVENT_NAMES = [
  'message.received',
  'message.sent',
  'message.failed',
  'message.delivered',
  'message.read',
  'conversation.assumed',
  'conversation.returned',
  'conversation.closed',
  'agent.published',
  'whatsapp.connected',
  'whatsapp.disconnected',
  'lgpd.opt_out',
] as const;

export type OutgoingEventName = (typeof OUTGOING_EVENT_NAMES)[number];

export interface OutgoingEventPayload {
  event: OutgoingEventName;
  workspaceId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

/** Gera um secret novo (cliente vê uma vez no momento de criar). */
export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(24).toString('base64url')}`;
}

/** Assinatura HMAC SHA-256 do body, padrão `sha256=<hex>`. */
export function signWebhookBody(body: string, secret: string): string {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
}

/**
 * Dispara o evento pra todos os webhooks ativos do workspace que estão
 * inscritos no evento. Não bloqueia — best-effort com retry simples.
 * Em produção real, enfileiraria no BullMQ pra processar fora do request.
 */
export async function dispatchOutgoingEvent(
  workspaceId: string,
  event: OutgoingEventName,
  data: Record<string, unknown>,
): Promise<void> {
  const subscribers = await prisma.outgoingWebhook.findMany({
    where: {
      workspaceId,
      active: true,
      events: { has: event },
    },
    select: { id: true, url: true, secret: true },
  });

  if (subscribers.length === 0) return;

  const payload: OutgoingEventPayload = {
    event,
    workspaceId,
    timestamp: new Date().toISOString(),
    data,
  };
  const body = JSON.stringify(payload);

  await Promise.allSettled(
    subscribers.map(async (sub) => {
      const signature = signWebhookBody(body, sub.secret);
      try {
        const res = await fetch(sub.url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-zapai-event': event,
            'x-zapai-signature': signature,
            'user-agent': 'ZapAI-Webhook/1.0',
          },
          body,
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) {
          log.warn(
            { webhookId: sub.id, event, status: res.status },
            'webhook entrega retornou non-2xx',
          );
        } else {
          log.debug({ webhookId: sub.id, event, status: res.status }, 'webhook entregue');
        }
      } catch (err) {
        log.warn(
          { webhookId: sub.id, event, err: String(err) },
          'webhook entrega falhou',
        );
      }
    }),
  );
}

export const OUTGOING_EVENT_DESCRIPTIONS: Record<OutgoingEventName, string> = {
  'message.received': 'Cliente final enviou mensagem (INBOUND)',
  'message.sent': 'Mensagem enviada pelo agente ou humano',
  'message.failed': 'Falha ao enviar mensagem',
  'message.delivered': 'Mensagem entregue ao cliente',
  'message.read': 'Mensagem lida pelo cliente (2 ticks azuis)',
  'conversation.assumed': 'Atendente humano assumiu a conversa',
  'conversation.returned': 'Conversa devolvida ao agente IA',
  'conversation.closed': 'Conversa encerrada',
  'agent.published': 'Nova versão do agente publicada',
  'whatsapp.connected': 'Número WhatsApp conectado',
  'whatsapp.disconnected': 'Número WhatsApp desconectado',
  'lgpd.opt_out': 'Contato fez opt-out',
};
