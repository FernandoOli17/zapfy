import 'server-only';

import { createHmac, randomBytes, randomUUID } from 'node:crypto';

import { prisma } from '@zapfy/db';
import { createLogger } from '@zapfy/shared';

import { enqueue, QUEUE_NAMES, type OutgoingWebhookJob } from '@/lib/queues';

// Re-exporta constantes/tipos (também disponíveis em webhooks-outgoing-events
// pra client components que não podem importar server-only).
export {
  OUTGOING_EVENT_NAMES,
  OUTGOING_EVENT_DESCRIPTIONS,
  type OutgoingEventName,
  type OutgoingEventPayload,
} from './webhooks-outgoing-events';
import type { OutgoingEventName, OutgoingEventPayload } from './webhooks-outgoing-events';

const log = createLogger('webhooks-outgoing');

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
 * inscritos no evento. **Não-bloqueante** — enfileira no BullMQ
 * `outgoingWebhook` que tem retry com backoff exponencial + dead letter.
 *
 * Se Redis estiver indisponível (dev sem worker), faz fallback inline
 * em background com Promise.allSettled — não bloqueia a request original.
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

  for (const sub of subscribers) {
    const signature = signWebhookBody(body, sub.secret);
    const job: OutgoingWebhookJob = {
      webhookId: sub.id,
      url: sub.url,
      secret: sub.secret,
      bodyJson: body,
      signature,
      eventName: event,
      attempt: 1,
    };

    // jobId precisa ser único — randomUUID em vez de Date.now() pra evitar
    // colisão quando o mesmo subscriber recebe 2 eventos no mesmo ms (ex:
    // message.sent + message.delivered em rápida sucessão).
    const result = await enqueue(QUEUE_NAMES.outgoingWebhook, job, {
      jobId: `wh-${sub.id}-${randomUUID()}`,
      attempts: 5,
    });

    if (!result.ok) {
      // Fila indisponível: fallback inline em background — best-effort, não
      // bloqueia o request original.
      log.warn({ webhookId: sub.id, event }, 'fila indisponível — entregando inline');
      void deliverInline(sub.id, sub.url, body, signature, event);
    }
  }
}

async function deliverInline(
  webhookId: string,
  url: string,
  body: string,
  signature: string,
  event: string,
): Promise<void> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-trato-event': event,
        'x-trato-signature': signature,
        // attempt=1 inline (esse path só roda quando o BullMQ está down,
        // então não há retries do nosso lado — sempre primeira tentativa).
        'x-trato-attempt': '1',
        'user-agent': 'Trato-Webhook/1.0',
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      log.warn({ webhookId, event, status: res.status }, 'inline webhook non-2xx');
    } else {
      log.debug({ webhookId, event, status: res.status }, 'inline webhook entregue');
    }
  } catch (err) {
    log.warn({ webhookId, event, err: String(err) }, 'inline webhook falhou');
  }
}

