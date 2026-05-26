import { Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import { createLogger } from '@zapai/shared';

import { env } from './env';
import { QUEUE_NAMES } from './queues';
import {
  processLgpdHardDelete,
  sweepExpiredHardDeletes,
  type LgpdHardDeleteJob,
} from './jobs/lgpd-hard-delete';
import {
  processOutgoingWebhook,
  type OutgoingWebhookJob,
} from './jobs/outgoing-webhook';
import {
  processMessage,
  type ProcessMessageJob,
} from './jobs/process-message';
import {
  processSendBroadcast,
  type SendBroadcastJob,
} from './jobs/send-broadcast';

const log = createLogger('worker');

const connection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

connection.on('error', (err) => log.error({ err }, 'redis connection error'));
connection.on('connect', () => log.info('redis connected'));

const workers: Worker[] = [];

// LGPD hard delete
workers.push(
  new Worker<LgpdHardDeleteJob>(
    QUEUE_NAMES.lgpdHardDelete,
    async (job: Job<LgpdHardDeleteJob>) => {
      log.info({ jobId: job.id, contactId: job.data.contactId }, 'lgpd hard delete');
      await processLgpdHardDelete(job.data);
    },
    { connection, concurrency: 5 },
  ),
);

// Outgoing webhooks
workers.push(
  new Worker<OutgoingWebhookJob>(
    QUEUE_NAMES.outgoingWebhook,
    async (job: Job<OutgoingWebhookJob>) => {
      log.info(
        { jobId: job.id, webhookId: job.data.webhookId, event: job.data.eventName },
        'outgoing webhook',
      );
      await processOutgoingWebhook(job.data);
    },
    { connection, concurrency: 10 },
  ),
);

// Process message — agente IA responde WhatsApp
workers.push(
  new Worker<ProcessMessageJob>(
    QUEUE_NAMES.processMessage,
    async (job: Job<ProcessMessageJob>) => {
      log.info(
        {
          jobId: job.id,
          workspaceId: job.data.workspaceId,
          conversationId: job.data.conversationId,
        },
        'processando mensagem',
      );
      await processMessage(job.data);
    },
    { connection, concurrency: 5 },
  ),
);

// Send broadcast
workers.push(
  new Worker<SendBroadcastJob>(
    QUEUE_NAMES.sendBroadcast,
    async (job: Job<SendBroadcastJob>) => {
      log.info(
        {
          jobId: job.id,
          broadcastId: job.data.broadcastId,
          recipientId: job.data.recipientId,
        },
        'enviando broadcast',
      );
      await processSendBroadcast(job.data);
    },
    { connection, concurrency: 3 }, // throttle pra não estourar rate limit da Meta
  ),
);

/**
 * Repeatable: LGPD hard delete sweep a cada hora.
 */
const SWEEP_INTERVAL_MS = 60 * 60 * 1000;

function startRepeatables(): void {
  setInterval(() => {
    void sweepExpiredHardDeletes()
      .then((count) => {
        if (count > 0) log.info({ count }, 'lgpd sweep — contatos processados');
      })
      .catch((err: unknown) => log.error({ err: String(err) }, 'lgpd sweep falhou'));
  }, SWEEP_INTERVAL_MS);

  void sweepExpiredHardDeletes().catch((err: unknown) =>
    log.error({ err: String(err) }, 'lgpd sweep inicial falhou'),
  );
}

startRepeatables();

log.info(
  {
    queues: workers.map((w) => w.name),
    mockAi: process.env['MOCK_AI'] === 'true',
    redisHost: env.REDIS_URL.split('@')[1] ?? 'configured',
  },
  'Orbe worker pronto',
);

async function shutdown(signal: string): Promise<void> {
  log.info({ signal }, 'shutting down…');
  await Promise.all(workers.map((w) => w.close()));
  await connection.quit();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
