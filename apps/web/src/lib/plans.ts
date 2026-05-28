import 'server-only';

import { prisma, PlanId as DbPlanId } from '@zapfy/db';
import { PLANS, PlanLimitError, type PlanFeature, type PlanId } from '@zapfy/shared';

/**
 * Resolve features ativas no workspace baseado no plano da Subscription.
 * Se workspace estiver em trial, considera as features do plano contratado
 * (no MVP trial sempre dá Starter level).
 */
export async function getWorkspacePlan(workspaceId: string): Promise<{
  plan: PlanId;
  features: PlanFeature;
  status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'UNPAID' | 'INCOMPLETE';
  trialEndsAt: Date | null;
}> {
  const sub = await prisma.subscription.findUnique({ where: { workspaceId } });
  const plan: PlanId = (sub?.plan as PlanId | undefined) ?? 'STARTER';
  return {
    plan,
    features: PLANS[plan],
    status: (sub?.status as 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'UNPAID' | 'INCOMPLETE' | undefined) ?? 'TRIALING',
    trialEndsAt: sub?.trialEndsAt ?? null,
  };
}

/**
 * Contatos únicos ativos nos últimos 30 dias.
 *
 * "Contato ativo" = enviou OU recebeu pelo menos uma mensagem nos últimos
 * `ACTIVE_CONTACT_WINDOW_DAYS` dias. Este é o novo limite de plano desde
 * 2026-05 — substituiu `aiConversations` por causa da mudança Meta jul/2025.
 */
export async function countActiveContactsThisCycle(workspaceId: string): Promise<number> {
  const { ACTIVE_CONTACT_WINDOW_DAYS } = await import('@zapfy/shared');
  const since = new Date(Date.now() - ACTIVE_CONTACT_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  // Conta contatos distintos que aparecem em Message dentro da janela.
  const rows = await prisma.message.findMany({
    where: {
      workspaceId,
      createdAt: { gte: since },
      conversation: { contactId: { not: '' } },
    },
    distinct: ['conversationId'],
    select: { conversation: { select: { contactId: true } } },
  });
  return new Set(rows.map((r) => r.conversation.contactId)).size;
}

/**
 * Broadcasts disparados no ciclo do mês corrente.
 * Cada `Broadcast` conta 1 vez, independente do número de destinatários.
 */
export async function countBroadcastsThisCycle(workspaceId: string): Promise<number> {
  const sub = await prisma.subscription.findUnique({ where: { workspaceId } });
  const since =
    sub?.currentPeriodStart ??
    (sub?.trialEndsAt
      ? new Date(sub.trialEndsAt.getTime() - 7 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

  return prisma.broadcast.count({
    where: { workspaceId, createdAt: { gte: since } },
  });
}

/**
 * Contatos ativos por dia nos últimos N dias. Pra sparkline da /billing.
 * Cada bucket conta contatos distintos que tiveram pelo menos 1 mensagem
 * naquele dia (não acumulado — é dia-a-dia).
 */
export async function dailyActiveContactsLastDays(
  workspaceId: string,
  days: number,
): Promise<Array<{ label: string; value: number }>> {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const rows = await prisma.message.findMany({
    where: { workspaceId, createdAt: { gte: since } },
    select: { createdAt: true, conversation: { select: { contactId: true } } },
  });

  const buckets = new Map<string, Set<string>>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    buckets.set(d.toISOString().slice(0, 10), new Set());
  }
  for (const r of rows) {
    const key = r.createdAt.toISOString().slice(0, 10);
    const set = buckets.get(key);
    if (set) set.add(r.conversation.contactId);
  }

  return Array.from(buckets.entries()).map(([k, set]) => {
    const d = new Date(k + 'T00:00:00');
    return {
      label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      value: set.size,
    };
  });
}

/**
 * Garante que o workspace pode usar a feature. Throw PlanLimitError se exceder.
 */
export async function assertPlanFeature(
  workspaceId: string,
  feature: 'customTools' | 'apiAccess',
): Promise<void> {
  const { features, plan } = await getWorkspacePlan(workspaceId);
  if (!features[feature]) {
    throw new PlanLimitError(`${feature} (plano ${plan})`);
  }
}

/**
 * Server-action / route handler gate por feature de plano.
 *
 * Uso:
 *   const gate = await requirePlan(workspaceId, 'customTools');
 *   if (!gate.ok) return { status: 'error', error: gate.error, upgradeRequired: gate.plan };
 *
 * UI deve detectar `upgradeRequired` e redirecionar pra `/billing?upgrade=customTools`.
 */
export async function requirePlan(
  workspaceId: string,
  feature: 'customTools' | 'apiAccess',
): Promise<
  | { ok: true; plan: PlanId }
  | { ok: false; plan: PlanId; error: string; requiredPlan: PlanId }
> {
  const { plan, features, status } = await getWorkspacePlan(workspaceId);
  if (features[feature]) {
    if (status === 'PAST_DUE' || status === 'CANCELED' || status === 'UNPAID') {
      return {
        ok: false,
        plan,
        requiredPlan: plan,
        error: `Sua assinatura está ${status.toLowerCase()}. Atualize o pagamento em /billing.`,
      };
    }
    return { ok: true, plan };
  }
  // Encontrar o menor plano que tem essa feature
  const requiredPlan: PlanId = PLANS.PRO[feature] ? 'PRO' : 'PREMIUM';
  return {
    ok: false,
    plan,
    requiredPlan,
    error: `${feature} disponível no plano ${requiredPlan} ou superior. Você está no ${plan}.`,
  };
}

/** Verifica limites numéricos (numbers, seats, docs, activeContacts, broadcasts). */
export async function assertPlanLimit(
  workspaceId: string,
  feature:
    | 'whatsappNumbers'
    | 'teamSeats'
    | 'knowledgeDocs'
    | 'activeContacts'
    | 'broadcasts',
  currentCount: number,
): Promise<void> {
  const { features, plan } = await getWorkspacePlan(workspaceId);
  const max = features[feature];
  if (max === 'unlimited') return;
  if (currentCount >= max) {
    throw new PlanLimitError(`${feature} limite ${max} (plano ${plan})`);
  }
}

export { DbPlanId };
