import 'server-only';

import { PostHog } from 'posthog-node';
import { createLogger } from '@zapai/shared';

const log = createLogger('posthog');

/**
 * PostHog server client com graceful fallback.
 *
 * Sem `NEXT_PUBLIC_POSTHOG_KEY` configurado, `capture()` é no-op — útil em dev
 * e em testes sem ruido. Em prod com key, envia events em batch (5s flush).
 *
 * IMPORTANTE: não passa dados de PII (telefone, email) direto — usa userId
 * (cuid) ou workspaceId. Veja `analytics.ts` pra os event names canônicos.
 */
let cached: PostHog | null = null;
let warned = false;

function getKey(): string | null {
  return process.env['NEXT_PUBLIC_POSTHOG_KEY'] ?? null;
}

export function getPosthogServer(): PostHog | null {
  if (cached) return cached;
  const key = getKey();
  if (!key) {
    if (!warned) {
      log.info('NEXT_PUBLIC_POSTHOG_KEY não configurada — analytics em modo no-op');
      warned = true;
    }
    return null;
  }
  cached = new PostHog(key, {
    host: process.env['NEXT_PUBLIC_POSTHOG_HOST'] ?? 'https://app.posthog.com',
    flushAt: 10,
    flushInterval: 5000,
  });
  return cached;
}

/** Captura um event. No-op se PostHog não configurado. */
export function captureEvent(input: {
  event: string;
  distinctId: string; // userId ou workspaceId
  properties?: Record<string, unknown>;
  workspaceId?: string;
}): void {
  const ph = getPosthogServer();
  if (!ph) return;
  ph.capture({
    distinctId: input.distinctId,
    event: input.event,
    properties: {
      ...input.properties,
      ...(input.workspaceId && { workspace_id: input.workspaceId }),
      $process_person_profile: false, // server events: sem perfil pessoal por default
    },
  });
}

/** Identifica usuário (1x no login/signup) com workspace metadata. */
export function identifyUser(input: {
  userId: string;
  workspaceId?: string;
  plan?: string;
  createdAt?: Date;
}): void {
  const ph = getPosthogServer();
  if (!ph) return;
  ph.identify({
    distinctId: input.userId,
    properties: {
      ...(input.workspaceId && { workspace_id: input.workspaceId }),
      ...(input.plan && { plan: input.plan }),
      ...(input.createdAt && { created_at: input.createdAt.toISOString() }),
    },
  });
}

/** Flush pendente — chamar no shutdown gracioso ou em testes. */
export async function flushPosthog(): Promise<void> {
  if (cached) await cached.shutdown();
}
