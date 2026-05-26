import { generateText, stepCountIs, type ModelMessage, type Tool } from 'ai';
import { createLogger } from '@zapai/shared';
import { getAiModels, isMockMode } from '../provider';
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
}

export interface RunAgentResult {
  text: string;
  toolsUsed: string[];
  tokensIn: number;
  tokensOut: number;
  handedOff: boolean;
}

const MOCK_RESPONSE =
  'Olá! Recebi sua mensagem. Em breve um atendente irá te ajudar. Como posso te chamar? 😊';

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
  } = input;

  if (isMockMode()) {
    log.info('mock mode — retornando resposta canned');
    return { text: MOCK_RESPONSE, toolsUsed: [], tokensIn: 0, tokensOut: 0, handedOff: false };
  }

  const globalTools = buildGlobalTools(globalDeps);
  const verticalToolsMap = buildVerticalTools(vertical, verticalDeps);
  const tools: Record<string, Tool> = { ...globalTools, ...verticalToolsMap };

  // Injeta contexto RAG no system prompt
  const ragSection =
    ragChunks.length > 0
      ? `\n\n---\n## Base de conhecimento (use quando relevante)\n${ragChunks.map((c, i) => `[${i + 1}] **${c.title}**: ${c.content}`).join('\n\n')}\n---`
      : '';

  const fullSystem = systemPrompt + ragSection;

  const messages: ModelMessage[] = [
    ...messageHistory.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.text })),
    { role: 'user', content: inboundText },
  ];

  const toolsUsed: string[] = [];
  let handedOff = false;

  try {
    const { text, totalUsage, steps } = await generateText({
      model: getAiModels().chat,
      system: fullSystem,
      messages,
      tools,
      stopWhen: stepCountIs(maxSteps),
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
      handedOff,
    };
  } catch (err) {
    log.error({ err: String(err) }, 'agent run falhou — retornando fallback');
    return {
      text: 'Desculpe, tive um problema técnico. Por favor, tente novamente em instantes.',
      toolsUsed: [],
      tokensIn: 0,
      tokensOut: 0,
      handedOff: false,
    };
  }
}
