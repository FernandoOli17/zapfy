import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { prisma } from '@zapai/db';

import { requireWorkspace } from '@/lib/inbox';

import { BroadcastRow } from '../broadcast-row';

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
    <div className="mx-auto max-w-5xl px-6 py-12 md:px-10 md:py-16">
      <Link
        href="/automations/broadcasts"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Broadcasts
      </Link>

      <div className="mt-4 rounded-xl border border-border/60 bg-card/40">
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

      <section className="mt-10">
        <h2 className="text-sm uppercase tracking-widest text-muted-foreground">Status</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-6">
          <Stat label="Pendentes" value={counts.PENDING} />
          <Stat label="Enviados" value={counts.SENT} />
          <Stat label="Entregues" value={counts.DELIVERED} />
          <Stat label="Lidos" value={counts.READ} accent />
          <Stat label="Falhas" value={counts.FAILED} tone="danger" />
          <Stat label="Skipped" value={counts.SKIPPED} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-sm uppercase tracking-widest text-muted-foreground">
          Destinatários ({broadcast._count.recipients}{' '}
          {broadcast._count.recipients > broadcast.recipients.length
            ? `— mostrando ${broadcast.recipients.length}`
            : ''}
          )
        </h2>
        <ul className="mt-3 divide-y divide-border/60 rounded-xl border border-border/60 bg-card/40">
          {broadcast.recipients.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {r.contact.name ?? r.contact.phoneE164}
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  {r.contact.phoneE164}
                </p>
              </div>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {r.status}
              </span>
              {r.errorMessage && (
                <span className="max-w-xs truncate text-xs text-destructive" title={r.errorMessage}>
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
  tone,
}: {
  label: string;
  value: number;
  accent?: boolean;
  tone?: 'danger';
}) {
  const valueClass = tone === 'danger'
    ? 'text-destructive'
    : accent
      ? 'text-primary'
      : '';
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-medium tabular-nums tracking-tight ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}
