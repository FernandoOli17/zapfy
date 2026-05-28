import { NextResponse, type NextRequest } from 'next/server';

import { revokeDeviceVerificationByToken } from '@/lib/device-verification';
import { createLogger } from '@zapfy/shared';

const log = createLogger('revoke-device');

/**
 * GET /api/auth/revoke-device?token=<revokeToken>
 *
 * Endpoint sem-auth (token serve como bearer): clicado a partir do link
 * "Não foi você?" no email. Destrói a sessão associada e redireciona pro
 * fluxo de reset de senha.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.redirect(new URL('/login?error=missing-token', req.url));
  }

  const res = await revokeDeviceVerificationByToken(token);
  if (!res.ok) {
    log.warn({ reason: res.reason }, 'revoke-device falhou');
    return NextResponse.redirect(
      new URL(`/login?error=revoke-${res.reason}`, req.url),
    );
  }

  log.info({ userId: res.userId }, 'sessão revogada por device verification');
  return NextResponse.redirect(
    new URL('/forgot-password?revoked=1', req.url),
  );
}
