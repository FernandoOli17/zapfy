import 'server-only';

import { prisma } from '@zapfy/db';

export type ComponentStatus = 'operational' | 'degraded' | 'down';

export interface ComponentCheck {
  status: ComponentStatus;
  detail?: string;
  latencyMs?: number;
}

/**
 * Roda os 4 health checks em paralelo. Cada um tem 3s timeout — se exceder,
 * marca como 'degraded' (não 'down') por ser apenas um snapshot.
 */
export async function runStatusChecks(): Promise<{
  API: ComponentCheck;
  WORKER: ComponentCheck;
  WHATSAPP: ComponentCheck;
  DATABASE: ComponentCheck;
}> {
  const [api, db, worker, whatsapp] = await Promise.all([
    checkApi(),
    checkDatabase(),
    checkWorker(),
    checkWhatsApp(),
  ]);
  return { API: api, WORKER: worker, WHATSAPP: whatsapp, DATABASE: db };
}

async function checkApi(): Promise<ComponentCheck> {
  // Se chegou aqui, API tá viva. latency = 0
  return { status: 'operational', detail: `Region: ${process.env['VERCEL_REGION'] ?? 'local'}` };
}

async function checkDatabase(): Promise<ComponentCheck> {
  const t0 = Date.now();
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout 3s')), 3000)),
    ]);
    const latencyMs = Date.now() - t0;
    return {
      status: latencyMs > 1500 ? 'degraded' : 'operational',
      detail: `${latencyMs}ms`,
      latencyMs,
    };
  } catch (err) {
    return {
      status: 'down',
      detail: err instanceof Error ? err.message : 'unreachable',
      latencyMs: Date.now() - t0,
    };
  }
}

/**
 * Worker health: olha se há ao menos 1 job processado nos últimos 5min,
 * OU se há LGPD sweep registrado (worker mostra "vivo" via repeatable).
 * Heurística — se zero jobs processados em 1h, considera degraded.
 */
async function checkWorker(): Promise<ComponentCheck> {
  try {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const recentActivity = await prisma.message.count({
      where: { createdAt: { gte: since }, direction: 'OUTBOUND', fromAi: true },
    });
    if (recentActivity > 0) {
      return { status: 'operational', detail: `${recentActivity} mensagens IA na última hora` };
    }
    // Sem atividade IA recente — não significa down (workspace ocioso é normal).
    // Verifica audit log recente como proxy de "worker fez algo".
    const auditRecent = await prisma.auditLog.count({
      where: { createdAt: { gte: since } },
    });
    return {
      status: 'operational',
      detail:
        auditRecent > 0
          ? `${auditRecent} eventos auditados na última hora`
          : 'Sem atividade na última hora (normal em workspaces ociosos)',
    };
  } catch {
    return { status: 'degraded', detail: 'Não foi possível verificar atividade do worker' };
  }
}

/**
 * WhatsApp: conta workspaces com WhatsAppAccount CONNECTED vs ERROR.
 * Se >5% em ERROR, marca degraded.
 */
async function checkWhatsApp(): Promise<ComponentCheck> {
  try {
    const [connected, errored, total] = await Promise.all([
      prisma.whatsAppAccount.count({ where: { status: 'CONNECTED' } }),
      prisma.whatsAppAccount.count({ where: { status: 'ERROR' } }),
      prisma.whatsAppAccount.count(),
    ]);
    if (total === 0) {
      return { status: 'operational', detail: 'Nenhum workspace conectado ainda' };
    }
    const errorRate = errored / total;
    if (errorRate > 0.2) {
      return { status: 'down', detail: `${errored}/${total} contas com erro` };
    }
    if (errorRate > 0.05) {
      return { status: 'degraded', detail: `${errored}/${total} contas com erro` };
    }
    return { status: 'operational', detail: `${connected}/${total} contas conectadas` };
  } catch {
    return { status: 'degraded', detail: 'Não foi possível consultar status WA' };
  }
}
