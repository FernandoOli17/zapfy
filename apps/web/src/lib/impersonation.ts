import 'server-only';

import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'node:crypto';

import { env } from '@/env';

/**
 * Cookie name prefixed com `__Host-` em prod pra impedir subdomínio de
 * setar o cookie (mecanismo browser-level que exige Path=/, Secure, Domain
 * NOT set). Em dev/preview onde secure=false, usamos nome simples.
 */
export const IMPERSONATE_COOKIE =
  process.env['NODE_ENV'] === 'production'
    ? '__Host-x-impersonate-workspace'
    : 'x-impersonate-workspace';

/**
 * Token format: `${workspaceId}.${userId}.${expiresAtMs}.${hmac}`
 *
 * O HMAC vincula o cookie ao userId do admin que fez a impersonação. Outro
 * admin (mesmo browser/kiosk) NÃO consegue herdar o token — `verifyToken`
 * exige que o `userId` no payload bata com a sessão atual.
 *
 * Expira em maxAgeMs (default 1h). Renovação requer novo impersonateWorkspace
 * — não estendemos o token automaticamente, intencional pra forçar audit
 * trail explícito a cada hora.
 */
const HMAC_KEY = env.BETTER_AUTH_SECRET;

function hmacToken(payload: string): string {
  return createHmac('sha256', HMAC_KEY).update(payload).digest('base64url');
}

export function signImpersonationToken(input: {
  workspaceId: string;
  userId: string;
  maxAgeMs?: number;
}): { token: string; expiresAt: Date } {
  const expiresAt = new Date(Date.now() + (input.maxAgeMs ?? 60 * 60 * 1000));
  const payload = `${input.workspaceId}.${input.userId}.${expiresAt.getTime()}`;
  const sig = hmacToken(payload);
  return { token: `${payload}.${sig}`, expiresAt };
}

export interface ImpersonationPayload {
  workspaceId: string;
  userId: string;
  expiresAt: Date;
}

/**
 * Verifica + decodifica o token. Retorna null se:
 *  - formato inválido
 *  - HMAC não bate
 *  - expirou
 *  - userId não bate com `expectedUserId` (defesa anti-cross-admin)
 */
export function verifyImpersonationToken(
  token: string,
  expectedUserId: string,
): ImpersonationPayload | null {
  const parts = token.split('.');
  if (parts.length !== 4) return null;
  const [workspaceId, userId, expiresAtStr, sig] = parts as [
    string,
    string,
    string,
    string,
  ];

  // HMAC constant-time check
  const expected = hmacToken(`${workspaceId}.${userId}.${expiresAtStr}`);
  const expBuf = Buffer.from(expected, 'utf8');
  const recBuf = Buffer.from(sig, 'utf8');
  if (expBuf.length !== recBuf.length) return null;
  try {
    if (!timingSafeEqual(expBuf, recBuf)) return null;
  } catch {
    return null;
  }

  // Bind ao userId — diferente = cross-admin inheritance attempt
  if (userId !== expectedUserId) return null;

  const expiresMs = Number(expiresAtStr);
  if (!Number.isFinite(expiresMs)) return null;
  if (Date.now() > expiresMs) return null;

  return { workspaceId, userId, expiresAt: new Date(expiresMs) };
}

/**
 * Lê e VERIFICA o cookie de impersonação contra o userId da sessão atual.
 * Em vez de retornar string solta (footgun: caller pode esquecer de checar
 * isSuperAdmin), retorna `null` ou o `workspaceId` validado.
 *
 * O caller AINDA precisa garantir que o user é super-admin antes de chamar —
 * mas pelo menos o cookie agora prova quem criou.
 */
export async function getImpersonatedWorkspaceId(
  expectedUserId: string,
): Promise<string | null> {
  const c = await cookies();
  const token = c.get(IMPERSONATE_COOKIE)?.value;
  if (!token) return null;
  const payload = verifyImpersonationToken(token, expectedUserId);
  return payload?.workspaceId ?? null;
}
