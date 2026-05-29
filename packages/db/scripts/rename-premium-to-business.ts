/**
 * Renomeia o valor de enum PlanId 'PREMIUM' -> 'BUSINESS' preservando dados.
 * Idempotente: se 'PREMIUM' não existe mais, não faz nada.
 *
 * Uso: npx tsx --env-file=.env packages/db/scripts/rename-premium-to-business.ts
 */
import { prisma } from '../src/index';

async function main() {
  const rows = await prisma.$queryRawUnsafe<Array<{ enumlabel: string }>>(
    `SELECT e.enumlabel::text AS enumlabel FROM pg_enum e
     JOIN pg_type t ON t.oid = e.enumtypid
     WHERE t.typname = 'PlanId'`,
  );
  const labels = rows.map((r) => r.enumlabel);
  console.info('Valores atuais de PlanId:', labels.join(', '));

  if (labels.includes('BUSINESS')) {
    console.info("'BUSINESS' já existe — nada a fazer.");
    return;
  }
  if (!labels.includes('PREMIUM')) {
    console.info("'PREMIUM' não existe — nada a renomear.");
    return;
  }
  await prisma.$executeRawUnsafe(`ALTER TYPE "PlanId" RENAME VALUE 'PREMIUM' TO 'BUSINESS'`);
  console.info("✅ 'PREMIUM' renomeado para 'BUSINESS'.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
