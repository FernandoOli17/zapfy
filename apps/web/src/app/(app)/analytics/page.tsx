import { BarChart3, Bot, Clock, Headset, Inbox, MessageSquare, Users, Zap } from 'lucide-react';
import { prisma, type Prisma } from '@zapfy/db';

import { requireWorkspace } from '@/lib/inbox';
import { Sparkline } from '@/components/charts/sparkline';

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

interface DailyHandoffRow {
  day: string;
  handoffs: bigint;
  total: bigint;
}

interface HourBucket {
  hour: number;
  count: bigint;
}

interface DailyResponseTimeRow {
  day: string;
  avg_seconds: number;
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
      SELECT
        to_char(date_trunc('day', "createdAt" AT TIME ZONE 'America/Sao_Paulo'), 'YYYY-MM-DD') AS day,
        count(*)::bigint AS count
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

  // Métricas adicionais (queries paralelas, fora da transação principal pra simplificar)
  const [handoffSeries, hourBuckets, responseTimeSeries] = await Promise.all([
    // Handoff por dia: conversas que viraram HUMAN_HANDLING / total iniciadas
    prisma.$queryRaw<DailyHandoffRow[]>`
      SELECT
        to_char(date_trunc('day', "createdAt" AT TIME ZONE 'America/Sao_Paulo'), 'YYYY-MM-DD') AS day,
        count(*) FILTER (WHERE status = 'HUMAN_HANDLING')::bigint AS handoffs,
        count(*)::bigint AS total
      FROM "Conversation"
      WHERE "workspaceId" = ${workspace.id} AND "createdAt" >= ${since}
      GROUP BY 1
      ORDER BY 1 ASC
    `,
    // Hora de pico (msg inbound por hora do dia, agregado nos últimos N dias)
    prisma.$queryRaw<HourBucket[]>`
      SELECT
        extract(hour FROM "createdAt" AT TIME ZONE 'America/Sao_Paulo')::int AS hour,
        count(*)::bigint AS count
      FROM "Message"
      WHERE "workspaceId" = ${workspace.id}
        AND "createdAt" >= ${since}
        AND direction = 'INBOUND'
      GROUP BY 1
      ORDER BY 1 ASC
    `,
    // Tempo médio de resposta: gap entre msg INBOUND e próxima OUTBOUND da mesma conversa.
    // LATERAL JOIN + LIMIT 1 evita o nested-loop scan da subquery correlacionada.
    // Cap em 5k inbound rows por workspace pra blindar contra DoS em workspace
    // grande — métrica vira amostra acima desse volume.
    prisma.$queryRaw<DailyResponseTimeRow[]>`
      WITH inbounds AS (
        SELECT "id", "conversationId", "createdAt"
        FROM "Message"
        WHERE "workspaceId" = ${workspace.id}
          AND direction = 'INBOUND'
          AND "createdAt" >= ${since}
        ORDER BY "createdAt" DESC
        LIMIT 5000
      ),
      paired AS (
        SELECT
          i."createdAt" AS in_at,
          o."createdAt" AS out_at
        FROM inbounds i
        LEFT JOIN LATERAL (
          SELECT "createdAt"
          FROM "Message" m_out
          WHERE m_out."conversationId" = i."conversationId"
            AND m_out.direction = 'OUTBOUND'
            AND m_out."createdAt" > i."createdAt"
            AND m_out."createdAt" < i."createdAt" + interval '6 hours'
          ORDER BY m_out."createdAt" ASC
          LIMIT 1
        ) o ON true
      )
      SELECT
        to_char(date_trunc('day', in_at AT TIME ZONE 'America/Sao_Paulo'), 'YYYY-MM-DD') AS day,
        avg(extract(epoch FROM (out_at - in_at)))::float AS avg_seconds
      FROM paired
      WHERE out_at IS NOT NULL
      GROUP BY 1
      ORDER BY 1 ASC
    `,
  ]);

