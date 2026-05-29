/**
 * Roteamento de modelo Haiku→Sonnet (proposta da Fase 6).
 *
 * Ideia: nem todo turn precisa do Sonnet. Saudação, agradecimento e perguntas
 * triviais curtas o Haiku resolve com qualidade equivalente e ~3x mais barato.
 * Casos que exigem raciocínio, tool calling rico ou lidar com cliente irritado
 * vão pro Sonnet.
 *
 * ⚠️ DESLIGADO por default (`AI_ROUTING` != 'true'). Ligar é decisão de produto
 * baseada no eval comparativo (qualidade vs custo) — ver ADR de roteamento.
 * Este módulo só decide o alvo; quem injeta o modelo é o worker/runner.
 */

export type RouteTarget = 'fast' | 'chat';

export interface RouteInput {
  intent: string;
  sentiment: string;
  needsHandoff: boolean;
  /** Tamanho da mensagem do cliente (chars). */
  messageLength: number;
  /** Quantidade de turns anteriores na conversa. */
  historyLength: number;
}

export interface RouteDecision {
  target: RouteTarget;
  reason: string;
}

/** Intents que quase sempre exigem raciocínio/tools → Sonnet. */
const COMPLEX_INTENTS = new Set(['order', 'complaint', 'cancel', 'request']);
/** Intents triviais que o Haiku cobre bem quando a mensagem é curta. */
const TRIVIAL_INTENTS = new Set(['greeting', 'other']);

const SHORT_MESSAGE_CHARS = 120;

/**
 * Decide o modelo do turn. Conservador: na dúvida, manda pro Sonnet (qualidade
 * acima de economia, conforme a regra "esperteza que custa confiança não vale").
 */
export function routeModel(input: RouteInput): RouteDecision {
  if (input.needsHandoff) {
    return { target: 'chat', reason: 'handoff: precisa de cuidado' };
  }
  if (input.sentiment === 'negative') {
    return { target: 'chat', reason: 'cliente insatisfeito' };
  }
  if (COMPLEX_INTENTS.has(input.intent)) {
    return { target: 'chat', reason: `intent complexa: ${input.intent}` };
  }
  if (input.historyLength >= 6) {
    return { target: 'chat', reason: 'conversa longa: contexto acumulado' };
  }
  if (TRIVIAL_INTENTS.has(input.intent) && input.messageLength <= SHORT_MESSAGE_CHARS) {
    return { target: 'fast', reason: `trivial: ${input.intent} curto` };
  }
  // Default seguro: Sonnet.
  return { target: 'chat', reason: 'default conservador' };
}

export function isRoutingEnabled(): boolean {
  return process.env['AI_ROUTING'] === 'true';
}
