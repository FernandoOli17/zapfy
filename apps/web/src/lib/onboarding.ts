import 'server-only';

import { prisma } from '@zapfy/db';
import { createLogger } from '@zapfy/shared';

const log = createLogger('onboarding');

export type OnboardingStepId = 'forge' | 'simulator' | 'plan' | 'whatsapp' | 'first-reply';

export interface OnboardingStep {
  id: OnboardingStepId;
  title: string;
  description: string;
  href: string;
  done: boolean;
}

export interface OnboardingProgress {
  steps: OnboardingStep[];
  completedCount: number;
  complete: boolean;
  /** Primeiro passo não concluído (null quando complete). */
  next: OnboardingStep | null;
}

export interface OnboardingInputs {
  hasPublishedAgent: boolean;
  hasTestedAgent: boolean;
  hasActivePlan: boolean;
  hasWhatsAppConnected: boolean;
  hasFirstRealReply: boolean;
}

/**
 * Derivador PURO (testável sem DB): monta os 5 passos "valor antes de pagar"
 * a partir de booleans. Ordem fixa; passos feitos fora de ordem contam normal.
 */
export function deriveOnboardingSteps(inputs: OnboardingInputs): OnboardingProgress {
  const steps: OnboardingStep[] = [
    {
      id: 'forge',
      title: 'Montar seu agente no Forge',
      description: 'Responde 4 perguntas e a IA nasce configurada. ~3 min.',
      href: '/forge',
      done: inputs.hasPublishedAgent,
    },
    {
      id: 'simulator',
      title: 'Ver a IA funcionando',
      description: 'Converse com seu agente no simulador — é assim que seus clientes serão atendidos.',
      href: '/agent',
      done: inputs.hasTestedAgent,
    },
    {
      id: 'plan',
      title: 'Ativar seu plano',
      description: 'Garantia de 7 dias. Sem plano, o agente não atende no WhatsApp.',
      href: '/billing',
      done: inputs.hasActivePlan,
    },
    {
      id: 'whatsapp',
      title: 'Conectar seu WhatsApp',
      description: 'Guia passo a passo pra ligar seu número da Meta.',
      href: '/whatsapp',
      done: inputs.hasWhatsAppConnected,
    },
    {
      id: 'first-reply',
      title: 'Primeira conversa real',
      description: 'Mande uma mensagem de teste e veja a IA responder no WhatsApp.',
      href: '/whatsapp',
      done: inputs.hasFirstRealReply,
    },
  ];
  const completedCount = steps.filter((s) => s.done).length;
  return {
    steps,
    completedCount,
    complete: completedCount === steps.length,
    next: steps.find((s) => !s.done) ?? null,
  };
}

/**
 * Junta as queries (todas baratas, indexadas por workspaceId) e deriva.
 * Falha → retorna null e loga: o dashboard NUNCA quebra por causa do card.
 */
export async function getOnboardingProgress(
  workspaceId: string,
): Promise<OnboardingProgress | null> {
  try {
    const [publishedAgent, tested, sub, waConnected, firstReply] = await Promise.all([
      prisma.agent.findFirst({
        where: { workspaceId, currentVersionId: { not: null } },
        select: { id: true },
      }),
      prisma.auditLog.findFirst({
        where: { workspaceId, action: 'agent.test' },
        select: { id: true },
      }),
      prisma.subscription.findFirst({
        where: { workspaceId },
        select: { status: true },
      }),
      prisma.whatsAppAccount.findFirst({
        where: { workspaceId, status: 'CONNECTED' },
        select: { id: true },
      }),
      prisma.message.findFirst({
        where: {
          workspaceId,
          direction: 'OUTBOUND',
          fromAi: true,
          whatsappMessageId: { not: null },
        },
        select: { id: true },
      }),
    ]);
    return deriveOnboardingSteps({
      hasPublishedAgent: Boolean(publishedAgent),
      hasTestedAgent: Boolean(tested),
      hasActivePlan: sub?.status === 'ACTIVE' || sub?.status === 'PAST_DUE',
      hasWhatsAppConnected: Boolean(waConnected),
      hasFirstRealReply: Boolean(firstReply),
    });
  } catch (err) {
    log.error({ workspaceId, err: String(err) }, 'getOnboardingProgress falhou — card omitido');
    return null;
  }
}
