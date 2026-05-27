import type { ModelMessage } from 'ai';

/**
 * Helpers de prompt caching cross-provider.
 *
 * Anthropic cobra um desconto pesado (até 90%) em cache hit pra prompts
 * cacheados. CLAUDE.md obriga cache em qualquer prompt > 1024 tokens
 * (system prompt do agente, RAG context, exemplos few-shot).
 *
 * OpenAI faz cache automático server-side a partir de 1024 tokens — não
 * exige nada do client. Então o helper só adiciona `providerOptions`
 * quando o provider for Anthropic.
 *
 * Uso típico:
 *   const messages = [
 *     systemMessage(longSystem),  // cache marker se Anthropic
 *     { role: 'user', content: '...' }
 *   ];
 */

const ANTHROPIC_CACHE_OPT = {
  anthropic: { cacheControl: { type: 'ephemeral' as const } },
};

/** Heurística simples — só vale a pena marcar cache em conteúdo grande. */
const MIN_CACHE_CHARS = 1024 * 4; // ~1024 tokens estimados (4 chars/token)

/**
 * Constrói uma message de role 'system' com providerOptions de cache control
 * quando o conteúdo for grande o suficiente para valer a pena. O ai-sdk
 * Anthropic provider lê `providerOptions.anthropic.cacheControl` e converte
 * pra `cache_control: { type: 'ephemeral' }` na API.
 *
 * Quando o provider é OpenAI, providerOptions são ignorados — server faz
 * cache automático.
 */
export function systemMessage(text: string): ModelMessage {
  if (text.length < MIN_CACHE_CHARS) {
    return { role: 'system', content: text };
  }
  return {
    role: 'system',
    content: text,
    providerOptions: ANTHROPIC_CACHE_OPT,
  } as ModelMessage;
}

/**
 * Mesma ideia, mas para um chunk dentro de uma mensagem de user (útil pra
 * cachear RAG context que muda entre requests mas é grande).
 *
 * Retorna um content array com cache marker no fim do bloco grande.
 */
export function userMessageWithContext(context: string, userText: string): ModelMessage {
  if (context.length < MIN_CACHE_CHARS) {
    return { role: 'user', content: `${context}\n\n${userText}` };
  }
  return {
    role: 'user',
    content: [
      {
        type: 'text',
        text: context,
        providerOptions: ANTHROPIC_CACHE_OPT,
      },
      { type: 'text', text: userText },
    ],
  } as ModelMessage;
}
