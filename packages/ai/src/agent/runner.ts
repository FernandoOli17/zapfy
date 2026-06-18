import { generateText, stepCountIs, type LanguageModel, type ModelMessage, type Tool } from 'ai';
import { createLogger } from '@zapfy/shared';
import { getAiModels, isMockMode } from '../provider';
import { systemMessage } from '../caching';
import { detectPromptInjection, detectBlockedTopics } from '../guards';
import { buildGlobalTools, type AgentToolDeps } from './tools/global';
import { buildVerticalTools, type VerticalToolDeps } from './tools/verticals';
import type { RagChunk } from './rag';

const log = createLogger('agent:runner');

export interface RunAgentInput {
  systemPrompt: string;
  vertical: string;
  messageHistory: Array<{ role: 'user' | 'assistant'; text: string }>;
  inboundText: string;
  ragChunks: RagChunk[];
  globalDeps: AgentToolDeps;
  verticalDeps: VerticalToolDeps;
  maxSteps?: number;
  /** Timeout em ms para o turn completo (tool calls + texto). Default 30s. */
  timeoutMs?: number;
  /** Blacklist de tópicos por workspace — caller pega de WorkspaceSettings. */
  topicBlacklist?: string[];
  /**
   * Override do modelo. Default: `getAiModels().chat` (Sonnet). Usado pelo
   * roteamento (injeta Haiku em casos triviais) e por testes (mock model).
   */
  model?: LanguageModel;
  /**
   * Tools habilitadas pelo dono na fase TOOLS do Forge (AgentVersion.toolsEnabled).
   * Filtra as tools de VERTICAL; as globais (transfer_to_human, etc.) ficam
   * sempre disponíveis. Ausente/vazio = todas as tools do vertical (legado).
   */
  toolsEnabled?: string[];
}

export interface RunAgentResult {
  text: string;
  toolsUsed: string[];
  tokensIn: number;
  tokensOut: number;
  /** Tokens de input lidos do cache (subconjunto de tokensIn). Pro custo. */
  cachedTokensIn: number;
  handedOff: boolean;
  /** True quando o input bateu em detector de injection ou blacklist. */
  guardTriggered: boolean;
  guardReasons: string[];
}

const MOCK_RESPONSE =
  'Olá! Recebi sua mensagem. Em breve um atendente irá te ajudar. Como posso te chamar? 😊';

const HANDOFF_ON_GUARD =
  'Recebi sua mensagem. Pra garantir o melhor atendimento, vou transferir você para um atendente humano em instantes. 🙌';

export async function runAgent(input: RunAgentInput): Promise<RunAgentResult> {
  const {
    systemPrompt,
    vertical,
    messageHistory,
    inboundText,
    ragChunks,
    globalDeps,
    verticalDeps,
    maxSteps = 5,
    timeoutMs = 30_000,
    topicBlacklist = [],
    model,
    toolsEnabled,
  } = input;

  if (isMockMode()) {
    log.info('mock mode — retornando resposta canned');
    return {
      text: MOCK_RESPONSE,
      toolsUsed: [],
      tokensIn: 0,
      tokensOut: 0,
      cachedTokensIn: 0,
      handedOff: false,
      guardTriggered: false,
      guardReasons: [],
    };
  }

  // ── 1. Guardrails de input ────────────────────────────────────────────────
  const injection = detectPromptInjection(inboundText);
  const blockedTopics = detectBlockedTopics(inboundText, { keywords: topicBlacklist });
  const guardTriggered = injection.injection || blockedTopics.length > 0;
  const guardReasons = [...injection.reasons, ...blockedTopics.map((t) => `topic:${t}`)];

  if (guardTriggered) {
    log.warn({ reasons: guardReasons }, 'guardrails dispararam — handoff automático');
    try {
      await globalDeps.transferToHuman(`Guardrail: ${guardReasons.join(', ')}`);
    } catch (err) {
      log.warn({ err: String(err) }, 'transferToHuman falhou após guardrail');
    }
    return {
      text: HANDOFF_ON_GUARD,
      toolsUsed: ['transfer_to_human'],
      tokensIn: 0,
      tokensOut: 0,
      cachedTokensIn: 0,
      handedOff: true,
      guardTriggered: true,
      guardReasons,
    };
  }

  // ── 2. Montar tools ───────────────────────────────────────────────────────
  // O dono escolhe tools na fase TOOLS do Forge — desligar tem que desligar de
  // verdade. Filtro só nas de vertical; globais são infra do atendimento.
  const globalTools = buildGlobalTools(globalDeps);
  const verticalToolsMap = buildVerticalTools(vertical, verticalDeps);
  const enabledSet = toolsEnabled && toolsEnabled.length > 0 ? new Set(toolsEnabled) : null;
  const filteredVertical: Record<string, Tool> = enabledSet
    ? Object.fromEntries(Object.entries(verticalToolsMap).filter(([name]) => enabledSet.has(name)))
    : verticalToolsMap;
  const tools: Record<string, Tool> = { ...globalTools, ...filteredVertical };

  // ── 3. Montar prompt com RAG ──────────────────────────────────────────────
  const ragSection =
    ragChunks.length > 0
      ? `\n\n---\n## Base de conhecimento (use quando relevante)\n${ragChunks
          .map((c, i) => `[${i + 1}] **${c.title}**: ${c.content}`)
          .join('\n\n')}\n---`
      : '';

  const fullSystem = systemPrompt + ragSection;

  // ── 4. Mensagens — system cacheável + histórico + inbound ────────────────
  const messages: ModelMessage[] = [
    systemMessage(fullSystem),
    ...messageHistory.map<ModelMessage>((m) => ({
      role: m.role,
      content: m.text,
    })),
    { role: 'user', content: inboundText },
  ];

  const toolsUsed: string[] = [];
  let handedOff = false;

  // ── 5. Timeout via AbortController ────────────────────────────────────────
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const { text, totalUsage, steps } = await generateText({
      model: model ?? getAiModels().chat,
      messages,
      tools,
      stopWhen: stepCountIs(maxSteps),
      abortSignal: controller.signal,
    });

    for (const step of steps) {
      for (const tc of step.toolCalls ?? []) {
        toolsUsed.push(tc.toolName);
        if (tc.toolName === 'transfer_to_human') handedOff = true;
      }
    }

    log.info(
      {
        tokensIn: totalUsage.inputTokens ?? 0,
        tokensOut: totalUsage.outputTokens ?? 0,
        cacheRead: totalUsage.cachedInputTokens ?? 0,
        steps: steps.length,
        toolsUsed,
      },
      'agent run concluído',
    );

    return {
      text,
      toolsUsed,
      tokensIn: totalUsage.inputTokens ?? 0,
      tokensOut: totalUsage.outputTokens ?? 0,
      cachedTokensIn: totalUsage.cachedInputTokens ?? 0,
      handedOff,
      guardTriggered: false,
      guardReasons: [],
    };
  } catch (err) {
    const aborted = controller.signal.aborted;
    log.error(
      { err: String(err), aborted, timeoutMs },
      aborted ? 'agent run timeout' : 'agent run falhou',
    );
    return {
      text: aborted
        ? 'Desculpe, levei tempo demais pra responder. Pode tentar de novo em instantes?'
        : 'Desculpe, tive um problema técnico. Por favor, tente novamente em instantes.',
      toolsUsed,
      tokensIn: 0,
      tokensOut: 0,
      cachedTokensIn: 0,
      handedOff,
      guardTriggered: false,
      guardReasons: [],
    };
  } finally {
    clearTimeout(timer);
  }
}
