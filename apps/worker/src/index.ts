import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { createLogger } from '@zapai/shared';

import { env } from './env.js';
import { QUEUE_NAMES } from './queues.js';

const log = createLogger('worker');

const connection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

connection.on('error', (err) => log.error({ err }, 'redis connection error'));
connection.on('connect', () => log.info('redis connected'));

/**
 * Workers ficam vazios na Fase 1 — registro de jobs entra em Fase 5 (mensagens),
 * Fase 5 (embeddings) e Fase 9 (broadcasts, LGPD).
 *
 * Quando adicionar um processador novo:
 *   1. Cria handler em src/jobs/<name>.ts exportando default async fn
 *   2. Registra abaixo com a queue do QUEUE_NAMES
 *   3. Adiciona BullMQ Queue producer em packages/shared se for usado fora do worker
 */
const workers: Worker[] = [];

const placeholderWorker = new Worker(
  QUEUE_NAMES.processMessage,
  async (job) => {
    log.info({ jobId: job.id, name: job.name }, 'placeholder processor invoked');
  },
  { connection, autorun: false }, // autorun=false até Fase 5 ligar de fato
);
workers.push(placeholderWorker);

log.info(
  { queues: workers.map((w) => w.name) },
  'ZapAI worker pronto (sem processadores ativos — Fase 5)',
);

async function shutdown(signal: string) {
  log.info({ signal }, 'shutting down…');
  await Promise.all(workers.map((w) => w.close()));
  await connection.quit();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
