import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { prisma } from '@zapai/db';

import { requireWorkspace } from '@/lib/inbox';

import { BroadcastRow } from '../broadcast-row';
import { AutoRefresh } from './auto-refresh';

export const metadata = { title: 'Broadcast' };
export const dynamic = 'force-dynamic';

export default async function BroadcastDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { workspace } = await requireWorkspace();
  const broadcast = await prisma.broadcast.findFirst({
    where: { id, workspaceId: workspace.id },
    include: {
      template: { select: { name: true, language: true, category: true } },
      recipients: {
        take: 200,
        orderBy: { createdAt: 'asc' },
        include: {
          contact: {
            select: { id: true, name: true, phoneE164: true },
          },
        },
      },
      _count: { select: { recipients: true } },
    },
  });
  if (!broadcast) notFound();

  const counts = {
    PENDING: broadcast.recipients.filter((r) => r.status === 'PENDING').length,
    SENT: broadcast.recipients.filter((r) => r.status === 'SENT').length,
    DELIVERED: broadcast.recipients.filter((r) => r.status === 'DELIVERED').length,
    READ: broadcast.recipients.filter((r) => r.status === 'READ').length,
    FAILED: broadcast.recipients.filter((r) => r.status === 'FAILED').length,
    SKIPPED: broadcast.recipients.filter((r) => r.status === 'SKIPPED').length,
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10 md:py-10">
      <Link
        href="/automations/broadcasts"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar para broadcasts
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">
        {broadcast.name}
      </h1>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        <BroadcastRow
          broadcast={{
            id: broadcast.id,
            name: broadcast.name,
            status: broadcast.status,
            templateName: broadcast.template.name,
            templateLanguage: broadcast.template.language,
            recipientCount: broadcast._count.recipients,
            scheduledFor: broadcast.scheduledFor?.toISOString() ?? null,
            startedAt: broadcast.startedAt?.toISOString() ?? null,
            finishedAt: broadcast.finishedAt?.toISOString() ?? null,
            createdAt: broadcast.createdAt.toISOString(),
          }}
        />
      </div>

      <section className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold tracking-tight">Status dos envios</h2>
          {broadcast.status === 'RUNNING' && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              em execução
            </span>
          )}
        </div>

        {/* Progress bar */}
        {(() => {
          const total = broadcast._count.recipients || 1;
          const done = counts.SENT + counts.DELIVERED + counts.READ + counts.FAILED + counts.SKIPPED;
          const pct = Math.round((done / total) * 100);
          const failedPct = Math.round((counts.FAILED / total) * 100);
          return (
            <div className="mt-3">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="flex h-full">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${pct - failedPct}%` }}
                  />
                  <div
                    className="h-full bg-destructive/70 transition-all duration-500"
                    style={{ width: `${failedPct}%` }}
                  />
                </div>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {done.toLocaleString('pt-BR')} / {broadcast._count.recipients.toLocaleString('pt-BR')} ·{' '}
                {pct}%
                {counts.FAILED > 0 && (
                  <span className="text-destructive"> · {counts.FAILED} falhas</span>
                )}
              </p>
            </div>
          );
        })()}

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-6">
          <Stat label="Pendentes" value={counts.PENDING} />
          <Stat label="Enviados" value={counts.SENT} />
          <Stat label="Entregues" value={counts.DELIVERED} accent="primary" />
          <Stat label="Lidos" value={counts.READ} accent="emerald" />
          <Stat label="Falhas" value={counts.FAILED} accent="destructive" />
          <Stat label="Skipped" value={counts.SKIPPED} />
        </div>

        {broadcast.status === 'RUNNING' && <AutoRefresh />}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold tracking-tight">
          Destinatários
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            ({broadcast._count.recipients}
            {broadcast._count.recipients > broadcast.recipients.length
              ? ` — mostrando ${broadcast.recipients.length}`
              : ''}
            )
          </span>
        </h2>
        <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {broadcast.recipients.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm hover:bg-muted/40"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                {(r.contact.name ?? r.contact.phoneE164).slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {r.contact.name ?? r.contact.phoneE164}
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  +{r.contact.phoneE164}
                </p>
              </div>
              <StatusPill status={r.status} />
              {r.errorMessage && (
                <span
                  className="max-w-xs truncate text-xs text-destructive"
                  title={r.errorMessage}
                >
                  {r.errorMessage}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: 'primary' | 'emerald' | 'destructive';
}) {
  const valueClass =
    accent === 'destructive'
      ? 'text-destructive'
      : accent === 'primary'
        ? 'text-primary'
        : accent === 'emerald'
          ? 'text-emerald-600 dark:text-emerald-400'
          : '';
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums tracking-tight ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === 'READ'
      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
      : status === 'DELIVERED' || status === 'SENT'
        ? 'bg-primary/10 text-primary'
        : status === 'FAILED'
          ? 'bg-destructive/10 text-destructive'
          : 'bg-muted text-muted-foreground';
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${tone}`}
    >
      {status.toLowerCase()}
    </span>
  );
}
