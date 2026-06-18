import { tool, type Tool } from 'ai';
import { z } from 'zod';
import { prisma, type Prisma } from '@zapfy/db';
import { createLogger } from '@zapfy/shared';
import type { VerticalRuntimeDeps } from './runtime/types';

const log = createLogger('tools:infoproduct');

/**
 * Tools do vertical INFOPRODUCT (cursos, mentorias, ticket alto).
 * Foco: qualificar lead (BANT), responder objeção, agendar call de vendas.
 *
 * Calendly stubbed — caller pode configurar URL próprio no workspace settings.
 */

const BANT_SCORE_WEIGHTS = {
  budget: 0.30,
  authority: 0.20,
  need: 0.25,
  timeline: 0.25,
};

export function buildInfoproductTools(deps: VerticalRuntimeDeps): Record<string, Tool> {
  return {
    qualify_lead: tool({
      description:
        'Persiste qualificação BANT do lead (Budget, Authority, Need, Timeline). Cada campo 1-5 (1=baixo, 5=alto). Score agregado salvo em Contact.customFields pra closer humano usar depois.',
      inputSchema: z.object({
        budget: z.number().int().min(1).max(5).describe('1=sem orçamento, 5=tem dinheiro pronto'),
        authority: z.number().int().min(1).max(5).describe('1=não decide, 5=é o decisor'),
        need: z.number().int().min(1).max(5).describe('1=curioso, 5=problema doendo agora'),
        timeline: z.number().int().min(1).max(5).describe('1=sem prazo, 5=quer agora'),
        observations: z.string().max(500).optional(),
      }),
      execute: async ({ budget, authority, need, timeline, observations }) => {
        const score =
          budget * BANT_SCORE_WEIGHTS.budget +
          authority * BANT_SCORE_WEIGHTS.authority +
          need * BANT_SCORE_WEIGHTS.need +
          timeline * BANT_SCORE_WEIGHTS.timeline;
        const tier: 'A' | 'B' | 'C' | 'D' =
          score >= 4 ? 'A' : score >= 3 ? 'B' : score >= 2 ? 'C' : 'D';

        if (deps.contactId !== 'test-contact') {
          const contact = await prisma.contact.findUnique({
            where: { id: deps.contactId },
            select: { customFields: true },
          });
          const cf =
            contact?.customFields && typeof contact.customFields === 'object' && !Array.isArray(contact.customFields)
              ? (contact.customFields as Record<string, unknown>)
              : {};
          const newCf = {
            ...cf,
            bant: { budget, authority, need, timeline, score, tier, ...(observations ? { observations } : {}), updatedAt: new Date().toISOString() },
          };
          await prisma.contact.update({
            where: { id: deps.contactId },
            data: { customFields: newCf as Prisma.InputJsonValue },
          });
        }

        log.info(
          { workspaceId: deps.workspaceId, contactId: deps.contactId, tier, score: score.toFixed(2) },
          'lead qualificado',
        );

        return {
          ok: true as const,
          score: Number(score.toFixed(2)),
          tier,
          message:
            tier === 'A'
              ? 'Lead quente — agende call com closer imediatamente'
              : tier === 'B'
                ? 'Lead morno — nutrir com conteúdo + agendar call em 1-2 dias'
                : tier === 'C'
                  ? 'Lead frio — manter na sequência de conteúdo, follow-up em 1 semana'
                  : 'Não é o momento — desqualifica gentilmente',
        };
      },
    }),

    send_sales_page: tool({
      description:
        'Envia a página de vendas do workspace. Use depois de qualificar e o lead pedir "me manda o link". A URL vem da configuração do workspace — você NÃO fornece a URL e NÃO deve inventar nenhum link.',
      // Sem `salesPageUrl` no input: a URL antes vinha do PRÓPRIO modelo e podia
      // ser um domínio alucinado mandado pro lead. A fonte real (config do
      // workspace) ainda não existe — ver notes/PLAN.md. Até existir, a tool
      // degrada honesto em vez de confiar no que o LLM "acha" que é a URL.
      inputSchema: z.object({
        campaign: z.string().max(40).default('chat').describe('Campanha pro UTM, ex: blackfriday, lancamento'),
      }),
      execute: async () => {
        return {
          ok: false as const,
          reason: 'sales_page_not_configured' as const,
          error:
            'Página de vendas não está configurada no workspace. Não invente nem mande nenhum link: explique pro lead os próximos passos por aqui ou diga que vai chamar alguém do time pra mandar o link oficial.',
        };
      },
    }),

    schedule_call: tool({
      description:
        'Agenda call de vendas com closer. A URL de agendamento vem da configuração do workspace — você NÃO fornece a URL e NÃO deve inventar nenhum link. Use SÓ pra leads tier A ou B.',
      // Sem `calendlyUrl` no input pelo mesmo motivo do send_sales_page: a URL
      // vinha do modelo e podia ser inventada. Sem fonte de config real, degrada
      // honesto pra handoff em vez de mandar um Calendly alucinado pro lead.
      inputSchema: z.object({
        preferredWeekday: z.enum(['mon', 'tue', 'wed', 'thu', 'fri']).optional(),
      }),
      execute: async () => {
        return {
          ok: false as const,
          reason: 'scheduling_not_configured' as const,
          error:
            'Agendamento de call não está configurado no workspace. Não invente link: combine um horário por aqui mesmo ou avise que alguém do time vai mandar o link oficial pra marcar.',
        };
      },
    }),

    send_objection_handler: tool({
      description:
        'Retorna uma resposta pronta pra uma objeção comum (preço/tempo/desconfiança/timing). Caller pode adaptar o texto. NÃO use pra inventar — busca em respostas catalogadas.',
      inputSchema: z.object({
        objectionType: z.enum(['price', 'time', 'trust', 'timing', 'spouse', 'discount']),
      }),
      execute: async ({ objectionType }) => {
        const playbook: Record<string, string> = {
          price: `"Eu entendo. Pensa assim: o curso custa R$X uma vez. Quanto vale resolver esse problema [Y] que você tá lidando todo mês? Em quanto tempo o resultado paga o investimento? Se ainda fica apertado, dá pra parcelar."`,
          time: `"Cara, é honesto: se você não tem 4-6h por semana, melhor não comprar agora. Mas se sobrarem 30min/dia, em 90 dias você sai com [resultado X]. O que parece mais real pra sua rotina?"`,
          trust: `"Faz sentido a desconfiança. Te mando 3 alunos que começaram do zero e tiveram resultado — você fala com eles direto, sem intermediário. Topa?"`,
          timing: `"Beleza, sem pressão. Posso te mandar 1 conteúdo grátis por semana? Quando achar que é o momento, a gente conversa de novo."`,
          spouse: `"Faz sentido alinhar. Te mando um material de 1 página pra você mostrar pro [marido/esposa]: o que é, valor e o resultado esperado. Posso?"`,
          discount: `"Não trabalho com desconto fora do tabelado — quem comprou pelo preço cheio iria ficar puto. Mas posso te oferecer um bônus exclusivo: [bônus X]. Funciona?"`,
        };
        return {
          ok: true as const,
          script: playbook[objectionType] ?? 'Sem script catalogado pra essa objeção',
          tip: 'Adapte o texto ao tom da conversa. Não cole literal.',
        };
      },
    }),
  };
}
