/**
 * Enforcement do limite de conversas de IA (unidade de cobrança — ADR-0002).
 *
 * O gate de assinatura (process-message) só checa STATUS; o LIMITE numérico do
 * plano nunca era aplicado, então STARTER consumia conversas ilimitadas ao custo
 * de tokens da casa (TASK-0024 / ERR-0002). Aqui contamos as conversas de IA do
 * ciclo e decidimos se este turno pode ser respondido pela IA.
 *
 * Zona vermelha — dinheiro: na dúvida bloqueia (falha-fechada), nunca cobra a
 * mais nem atende de graça acima do pacote. Plano ilimitado (BUSINESS) nunca
 * bloqueia. A notificação ao owner é best-effort e NUNCA propaga (não atrasa nem
 * derruba o caminho da resposta).
 */
import { prisma } from '@zapfy/db';
import {
  PLANS,
  aiConversationCycleStart,
  aiConversationGate,
  createLogger,
  type PlanId,
} from '@zapfy/shared';
import { Resend } from 'resend';

import { env } from '../env';

const log = createLogger('worker:ai-conversation-limit');

const APP_URL = env.NEXT_PUBLIC_APP_URL ?? 'https://trato.dev';

export type AiLimitDecision = {
  /** `true` → não responder com IA neste turno (limite estourado, conversa nova). */
  blocked: boolean;
  used: number;
  limit: number | 'unlimited';
  pct: number;
  plan: PlanId;
};

/**
 * Conta conversas distintas com ≥1 `fromAi` no ciclo e decide o gate.
 *
 * `plan`/`currentPeriodStart` vêm da Subscription já carregada em process-message
 * (evita um round-trip a mais). A contagem de `fromAi` e o check da conversa
 * atual são duas queries enxutas (`distinct` / `findFirst`).
 */
export async function evaluateAiConversationLimit(input: {
  workspaceId: string;
  conversationId: string;
  plan: PlanId;
  currentPeriodStart: Date | null | undefined;
}): Promise<AiLimitDecision> {
  const { workspaceId, conversationId, plan, currentPeriodStart } = input;
  const limit = PLANS[plan].aiConversations;

  // Curto-circuito: plano ilimitado nunca bloqueia — nem toca o DB.
  if (limit === 'unlimited') {
    return { blocked: false, used: 0, limit, pct: 0, plan };
  }

  const since = aiConversationCycleStart(currentPeriodStart);

  const [aiConversations, currentConvHasAi] = await Promise.all([
    prisma.message.findMany({
      where: { workspaceId, fromAi: true, createdAt: { gte: since } },
      distinct: ['conversationId'],
      select: { conversationId: true },
    }),
    prisma.message.findFirst({
      where: { conversationId, fromAi: true, createdAt: { gte: since } },
      select: { id: true },
    }),
  ]);

  const used = aiConversations.length;
  const currentConvCounts = currentConvHasAi !== null;
  const { state, blocked } = aiConversationGate(limit, used, currentConvCounts);

  return { blocked, used, limit, pct: state.pct, plan };
}

let resendClient: Resend | null = null;
function getResend(): Resend | null {
  if (resendClient) return resendClient;
  if (!env.RESEND_API_KEY) return null;
  resendClient = new Resend(env.RESEND_API_KEY);
  return resendClient;
}

/**
 * Avisa o owner ao cruzar 80% / 100% do limite. Best-effort e idempotente por
 * ciclo: a chave do `EmailSent` carrega o início do ciclo (YYYY-MM-DD), então
 * cada ciclo de cobrança permite um novo aviso. NUNCA lança — falha só loga.
 */
export async function notifyOwnerOnLimit(input: {
  workspaceId: string;
  plan: PlanId;
  used: number;
  limit: number | 'unlimited';
  pct: number;
  currentPeriodStart: Date | null | undefined;
}): Promise<void> {
  try {
    const { workspaceId, plan, used, limit, pct } = input;
    if (limit === 'unlimited') return;

    const tier = pct >= 100 ? 100 : pct >= 80 ? 80 : null;
    if (tier === null) return;

    const cycleKey = aiConversationCycleStart(input.currentPeriodStart)
      .toISOString()
      .slice(0, 10);
    const templateKey = `ai_limit_${tier}_${cycleKey}`;

    const owner = await prisma.workspaceMember.findFirst({
      where: { workspaceId, role: 'OWNER' },
      include: { user: { select: { id: true, email: true, name: true } }, workspace: { select: { slug: true } } },
    });
    const user = owner?.user;
    if (!user?.email) return;

    const already = await prisma.emailSent.findUnique({
      where: { userId_templateKey: { userId: user.id, templateKey } },
    });
    if (already) return;

    const billingUrl = `${APP_URL.replace(/\/$/, '')}/billing`;
    const firstName = user.name?.split(' ')[0] ?? 'olá';
    const subject =
      tier === 100
        ? 'Você atingiu o limite de conversas de IA do seu plano'
        : 'Você usou 80% das conversas de IA do seu plano';
    const body =
      tier === 100
        ? `${firstName}, o workspace ${owner?.workspace?.slug ?? ''} atingiu ${used}/${limit} conversas de IA no ciclo (plano ${plan}). Novas conversas serão transferidas para atendimento humano até o próximo ciclo ou upgrade.`
        : `${firstName}, o workspace ${owner?.workspace?.slug ?? ''} já usou ${used}/${limit} conversas de IA no ciclo (plano ${plan}). Considere o upgrade pra não pausar o atendimento por IA.`;

    const resend = getResend();
    if (!resend) {
      log.info({ workspaceId, templateKey, to: user.email, subject }, '[email-dev] enviaria aviso de limite');
      await prisma.emailSent.create({ data: { userId: user.id, templateKey, resendId: 'dev-no-op' } });
      return;
    }

    const res = await resend.emails.send({
      from: env.RESEND_FROM_EMAIL ?? 'Trato <noreply@trato.dev>',
      to: [user.email],
      subject,
      html: `<p>${body}</p><p><a href="${billingUrl}">Ver planos →</a></p>`,
      text: `${body} ${billingUrl}`,
    });
    if (res.error) {
      log.error({ workspaceId, templateKey, err: res.error }, 'resend error — aviso de limite NÃO enviado');
      return;
    }
    await prisma.emailSent.create({
      data: { userId: user.id, templateKey, resendId: res.data?.id ?? null },
    });
    log.info({ workspaceId, templateKey, tier }, 'owner notificado sobre limite de conversas de IA');
  } catch (err) {
    // Best-effort: nunca derruba o turno por causa do aviso.
    log.warn({ workspaceId: input.workspaceId, err: String(err) }, 'notificação de limite falhou — ignorando');
  }
}
