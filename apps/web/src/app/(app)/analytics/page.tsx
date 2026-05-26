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
    prisma.conversation.count({
      where: { workspaceId: workspace.id, status: { not: 'CLOSED' } },
    }),
    prisma.conversation.count({ where: { workspaceId: workspace.id, status: 'AI_HANDLING' } }),
    prisma.conversation.count({
      where: { workspaceId: workspace.id, status: 'HUMAN_HANDLING' },
    }),
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
    { name: 'IA', value: aiHandlingConversations, color: 'hsl(213 93% 68%)' },
    { name: 'Humano', value: humanHandlingConversations, color: 'hsl(160 70% 55%)' },
    { name: 'Fechadas', value: closedCount, color: 'hsl(220 8% 45%)' },
  ];

  const topTags = topTagsRaw.map((r) => ({ tag: r.tag, count: Number(r.count) }));

  const handoffRate =
    totalMessages > 0
      ? Math.round((humanHandlingConversations / Math.max(activeConversations, 1)) * 100)
      : 0;
  const aiPercent = totalMessages > 0 ? Math.round((aiMessages / totalMessages) * 100) : 0;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 md:px-10 md:py-10">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Últimos {DAYS} dias</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
            Analytics
          </h1>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
          <BarChart3 className="h-3 w-3" />
          Atualizado em tempo real
        </div>
      </div>

      {/* Metrics */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Metric
          icon={MessageSquare}
          label="Mensagens"
          value={totalMessages}
          sublabel={`${inboundMessages} in · ${outboundMessages} out`}
        />
        <Metric
          icon={Bot}
          label="Respondidas por IA"
          value={aiMessages}
          sublabel={`${aiPercent}% do total`}
          accent
        />
        <Metric icon={Users} label="Contatos ativos" value={totalContacts} />
        <Metric icon={Inbox} label="Conversas abertas" value={activeConversations} />
      </div>

      {/* Charts row 1 */}
      <section className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card title="Mensagens por dia" subtitle="Volume diário (in + out)">
          <MessagesPerDayChart data={series} />
        </Card>
        <Card title="Conversas por status" subtitle="Distribuição atual">
          <ConversationsByStatusChart data={statusData} />
        </Card>
      </section>

      {/* Charts row 2 */}
      <section className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card title="Top tags" subtitle="Tags mais usadas em contatos">
          {topTags.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nenhuma tag aplicada ainda.
            </p>
          ) : (
            <TopTagsChart data={topTags} />
          )}
        </Card>
        <Card title="Handoff humano" subtitle="Conversas que precisaram de gente">
          <div className="flex h-48 flex-col items-center justify-center">
            <p className="text-6xl font-semibold tracking-tight text-primary tabular-nums">
              {handoffRate}%
            </p>
            <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <Headset className="h-3 w-3" />
              conversas humanas
            </p>
          </div>
        </Card>
      </section>

      <p className="mt-6 text-xs text-muted-foreground">
        Em breve: filtro por intervalo, exportação CSV, comparação período-anterior.
      </p>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  sublabel,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  sublabel?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/30">
      <div className="flex items-center justify-between">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
            accent ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-4 text-3xl font-semibold tabular-nums tracking-tight">
        {value.toLocaleString('pt-BR')}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
      {sublabel && (
        <p className="mt-2 text-[11px] text-muted-foreground/80">{sublabel}</p>
      )}
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
    <div className="rounded-xl border border-border bg-card p-5 md:p-6">
      <div>
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}
