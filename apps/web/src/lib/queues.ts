import 'server-only';

import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { createLogger } from '@zapai/shared';

import { env } from '@/env';

const log = createLogger('queues');

/**
 * Producer-side: Singleton connection + queue clients reusados entre
 * requests. Em dev/sem REDIS_URL respondendo, falha gracefully (loga warn).
 *
 * Worker consome em apps/worker.
 */
let connection: IORedis | null = null;
const queues = new Map<string, Queue>();
let connWarned = false;

function getConnection(): IORedis | null {
  if (connection) return connection;
  if (!env.REDIS_URL) {
    if (!connWarned) {
      log.warn('REDIS_URL não configurada — enqueueing vai falhar em dev');
      connWarned = true;
    }
    return null;
  }
  connection = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
  connection.on('error', (err: Error) =>
    log.error({ err: err.message }, 'redis connection error'),
  );
  return connection;
}

function getQueue(name: string): Queue | null {
  const cached = queues.get(name);
  if (cached) return cached;
  const conn = getConnection();
  if (!conn) return null;
  const q = new Queue(name, { connection: conn });
  queues.set(name, q);
  return q;
}

export const QUEUE_NAMES = {
  processMessage: 'process-message',
  sendBroadcast: 'send-broadcast',
  outgoingWebhook: 'outgoing-webhook',
  lgpdHardDelete: 'lgpd-hard-delete',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

interface EnqueueOptions {
  /** Delay em ms antes de processar. */
  delay?: number;
  /** ID único pra evitar duplicação. */
  jobId?: string;
  /** Tentativas com backoff exponencial. Default 5. */
  attempts?: number;
}

export async function enqueue<T>(
  name: QueueName,
  data: T,
  opts: EnqueueOptions = {},
): Promise<{ ok: boolean; jobId?: string; error?: string }> {
  const q = getQueue(name);
  if (!q) {
    log.warn({ name }, 'enqueue ignorado — fila indisponível');
    return { ok: false, error: 'Redis indisponível' };
  }
  try {
    const job = await q.add(name, data, {
      removeOnComplete: { age: 24 * 60 * 60, count: 1000 },
      removeOnFail: { age: 7 * 24 * 60 * 60 },
      attempts: opts.attempts ?? 5,
      backoff: { type: 'exponential', delay: 5000 },
      ...(opts.delay !== undefined ? { delay: opts.delay } : {}),
      ...(opts.jobId !== undefined ? { jobId: opts.jobId } : {}),
    });
    return { ok: true, ...(job.id ? { jobId: job.id } : {}) };
  } catch (err) {
    log.warn({ name, err: String(err) }, 'enqueue falhou');
    return { ok: false, error: err instanceof Error ? err.message : 'falha' };
  }
}

// Tipos dos payloads pra cada fila — usados pelo worker e producers
export interface ProcessMessageJob {
  workspaceId: string;
  messageId: string;
  conversationId: string;
  contactId: string;
}

export interface SendBroadcastJob {
  workspaceId: string;
  broadcastId: string;
  recipientId: string;
}

export interface OutgoingWebhookJob {
  webhookId: string;
  url: string;
  secret: string;
  bodyJson: string;
  eventName: string;
  attempt: number;
}

export interface LgpdHardDeleteJob {
  workspaceId: string;
  contactId: string;
}
