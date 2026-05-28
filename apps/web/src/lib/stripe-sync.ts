import 'server-only';

import { createLogger } from '@zapfy/shared';
import type { PlanId } from '@zapfy/shared';

import { getPriceIdForPlan, getStripeClient, isStripeMock } from '@/lib/stripe';

const log = createLogger('stripe-sync');

/**
 * Propaga uma mudança de plano feita no DB (e.g., via forceUpgradeWorkspace)
 * pra Stripe. Tenta atualizar o item da subscription pra o novo price ID.
 *
 * Retorna `true` se efetivamente sincronizou (ou se está em MOCK), `false`
 * em best-effort failure. NUNCA throw — o caller já gravou DB e ainda quer
 * o success path mesmo com Stripe transitoriamente fora.
 */
export async function syncStripeSubscription(input: {
  workspaceId: string;
  targetPlan: PlanId;
  stripeSubscriptionId: string | null;
}): Promise<boolean> {
  if (isStripeMock()) {
    log.info({ workspaceId: input.workspaceId, plan: input.targetPlan }, 'STRIPE_MOCK — skip sync');
    return true;
  }

  const stripe = getStripeClient();
  if (!stripe) {
    log.warn({ workspaceId: input.workspaceId }, 'Stripe não configurado — skip sync');
    return false;
  }

  if (!input.stripeSubscriptionId) {
    // Workspace ainda não tem subscription real no Stripe (e.g., gift inicial).
    // Não criamos subscription do zero aqui — seria sem método de pagamento.
    // Quando o owner abrir /billing e iniciar checkout, Stripe cria normalmente.
    log.info(
      { workspaceId: input.workspaceId },
      'Sem stripeSubscriptionId — DB-only, sync deferred',
    );
    return false;
  }

  const newPriceId = getPriceIdForPlan(input.targetPlan);
  if (!newPriceId) {
    log.warn(
      { workspaceId: input.workspaceId, plan: input.targetPlan },
      'Sem price ID configurado pra esse plano',
    );
    return false;
  }

  try {
    const sub = await stripe.subscriptions.retrieve(input.stripeSubscriptionId);
    const currentItem = sub.items.data[0];
    if (!currentItem) {
      log.warn({ subId: input.stripeSubscriptionId }, 'Subscription sem items — pulo');
      return false;
    }

    await stripe.subscriptions.update(input.stripeSubscriptionId, {
      items: [{ id: currentItem.id, price: newPriceId }],
      proration_behavior: 'none', // ação manual — sem proração (decisão admin)
      cancel_at_period_end: false,
    });

    log.info(
      { subId: input.stripeSubscriptionId, plan: input.targetPlan },
      'Stripe sub sincronizada',
    );
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(
      { subId: input.stripeSubscriptionId, err: msg },
      'Falhou sincronização com Stripe — DB já atualizado, audit recomenda re-sync manual',
    );
    return false;
  }
}
