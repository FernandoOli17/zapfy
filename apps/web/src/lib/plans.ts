import 'server-only';

import { prisma, PlanId as DbPlanId } from '@zapai/db';
import { PLANS, PlanLimitError, type PlanFeature, type PlanId } from '@zapai/shared';

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
