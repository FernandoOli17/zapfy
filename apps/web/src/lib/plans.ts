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
 * Atual uso de Conversas IA no ciclo do mês corrente (ou desde início do trial).
 * Conta UsageRecord do tipo 'ai_message' agrupado por contato (1 contato = 1 conversa).
 */
export async function countAiConversationsThisCycle(workspaceId: string): Promise<number> {
  const sub = await prisma.subscription.findUnique({ where: { workspaceId } });
  const since =
    sub?.currentPeriodStart ??
    (sub?.trialEndsAt
      ? new Date(sub.trialEndsAt.getTime() - 7 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

  const rows = await prisma.usageRecord.findMany({
    where: { workspaceId, kind: 'ai_message', createdAt: { gte: since } },
    select: { metadata: true },
  });

  // contagem distinta de contactId nos metadados
  const contacts = new Set<string>();
  for (const r of rows) {
    const meta = r.metadata as Record<string, unknown> | null;
    const cid = meta && typeof meta['contactId'] === 'string' ? (meta['contactId'] as string) : null;
    if (cid) contacts.add(cid);
  }
  return contacts.size;
}

/**
 * Conversas IA por dia nos últimos N dias. Pra gráfico de uso na /billing.
 * Conta UsageRecord do tipo 'ai_message' agrupado por dia.
 */
export async function dailyConversationsLastDays(
  workspaceId: string,
  days: number,
): Promise<Array<{ label: string; value: number }>> {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const rows = await prisma.usageRecord.findMany({
    where: { workspaceId, kind: 'ai_message', createdAt: { gte: since } },
    select: { createdAt: true },
  });

  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const r of rows) {
    const key = r.createdAt.toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return Array.from(buckets.entries()).map(([k, v]) => {
    const d = new Date(k + 'T00:00:00');
    return {
      label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      value: v,
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

/** Verifica limites numéricos (numbers, seats, docs). */
export async function assertPlanLimit(
  workspaceId: string,
  feature: 'whatsappNumbers' | 'teamSeats' | 'knowledgeDocs' | 'aiConversations',
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
