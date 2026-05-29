/**
 * Tipos e agregação de métricas do eval harness.
 *
 * Prioridade das métricas (AI_ENGINE_PROMPT §10):
 *   anti-alucinação > handoff correto > tom/qualidade > esperteza.
 */
import { estimateCostUsd, usdToBrl, type TokenUsage } from '../cost/pricing';
import { detectHallucination } from './hallucination';
import { matchesTone } from './tone';

export interface TurnExpectation {
  /** Tool que deveria ser chamada neste turn (ex.: 'list_products'). */
  expectTool?: string;
  /** True/false se o turn deveria (ou não) resultar em handoff. */
  expectHandoff?: boolean;
  /** Marcadores de tom — aderência conta se ao menos um aparece na resposta. */
  toneMarkers?: string[];
  /** Resposta não pode afirmar fato de negócio sem fonte. Default true. */
  forbidHallucination?: boolean;
}

export interface GoldenTurn {
  user: string;
  expect: TurnExpectation;
}

export interface GoldenCase {
  id: string;
  vertical: string;
  description: string;
  systemPrompt: string;
  /** Tom esperado em linguagem natural — usado pelo juiz real (modo token). */
  toneBrief: string;
  turns: GoldenTurn[];
}

export interface TurnResult {
  text: string;
  toolsUsed: string[];
  ragChunks: Array<{ content: string; title?: string }>;
  handedOff: boolean;
  tokensIn: number;
  tokensOut: number;
  cachedTokensIn: number;
  /** Id do modelo que respondeu (pro custo e pra comparar roteamento). */
  model: string;
}

export type Responder = (ctx: {
  goldenCase: GoldenCase;
  turn: GoldenTurn;
  history: Array<{ role: 'user' | 'assistant'; text: string }>;
}) => Promise<TurnResult>;

export interface TurnEvaluation {
  user: string;
  reply: string;
  toolsUsed: string[];
  model: string;
  toolOk: boolean | null;
  handoffOk: boolean | null;
  hallucinated: boolean;
  hallucinationKinds: string[];
  toneOk: boolean | null;
  costUsd: number;
}

export interface CaseReport {
  id: string;
  vertical: string;
  turns: TurnEvaluation[];
  costUsd: number;
}

export interface EvalMetrics {
  cases: number;
  turns: number;
  /** % de turns com `expectTool` em que a tool certa foi usada. */
  toolAccuracy: number;
  /** % de turns com `expectHandoff` em que o handoff bateu (nos dois sentidos). */
  handoffAccuracy: number;
  /** % de turns que afirmaram fato sem fonte (MENOR é melhor; alvo 0). */
  hallucinationRate: number;
  /** % de turns com `toneMarkers` que acertaram o tom. */
  toneAdherence: number;
  totalCostUsd: number;
  totalCostBrl: number;
  avgCostPerCaseUsd: number;
  /** Razão média de tokens lidos do cache (0–1). */
  cacheHitRatio: number;
}

export interface EvalReport {
  metrics: EvalMetrics;
  perCase: CaseReport[];
}

/** Avalia um único turn contra sua expectativa. Pura — sem IO. */
export function evaluateTurn(turn: GoldenTurn, result: TurnResult): TurnEvaluation {
  const exp = turn.expect;

  const toolOk =
    exp.expectTool === undefined ? null : result.toolsUsed.includes(exp.expectTool);

  const handoffOk =
    exp.expectHandoff === undefined ? null : result.handedOff === exp.expectHandoff;

  const halluc =
    exp.forbidHallucination === false
      ? { hallucinated: false, findings: [] }
      : detectHallucination({
          reply: result.text,
          toolsUsed: result.toolsUsed,
          ragChunks: result.ragChunks,
        });

  const toneOk =
    exp.toneMarkers && exp.toneMarkers.length > 0
      ? matchesTone(result.text, exp.toneMarkers)
      : null;

  const usage: TokenUsage = {
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    cachedTokensIn: result.cachedTokensIn,
  };

  return {
    user: turn.user,
    reply: result.text,
    toolsUsed: result.toolsUsed,
    model: result.model,
    toolOk,
    handoffOk,
    hallucinated: halluc.hallucinated,
    hallucinationKinds: halluc.findings.map((f) => f.kind),
    toneOk,
    costUsd: estimateCostUsd(result.model, usage),
  };
}

/** Agrega avaliações de turns em métricas globais. */
export function aggregate(perCase: CaseReport[]): EvalMetrics {
  const turns = perCase.flatMap((c) => c.turns);
  const ratio = (hits: number, total: number) => (total === 0 ? 1 : hits / total);

  const toolTurns = turns.filter((t) => t.toolOk !== null);
  const handoffTurns = turns.filter((t) => t.handoffOk !== null);
  const toneTurns = turns.filter((t) => t.toneOk !== null);
  const hallucCheckedTurns = turns; // todos passam pelo detector salvo opt-out

  const totalCostUsd = perCase.reduce((acc, c) => acc + c.costUsd, 0);

  return {
    cases: perCase.length,
    turns: turns.length,
    toolAccuracy: ratio(toolTurns.filter((t) => t.toolOk).length, toolTurns.length),
    handoffAccuracy: ratio(
      handoffTurns.filter((t) => t.handoffOk).length,
      handoffTurns.length,
    ),
    hallucinationRate: ratio(
      hallucCheckedTurns.filter((t) => t.hallucinated).length,
      hallucCheckedTurns.length,
    ),
    toneAdherence: ratio(toneTurns.filter((t) => t.toneOk).length, toneTurns.length),
    totalCostUsd,
    totalCostBrl: usdToBrl(totalCostUsd),
    avgCostPerCaseUsd: perCase.length === 0 ? 0 : totalCostUsd / perCase.length,
    cacheHitRatio: 0, // preenchido pelo harness quando há dados de cache
  };
}
