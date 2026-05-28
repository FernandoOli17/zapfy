import 'server-only';

import Stripe from 'stripe';
import { createLogger } from '@zapfy/shared';
import type { PlanId } from '@zapfy/shared';

import { env } from '@/env';

const log = createLogger('stripe');

/**
 * Stripe client com graceful fallback + STRIPE_MOCK mode:
 *
 * - STRIPE_MOCK=true → `getStripeClient()` retorna null mesmo se houver key.
 *   Actions usam `isStripeMock()` pra trocar pra fluxo mockado (URLs fake,
 *   estado local). Útil pra dev e testes E2E sem cobrar.
 * - sem STRIPE_SECRET_KEY → mesma coisa: null + warning. Modo demo.
 * - com key + sem MOCK → cliente real.
 *
 * Toda função que chama Stripe checa `isStripeConfigured()` antes.
 */
let cached: Stripe | null = null;
let warned = false;

export function isStripeMock(): boolean {
  return process.env['STRIPE_MOCK'] === 'true';
}

export function getStripeClient(): Stripe | null {
  if (isStripeMock()) return null;
  if (cached) return cached;
  if (!env.STRIPE_SECRET_KEY) {
    if (!warned) {
      log.warn('STRIPE_SECRET_KEY não configurada — billing rodando em modo demo');
      warned = true;
    }
    return null;
  }
  cached = new Stripe(env.STRIPE_SECRET_KEY, {
    typescript: true,
    appInfo: { name: 'Trato', version: '0.1.0' },
  });
  return cached;
}

export function isStripeConfigured(): boolean {
  // Mock mode é "configurado" — funciona sem credencial real, mas funciona.
  return isStripeMock() || Boolean(env.STRIPE_SECRET_KEY);
}

/**
 * Mapeamento plano -> price ID configurado via env.
 * Plano sem priceId fica indisponível pra upgrade — UI mostra "indisponível".
 */
export function getPriceIdForPlan(plan: PlanId): string | null {
  if (plan === 'STARTER') return env.STRIPE_PRICE_STARTER ?? null;
  if (plan === 'PRO') return env.STRIPE_PRICE_PRO ?? null;
  if (plan === 'PREMIUM') return env.STRIPE_PRICE_PREMIUM ?? null;
  return null;
}

/** Mapeia um Stripe price id de volta pra PlanId, se for um dos nossos. */
export function planIdFromStripePrice(priceId: string): PlanId | null {
  if (priceId === env.STRIPE_PRICE_STARTER) return 'STARTER';
  if (priceId === env.STRIPE_PRICE_PRO) return 'PRO';
  if (priceId === env.STRIPE_PRICE_PREMIUM) return 'PREMIUM';
  return null;
}
