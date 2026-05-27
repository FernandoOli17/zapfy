// Inicialização cliente Sentry — carregado automaticamente pelo Next.js.
// Sem DSN, init no-op (graceful degrade).

import * as Sentry from '@sentry/nextjs';

const dsn = process.env['NEXT_PUBLIC_SENTRY_DSN'];

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env['NODE_ENV'] ?? 'development',
    tracesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.1 : 0,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0,
    integrations: [Sentry.replayIntegration({ maskAllText: false, blockAllMedia: true })],
    ignoreErrors: ['NEXT_NOT_FOUND', 'NEXT_REDIRECT', 'ResizeObserver loop'],
  });
}
