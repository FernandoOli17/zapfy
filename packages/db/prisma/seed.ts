import { PrismaClient, WorkspaceRole, Vertical, PlanId, SubscriptionStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.info('🌱 Seeding Zapfy dev data…');

  const user = await prisma.user.upsert({
    where: { email: 'demo@zapfy.dev' },
    update: {},
    create: {
      email: 'demo@zapfy.dev',
      name: 'Demo Owner',
      emailVerified: true,
    },
  });

  const workspace = await prisma.workspace.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      slug: 'demo',
      name: 'Workspace Demo',
    },
  });

  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: { workspaceId: workspace.id, userId: user.id },
    },
    update: { role: WorkspaceRole.OWNER },
    create: {
      workspaceId: workspace.id,
      userId: user.id,
      role: WorkspaceRole.OWNER,
    },
  });

  const trialDays = 7;
  const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);
  await prisma.subscription.upsert({
    where: { workspaceId: workspace.id },
    update: {},
    create: {
      workspaceId: workspace.id,
      plan: PlanId.STARTER,
      status: SubscriptionStatus.TRIALING,
      trialEndsAt,
    },
  });

  const agent = await prisma.agent.upsert({
    where: { id: `seed-agent-${workspace.id}` },
    update: {},
    create: {
      id: `seed-agent-${workspace.id}`,
      workspaceId: workspace.id,
      name: 'Agente Demo',
      vertical: Vertical.OTHER,
    },
  });

  const existingVersion = await prisma.agentVersion.findFirst({
    where: { agentId: agent.id, versionNumber: 1 },
  });

  const version =
    existingVersion ??
    (await prisma.agentVersion.create({
      data: {
        agentId: agent.id,
        versionNumber: 1,
        systemPrompt:
          'Você é o agente demo do Zapfy. Atende em pt-BR, tom amigável e direto. Quando não souber, ofereça falar com um humano.',
        personality: {
          tone: 'amigável',
          formality: 'informal',
          emoji: 'moderado',
          neverSay: [],
        },
        toolsEnabled: ['search_knowledge', 'transfer_to_human', 'set_contact_field'],
        handoffRules: {
          keywords: ['humano', 'atendente', 'pessoa'],
          conditions: ['reclamação', 'pedido fora do padrão'],
        },
        businessHours: {
          timezone: 'America/Sao_Paulo',
          mondayToFriday: { start: '09:00', end: '18:00' },
          saturday: { start: '09:00', end: '13:00' },
          sunday: null,
        },
      },
    }));

  await prisma.agent.update({
    where: { id: agent.id },
    data: { currentVersionId: version.id },
  });

  console.info('✅ Seed completo.');
  console.info(`   User:      ${user.email} (${user.id})`);
  console.info(`   Workspace: ${workspace.slug} (${workspace.id})`);
  console.info(`   Agent:     ${agent.name} v${version.versionNumber}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err: unknown) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
