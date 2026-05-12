import { tool, type Tool } from 'ai';
import { z } from 'zod';

import {
  FORGE_PHASE_IDS,
  VERTICAL_IDS,
  handoffRulesSchema,
  knowledgeItemSchema,
  personalitySchema,
  type ForgeAnswers,
  type ForgePhaseId,
  type KnowledgeItem,
} from './types';

/**
 * Dependências que a engine injeta nas tools. Mantém side-effects fora de packages/ai.
 *
 * IMPORTANTE: implementações dessas callbacks devem operar sobre uma ref viva
 * de answers/state (closure-based), pq vários tool-calls podem rodar em sequência
 * num único step do LLM.
 */
export interface ForgeToolDeps {
  /** Merge raso no answers (overwrite por campo). Pra arrays append use callbacks específicos. */
  setAnswer: (patch: Partial<ForgeAnswers>) => void;
  /** Append em answers.knowledge. */
  appendKnowledge: (item: KnowledgeItem) => void;
  /** Anota intenção de mudar de fase. Engine confirma no fim do step. */
  setNextPhase: (phase: ForgePhaseId) => void;
  /** IO: faz fetch da URL e retorna título + texto extraído. */
  scrapeUrl: (url: string) => Promise<{ title: string; excerpt: string }>;
  /** IO: roda meta-prompt sobre os answers atuais e retorna o system prompt. */
  generateSystemPrompt: () => Promise<string>;
  /** IO: aplica patch natural language no system prompt atual e retorna a versão revisada. */
  refineSystemPrompt: (instruction: string) => Promise<string>;
  /** IO: publica AgentVersion no DB usando o systemPromptDraft atual. */
  publishAgentVersion: (input: {
    agentName: string;
  }) => Promise<{ agentId: string; versionNumber: number }>;
  /** Catálogo declarativo de tools por vertical. */
  suggestToolsForVertical: (
    vertical: string,
  ) => Promise<Array<{ name: string; description: string; recommendedActive: boolean }>>;
}

