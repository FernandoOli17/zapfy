import { generateText } from 'ai';
import { getAiModels } from '../provider';
import { systemMessage } from '../caching';
import { buildMetaPromptUserMessage, META_PROMPT_SYSTEM } from './prompts/meta-prompt';
import type { ForgeAnswers } from './types';

/**
 * Gera o system prompt do agente final a partir dos ForgeAnswers — é o coração
 * do Forge (meta-prompt → prompt de produção). Extraído da engine pra ser
 * reutilizável (engine, scripts de validação, snapshot de regressão [[TASK-0014]]).
 *
 * Usa o modelo `chat` (Sonnet) com o system do meta-prompt cacheável.
 */
export async function generateSystemPrompt(
  answers: ForgeAnswers,
  agentName?: string,
): Promise<string> {
  const { chat } = getAiModels();
  const result = await generateText({
    model: chat,
    // Timeout obrigatório (CLAUDE.md) — geração de prompt é longa, não infinita.
    abortSignal: AbortSignal.timeout(60_000),
    messages: [
      systemMessage(META_PROMPT_SYSTEM),
      {
        role: 'user',
        content: buildMetaPromptUserMessage(agentName ? { ...answers, agentName } : answers),
      },
    ],
  });
  return result.text.trim();
}
