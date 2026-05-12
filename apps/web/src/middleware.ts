import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

export function middleware(req: NextRequest) {
  const sessionCookie = getSessionCookie(req);

  if (!sessionCookie) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
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
  ],
};
