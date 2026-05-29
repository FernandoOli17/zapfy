/**
 * Eval harness — roda conversas douradas através de um `Responder` e agrega
 * métricas. O responder é injetado: em teste é um fake determinístico (sem
 * token), no modo real é um adaptador sobre `runAgent` (gasta token).
 *
 * Esse desacoplamento deixa a lógica de métrica 100% testável no gate verde,
 * enquanto a medição de qualidade real fica num script orçado.
 */
import {
  aggregate,
  evaluateTurn,
  type CaseReport,
  type EvalReport,
  type GoldenCase,
  type Responder,
  type TurnResult,
} from './metrics';

export async function runEval(cases: GoldenCase[], responder: Responder): Promise<EvalReport> {
  const perCase: CaseReport[] = [];
  let cacheNum = 0;
  let cacheDen = 0;

  for (const goldenCase of cases) {
    const history: Array<{ role: 'user' | 'assistant'; text: string }> = [];
    const turnEvals = [];
    let caseCost = 0;

    for (const turn of goldenCase.turns) {
      const result: TurnResult = await responder({ goldenCase, turn, history });

      const evaluation = evaluateTurn(turn, result);
      turnEvals.push(evaluation);
      caseCost += evaluation.costUsd;

      cacheNum += result.cachedTokensIn;
      cacheDen += result.tokensIn;

      history.push({ role: 'user', text: turn.user });
      history.push({ role: 'assistant', text: result.text });
    }

    perCase.push({
      id: goldenCase.id,
      vertical: goldenCase.vertical,
      turns: turnEvals,
      costUsd: caseCost,
    });
  }

  const metrics = aggregate(perCase);
  metrics.cacheHitRatio = cacheDen > 0 ? Math.min(1, cacheNum / cacheDen) : 0;

  return { metrics, perCase };
}

/** Formata o relatório pra terminal (usado pelos scripts de eval). */
export function formatReport(report: EvalReport): string {
  const m = report.metrics;
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const lines = [
    '── EVAL ───────────────────────────────',
    `casos: ${m.cases} · turns: ${m.turns}`,
    `tool accuracy:     ${pct(m.toolAccuracy)}`,
    `handoff accuracy:  ${pct(m.handoffAccuracy)}`,
    `ALUCINAÇÃO:        ${pct(m.hallucinationRate)}  (alvo 0%)`,
    `aderência ao tom:  ${pct(m.toneAdherence)}`,
    `cache hit:         ${pct(m.cacheHitRatio)}`,
    `custo total:       $${m.totalCostUsd.toFixed(5)} (${m.totalCostBrl.toFixed(4)} BRL)`,
    `custo médio/caso:  $${m.avgCostPerCaseUsd.toFixed(5)}`,
    '───────────────────────────────────────',
  ];
  return lines.join('\n');
}
