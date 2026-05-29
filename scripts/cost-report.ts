/**
 * Relatório de custo real por conversa — lê os UsageRecord gravados pelo worker
 * (kind='ai_message') e resume tokens, custo e cache hit por conversa de IA.
 *
 * Use depois de mandar mensagens pela "Mensagem de teste" em /whatsapp com IA
 * real: mostra quanto cada conversa custou de verdade (insumo de margem, #6).
 *
 * Rodar:
 *   pnpm tsx scripts/cost-report.ts [workspaceId]
 * Sem argumento, soma os UsageRecord das últimas 24h de todos os workspaces.
 */
import 'dotenv/config';
import { prisma } from '../packages/db/src/index';
import { estimateCostCents, summarizeCost } from '../packages/ai/src/index';

async function main() {
  const workspaceId = process.argv[2];
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const records = await prisma.usageRecord.findMany({
    where: {
      kind: 'ai_message',
      createdAt: { gte: since },
      ...(workspaceId ? { workspaceId } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });

  if (records.length === 0) {
    console.info('Nenhum UsageRecord ai_message nas últimas 24h. Mande uma mensagem de teste primeiro.');
    return;
  }

  let totalCents = 0;
  let totalIn = 0;
  let totalOut = 0;
  let totalCached = 0;

  console.info(`▶ ${records.length} mensagens de IA (24h)${workspaceId ? ` · ws=${workspaceId}` : ''}\n`);
  for (const r of records) {
    const meta = (r.metadata as Record<string, unknown> | null) ?? {};
    const model = typeof meta['model'] === 'string' ? meta['model'] : 'claude-sonnet-4-5';
    const cached = typeof meta['cachedTokensIn'] === 'number' ? meta['cachedTokensIn'] : 0;
    const tokensIn = r.tokensIn ?? 0;
    const tokensOut = r.tokensOut ?? 0;
    const cents = r.costCents ?? estimateCostCents(model, { tokensIn, tokensOut, cachedTokensIn: cached });
    const s = summarizeCost(model, { tokensIn, tokensOut, cachedTokensIn: cached });

    totalCents += cents;
    totalIn += tokensIn;
    totalOut += tokensOut;
    totalCached += cached;

    console.info(
      `  ${r.createdAt.toISOString().slice(11, 19)} [${model}] ` +
        `in:${tokensIn} out:${tokensOut} cache:${(s.cacheHitRatio * 100).toFixed(0)}% ` +
        `→ ${s.cents}¢ (${formatBrlCents(s.cents)})`,
    );
  }

  const usd = totalCents / 100;
  const avgCents = totalCents / records.length;
  console.info('\n── total ──────────────────────────────');
  console.info(`mensagens:      ${records.length}`);
  console.info(`tokens in/out:  ${totalIn} / ${totalOut}`);
  console.info(`cache hit:      ${totalIn > 0 ? ((totalCached / totalIn) * 100).toFixed(1) : '0'}%`);
  console.info(`custo total:    ${totalCents}¢ ($${usd.toFixed(4)})`);
  console.info(`custo médio/msg:${avgCents.toFixed(2)}¢ (${formatBrlCents(avgCents)})`);
}

function formatBrlCents(cents: number): string {
  const brl = (cents / 100) * 5.2;
  return `R$ ${brl.toFixed(4).replace('.', ',')}`;
}

main()
  .catch((err) => {
    console.error('❌ Falha:', err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
