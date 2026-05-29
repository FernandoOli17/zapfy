/**
 * Comparação de roteamento: roda o MESMO eval com roteamento DESLIGADO e LIGADO,
 * e mostra qualidade vs custo lado a lado. Insumo pro ADR de roteamento — a
 * decisão de ligar em produção é do usuário.
 *
 * Rodar (com .env tendo ANTHROPIC_API_KEY e MOCK_AI=false):
 *   pnpm tsx scripts/eval-routing.ts
 */
import 'dotenv/config';
import { GOLDEN_CASES, runEval, type EvalReport } from '../packages/ai/src/index';
import { buildResponder, assertRealMode } from './eval-shared';

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function line(label: string, off: string, on: string): string {
  return `${label.padEnd(20)} ${off.padStart(12)} ${on.padStart(12)}`;
}

async function main() {
  assertRealMode();
  console.info(`▶ comparação de roteamento — ${GOLDEN_CASES.length} casos × 2 rodadas\n`);

  console.info('rodada 1/2: roteamento DESLIGADO...');
  const off: EvalReport = await runEval(GOLDEN_CASES, buildResponder({ routing: false }));

  console.info('rodada 2/2: roteamento LIGADO...\n');
  const on: EvalReport = await runEval(GOLDEN_CASES, buildResponder({ routing: true }));

  const mo = off.metrics;
  const mn = on.metrics;

  console.info(line('métrica', 'OFF', 'ON'));
  console.info('─'.repeat(46));
  console.info(line('tool accuracy', pct(mo.toolAccuracy), pct(mn.toolAccuracy)));
  console.info(line('handoff accuracy', pct(mo.handoffAccuracy), pct(mn.handoffAccuracy)));
  console.info(line('ALUCINAÇÃO', pct(mo.hallucinationRate), pct(mn.hallucinationRate)));
  console.info(line('aderência tom', pct(mo.toneAdherence), pct(mn.toneAdherence)));
  console.info(line('custo total USD', `$${mo.totalCostUsd.toFixed(5)}`, `$${mn.totalCostUsd.toFixed(5)}`));
  console.info(line('custo/caso USD', `$${mo.avgCostPerCaseUsd.toFixed(5)}`, `$${mn.avgCostPerCaseUsd.toFixed(5)}`));

  const saving = mo.totalCostUsd > 0 ? 1 - mn.totalCostUsd / mo.totalCostUsd : 0;
  console.info('─'.repeat(46));
  console.info(`economia de custo com roteamento: ${pct(saving)}`);

  const qualityDropped =
    mn.toolAccuracy < mo.toolAccuracy ||
    mn.handoffAccuracy < mo.handoffAccuracy ||
    mn.hallucinationRate > mo.hallucinationRate ||
    mn.toneAdherence < mo.toneAdherence;

  console.info(
    qualityDropped
      ? '\n⚠️  Qualidade caiu com roteamento — pesar economia vs risco no ADR.'
      : '\n🟢 Qualidade preservada com roteamento — candidato a ligar (decisão do usuário).',
  );
}

main().catch((err) => {
  console.error('❌ Falha na comparação:', err);
  process.exit(1);
});
