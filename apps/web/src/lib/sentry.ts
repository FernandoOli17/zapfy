import 'server-only';

import * as Sentry from '@sentry/nextjs';

import { env } from '@/env';

/**
 * Inicializa Sentry server-side com graceful fallback. Sem DSN, todas as
 * chamadas a captureException viram no-op. Idempotente.
 */
let initialized = false;

export function initSentry(): void {
  if (initialized) return;
  initialized = true;
  if (!env.SENTRY_DSN) return;
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 0,
    enabled: env.NODE_ENV !== 'test',
    ignoreErrors: [
      'NEXT_NOT_FOUND',
      'NEXT_REDIRECT',
    ],
  });
}

initSentry();

export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (!env.SENTRY_DSN) return;
  Sentry.captureException(err, context ? { extra: context } : undefined);
}

export function captureMessage(
  msg: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, unknown>,
): void {
  if (!env.SENTRY_DSN) return;
  Sentry.captureMessage(msg, {
    level,
    ...(context ? { extra: context } : {}),
  });
}

export function setSentryUser(
  userId: string | null,
  context?: { workspaceId?: string },
): void {
  if (!env.SENTRY_DSN) return;
  if (userId) {
    Sentry.setUser({ id: userId, ...(context?.workspaceId ? { workspaceId: context.workspaceId } : {}) });
  } else {
    Sentry.setUser(null);
  }
}
