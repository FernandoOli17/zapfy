import 'server-only';

import { prisma, PlanId as DbPlanId } from '@zapfy/db';
import {
  PLANS,
  PlanLimitError,
  isAgentServingStatus,
  planLimitState,
  requiredPlanForFeature,
  type PlanFeature,
  type PlanId,
} from '@zapfy/shared';

type SubStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'UNPAID' | 'INCOMPLETE';

/**
 * Resolve features ativas no workspace baseado no plano da Subscription.
 * Sem trial: workspace recém-criado fica `INCOMPLETE` (Forge monta/demonstra,
 * mas o agente só atende quando a assinatura vira `ACTIVE`).
 */
export async function getWorkspacePlan(workspaceId: string): Promise<{
  plan: PlanId;
  features: PlanFeature;
  status: SubStatus;
}> {
  const sub = await prisma.subscription.findUnique({ where: { workspaceId } });
  const plan: PlanId = (sub?.plan as PlanId | undefined) ?? 'STARTER';
  return {
    plan,
    features: PLANS[plan],
    status: (sub?.status as SubStatus | undefined) ?? 'INCOMPLETE',
  };
}

/** True se o agente do workspace pode atender no WhatsApp (assinatura paga viva). */
export async function isAgentServingEnabled(workspaceId: string): Promise<boolean> {
  const { status } = await getWorkspacePlan(workspaceId);
  return isAgentServingStatus(status);
}

/** Início do ciclo de cobrança corrente (período Stripe ou janela fallback). */
async function cycleStart(workspaceId: string): Promise<Date> {
  const { AI_CONVERSATION_WINDOW_DAYS } = await import('@zapfy/shared');
  const sub = await prisma.subscription.findUnique({
    where: { workspaceId },
    select: { currentPeriodStart: true },
  });
  return (
    sub?.currentPeriodStart ??
    new Date(Date.now() - AI_CONVERSATION_WINDOW_DAYS * 24 * 60 * 60 * 1000)
  );
}

/**
 * Conversas de IA no ciclo corrente.
 *
 * 1 conversa = uma `Conversation` distinta que teve ≥1 mensagem `fromAi` no
 * ciclo. É a unidade de cobrança dos planos (1.500 Starter / 6.000 Pro / ∞).
 */
export async function countAiConversationsThisCycle(workspaceId: string): Promise<number> {
  const since = await cycleStart(workspaceId);
  const rows = await prisma.message.findMany({
    where: { workspaceId, fromAi: true, createdAt: { gte: since } },
    distinct: ['conversationId'],
    select: { conversationId: true },
  });
  return rows.length;
}

/**
 * Broadcasts disparados no ciclo do mês corrente.
 * Cada `Broadcast` conta 1 vez, independente do número de destinatários.
 */
export async function countBroadcastsThisCycle(workspaceId: string): Promise<number> {
  const since = await cycleStart(workspaceId);
  return prisma.broadcast.count({
    where: { workspaceId, createdAt: { gte: since } },
  });
}

/**
 * Conversas de IA por dia nos últimos N dias. Pra sparkline da /billing.
 * Cada bucket conta conversas distintas que tiveram ≥1 mensagem `fromAi`
 * naquele dia (não acumulado — é dia-a-dia).
 */
export async function dailyAiConversationsLastDays(
  workspaceId: string,
  days: number,
): Promise<Array<{ label: string; value: number }>> {
  // Bucket, range e label na MESMA referência: fuso de Brasília (-03:00 fixo,
  // sem DST desde 2019). Antes a chave era data UTC e o label data local —
  // conversa das 21h+ caía no dia seguinte (e no último dia, fora do gráfico).
  const DAY_MS = 86_400_000;
  const BRT_OFFSET_MS = 3 * 3_600_000;
  const dayKeyBrt = (d: Date) => new Date(d.getTime() - BRT_OFFSET_MS).toISOString().slice(0, 10);

  const todayStart = new Date(`${dayKeyBrt(new Date())}T00:00:00.000-03:00`);
  const since = new Date(todayStart.getTime() - (days - 1) * DAY_MS);

  const rows = await prisma.message.findMany({
    where: { workspaceId, fromAi: true, createdAt: { gte: since } },
    select: { createdAt: true, conversationId: true },
  });

  const buckets = new Map<string, Set<string>>();
  for (let i = 0; i < days; i++) {
    buckets.set(dayKeyBrt(new Date(since.getTime() + i * DAY_MS)), new Set());
  }
  for (const r of rows) {
    const set = buckets.get(dayKeyBrt(r.createdAt));
    if (set) set.add(r.conversationId);
  }

  return Array.from(buckets.entries()).map(([k, set]) => ({
    // k é YYYY-MM-DD já no calendário BRT — label direto das partes.
    label: `${k.slice(8, 10)}/${k.slice(5, 7)}`,
    value: set.size,
  }));
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
  // Menor plano que habilita a feature (fallback BUSINESS).
  const requiredPlan: PlanId = requiredPlanForFeature(feature) ?? 'BUSINESS';
  return {
    ok: false,
    plan,
    requiredPlan,
    error: `${feature} disponível no plano ${requiredPlan} ou superior. Você está no ${plan}.`,
  };
}

/** Verifica limites numéricos (numbers, seats, docs, aiConversations). */
export async function assertPlanLimit(
  workspaceId: string,
  feature:
    | 'whatsappNumbers'
    | 'teamSeats'
    | 'knowledgeDocs'
    | 'aiConversations',
  currentCount: number,
): Promise<void> {
  const { features, plan } = await getWorkspacePlan(workspaceId);
  const max = features[feature];
  if (planLimitState(max, currentCount).over) {
    throw new PlanLimitError(`${feature} limite ${max} (plano ${plan})`);
  }
}

export { DbPlanId };
