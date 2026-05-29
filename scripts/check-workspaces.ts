/**
 * Lista workspaces e status de assinatura — pra saber qual workspace de teste
 * está ACTIVE (o gate só deixa o agente atender em ACTIVE/PAST_DUE).
 *
 * Rodar:
 *   pnpm tsx scripts/check-workspaces.ts
 */
import 'dotenv/config';
import { prisma } from '../packages/db/src/index';

async function main() {
  const ws = await prisma.workspace.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      subscription: { select: { status: true, plan: true } },
    },
    orderBy: { createdAt: 'asc' },
    take: 50,
  });

  console.info(`▶ ${ws.length} workspaces\n`);
  console.info('STATUS'.padEnd(13) + 'PLAN'.padEnd(11) + 'SLUG');
  console.info('─'.repeat(50));
  for (const w of ws) {
    const status = w.subscription?.status ?? 'NO-SUB';
    const plan = w.subscription?.plan ?? '-';
    const serving = status === 'ACTIVE' || status === 'PAST_DUE' ? '🟢' : '🔴';
    console.info(`${serving} ${status.padEnd(11)}${plan.padEnd(11)}${w.slug}`);
  }
  const active = ws.filter(
    (w) => w.subscription?.status === 'ACTIVE' || w.subscription?.status === 'PAST_DUE',
  );
  console.info('\n' + (active.length > 0
    ? `✅ ${active.length} workspace(s) atende(m): ${active.map((w) => w.slug).join(', ')}`
    : '⚠️  Nenhum workspace ACTIVE — o agente fica mudo no gate. Ative um pra o teste E2E.'));
}

main()
  .catch((err) => {
    console.error('❌ Falha:', err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
