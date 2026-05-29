/**
 * Núcleo compartilhado dos scripts de eval real (com token).
 *
 * Monta um `Responder` que espelha o pipeline de produção: classifica (Haiku) →
 * decide handoff → (opcional) roteia o modelo → roda o agente (Sonnet/Haiku).
 * Deps de tool são SEGURAS — nada de enviar WhatsApp ou mexer no DB de verdade;
 * transfer_to_human só registra um flag.
 *
 * Tools de vertical (list_products etc.) consultam o Postgres real (read-only) —
 * o que importa pro eval é se a tool CERTA foi chamada, não o dado retornado.
 */
import {
  classifyMessage,
  runAgent,
  routeModel,
  getAiModels,
  getModelIds,
  type Responder,
  type TurnResult,
  type AgentToolDeps,
  type VerticalToolDeps,
} from '../packages/ai/src/index';

export interface EvalOptions {
  /** Liga o roteamento Haiku→Sonnet (caso contrário, sempre Sonnet). */
  routing: boolean;
}

const EVAL_IDS = { workspaceId: 'eval', contactId: 'eval', conversationId: 'eval' };

export function buildResponder(opts: EvalOptions): Responder {
  const ids = getModelIds();

  return async ({ goldenCase, turn, history }) => {
    // 1. Classificador (Haiku) — igual ao pipeline real.
    const classification = await classifyMessage(turn.user);

    // 2. Handoff no classificador? Pipeline real transfere antes do agente.
    if (classification.needs_handoff) {
      return mk({
        text: '[handoff decidido no classificador]',
        handedOff: true,
        model: ids.fast,
      });
    }

    // 3. Roteamento de modelo (se ligado).
    let model: ReturnType<typeof getAiModels>['chat'] | undefined;
    let modelId = ids.chat;
    if (opts.routing) {
      const route = routeModel({
        intent: classification.intent,
        sentiment: classification.sentiment,
        needsHandoff: classification.needs_handoff,
        messageLength: turn.user.length,
        historyLength: history.length,
      });
      if (route.target === 'fast') {
        model = getAiModels().fast;
        modelId = ids.fast;
      }
    }

    // 4. Agente com deps seguras.
    let handoffFlag = false;
    const globalDeps: AgentToolDeps = {
      ...EVAL_IDS,
      searchKnowledge: async () => [],
      setContactField: async () => {},
      transferToHuman: async () => {
        handoffFlag = true;
      },
      sendTemplate: async () => {},
    };
    const verticalDeps: VerticalToolDeps = { ...EVAL_IDS };

    const res = await runAgent({
      systemPrompt: goldenCase.systemPrompt,
      vertical: goldenCase.vertical,
      messageHistory: history,
      inboundText: turn.user,
      ragChunks: [],
      globalDeps,
      verticalDeps,
      maxSteps: 5,
      timeoutMs: 30_000,
      ...(model ? { model } : {}),
    });

    return mk({
      text: res.text,
      toolsUsed: res.toolsUsed,
      handedOff: res.handedOff || handoffFlag,
      tokensIn: res.tokensIn,
      tokensOut: res.tokensOut,
      cachedTokensIn: res.cachedTokensIn,
      model: modelId,
    });
  };
}

function mk(partial: Partial<TurnResult>): TurnResult {
  return {
    text: '',
    toolsUsed: [],
    ragChunks: [],
    handedOff: false,
    tokensIn: 0,
    tokensOut: 0,
    cachedTokensIn: 0,
    model: 'claude-sonnet-4-5',
    ...partial,
  };
}

/** Aborta cedo se faltar credencial ou se MOCK_AI estiver ligado. */
export function assertRealMode(): void {
  if (!process.env['ANTHROPIC_API_KEY'] && !process.env['OPENAI_API_KEY']) {
    console.error('❌ Sem ANTHROPIC_API_KEY/OPENAI_API_KEY. Aborta antes de gastar.');
    process.exit(1);
  }
  if (process.env['MOCK_AI'] === 'true') {
    console.error('⚠️  MOCK_AI=true — eval real precisa de IA real. Aborta.');
    process.exit(1);
  }
}
