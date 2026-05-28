import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import { AlertTriangle, Code2, Network, Sparkles, Wrench } from 'lucide-react';
import { prisma } from '@zapfy/db';

import { auth } from '@/lib/auth';

import { DeveloperWorkspace } from './developer-workspace';

export const metadata = { title: 'Modo desenvolvedor' };
export const dynamic = 'force-dynamic';

export default async function DeveloperPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  const member = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    include: {
      workspace: {
        include: {
          agents: {
            take: 1,
            orderBy: { createdAt: 'asc' },
            include: { currentVersion: true },
          },
          customTools: {
            orderBy: { createdAt: 'desc' },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  if (!member) redirect('/onboarding');

  const isOwnerOrAdmin = member.role === 'OWNER' || member.role === 'ADMIN';
  const devModeOn = member.workspace.developerModeEnabled;

  if (!isOwnerOrAdmin) {
    return (
      <Forbidden message="Modo desenvolvedor é restrito a OWNER ou ADMIN do workspace." />
    );
  }
  if (!devModeOn) {
    return <DevModeOff />;
  }

  const agent = member.workspace.agents[0];
  if (!agent || !agent.currentVersion) {
    return (
      <NoAgent />
    );
  }

  return (
    <DeveloperWorkspace
      agent={{
        id: agent.id,
        name: agent.name,
        vertical: agent.vertical,
        currentVersion: {
          id: agent.currentVersion.id,
          versionNumber: agent.currentVersion.versionNumber,
          systemPrompt: agent.currentVersion.systemPrompt,
          customToolNames: agent.currentVersion.customToolNames,
          flowGraph:
            (agent.currentVersion.flowGraph as Record<string, unknown> | null) ?? null,
        },
      }}
      customTools={member.workspace.customTools.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        endpoint: t.endpoint,
        secretPrefix: t.secretPrefix,
        active: t.active,
        createdAt: t.createdAt.toISOString(),
      }))}
    />
  );
}

function Forbidden({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-center">
      <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
      <h1 className="mt-4 text-2xl font-semibold">Acesso negado</h1>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      <Link
        href="/dashboard"
        className="mt-6 inline-block text-sm font-medium text-primary hover:text-primary/80"
      >
        Voltar ao dashboard
      </Link>
    </div>
  );
}

function DevModeOff() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-center">
      <Code2 className="mx-auto h-10 w-10 text-muted-foreground" />
      <h1 className="mt-4 text-2xl font-semibold">Modo desenvolvedor desativado</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        O modo desenvolvedor libera um editor visual de fluxos (drag &amp; drop estilo n8n),
        criação de ferramentas HTTP customizadas com HMAC, e edição direta do system prompt do
        agente. Use só se sabe o que está fazendo — bypassa as proteções do Forge.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Feature icon={Network} title="Flow editor" desc="Drag/drop de blocos, condicionais, RAG." />
        <Feature icon={Wrench} title="Tools custom" desc="HTTP + HMAC, JSON Schema." />
        <Feature icon={Sparkles} title="Prompt raw" desc="Editor de system prompt bruto." />
      </div>
      <Link
        href="/settings"
        className="mt-8 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
      >
        Ativar em /settings
      </Link>
    </div>
  );
}

function NoAgent() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-center">
      <Sparkles className="mx-auto h-10 w-10 text-muted-foreground" />
      <h1 className="mt-4 text-2xl font-semibold">Nenhum agente publicado</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Crie um agente pelo Forge primeiro, depois volte aqui pra customizar.
      </p>
      <Link
        href="/forge"
        className="mt-6 inline-block text-sm font-medium text-primary hover:text-primary/80"
      >
        Abrir Forge
      </Link>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-left">
      <Icon className="h-4 w-4 text-primary" />
      <p className="mt-2 text-sm font-medium">{title}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
    </div>
  );
}
