import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';

/**
 * Provider AI configuravel via env.
 *
 *   AI_PROVIDER=openai     -> usa @ai-sdk/openai (OPENAI_API_KEY)
 *   AI_PROVIDER=anthropic  -> usa @ai-sdk/anthropic (ANTHROPIC_API_KEY)  [padrao da spec]
 *
 * Cada provider expõe dois modelos:
 *   - chat: o agente principal (raciocínio, long context, tool calling rico)
 *   - fast: classifier e auxiliares (intent, sentiment, gen rápido)
 *
 * Mantemos a interface idêntica pra trocar provider sem reescrever Forge.
 */

export type ProviderId = 'anthropic' | 'openai';

export interface AiModels {
  chat: LanguageModel;
  fast: LanguageModel;
  provider: ProviderId;
}

const ANTHROPIC_MODELS = {
  chat: 'claude-sonnet-4-5',
  fast: 'claude-haiku-4-5',
} as const;

const OPENAI_MODELS = {
  chat: 'gpt-4o',
  fast: 'gpt-4o-mini',
} as const;

function resolveProvider(): ProviderId {
  const fromEnv = (process.env['AI_PROVIDER'] ?? '').toLowerCase();
  if (fromEnv === 'openai') return 'openai';
  if (fromEnv === 'anthropic') return 'anthropic';
  // fallback: detecta pela presença da chave
  if (process.env['OPENAI_API_KEY']) return 'openai';
  if (process.env['ANTHROPIC_API_KEY']) return 'anthropic';
  // default histórico (spec): Anthropic
  return 'anthropic';
}

export function getAiModels(): AiModels {
  const provider = resolveProvider();
  if (provider === 'openai') {
    return {
      provider,
      chat: openai(process.env['OPENAI_MODEL_CHAT'] ?? OPENAI_MODELS.chat),
      fast: openai(process.env['OPENAI_MODEL_FAST'] ?? OPENAI_MODELS.fast),
    };
  }
  return {
    provider,
    chat: anthropic(process.env['ANTHROPIC_MODEL_CHAT'] ?? ANTHROPIC_MODELS.chat),
    fast: anthropic(process.env['ANTHROPIC_MODEL_FAST'] ?? ANTHROPIC_MODELS.fast),
  };
}

/** Helper pra logs */
export function describeProvider(p: AiModels): string {
  return `${p.provider}`;
}
