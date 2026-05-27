import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

/**
 * Validação de path relativo seguro (defesa contra open-redirect via `?next=`).
 */
function isSafeRelativePath(path: string): boolean {
  if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) return false;
  // Bloqueia caracteres de controle (NUL, CRLF) que abrem porta pra
  // header-injection ou outras travessuras.
  for (let i = 0; i < path.length; i++) {
    if (path.charCodeAt(i) < 32) return false;
  }
  return true;
}

/**
 * Rate limit em memória (best-effort) pra endpoints de auth — não substitui
 * o limit "real" do Upstash em produção (esse só roda em server-side).
 *
 * Middleware roda em Edge runtime — não temos acesso a Node API completa.
 * O Map local funciona em dev e dentro de uma instância serverless; em
 * cluster vai vazar, mas serve como primeira camada antes do limit Upstash
 * que roda nos handlers de auth.
 */
const ipHits = new Map<string, { count: number; resetAt: number }>();
const AUTH_LIMIT_PER_IP = 20; // 20 tentativas / minuto / IP
const AUTH_WINDOW_MS = 60 * 1000;

function rateLimitByIp(ip: string): { ok: boolean; remaining: number } {
  const now = Date.now();
  const entry = ipHits.get(ip);
  if (!entry || entry.resetAt < now) {
    ipHits.set(ip, { count: 1, resetAt: now + AUTH_WINDOW_MS });
    return { ok: true, remaining: AUTH_LIMIT_PER_IP - 1 };
  }
  if (entry.count >= AUTH_LIMIT_PER_IP) {
    return { ok: false, remaining: 0 };
  }
  entry.count += 1;
  return { ok: true, remaining: AUTH_LIMIT_PER_IP - entry.count };
}

function clientIpFromRequest(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]?.trim() ?? 'unknown';
  const real = req.headers.get('x-real-ip');
  if (real) return real;
  return 'unknown';
}

// Limpa entradas expiradas periodicamente pra evitar memory leak
let lastSweep = 0;
function maybeSweep(): void {
  const now = Date.now();
  if (now - lastSweep < AUTH_WINDOW_MS) return;
  lastSweep = now;
  for (const [k, v] of ipHits) {
    if (v.resetAt < now) ipHits.delete(k);
  }
}

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // ─── Rate limit nos endpoints sensíveis de auth ───────────────────────────
  if (
    path.startsWith('/api/auth/sign-in') ||
    path.startsWith('/api/auth/sign-up') ||
    path.startsWith('/api/auth/forget-password') ||
    path.startsWith('/api/auth/reset-password') ||
    path.startsWith('/api/auth/magic-link')
  ) {
    maybeSweep();
    const ip = clientIpFromRequest(req);
    const rl = rateLimitByIp(ip);
    if (!rl.ok) {
      return new NextResponse(
        JSON.stringify({
          error: 'Muitas tentativas. Aguarde 1 minuto e tente de novo.',
        }),
        {
          status: 429,
          headers: {
            'content-type': 'application/json',
            'retry-after': '60',
            'x-ratelimit-remaining': '0',
          },
        },
      );
    }
    // continua pro handler de auth
    return NextResponse.next();
  }

  // ─── Auth gate em rotas privadas (matcher abaixo controla quais) ──────────
  const sessionCookie = getSessionCookie(req);
  if (!sessionCookie) {
    const loginUrl = new URL('/login', req.url);
    if (isSafeRelativePath(path)) {
      loginUrl.searchParams.set('next', path);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Rotas privadas (auth gate)
    '/dashboard/:path*',
    '/forge/:path*',
    '/inbox/:path*',
    '/agent/:path*',
    '/whatsapp/:path*',
    '/contacts/:path*',
    '/knowledge/:path*',
    '/team/:path*',
    '/settings/:path*',
    '/automations/:path*',
    '/analytics/:path*',
    '/integrations/:path*',
    '/billing/:path*',
    '/products/:path*',
    '/professionals/:path*',
    '/coupons/:path*',
    '/orders/:path*',
    '/appointments/:path*',
    '/quotes/:path*',
    '/developer/:path*',
    // Rate-limit em auth endpoints
    '/api/auth/sign-in/:path*',
    '/api/auth/sign-up/:path*',
    '/api/auth/forget-password/:path*',
    '/api/auth/reset-password/:path*',
    '/api/auth/magic-link/:path*',
  ],
};