export function createForgeTools(deps: ForgeToolDeps): Record<string, Tool> {
  return {
    set_business_info: tool({
      description:
        'Persiste a descrição do negócio coletada em DISCOVERY: o que faz, marca, site.',
      inputSchema: z.object({
        description: z.string().min(8).describe('Em uma frase, o que a empresa faz/vende.'),
        brandName: z.string().optional().describe('Nome da marca/empresa.'),
        website: z.string().optional().describe('URL do site se mencionado.'),
      }),
      execute: async ({ description, brandName, website }) => {
        deps.setAnswer({
          business: {
            description,
            ...(brandName ? { brandName } : {}),
            ...(website ? { website } : {}),
          },
        });
        return { ok: true };
      },
    }),

    classify_business_vertical: tool({
      description:
        'Classifica o negócio em um dos 6 verticais (ECOMMERCE, CLINIC, RESTAURANT, INFOPRODUCT, SERVICE, OTHER). Use só quando tiver >95% certeza após DISCOVERY.',
      inputSchema: z.object({
        vertical: z.enum(VERTICAL_IDS),
        reason: z.string().describe('Justificativa curta da classificação.'),
      }),
      execute: async ({ vertical, reason }) => {
        deps.setAnswer({ vertical, verticalReason: reason });
        return { ok: true, vertical };
      },
    }),

    set_goals: tool({
      description: 'Persiste os objetivos do agente (2 a 4 frases curtas, em pt-BR).',
      inputSchema: z.object({
        goals: z.array(z.string().min(3)).min(1).max(6),
      }),
      execute: async ({ goals }) => {
        deps.setAnswer({ goals });
        return { ok: true };
      },
    }),

    set_tone: tool({
      description: 'Persiste a personalidade/tom do agente.',
      inputSchema: personalitySchema,
      execute: async (tone) => {
        deps.setAnswer({ tone });
        return { ok: true };
      },
    }),

    scrape_url: tool({
      description:
        'Faz fetch de uma URL pública do cliente (site, FAQ, catálogo) e retorna título + excerpt resumido.',
      inputSchema: z.object({
        url: z.string().url(),
      }),
      execute: async ({ url }) => {
        return deps.scrapeUrl(url);
      },
    }),

    add_knowledge_item: tool({
      description: 'Adiciona um item à base de conhecimento que será usada pelo RAG.',
      inputSchema: knowledgeItemSchema,
      execute: async (item) => {
        deps.appendKnowledge(item);
        return { ok: true };
      },
    }),

    suggest_tools_for_vertical: tool({
      description:
        'Retorna a lista canônica de tools que costuma ser ativada nesse vertical, com sugestão de quais ligar por default.',
      inputSchema: z.object({
        vertical: z.enum(VERTICAL_IDS),
      }),
      execute: async ({ vertical }) => {
        const tools = await deps.suggestToolsForVertical(vertical);
        return { tools };
      },
    }),

    set_tools: tool({
      description:
        'Define a lista final de tools ativas no agente (subset das sugeridas + globais).',
      inputSchema: z.object({
        tools: z.array(z.string()).min(1),
      }),
      execute: async ({ tools }) => {
        deps.setAnswer({ tools });
        return { ok: true };
      },
    }),

    set_handoff_rules: tool({
      description: 'Define quando o agente passa pra humano (palavras-chave, condições, horário).',
      inputSchema: handoffRulesSchema,
      execute: async (handoff) => {
        deps.setAnswer({ handoff });
        return { ok: true };
      },
    }),

    generate_system_prompt: tool({
      description:
        'Gera o system prompt completo do agente a partir do estado atual de answers. Chame na fase REVIEW antes de mostrar pro cliente.',
      inputSchema: z.object({}),
      execute: async () => {
        const draft = await deps.generateSystemPrompt();
        deps.setAnswer({ systemPromptDraft: draft });
        return {
          ok: true,
          preview: draft.slice(0, 240) + (draft.length > 240 ? '…' : ''),
        };
      },
    }),

    refine_system_prompt: tool({
      description:
        'Aplica uma mudança em linguagem natural no system prompt atual e devolve a versão revisada (diff-style). Use em REVIEW e em REFINEMENT.',
      inputSchema: z.object({
        instruction: z
          .string()
          .min(5)
          .describe('Instrução em pt-BR, ex: "deixa menos vendedora", "nunca prometa frete grátis".'),
      }),
      execute: async ({ instruction }) => {
        const draft = await deps.refineSystemPrompt(instruction);
        deps.setAnswer({ systemPromptDraft: draft });
        return {
          ok: true,
          preview: draft.slice(0, 240) + (draft.length > 240 ? '…' : ''),
        };
      },
    }),

    publish_agent_version: tool({
      description:
        'Persiste o agente como nova AgentVersion (active=true). Use só em PUBLISH, após cliente aprovar.',
      inputSchema: z.object({
        agentName: z.string().min(2),
      }),
      execute: async ({ agentName }) => {
        const result = await deps.publishAgentVersion({ agentName });
        deps.setAnswer({ agentName });
        return { ok: true, ...result };
      },
    }),

    advance_phase: tool({
      description:
        'Avança pra próxima fase do Forge. Use quando tiver coletado tudo da fase atual. NÃO peça permissão ao cliente, só chame.',
      inputSchema: z.object({
        to: z.enum(FORGE_PHASE_IDS),
      }),
      execute: async ({ to }) => {
        deps.setNextPhase(to);
        return { ok: true, newPhase: to };
      },
    }),
  };
}

/** Quais tools estão disponíveis em cada fase (filtro). */
export const PHASE_TOOLS: Record<ForgePhaseId, string[]> = {
  DISCOVERY: ['set_business_info', 'advance_phase'],
  VERTICAL_DETECTION: ['classify_business_vertical', 'advance_phase'],
  GOALS: ['set_goals', 'advance_phase'],
  TONE: ['set_tone', 'advance_phase'],
  KNOWLEDGE: ['scrape_url', 'add_knowledge_item', 'advance_phase'],
  TOOLS: ['suggest_tools_for_vertical', 'set_tools', 'advance_phase'],
  HANDOFF: ['set_handoff_rules', 'advance_phase'],
  REVIEW: ['generate_system_prompt', 'refine_system_prompt', 'advance_phase'],
  PUBLISH: ['publish_agent_version'],
  REFINEMENT: ['refine_system_prompt'],
};

export function pickToolsForPhase(
  all: Record<string, Tool>,
  phase: ForgePhaseId,
): Record<string, Tool> {
  const allowed = PHASE_TOOLS[phase];
  const out: Record<string, Tool> = {};
  for (const name of allowed) {
    const t = all[name];
    if (t) out[name] = t;
  }
  return out;
}
