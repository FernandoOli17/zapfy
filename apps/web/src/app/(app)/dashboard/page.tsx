import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Inbox,
  Phone,
  Sparkles,
  Users,
} from 'lucide-react';
import { prisma } from '@zapai/db';
import { Button } from '@zapai/ui';

import { auth } from '@/lib/auth';

export const metadata = { title: 'Dashboard' };

type Action = {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  ready: boolean;
  span: 'col-span-1' | 'md:col-span-2' | 'md:col-span-3';
};

const ACTIONS: Action[] = [
  {
    title: 'Conversar com o Forge',
    description:
      'Configure seu agente em linguagem natural. Vertical, tom, tools, handoff. Tudo gerado e versionado.',
    href: '/forge',
    icon: Sparkles,
    ready: false,
    span: 'md:col-span-2',
  },
  {
    title: 'Conectar WhatsApp',
    description: 'Cole as credenciais do seu Meta App pra começar a atender via Cloud API oficial.',
    href: '/whatsapp',
    icon: Phone,
    ready: false,
    span: 'col-span-1',
  },
  {
    title: 'Abrir Inbox',
    description: 'Conversas em tempo real, com IA e humanos no mesmo lugar.',
    href: '/inbox',
    icon: Inbox,
    ready: false,
    span: 'col-span-1',
  },
  {
    title: 'Base de conhecimento',
    description: 'Suba documentos, FAQs ou links. O agente busca no RAG quando precisar.',
    href: '/knowledge',
    icon: BookOpen,
    ready: false,
    span: 'md:col-span-2',
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
  ]);
  const [contactsCount, convosCount, agentsCount, docsCount] = counts;

  return (
    <div className="relative overflow-hidden">
      <div className="bg-radial-fade absolute inset-0 -z-10" aria-hidden />
      <div className="mx-auto max-w-6xl px-6 py-12 md:px-10 md:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Bem-vindo de volta
            </p>
            <h1 className="mt-3 text-4xl font-medium leading-[1.05] tracking-tight md:text-5xl">
              {ws.name},{' '}
              <span className="font-serif italic font-normal text-primary">por aqui.</span>
            </h1>
          </div>
          <PlanBadge plan={sub?.plan ?? 'STARTER'} status={sub?.status ?? 'TRIALING'} days={daysLeft} />
        </div>

        <p className="mt-4 max-w-xl text-muted-foreground md:text-lg">
          Configure o agente conversando com o Forge, conecte o WhatsApp e comece a atender em
          minutos. Esses três passos abaixo são o caminho.
        </p>

        {/* Stats */}
        <div className="mt-12 grid grid-cols-2 gap-4 border-t border-border/60 pt-8 md:grid-cols-4">
          <Stat label="Agentes" value={agentsCount} icon={Sparkles} />
          <Stat label="Contatos" value={contactsCount} icon={Users} />
          <Stat label="Conversas" value={convosCount} icon={Inbox} />
          <Stat label="Documentos" value={docsCount} icon={BookOpen} />
        </div>

        {/* Bento de ações */}
        <h2 className="mt-16 text-sm uppercase tracking-widest text-muted-foreground">
          Próximos passos
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {ACTIONS.map((a) => (
            <ActionCard key={a.title} {...a} />
          ))}
        </div>

        {/* Forge hint */}
        <div className="relative mt-16 overflow-hidden rounded-2xl border border-primary/30 bg-primary/5 p-8 md:p-12">
          <div className="bg-dot-grid absolute inset-0 opacity-20" aria-hidden />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <p className="text-xs uppercase tracking-widest text-primary">Comece por aqui</p>
              <h3 className="mt-3 text-3xl font-medium leading-tight tracking-tight md:text-4xl">
                Conversa com o{' '}
                <span className="font-serif italic font-normal">Forge</span> e ele monta seu
                agente.
              </h3>
              <p className="mt-3 text-muted-foreground">
                Pode começar agora. Ele entrevista seu negócio, detecta o vertical e propõe
                personalidade, tools e handoff. Em 5 minutos você publica a v1.
              </p>
            </div>
            <Button asChild size="lg" className="h-12 px-6 self-start md:self-auto" disabled>
              <Link href="/forge">
                Abrir o Forge
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
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
    <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/40 px-3 py-1.5 text-xs backdrop-blur">
      <span className="font-medium tracking-wider uppercase">{plan}</span>
      <span className="text-muted-foreground">·</span>
      <span className={isTrial ? 'text-primary' : 'text-muted-foreground'}>
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
    <div>
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-2 text-4xl font-medium tracking-tight md:text-5xl">{value}</div>
    </div>
  );
}

function ActionCard({ title, description, href, icon: Icon, ready, span }: Action) {
  const content = (
    <div className="relative h-full overflow-hidden rounded-xl border border-border/60 bg-card/40 p-6 transition group-hover:border-primary/40 group-hover:bg-card">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        {!ready && (
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            em breve
          </span>
        )}
      </div>
      <h3 className="mt-5 text-lg font-medium tracking-tight">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
      {ready && (
        <div className="mt-4 inline-flex items-center gap-1 text-sm text-primary opacity-0 transition group-hover:opacity-100">
          Abrir <ArrowRight className="h-3.5 w-3.5" />
        </div>
      )}
    </div>
  );

  if (!ready) {
    return <div className={`group cursor-not-allowed opacity-70 ${span}`}>{content}</div>;
  }
  return (
    <Link href={href} className={`group ${span}`}>
      {content}
    </Link>
  );
}
