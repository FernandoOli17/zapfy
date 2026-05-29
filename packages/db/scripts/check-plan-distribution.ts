/**
 * Conta assinaturas por plano + status. Leitura only — pra validar segurança
 * pós-migração (código antigo no ar não conhece BUSINESS).
 *
 * Uso: pnpm --filter @zapfy/db exec dotenv -e ../../.env -- tsx scripts/check-plan-distribution.ts
 */
import { prisma } from '../src/index';

async function main() {
  const byPlan = await prisma.subscription.groupBy({
    by: ['plan'],
    _count: { _all: true },
  });
  const byStatus = await prisma.subscription.groupBy({
    by: ['status'],
    _count: { _all: true },
  });
  console.info('Por plano:', JSON.stringify(byPlan));
  console.info('Por status:', JSON.stringify(byStatus));
  const business = byPlan.find((r) => r.plan === 'BUSINESS')?._count._all ?? 0;
  console.info(
    business > 0
      ? `⚠️ ${business} assinatura(s) BUSINESS — código antigo no ar pode quebrar ao ler. Deployar refactor logo.`
      : '✅ Nenhuma assinatura BUSINESS — código antigo no ar continua seguro.',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
