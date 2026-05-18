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

const log = createLogger('worker');

const connection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

connection.on('error', (err) => log.error({ err }, 'redis connection error'));
connection.on('connect', () => log.info('redis connected'));

const workers: Worker[] = [];

// LGPD hard delete: apaga contatos com hardDeleteAt vencido
workers.push(
  new Worker<LgpdHardDeleteJob>(
    QUEUE_NAMES.lgpdHardDelete,
    async (job: Job<LgpdHardDeleteJob>) => {
      log.info({ jobId: job.id, contactId: job.data.contactId }, 'processando lgpd hard delete');
      await processLgpdHardDelete(job.data);
    },
    { connection, concurrency: 5 },
  ),
);

// Outgoing webhooks com retry exponencial (configurado no producer)
workers.push(
  new Worker<OutgoingWebhookJob>(
    QUEUE_NAMES.outgoingWebhook,
    async (job: Job<OutgoingWebhookJob>) => {
      log.info(
        { jobId: job.id, webhookId: job.data.webhookId, event: job.data.eventName },
        'processando outgoing webhook',
      );
      await processOutgoingWebhook(job.data);
    },
    { connection, concurrency: 10 },
  ),
);

// Process message: agente IA real entra na Fase 5
workers.push(
  new Worker(
    QUEUE_NAMES.processMessage,
    async (job: Job) => {
      log.info({ jobId: job.id }, 'process-message recebido — agente IA entra na Fase 5');
    },
    { connection, autorun: false },
  ),
);

// Send broadcast: handler real entra junto com /automations/broadcasts
workers.push(
  new Worker(
    QUEUE_NAMES.sendBroadcast,
    async (job: Job) => {
      log.info({ jobId: job.id }, 'send-broadcast — handler em desenvolvimento');
    },
    { connection, autorun: false },
  ),
);

/**
 * Repeatable: LGPD hard delete sweep a cada hora.
 * Em produção, ideal é Vercel Cron / Railway Scheduler chamando uma rota interna —
 * mas o setInterval funciona pra worker persistente.
 */
const SWEEP_INTERVAL_MS = 60 * 60 * 1000;

function startRepeatables(): void {
  setInterval(() => {
    void sweepExpiredHardDeletes()
      .then((count) => {
        if (count > 0) {
          log.info({ count }, 'lgpd sweep — contatos processados');
        }
      })
      .catch((err: unknown) => {
        log.error({ err: String(err) }, 'lgpd sweep falhou');
      });
  }, SWEEP_INTERVAL_MS);

  // sweep imediato no startup
  void sweepExpiredHardDeletes().catch((err: unknown) =>
    log.error({ err: String(err) }, 'lgpd sweep inicial falhou'),
  );
}

startRepeatables();

log.info(
  {
    queues: workers.map((w) => w.name),
    redisHost: env.REDIS_URL.split('@')[1] ?? 'configured',
  },
  'ZapAI worker pronto',
);

async function shutdown(signal: string): Promise<void> {
  log.info({ signal }, 'shutting down…');
  await Promise.all(workers.map((w) => w.close()));
  await connection.quit();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
