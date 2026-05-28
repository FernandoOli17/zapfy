import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@zapfy/db';

import { isStripeConfigured } from '@/lib/stripe';
import { env } from '@/env';

/**
 * GET /api/health
 *
 * Modo público (default): só retorna `{ status, timestamp }`. Suficiente pra
 * uptime monitors (Better Stack, UptimeRobot, Pingdom). NÃO vaza presença
 * de integrações nem versões.
 *
 * Modo detalhado: requer header `Authorization: Bearer <HEALTH_DETAIL_TOKEN>`
 * ou query `?token=...`. Mostra status de cada integração e DB latency.
 * Útil pra dashboards internos. Se HEALTH_DETAIL_TOKEN não estiver setado,
 * modo detalhado fica indisponível.
 */
export async function GET(req: NextRequest) {
  const startedAt = Date.now();

  // DB ping sempre — é o "vivo ou morto"
  let dbOk = false;
  let dbMs = 0;
  const t0 = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
    dbMs = Date.now() - t0;
  } catch {
    dbOk = false;
    dbMs = Date.now() - t0;
  }

  // Modo detalhado: gateado por token validado pelo schema (>= 24 chars).
  const detailToken = env.HEALTH_DETAIL_TOKEN;
  const provided =
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() ||
    req.nextUrl.searchParams.get('token') ||
    '';
  const wantDetail =
    detailToken !== undefined && provided.length > 0 && constantTimeEqual(provided, detailToken);

  if (!wantDetail) {
    // Resposta pública mínima
    return NextResponse.json(
      {
        status: dbOk ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
      },
      {
        status: dbOk ? 200 : 503,
        headers: { 'cache-control': 'no-store' },
      },
    );
  }

  // Modo detalhado (token válido)
  const checks: Record<
    string,
    { status: 'ok' | 'down' | 'disabled'; detail?: string; ms?: number }
  > = {
    db: { status: dbOk ? 'ok' : 'down', ms: dbMs },
    env_encryption_key: { status: env.ENCRYPTION_KEY ? 'ok' : 'down' },
    env_auth_secret: { status: env.BETTER_AUTH_SECRET ? 'ok' : 'down' },
    stripe: { status: isStripeConfigured() ? 'ok' : 'disabled' },
    pusher: { status: env.PUSHER_APP_ID ? 'ok' : 'disabled' },
    upstash: { status: env.UPSTASH_REDIS_REST_URL ? 'ok' : 'disabled' },
    resend: { status: env.RESEND_API_KEY ? 'ok' : 'disabled' },
    sentry: { status: env.SENTRY_DSN ? 'ok' : 'disabled' },
    anthropic: { status: env.ANTHROPIC_API_KEY ? 'ok' : 'disabled' },
  };

  const critical = ['db', 'env_encryption_key', 'env_auth_secret'];
  const allCriticalOk = critical.every((k) => checks[k]?.status === 'ok');

  return NextResponse.json(
    {
      status: allCriticalOk ? 'ok' : 'degraded',
      uptime: process.uptime(),
      env: env.NODE_ENV,
      region: process.env['VERCEL_REGION'] ?? process.env['RAILWAY_REGION'] ?? null,
      timestamp: new Date().toISOString(),
      tookMs: Date.now() - startedAt,
      checks,
    },
    {
      status: allCriticalOk ? 200 : 503,
      headers: { 'cache-control': 'no-store' },
    },
  );
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
