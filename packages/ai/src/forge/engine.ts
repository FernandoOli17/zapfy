import { generateText, stepCountIs, type ModelMessage } from 'ai';
import { randomUUID } from 'node:crypto';

import { getAiModels } from '../provider';
import { systemMessage } from '../caching';

import { getPhaseSystemPrompt } from './prompts/phases';
import { generateSystemPrompt } from './generate';
import { createForgeTools, pickToolsForPhase, type ForgeToolDeps } from './tools';
import type {
  ForgeAnswers,
  ForgeMessage,
  ForgePhaseId,
  ForgeState,
  KnowledgeItem,
} from './types';

/**
 * Deps "IO" injetadas pelo caller (apps/web ou worker). Mantém DB, scraping
 * e publish fora de packages/ai pra evitar ciclo de dependências.
 */
export interface ForgeEngineIo {
  scrapeUrl: ForgeToolDeps['scrapeUrl'];
  publishAgentVersion: (input: {
    agentName: string;
    answers: ForgeAnswers;
    systemPrompt: string;
  }) => Promise<{ agentId: string; versionNumber: number }>;
  suggestToolsForVertical: ForgeToolDeps['suggestToolsForVertical'];
}

export interface RunForgeStepInput {
  state: ForgeState;
  userMessage: string;
  io: ForgeEngineIo;
  /** Limita iterações de tool calls em um único step. Default 6. */
  maxSteps?: number;
}

export interface RunForgeStepResult {
  newState: ForgeState;
  assistantMessage: string;
  toolCallsExecuted: Array<{ name: string; argsPreview: string }>;
  phaseChanged: boolean;
}

/**
 * Executa um turno do Forge:
 *   1. Anexa mensagem do user no transcript
 *   2. Roda LLM com system prompt + tools da fase atual
 *   3. Processa tool calls (mutam answers em memória via callbacks)
 *   4. Persiste mensagens novas e retorna estado atualizado
 */
export async function runForgeStep(input: RunForgeStepInput): Promise<RunForgeStepResult> {
  const { state, userMessage, io } = input;
  const maxSteps = input.maxSteps ?? 6;

  // --- snapshot vivo ---
  let answers: ForgeAnswers = clone(state.answers);
  let pendingNextPhase: ForgePhaseId | null = null;
  const toolCallsExecuted: Array<{ name: string; argsPreview: string }> = [];

  const models = getAiModels();

  // Deps com closure sobre o snapshot mutável
  const deps: ForgeToolDeps = {
    setAnswer: (patch) => {
      answers = mergeAnswers(answers, patch);
    },
    getAnswersSnapshot: () => answers,
    appendKnowledge: (item: KnowledgeItem) => {
      answers = { ...answers, knowledge: [...(answers.knowledge ?? []), item] };
    },
    setNextPhase: (phase) => {
      pendingNextPhase = phase;
    },
    scrapeUrl: io.scrapeUrl,
    generateSystemPrompt: async () => generateSystemPrompt(answers),
    refineSystemPrompt: async (instruction) => {
      const current = answers.systemPromptDraft ?? '';
      if (!current) {
        return generateSystemPrompt(answers);
      }
      const REFINE_SYSTEM =
        `Você recebe um system prompt atual de um agente de IA pro WhatsApp e uma instrução do dono pra ajustar. Aplique a mudança de forma cirúrgica — mude SÓ o que a instrução pede, preserve o resto literal. Devolva APENAS o system prompt revisado, sem preâmbulo, sem markdown wrapper.`;
      const result = await generateText({
        model: models.chat,
        // Lei do CLAUDE.md: toda chamada de LLM tem timeout — sem isto a
        // server action trava até o timeout da plataforma.
        abortSignal: AbortSignal.timeout(60_000),
        messages: [
          systemMessage(REFINE_SYSTEM),
          {
            role: 'user',
            content: `INSTRUÇÃO: ${instruction}\n\n---\n\nSYSTEM PROMPT ATUAL:\n\n${current}`,
          },
        ],
      });
      return result.text.trim();
    },
    publishAgentVersion: async ({ agentName }) => {
      if (!answers.systemPromptDraft) {
        answers = { ...answers, systemPromptDraft: await generateSystemPrompt(answers, agentName) };
      }
      return io.publishAgentVersion({
        agentName,
        answers,
        systemPrompt: answers.systemPromptDraft ?? '',
      });
    },
    suggestToolsForVertical: io.suggestToolsForVertical,
  };

  const allTools = createForgeTools(deps);
  const phaseTools = pickToolsForPhase(allTools, state.currentPhase);

  // --- transcript atualizado: adiciona user message ANTES de chamar LLM ---
  const userMsg: ForgeMessage = {
    id: randomUUID(),
    role: 'user',
    content: userMessage,
    createdAt: new Date().toISOString(),
  };
  const transcriptWithUser = [...state.transcript, userMsg];

  // --- chamada LLM (system cacheável + transcript) ---
  const systemPrompt = getPhaseSystemPrompt(state.currentPhase, answers);
  const messages: ModelMessage[] = [
    systemMessage(systemPrompt),
    ...transcriptWithUser
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map<ModelMessage>((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
  ];

  const result = await generateText({
    model: models.chat,
    messages,
    tools: phaseTools,
    stopWhen: stepCountIs(maxSteps),
    // Turnos do Forge são longos (scrape + geração de prompt), mas não infinitos.
    abortSignal: AbortSignal.timeout(60_000),
  });

  // --- agrega tool calls executados pra UI ---
  for (const step of result.steps) {
    for (const tc of step.toolCalls ?? []) {
      toolCallsExecuted.push({
        name: tc.toolName,
        argsPreview: safeJsonPreview(tc.input),
      });
    }
  }

  // --- assistant message final ---
  const assistantText = result.text.trim();
  const assistantMsg: ForgeMessage = {
    id: randomUUID(),
    role: 'assistant',
    content: assistantText || '(o agente avançou sem texto)',
    toolCalls: toolCallsExecuted.length
      ? toolCallsExecuted.map((t) => ({
          id: randomUUID(),
          name: t.name,
          args: t.argsPreview,
        }))
      : undefined,
    createdAt: new Date().toISOString(),
  };

  const finalPhase = pendingNextPhase ?? state.currentPhase;
  const newState: ForgeState = {
    sessionId: state.sessionId,
    workspaceId: state.workspaceId,
    currentPhase: finalPhase,
    transcript: [...transcriptWithUser, assistantMsg],
    answers,
  };

  return {
    newState,
    assistantMessage: assistantText,
    toolCallsExecuted,
    phaseChanged: pendingNextPhase !== null && pendingNextPhase !== state.currentPhase,
  };
}

// =========================================
// utils
// =========================================

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function mergeAnswers(current: ForgeAnswers, patch: Partial<ForgeAnswers>): ForgeAnswers {
  return {
    ...current,
    ...patch,
    business:
      patch.business !== undefined
        ? { ...(current.business ?? {}), ...patch.business }
        : current.business,
  };
}

function safeJsonPreview(v: unknown): string {
  try {
    const str = JSON.stringify(v);
    return str.length > 200 ? str.slice(0, 200) + '…' : str;
  } catch {
    return String(v);
  }
}
