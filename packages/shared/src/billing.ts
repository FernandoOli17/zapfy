import { PLANS, PLAN_IDS, type PlanId } from './constants';

/** Status de assinatura (espelha o enum SubscriptionStatus do Prisma). */
export type SubscriptionStatus =
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'UNPAID'
  | 'INCOMPLETE';

/**
 * O agente pode atender no WhatsApp? Só com assinatura paga viva.
 * `PAST_DUE` tem graça (Stripe ainda re-tenta cobrar); o resto bloqueia.
 * Sem trial: `INCOMPLETE`/`TRIALING` NÃO atendem (Forge demonstra no app).
 */
export function isAgentServingStatus(status: SubscriptionStatus): boolean {
  return status === 'ACTIVE' || status === 'PAST_DUE';
}

export type LimitState = {
  unlimited: boolean;
  /** 0–100; 0 quando unlimited. */
  pct: number;
  /** true quando `used >= limit` (não pode mais criar). */
  over: boolean;
  /** quanto resta; null quando unlimited. */
  remaining: number | null;
};

/** Estado de um limite numérico de plano dado o uso atual. */
export function planLimitState(limit: number | 'unlimited', used: number): LimitState {
  if (limit === 'unlimited') {
    return { unlimited: true, pct: 0, over: false, remaining: null };
  }
  const pct = limit <= 0 ? 100 : Math.min(100, Math.round((used / limit) * 100));
  return {
    unlimited: false,
    pct,
    over: used >= limit,
    remaining: Math.max(0, limit - used),
  };
}

/** Menor plano (na ordem de PLAN_IDS) que habilita uma feature booleana. */
export function requiredPlanForFeature(feature: 'customTools' | 'apiAccess'): PlanId | null {
  return PLAN_IDS.find((p) => PLANS[p][feature]) ?? null;
}

/** Saldo de créditos de marketing cobre o número de destinatários? */
export function creditsSufficient(balance: number, needed: number): boolean {
  return balance >= needed && needed >= 0;
}
