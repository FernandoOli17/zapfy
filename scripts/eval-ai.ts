/**
 * Eval harness REAL (com token) — roda as conversas douradas pelo agente de
 * verdade e reporta métricas: resolução (tool certa), handoff, ALUCINAÇÃO,
 * aderência ao tom + custo por caso.
 *
 * Respeita AI_ROUTING (se 'true', roteia Haiku→Sonnet). Custo controlado: o
 * dataset é pequeno; cada caso são 1-2 turns.
 *
 * Rodar (com .env tendo ANTHROPIC_API_KEY e MOCK_AI=false):
 *   pnpm tsx scripts/eval-ai.ts
 */
import 'dotenv/config';
import { GOLDEN_CASES, runEval, formatReport } from '../packages/ai/src/index';
import { buildResponder, assertRealMode } from './eval-shared';

async function main() {
  assertRealMode();

  const routing = process.env['AI_ROUTING'] === 'true';
  console.info(`▶ eval real — roteamento ${routing ? 'LIGADO' : 'desligado'} — ${GOLDEN_CASES.length} casos\n`);

  const report = await runEval(GOLDEN_CASES, buildResponder({ routing }));

  console.info(formatReport(report));
  console.info('\n── por caso ───────────────────────────');
  for (const c of report.perCase) {
    const halluc = c.turns.filter((t) => t.hallucinated).length;
    console.info(
      `${halluc > 0 ? '🔴' : '🟢'} ${c.id} [${c.vertical}] — ` +
        `alucinação:${halluc} · custo:$${c.costUsd.toFixed(5)}`,
    );
    for (const t of c.turns) {
      const marks = [
        t.toolOk === null ? '' : t.toolOk ? 'tool✓' : 'tool✗',
        t.handoffOk === null ? '' : t.handoffOk ? 'handoff✓' : 'handoff✗',
        t.toneOk === null ? '' : t.toneOk ? 'tom✓' : 'tom✗',
        t.hallucinated ? `ALUCINOU(${t.hallucinationKinds.join(',')})` : '',
      ]
        .filter(Boolean)
        .join(' ');
      console.info(`   · "${t.user.slice(0, 50)}" → [${t.model}] ${marks}`);
    }
  }

  // Regressão dura: alucinação > 0 é falha grave.
  if (report.metrics.hallucinationRate > 0) {
    console.error('\n❌ ALUCINAÇÃO detectada — falha grave (anti-alucinação é prioridade nº1).');
    process.exit(2);
  }
  console.info('\n✅ Sem alucinação. Eval concluído.');
}

main().catch((err) => {
  console.error('❌ Falha no eval:', err);
  process.exit(1);
});
