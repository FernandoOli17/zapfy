/**
 * Inspeciona o AgentVersion publicado de um workspace (read-only) — pra saber se
 * o system prompt é real (gerado pelo Forge) ou canned/mock. systemPrompt não é
 * segredo. Rodar: pnpm tsx scripts/inspect-agent.ts [slug]
 */
import 'dotenv/config';
import { prisma } from '../packages/db/src/index';

async function main() {
  const slug = process.argv[2] ?? 'granvilla-pet-shop';
  const ws = await prisma.workspace.findFirst({ where: { slug }, select: { id: true } });
  if (!ws) {
    console.info(`workspace "${slug}" não encontrado`);
    return;
  }
  const agent = await prisma.agent.findFirst({
    where: { workspaceId: ws.id },
    select: { id: true, name: true, vertical: true, currentVersionId: true },
  });
  console.info(`agent: ${agent?.name} · vertical: ${agent?.vertical} · currentVersionId: ${agent?.currentVersionId ?? 'NENHUM'}`);
  if (!agent?.currentVersionId) return;

  const v = await prisma.agentVersion.findUnique({
    where: { id: agent.currentVersionId },
    select: { versionNumber: true, systemPrompt: true, toolsEnabled: true },
  });
  const sp = v?.systemPrompt ?? '';
  const cannedMarker = sp.includes('[mock]') || sp.includes('canned') || sp.length < 120;
  console.info(`versão: v${v?.versionNumber} · systemPrompt: ${sp.length} chars · tools: ${JSON.stringify(v?.toolsEnabled)}`);
  console.info(`parece ${cannedMarker ? '⚠️ CANNED/curto' : '🟢 real (longo)'}`);
  console.info('--- primeiros 300 chars ---');
  console.info(sp.slice(0, 300));
}

main()
  .catch((e) => {
    console.error('ERRO:', e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
