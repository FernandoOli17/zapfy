import 'server-only';

import { createHash, randomBytes } from 'node:crypto';

import { prisma } from '@zapai/db';
import { AppError } from '@zapai/shared';

const API_KEY_PREFIX_LEN = 8; // chars visíveis no UI ('zk_xxxx')

/**
 * Gera uma nova API key: retorna o segredo (mostrar 1x pro user) + objeto
 * pra persistir (hash + prefix). Nunca armazenamos o segredo em texto plano.
 *
 * Formato: zk_<24 chars base64url>
 */
export function generateApiKey(): {
  secret: string;
  keyHash: string;
  prefix: string;
} {
  const random = randomBytes(18).toString('base64url'); // 24 chars
  const secret = `zk_${random}`;
  const keyHash = createHash('sha256').update(secret).digest('hex');
  const prefix = secret.slice(0, API_KEY_PREFIX_LEN);
  return { secret, keyHash, prefix };
}

/**
 * Valida um Bearer token. Retorna ApiKey + workspaceId se válido, throw 401 se não.
 * Atualiza lastUsedAt em background (não bloqueia request).
 */
export async function authenticateApiKey(authHeader: string | null): Promise<{
  apiKeyId: string;
  workspaceId: string;
  scopes: string[];
}> {
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    throw new AppError('AUTH_MISSING', 401, 'Header Authorization: Bearer <key> obrigatório');
  }
  const secret = authHeader.slice('Bearer '.length).trim();
  if (!secret.startsWith('zk_')) {
    throw new AppError('AUTH_INVALID_FORMAT', 401, 'API key inválida');
  }
  const keyHash = createHash('sha256').update(secret).digest('hex');
  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    select: {
      id: true,
      workspaceId: true,
      scopes: true,
      revokedAt: true,
      expiresAt: true,
    },
  });
  if (!apiKey || apiKey.revokedAt) {
    throw new AppError('AUTH_INVALID', 401, 'API key inválida ou revogada');
  }
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    throw new AppError('AUTH_EXPIRED', 401, 'API key expirada');
  }
  // best-effort: atualiza lastUsedAt sem bloquear (não await)
  void prisma.apiKey
    .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
    .catch(() => undefined);

  return {
    apiKeyId: apiKey.id,
    workspaceId: apiKey.workspaceId,
    scopes: apiKey.scopes,
  };
}

export function requireScope(authResult: { scopes: string[] }, scope: string): void {
  if (authResult.scopes.includes('*')) return;
  if (!authResult.scopes.includes(scope)) {
    throw new AppError(
      'AUTH_INSUFFICIENT_SCOPE',
      403,
      `API key sem permissão pra ${scope}. Scopes atuais: ${authResult.scopes.join(', ') || '(nenhum)'}`,
    );
  }
}

export const AVAILABLE_SCOPES = [
  'lgpd:export',
  'lgpd:delete',
  'lgpd:opt-out',
  'contacts:read',
  'contacts:write',
  'conversations:read',
  'conversations:write',
  'messages:send',
  '*',
] as const;
export type ApiKeyScope = (typeof AVAILABLE_SCOPES)[number];
