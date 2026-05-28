import { createLogger } from '@zapfy/shared';

const log = createLogger('worker:outgoing-webhook');

export interface OutgoingWebhookJob {
  webhookId: string;
  url: string;
  secret: string;
  bodyJson: string;
  signature: string; // já calculada pelo producer
  eventName: string;
  attempt: number;
}

/**
 * Job: faz POST pro endpoint do cliente. Falha com throw pra BullMQ
 * retry com backoff exponencial (até 5 vezes definido no producer).
 */
export async function processOutgoingWebhook(data: OutgoingWebhookJob): Promise<void> {
  const res = await fetch(data.url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-trato-event': data.eventName,
      'x-trato-signature': data.signature,
      'x-trato-attempt': String(data.attempt),
      'user-agent': 'Trato-Webhook/1.0',
    },
    body: data.bodyJson,
    signal: AbortSignal.timeout(10_000),
  });

  if (res.status >= 200 && res.status < 300) {
    log.info({ webhookId: data.webhookId, status: res.status }, 'webhook delivered');
    return;
  }

  // 4xx (exceto 429) é erro permanente — não retry
  if (res.status >= 400 && res.status < 500 && res.status !== 429) {
    log.warn(
      { webhookId: data.webhookId, status: res.status },
      'webhook 4xx — não retry',
    );
    return;
  }

  // 5xx e 429 fazem retry
  throw new Error(`HTTP ${res.status}`);
}
