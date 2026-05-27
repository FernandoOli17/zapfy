import 'server-only';

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { createLogger } from '@zapai/shared';

import { env } from '@/env';

const log = createLogger('rate-limit');

/**
 * Cliente Upstash REST. Em dev/sem credenciais, ficamos no-op (todas as
 * chamadas a `limit()` permitem). Em prod, com UPSTASH_REDIS_REST_URL +
 * UPSTASH_REDIS_REST_TOKEN, rate-limita de verdade.
 *
 * Usamos o REST client (não BullMQ Redis) porque rate-limit precisa de
 * latência baixa e Upstash REST tem edge-cache.
 */
let redis: Redis | null = null;
let warned = false;

function getRedis(): Redis | null {
  if (redis) return redis;
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    if (!warned) {
      log.warn(
        'UPSTASH_REDIS_REST_URL/TOKEN não configurados — rate limit no-op em dev',
      );
      warned = true;
    }
    return null;
  }
  redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });
  return redis;
}

/** Pool de limiters reutilizáveis por preset. */
const limiters = new Map<string, Ratelimit>();

function getLimiter(name: string, limit: number, windowSec: number): Ratelimit | null {
  const client = getRedis();
  if (!client) return null;
  const key = `${name}:${limit}:${windowSec}`;
  const cached = limiters.get(key);
  if (cached) return cached;
  const limiter = new Ratelimit({
    redis: client,
    limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
    analytics: true,
    prefix: `Trato:rl:${name}`,
  });
  limiters.set(key, limiter);
  return limiter;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // epoch ms
}

/**
 * Genérica: limita por identifier (IP, userId, workspaceId, etc.).
 * Se Upstash não estiver configurado, sempre permite (success: true).
 */
export async function enforceRateLimit(
  identifier: string,
  preset: { name: string; limit: number; windowSec: number },
): Promise<RateLimitResult> {
  const limiter = getLimiter(preset.name, preset.limit, preset.windowSec);
  if (!limiter) {
    return {
      success: true,
      limit: preset.limit,
      remaining: preset.limit,
      reset: Date.now() + preset.windowSec * 1000,
    };
  }
  const r = await limiter.limit(identifier);
  return {
    success: r.success,
    limit: r.limit,
    remaining: r.remaining,
    reset: r.reset,
  };
}

// Presets prontos
export const RL_PUBLIC = { name: 'public', limit: 100, windowSec: 60 } as const;
export const RL_SIGNUP = { name: 'signup', limit: 10, windowSec: 60 * 60 } as const;
export const RL_CONTACT = { name: 'contact', limit: 5, windowSec: 60 } as const;
export const RL_LGPD_API = { name: 'lgpd-api', limit: 30, windowSec: 60 } as const;
export const RL_FORGE = { name: 'forge', limit: 30, windowSec: 60 } as const;
/** Envio manual do agente humano no Inbox — generoso, mas evita scripts. */
export const RL_INBOX_SEND = { name: 'inbox-send', limit: 60, windowSec: 60 } as const;
/** Conexão / teste de número WhatsApp — Meta API tem rate dela. */
export const RL_WHATSAPP_CONNECT = { name: 'wa-connect', limit: 10, windowSec: 60 * 5 } as const;

/** Extrai IP da request (tolera proxies). */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? 'unknown';
  const real = headers.get('x-real-ip');
  if (real) return real;
  return 'unknown';
}
