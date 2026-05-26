import { NextResponse } from 'next/server';
import { prisma } from '@zapai/db';

import { isStripeConfigured } from '@/lib/stripe';
import { env } from '@/env';

/**
 * GET /api/health
 * Verifica conectividade básica: DB, env crítico, e flags opcionais.
 * Retorna 200 sempre que o serviço está vivo (mesmo com integrações
 * opcionais desligadas). Retorna 503 se DB está fora.
 */
export async function GET() {
  const startedAt = Date.now();
  const checks: Record<
    string,
    { status: 'ok' | 'down' | 'disabled'; detail?: string; ms?: number }
  > = {};

  // DB ping
  const t0 = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks['db'] = { status: 'ok', ms: Date.now() - t0 };
  } catch (err) {
    checks['db'] = {
      status: 'down',
      detail: err instanceof Error ? err.message.slice(0, 200) : 'unknown',
      ms: Date.now() - t0,
    };
  }

  // Env críticos (presença, não validade)
  checks['env_encryption_key'] = {
    status: env.ENCRYPTION_KEY ? 'ok' : 'down',
  };
  checks['env_auth_secret'] = {
    status: env.BETTER_AUTH_SECRET ? 'ok' : 'down',
  };

  // Integrações opcionais
  checks['stripe'] = { status: isStripeConfigured() ? 'ok' : 'disabled' };
  checks['pusher'] = {
    status: env.PUSHER_APP_ID ? 'ok' : 'disabled',
  };
  checks['upstash'] = {
    status: env.UPSTASH_REDIS_REST_URL ? 'ok' : 'disabled',
  };
  checks['resend'] = {
    status: env.RESEND_API_KEY ? 'ok' : 'disabled',
  };
  checks['sentry'] = { status: env.SENTRY_DSN ? 'ok' : 'disabled' };
  checks['anthropic'] = { status: env.ANTHROPIC_API_KEY ? 'ok' : 'disabled' };

  const critical = ['db', 'env_encryption_key', 'env_auth_secret'];
  const allCriticalOk = critical.every((k) => checks[k]?.status === 'ok');

  const body = {
    status: allCriticalOk ? 'ok' : 'degraded',
    uptime: process.uptime(),
    env: env.NODE_ENV,
    region: process.env['VERCEL_REGION'] ?? process.env['RAILWAY_REGION'] ?? null,
    timestamp: new Date().toISOString(),
    tookMs: Date.now() - startedAt,
    checks,
  };

  return NextResponse.json(body, { status: allCriticalOk ? 200 : 503 });
}
