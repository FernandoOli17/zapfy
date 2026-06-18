import type Stripe from 'stripe';
import { PlanId, SubscriptionStatus } from '@zapfy/db';

import { planIdFromStripePrice } from '@/lib/stripe';

/**
 * Mapeia o status da Subscription do Stripe pro enum do DB.
 *
 * `paused` → UNPAID (não PAST_DUE): paused bloqueia atendimento e é recuperável
 * quando o pagamento volta. PAST_DUE deixaria o agente atendendo de graça
 * indefinidamente (BI-A8).
 */
export const STATUS_MAP: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
  trialing: SubscriptionStatus.TRIALING,
  active: SubscriptionStatus.ACTIVE,
  past_due: SubscriptionStatus.PAST_DUE,
  canceled: SubscriptionStatus.CANCELED,
  unpaid: SubscriptionStatus.UNPAID,
  incomplete: SubscriptionStatus.INCOMPLETE,
  incomplete_expired: SubscriptionStatus.CANCELED,
  paused: SubscriptionStatus.UNPAID,
};

/**
 * Mapeia um Stripe price id pro PlanId do DB. Retorna `null` se o price não for
 * um dos nossos (env STRIPE_PRICE_* faltando/divergente) — o caller decide o que
 * fazer, mas NUNCA rebaixar pra STARTER em silêncio (BI-A7).
 */
export function mapPriceToDbPlan(priceId: string): PlanId | null {
  const id = planIdFromStripePrice(priceId);
  if (id === 'STARTER') return PlanId.STARTER;
  if (id === 'PRO') return PlanId.PRO;
  if (id === 'BUSINESS') return PlanId.BUSINESS;
  return null;
}
