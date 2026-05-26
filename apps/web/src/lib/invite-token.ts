import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

import { AppError } from '@zapai/shared';

import { env } from '@/env';

/**
 * Token-only invite system (sem WorkspaceInvite no DB).
 *
 * Payload é assinado com HMAC-SHA256 usando BETTER_AUTH_SECRET. Formato:
 *     base64url(JSON.stringify(payload)) + "." + base64url(hmacHex)
 *
 * Vantagens:
 * - Sem migration de schema
 * - Stateless: revoke = trocar BETTER_AUTH_SECRET (todos os convites antigos viram inválidos)
 * - Expiration embutida no payload
 *
 * Limite: convites já aceitos não dá pra "marcar como usados" — alguém com o link
 * antigo poderia tentar aceitar de novo, mas o action verifica WorkspaceMember
 * (workspaceId, email) e bloqueia se já estiver no time.
 */

export interface InvitePayload {
  workspaceId: string;
  workspaceName: string;
  inviterUserId: string;
  inviterName: string;
  email: string;
  role: 'ADMIN' | 'AGENT';
  expiresAt: number; // epoch ms
  nonce: string; // pra cada convite ser único mesmo com mesmos campos
}

const INVITE_TTL_DAYS = 7;
const INVITE_TTL_MS = INVITE_TTL_DAYS * 24 * 60 * 60 * 1000;

function base64urlEncode(buf: Buffer | string): string {
  const b = typeof buf === 'string' ? Buffer.from(buf, 'utf8') : buf;
  return b.toString('base64url');
}

function base64urlDecode(s: string): Buffer {
  return Buffer.from(s, 'base64url');
}

function sign(payloadB64: string): string {
  return createHmac('sha256', env.BETTER_AUTH_SECRET).update(payloadB64).digest('hex');
}

export function signInviteToken(
  input: Omit<InvitePayload, 'expiresAt' | 'nonce'>,
): { token: string; expiresAt: Date } {
  const expiresAt = Date.now() + INVITE_TTL_MS;
  const payload: InvitePayload = {
    ...input,
    expiresAt,
    nonce: Math.random().toString(36).slice(2, 14),
  };
  const payloadB64 = base64urlEncode(JSON.stringify(payload));
  const sigHex = sign(payloadB64);
  const sigB64 = base64urlEncode(Buffer.from(sigHex, 'hex'));
  return {
    token: `${payloadB64}.${sigB64}`,
    expiresAt: new Date(expiresAt),
  };
}

export function verifyInviteToken(token: string): InvitePayload {
  const parts = token.split('.');
  if (parts.length !== 2) {
    throw new AppError('INVITE_INVALID', 400, 'Convite com formato inválido');
  }
  const [payloadB64, sigB64] = parts as [string, string];

  const expectedHex = sign(payloadB64);
  const expectedBuf = Buffer.from(expectedHex, 'hex');
  const providedBuf = base64urlDecode(sigB64);
  if (expectedBuf.length !== providedBuf.length || !timingSafeEqual(expectedBuf, providedBuf)) {
    throw new AppError('INVITE_BAD_SIGNATURE', 400, 'Assinatura do convite inválida');
  }

  let payload: InvitePayload;
  try {
    payload = JSON.parse(base64urlDecode(payloadB64).toString('utf8')) as InvitePayload;
  } catch {
    throw new AppError('INVITE_BAD_PAYLOAD', 400, 'Payload do convite inválido');
  }

  if (typeof payload.expiresAt !== 'number' || payload.expiresAt < Date.now()) {
    throw new AppError(
      'INVITE_EXPIRED',
      400,
      'Esse convite expirou. Peça pra quem te chamou enviar de novo.',
    );
  }

  if (!payload.workspaceId || !payload.email || !payload.role) {
    throw new AppError('INVITE_BAD_PAYLOAD', 400, 'Convite incompleto');
  }

  return payload;
}
