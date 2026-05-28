import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Inbox,
  Phone,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { prisma } from '@zapfy/db';
import { Button } from '@zapfy/ui';

import { auth } from '@/lib/auth';

import { OnboardingChecklist } from './onboarding-checklist';

export const metadata = { title: 'Dashboard' };

type Action = {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  ready: boolean;
  accent?: 'primary' | 'neutral';
};

const ACTIONS: Action[] = [
  {
    title: 'Conversar com o Forge',
    description:
      'Configure seu agente em linguagem natural. Vertical, tom, tools, handoff — gerado e versionado.',
    href: '/forge',
    icon: Sparkles,
    ready: true,
    accent: 'primary',
  },
  {
    title: 'Conectar WhatsApp',
    description:
      'Cole as credenciais do seu Meta App pra começar a atender via Cloud API oficial.',
    href: '/whatsapp',
    icon: Phone,
    ready: true,
  },
  {
    title: 'Abrir Inbox',
    description: 'Conversas em tempo real, com IA e humanos no mesmo lugar.',
    href: '/inbox',
    icon: Inbox,
    ready: true,
  },
  {
    title: 'Base de conhecimento',
    description: 'Suba documentos, FAQs ou links. O agente busca no RAG quando precisar.',
    href: '/knowledge',
    icon: BookOpen,
    ready: false,
  },
];

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  const member = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    include: { workspace: { include: { subscription: true } } },
    orderBy: { createdAt: 'asc' },
  });
  if (!member) redirect('/onboarding');

  const ws = member.workspace;
  const sub = ws.subscription;
  const trialEndsAt = sub?.trialEndsAt;
  const daysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86_400_000))
    : null;

  const counts = await prisma.$transaction([
    prisma.contact.count({ where: { workspaceId: ws.id } }),
    prisma.conversation.count({ where: { workspaceId: ws.id } }),
    prisma.agent.count({ where: { workspaceId: ws.id } }),
    prisma.knowledgeDocument.count({ where: { workspaceId: ws.id } }),
    prisma.agent.count({ where: { workspaceId: ws.id, currentVersionId: { not: null } } }),
    prisma.whatsAppAccount.count({ where: { workspaceId: ws.id, status: 'CONNECTED' } }),
    prisma.workspaceMember.count({ where: { workspaceId: ws.id } }),
    prisma.message.count({ where: { workspaceId: ws.id } }),
  ]);
  const [contactsCount, convosCount, agentsCount, docsCount, publishedAgents, waConnected, memberCount, messageCount] = counts;

  const onboardingStatus = {
    forgeComplete: publishedAgents > 0,
    whatsappConnected: waConnected > 0,
    knowledgeBaseStarted: docsCount > 0,
    teamInvited: memberCount > 1,
    firstMessage: messageCount > 0,
  };

  const userName = session.user.name?.split(' ')[0] ?? session.user.email.split('@')[0] ?? 'lá';

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 md:px-10 md:py-10">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Olá, {userName}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
            Dashboard
          </h1>
        </div>
        <PlanBadge
          plan={sub?.plan ?? 'STARTER'}
          status={sub?.status ?? 'TRIALING'}
          days={daysLeft}
        />
      </div>

      {/* Onboarding checklist — some quando 100% completo */}
      <div className="mt-6">
        <OnboardingChecklist workspaceSlug={ws.slug} status={onboardingStatus} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Stat label="Agentes" value={agentsCount} icon={Sparkles} />
        <Stat label="Contatos" value={contactsCount} icon={Users} />
        <Stat label="Conversas" value={convosCount} icon={Inbox} />
        <Stat label="Documentos" value={docsCount} icon={BookOpen} />
      </div>

      {/* Forge CTA */}
      <div className="relative mt-8 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-primary/[0.02] to-transparent p-6 md:p-8">
        <div
          className="absolute inset-0 opacity-50"
          aria-hidden
          style={{
            background:
              'radial-gradient(ellipse 60% 80% at 100% 0%, color-mix(in srgb, hsl(213 93% 60%) 14%, transparent), transparent 70%)',
          }}
        />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
              <Sparkles className="h-3 w-3" />
              Recomendado
            </div>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
              Comece conversando com o{' '}
              <span className="font-serif italic font-normal text-primary">Forge</span>
            </h3>
            <p className="mt-2 text-sm text-muted-foreground md:text-base">
              Ele entrevista seu negócio, detecta o vertical e propõe personalidade, tools e
              handoff. Em 5 minutos você publica a v1.
            </p>
          </div>
          <Button asChild size="lg" className="h-11 px-5 self-start md:self-auto">
            <Link href="/forge">
              Abrir o Forge
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Próximos passos */}
      <div className="mt-10 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight">Próximos passos</h2>
        <Link
          href="/forge"
          className="text-xs font-medium text-primary hover:text-primary/80 inline-flex items-center gap-1"
        >
          Ver tudo <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        {ACTIONS.map((a) => (
          <ActionCard key={a.title} {...a} />
        ))}
      </div>

      {/* Activity teaser */}
      <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Atividade recente</h3>
              <p className="text-xs text-muted-foreground">Conversas e eventos das últimas 24h</p>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-6 flex h-32 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
            <p className="text-xs text-muted-foreground">
              Conecte o WhatsApp pra começar a registrar atividade.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">Status do workspace</h3>
          <p className="text-xs text-muted-foreground">Resumo da configuração atual</p>
          <ul className="mt-5 space-y-3 text-sm">
            <StatusRow label="Agente IA" done={agentsCount > 0} cta="Configurar" href="/agent" />
            <StatusRow label="WhatsApp" done={false} cta="Conectar" href="/whatsapp" />
            <StatusRow
              label="Base de conhecimento"
              done={docsCount > 0}
              cta="Subir docs"
              href="/knowledge"
            />
            <StatusRow label="Time" done={false} cta="Convidar" href="/team" />
          </ul>
        </div>
      </div>
    </div>
  );
}

