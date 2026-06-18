import { AI_CONVERSATION_WINDOW_DAYS, PLANS, PLAN_IDS, type PlanId } from './constants';

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

/**
 * Início do ciclo de cobrança corrente pra contagem de conversas de IA.
 * Período Stripe quando existe; senão janela móvel de `AI_CONVERSATION_WINDOW_DAYS`.
 *
 * Pura (recebe o `currentPeriodStart` da Subscription e um relógio) pra poder
 * rodar tanto no web (server-only, via `apps/web/src/lib/plans.ts`) quanto no
 * worker sem arrastar `prisma`/`server-only` pra cá.
 */
export function aiConversationCycleStart(
  currentPeriodStart: Date | null | undefined,
  now: Date = new Date(),
): Date {
  return (
    currentPeriodStart ??
    new Date(now.getTime() - AI_CONVERSATION_WINDOW_DAYS * 24 * 60 * 60 * 1000)
  );
}

/** Decisão do gate de conversas de IA antes de responder com o agente. */
export type AiConversationGate = {
  /** Estado do limite numérico (mesma forma de `planLimitState`). */
  state: LimitState;
  /**
   * `true` quando o agente NÃO deve responder com IA neste turno (limite
   * estourado e a conversa atual ainda não é cobrável). Comportamento de corte
   * seco — zona vermelha: na dúvida, bloqueia (falha-fechada).
   */
  blocked: boolean;
};

/**
 * Aplica o limite de conversas de IA do plano (unidade de cobrança).
 *
 * Regras (ADR-0002):
 * - Plano ilimitado (BUSINESS) nunca bloqueia.
 * - Se a `Conversation` atual JÁ é cobrável neste ciclo (já teve ≥1 `fromAi`),
 *   responder de novo NÃO incrementa a contagem → nunca bloqueia (não deixa o
 *   cliente no vácuo no meio de uma conversa já paga).
 * - Caso contrário, bloqueia quando `usedConversations >= limite` — abrir uma
 *   conversa NOVA estouraria o pacote. Bloqueio suave: handoff + não cobra.
 *
 * @param limit              `PLANS[plan].aiConversations`
 * @param usedConversations  conversas distintas com ≥1 `fromAi` no ciclo
 * @param currentConvCounts  a conversa atual já conta como cobrável no ciclo?
 */
export function aiConversationGate(
  limit: number | 'unlimited',
  usedConversations: number,
  currentConvCounts: boolean,
): AiConversationGate {
  const state = planLimitState(limit, usedConversations);
  const blocked = state.over && !currentConvCounts;
  return { state, blocked };
}
