/**
 * Compara a CAPACIDADE do modelo no runtime do WhatsApp: agente 100% Sonnet vs
 * agente 100% Haiku, no mesmo golden set. Responde "o Haiku dá conta de tudo?".
 *
 * Mede o que importa pro WhatsApp: tool certa, ALUCINAÇÃO, handoff, tom, custo.
 *
 * Rodar (com .env: ANTHROPIC_API_KEY + MOCK_AI=false):
 *   pnpm tsx scripts/eval-model-compare.ts
 */
import 'dotenv/config';
import { GOLDEN_CASES, runEval, type EvalReport } from '../packages/ai/src/index';
import { buildResponder, assertRealMode } from './eval-shared';

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}
function row(label: string, a: string, b: string): string {
  return `${label.padEnd(20)} ${a.padStart(14)} ${b.padStart(14)}`;
}

async function main() {
  assertRealMode();
  console.info(`▶ Sonnet-tudo vs Haiku-tudo — ${GOLDEN_CASES.length} casos\n`);

  console.info('rodada 1/2: agente = SONNET (tudo)...');
  const sonnet: EvalReport = await runEval(GOLDEN_CASES, buildResponder({ routing: false, forceAgentModel: 'chat' }));

  console.info('rodada 2/2: agente = HAIKU (tudo)...\n');
  const haiku: EvalReport = await runEval(GOLDEN_CASES, buildResponder({ routing: false, forceAgentModel: 'fast' }));

  const s = sonnet.metrics;
  const h = haiku.metrics;

  console.info(row('métrica', 'SONNET', 'HAIKU'));
  console.info('─'.repeat(50));
  console.info(row('tool accuracy', pct(s.toolAccuracy), pct(h.toolAccuracy)));
  console.info(row('handoff accuracy', pct(s.handoffAccuracy), pct(h.handoffAccuracy)));
  console.info(row('ALUCINAÇÃO', pct(s.hallucinationRate), pct(h.hallucinationRate)));
  console.info(row('aderência tom', pct(s.toneAdherence), pct(h.toneAdherence)));
  console.info(row('custo total USD', `$${s.totalCostUsd.toFixed(5)}`, `$${h.totalCostUsd.toFixed(5)}`));
  console.info('─'.repeat(50));

  const saving = s.totalCostUsd > 0 ? 1 - h.totalCostUsd / s.totalCostUsd : 0;
  console.info(`economia Haiku-tudo: ${pct(saving)}`);

  // Por caso — onde o Haiku difere/alucina
  console.info('\n── Haiku por caso ─────────────────────');
  for (const c of haiku.perCase) {
    const halluc = c.turns.filter((t) => t.hallucinated).length;
    const toolMiss = c.turns.filter((t) => t.toolOk === false).length;
    console.info(`${halluc > 0 || toolMiss > 0 ? '🔴' : '🟢'} ${c.id}: alucinação=${halluc} toolMiss=${toolMiss}`);
  }

  const haikuWorse =
    h.hallucinationRate > s.hallucinationRate ||
    h.toolAccuracy < s.toolAccuracy ||
    h.handoffAccuracy < s.handoffAccuracy;
  console.info(
    haikuWorse
      ? '\n⚠️  Haiku-tudo PIOROU qualidade vs Sonnet — risco de confiança. Ver tabela.'
      : '\n🟢 Haiku-tudo manteve qualidade neste set — candidato, mas validar em escala.',
  );
}

main().catch((err) => {
  console.error('❌ Falha:', err);
  process.exit(1);
});