function PlanBadge({
  plan,
  status,
  days,
}: {
  plan: string;
  status: string;
  days: number | null;
}) {
  const isTrial = status === 'TRIALING';
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs shadow-sm">
      <span className="font-semibold uppercase tracking-wider">{plan}</span>
      <span className="text-muted-foreground/40">·</span>
      <span className={isTrial ? 'text-primary font-medium' : 'text-muted-foreground'}>
        {isTrial && days !== null
          ? `${days} dia${days === 1 ? '' : 's'} de trial`
          : status.toLowerCase()}
      </span>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30">
      <div className="flex items-center justify-between">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function ActionCard({ title, description, href, icon: Icon, ready, accent }: Action) {
  const isPrimary = accent === 'primary';
  const content = (
    <div
      className={`relative flex h-full flex-col overflow-hidden rounded-xl border p-5 transition-all ${
        isPrimary
          ? 'border-primary/30 bg-primary/[0.04] group-hover:border-primary/50 group-hover:bg-primary/[0.07]'
          : 'border-border bg-card group-hover:border-primary/30 group-hover:shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${
            isPrimary ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
        {!ready && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            em breve
          </span>
        )}
      </div>
      <h3 className="mt-4 text-base font-semibold tracking-tight">{title}</h3>
      <p className="mt-1 flex-1 text-xs text-muted-foreground">{description}</p>
      {ready && (
        <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
          Abrir
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </div>
      )}
    </div>
  );

  if (!ready) {
    return <div className="group cursor-not-allowed opacity-60">{content}</div>;
  }
  return (
    <Link href={href} className="group">
      {content}
    </Link>
  );
}

function StatusRow({
  label,
  done,
  cta,
  href,
}: {
  label: string;
  done: boolean;
  cta: string;
  href: string;
}) {
  return (
    <li className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
            done
              ? 'bg-primary/15 text-primary'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {done ? '✓' : '○'}
        </span>
        <span className={done ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
      </div>
      {!done && (
        <Link
          href={href}
          className="text-xs font-medium text-primary hover:text-primary/80"
        >
          {cta}
        </Link>
      )}
    </li>
  );
}