  const seriesMap = new Map(messagesPerDay.map((r) => [r.day, Number(r.count)]));
  const series: Array<{ date: string; count: number; label: string }> = [];
  // Series keys precisam bater com o que SQL devolve. SQL bucketeia em BRT
  // (America/Sao_Paulo), então buildamos as keys em BRT também usando
  // pt-BR formatter parcial.
  const fmtKey = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const fmtLabel = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
  });
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = fmtKey.format(d); // YYYY-MM-DD em BRT
    series.push({
      date: key,
      count: seriesMap.get(key) ?? 0,
      label: fmtLabel.format(d),
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

  // Série de handoff% por dia (aligns com `series` do daily messages)
  const handoffMap = new Map(
    handoffSeries.map((r) => [
      r.day,
      Number(r.total) > 0 ? Math.round((Number(r.handoffs) / Number(r.total)) * 100) : 0,
    ]),
  );
  const handoffByDay = series.map((s) => ({
    label: s.label,
    value: handoffMap.get(s.date) ?? 0,
  }));

  // Resposta média por dia
  const responseMap = new Map(
    responseTimeSeries.map((r) => [r.day, Math.round(Number(r.avg_seconds))]),
  );
  const responseByDay = series.map((s) => ({
    label: s.label,
    value: responseMap.get(s.date) ?? 0,
  }));
  const respValues = responseByDay.map((d) => d.value).filter((v) => v > 0);
  const avgResponseSeconds =
    respValues.length > 0 ? Math.round(respValues.reduce((a, b) => a + b, 0) / respValues.length) : 0;

  // Hora de pico — bucket 24 horas com 0 default
  const hourMap = new Map(hourBuckets.map((h) => [h.hour, Number(h.count)]));
  const hoursOfDay: Array<{ label: string; value: number }> = [];
  for (let h = 0; h < 24; h++) {
    hoursOfDay.push({
      label: `${h.toString().padStart(2, '0')}h`,
      value: hourMap.get(h) ?? 0,
    });
  }
  const peakHourCandidate = hoursOfDay.reduce(
    (acc, cur) => (cur.value > acc.value ? cur : acc),
    hoursOfDay[0]!,
  );
  // Quando nenhuma hora teve msg, "00h" não é informativo — exibe "—"
  const peakHour = peakHourCandidate.value > 0 ? peakHourCandidate : { label: '—', value: 0 };

  function formatDuration(seconds: number): string {
    if (seconds === 0) return '—';
    if (seconds < 60) return `${seconds}s`;
    return `${Math.round(seconds / 60)}min`;
  }

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

      {/* Métricas secundárias */}
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <MiniMetric
          icon={Headset}
          label="Handoff humano"
          value={`${handoffRate}%`}
          sublabel="agora"
        />
        <MiniMetric
          icon={Clock}
          label="Resposta média"
          value={formatDuration(avgResponseSeconds)}
          sublabel="primeira resposta"
        />
        <MiniMetric
          icon={Zap}
          label="Hora de pico"
          value={peakHour.label}
          sublabel={`${peakHour.value} msgs`}
        />
        <MiniMetric
          icon={Bot}
          label="% IA"
          value={`${aiPercent}%`}
          sublabel="vs humano"
          accent
        />
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
        <Card title="Handoff por dia" subtitle="% conversas que viraram humanas">
          <div className="h-32 text-amber-600 dark:text-amber-400">
            <Sparkline data={handoffByDay} height={120} format="percent" colorClass="text-amber-500" />
          </div>
        </Card>
      </section>

      {/* Charts row 3 — novos */}
      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Tempo de resposta" subtitle="Primeira resposta após msg do cliente">
          <div className="h-32">
            <Sparkline data={responseByDay} height={120} format="duration" colorClass="text-sky-500" />
          </div>
          {avgResponseSeconds > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Média no período: <strong className="text-foreground">{formatDuration(avgResponseSeconds)}</strong>
            </p>
          )}
        </Card>
        <Card title="Hora de pico" subtitle="Mensagens recebidas por hora (BRT)">
          <div className="h-32">
            <Sparkline data={hoursOfDay} height={120} colorClass="text-violet-500" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Pico: <strong className="text-foreground">{peakHour.label}</strong> ({peakHour.value} mensagens)
          </p>
        </Card>
      </section>

      <p className="mt-6 text-xs text-muted-foreground">
        Em breve: filtro por intervalo, exportação CSV, comparação período-anterior.
      </p>
    </div>
  );
}

function MiniMetric({
  icon: Icon,
  label,
  value,
  sublabel,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sublabel?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-1.5">
        <Icon className={`h-3 w-3 ${accent ? 'text-primary' : 'text-muted-foreground'}`} />
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      </div>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      {sublabel && <p className="text-[10px] text-muted-foreground/80">{sublabel}</p>}
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
