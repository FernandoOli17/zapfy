import { config as loadDotenv } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

// Em monorepo, Next so carrega .env da pasta da app por padrao.
// Aqui forcamos load do .env da raiz (../../.env) ANTES do Next inicializar,
// pra todos os modulos (Better Auth, @zapfy/db, etc.) verem as vars.
const here = dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: resolve(here, '../../.env'), override: false });

const isProd = process.env['NODE_ENV'] === 'production';

/**
 * Content-Security-Policy.
 *
 * Notas:
 *  - 'unsafe-inline' / 'unsafe-eval' em script-src são necessários pro Next.js
 *    (inline runtime scripts) e pra Pusher injetar SDK. Mitigado por outras camadas.
 *  - connect-src libera APIs que o client precisa chamar: própria origem +
 *    Pusher (wss://) + Sentry (se ativo) + PostHog (se ativo).
 *  - img-src libera https: (logos de marca, gravatar) + data: (SVG inline).
 *  - frame-ancestors 'none' bloqueia clickjacking — ninguém pode iframe-ar.
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.pusher.com https://*.posthog.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: wss://*.pusher.com wss://ws-*.pusher.com https://*.posthog.com https://*.sentry.io https://o*.ingest.sentry.io",
  "media-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  ...(isProd ? ['upgrade-insecure-requests'] : []),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  ...(isProd
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
    : []),
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=(), interest-cohort=()',
  },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@zapfy/ui', '@zapfy/shared', '@zapfy/db'],
  /**
   * Pacotes que precisam ficar EXTERNAL no bundle serverless do Vercel.
   * Sem isso, Next.js bundleliza @prisma/client + adapter e o adapter
   * é perdido em runtime — Prisma cai pro binary engine que NÃO está
   * disponível no Lambda Vercel. Resultado: "Query Engine not found".
   */
  serverExternalPackages: [
    '@prisma/client',
    '@prisma/adapter-neon',
    '@neondatabase/serverless',
    '.prisma/client',
  ],
  typedRoutes: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
      { protocol: 'https', hostname: 'utfs.io' },
    ],
  },
  // Hardening de headers HTTP — defesa contra XSS, clickjacking, MIME sniff,
  // protocol downgrade, e leak de Referer pra terceiros.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      // Webhooks recebem POST cross-origin (Meta/Stripe) — relaxa CORP.
      {
        source: '/api/webhooks/:path*',
        headers: [{ key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' }],
      },
    ];
  },
};

export default nextConfig;
