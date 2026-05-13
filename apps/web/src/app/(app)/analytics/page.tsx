import { BarChart3, Bot, Headset, Inbox, MessageSquare, Users } from 'lucide-react';
import { prisma, type Prisma } from '@zapai/db';

import { requireWorkspace } from '@/lib/inbox';

import { MessagesPerDayChart, ConversationsByStatusChart, TopTagsChart } from './charts';

export const metadata = { title: 'Analytics' };
export const dynamic = 'force-dynamic';

const DAYS = 14;

interface DailyMessageCount {
  day: string;
  count: bigint;
}

interface TagCount {
  tag: string;
  count: bigint;
}

export default async function AnalyticsPage() {
  const { workspace } = await requireWorkspace();
  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);

  // Métricas em paralelo
  const [
    totalMessages,
    inboundMessages,
    outboundMessages,
    aiMessages,
    totalContacts,
    activeConversations,
    aiHandlingConversations,
    humanHandlingConversations,
    messagesPerDay,
    statusCounts,
    topTagsRaw,
  ] = await prisma.$transaction([
    prisma.message.count({ where: { workspaceId: workspace.id, createdAt: { gte: since } } }),
    prisma.message.count({
      where: { workspaceId: workspace.id, createdAt: { gte: since }, direction: 'INBOUND' },
    }),
    prisma.message.count({
      where: { workspaceId: workspace.id, createdAt: { gte: since }, direction: 'OUTBOUND' },
    }),
    prisma.message.count({
      where: { workspaceId: workspace.id, createdAt: { gte: since }, fromAi: true },
    }),
    prisma.contact.count({ where: { workspaceId: workspace.id, deletedAt: null } }),
    prisma.conversation.count({ where: { workspaceId: workspace.id, status: { not: 'CLOSED' } } }),
    prisma.conversation.count({ where: { workspaceId: workspace.id, status: 'AI_HANDLING' } }),
    prisma.conversation.count({ where: { workspaceId: workspace.id, status: 'HUMAN_HANDLING' } }),
    prisma.$queryRaw<DailyMessageCount[]>`
      SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS day, count(*)::bigint AS count
      FROM "Message"
      WHERE "workspaceId" = ${workspace.id} AND "createdAt" >= ${since}
      GROUP BY 1
      ORDER BY 1 ASC
    ` as Prisma.PrismaPromise<DailyMessageCount[]>,
    prisma.conversation.groupBy({
      by: ['status'],
      where: { workspaceId: workspace.id },
      _count: { _all: true },
      orderBy: { status: 'asc' },
    }),
    prisma.$queryRaw<TagCount[]>`
      SELECT unnest(tags) AS tag, count(*)::bigint AS count
      FROM "Contact"
      WHERE "workspaceId" = ${workspace.id} AND "deletedAt" IS NULL
      GROUP BY tag
      ORDER BY count DESC
      LIMIT 10
    ` as Prisma.PrismaPromise<TagCount[]>,
  ]);

  // Normaliza messagesPerDay pra ter todas as datas (zero-fill)
  const seriesMap = new Map(messagesPerDay.map((r) => [r.day, Number(r.count)]));
  const series: Array<{ date: string; count: number; label: string }> = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    series.push({
      date: key,
      count: seriesMap.get(key) ?? 0,
      label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    });
  }

  const closedCount = (() => {
    const row = statusCounts.find((s) => s.status === 'CLOSED');
    if (!row) return 0;
    const c = row._count as unknown;
    if (typeof c === 'number') return c;
    if (typeof c === 'object' && c !== null && '_all' in c) {
      return Number((c as { _all?: number })._all ?? 0);
    }
    return 0;
  })();

  const statusData = [
    { name: 'IA', value: aiHandlingConversations, color: 'hsl(142 70% 45%)' },
    { name: 'Humano', value: humanHandlingConversations, color: 'hsl(240 5% 65%)' },
    { name: 'Fechadas', value: closedCount, color: 'hsl(240 5% 35%)' },
  ];

  const topTags = topTagsRaw.map((r) => ({ tag: r.tag, count: Number(r.count) }));

  const handoffRate = totalMessages > 0 ? Math.round((humanHandlingConversations / Math.max(activeConversations, 1)) * 100) : 0;

  return (
    <div className="relative overflow-hidden">
      <div className="bg-radial-fade absolute inset-0 -z-10" aria-hidden />
      <div className="mx-auto max-w-6xl px-6 py-12 md:px-10 md:py-16">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Analytics · últimos {DAYS} dias
        </p>
        <h1 className="mt-3 text-4xl font-medium leading-[1.05] tracking-tight md:text-5xl">
          O que tá{' '}
          <span className="font-serif italic font-normal text-primary">acontecendo.</span>
        </h1>

        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Metric icon={MessageSquare} label="Mensagens" value={totalMessages} sublabel={`${inboundMessages} in · ${outboundMessages} out`} />
          <Metric icon={Bot} label="Respondidas por IA" value={aiMessages} sublabel={`${totalMessages > 0 ? Math.round((aiMessages / totalMessages) * 100) : 0}% do total`} />
          <Metric icon={Users} label="Contatos ativos" value={totalContacts} />
          <Metric icon={Inbox} label="Conversas abertas" value={activeConversations} />
        </div>

        <section className="mt-12 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Card title="Mensagens por dia" subtitle="Volume diário (in + out)">
            <MessagesPerDayChart data={series} />
          </Card>
          <Card title="Conversas por status" subtitle="Distribuição atual">
            <ConversationsByStatusChart data={statusData} />
          </Card>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Card title="Top tags" subtitle="Tags mais usadas em contatos">
            {topTags.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Nenhuma tag aplicada ainda.
              </p>
            ) : (
              <TopTagsChart data={topTags} />
            )}
          </Card>
          <Card title="Taxa de handoff humano" subtitle="Quantas conversas precisaram de gente">
            <div className="flex h-48 flex-col items-center justify-center">
              <p className="font-serif text-7xl font-medium tracking-tight text-primary">
                {handoffRate}%
              </p>
              <p className="mt-2 inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground">
                <Headset className="h-3 w-3" />
                conversas humanas
              </p>
            </div>
          </Card>
        </section>

        <p className="mt-10 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <BarChart3 className="h-3 w-3" />
          Métricas atualizadas a cada visita. Em breve: filtro por intervalo, exportação CSV.
        </p>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  sublabel,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  sublabel?: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-2 text-4xl font-medium tabular-nums tracking-tight">
        {value.toLocaleString('pt-BR')}
      </p>
      {sublabel && <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p>}
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-5 md:p-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{subtitle}</p>
        <h3 className="mt-1.5 text-lg font-medium tracking-tight">{title}</h3>
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}
