import Link from 'next/link';
import { ArrowRight, Megaphone, Plus } from 'lucide-react';
import { prisma } from '@zapai/db';

import { requireWorkspace } from '@/lib/inbox';

import { BroadcastRow } from './broadcast-row';
import { AutomationsTabs } from '../tabs';

export const metadata = { title: 'Broadcasts' };
export const dynamic = 'force-dynamic';

export default async function BroadcastsPage() {
  const { workspace } = await requireWorkspace();
  const broadcasts = await prisma.broadcast.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: 'desc' },
    include: {
      template: { select: { name: true, language: true } },
      _count: { select: { recipients: true } },
    },
  });

  const counts = {
    DRAFT: broadcasts.filter((b) => b.status === 'DRAFT').length,
    SCHEDULED: broadcasts.filter((b) => b.status === 'SCHEDULED').length,
    RUNNING: broadcasts.filter((b) => b.status === 'RUNNING').length,
    COMPLETED: broadcasts.filter((b) => b.status === 'COMPLETED').length,
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10 md:py-10">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Automações</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
            Broadcasts
          </h1>
        </div>
        <Link
          href="/automations/broadcasts/new"
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Novo broadcast
        </Link>
      </div>

      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Envie um template HSM aprovado pra uma lista de contatos. Filtra por tag, escolhe todos
        ou IDs específicos. Respeita opt-out e contatos deletados.
      </p>

      <div className="mt-5">
        <AutomationsTabs current="broadcasts" />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Rascunhos" value={counts.DRAFT} />
        <Stat label="Agendados" value={counts.SCHEDULED} accent="amber" />
        <Stat label="Rodando" value={counts.RUNNING} accent="primary" />
        <Stat label="Concluídos" value={counts.COMPLETED} accent="emerald" />
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-semibold tracking-tight">Seus broadcasts</h2>
        {broadcasts.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Megaphone className="h-6 w-6 text-primary" />
            </div>
            <p className="mt-4 font-medium">Nenhum broadcast ainda.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Crie um broadcast pra disparar uma campanha. Precisa de pelo menos um template
              aprovado.
            </p>
            <Link
              href="/automations/broadcasts/new"
              className="mt-6 inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Criar primeiro broadcast
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {broadcasts.map((b) => (
              <li key={b.id}>
                <BroadcastRow
                  broadcast={{
                    id: b.id,
                    name: b.name,
                    status: b.status,
                    templateName: b.template.name,
                    templateLanguage: b.template.language,
                    recipientCount: b._count.recipients,
                    scheduledFor: b.scheduledFor?.toISOString() ?? null,
                    startedAt: b.startedAt?.toISOString() ?? null,
                    finishedAt: b.finishedAt?.toISOString() ?? null,
                    createdAt: b.createdAt.toISOString(),
                  }}
                />
              </li>
            ))}
          </ul>
        )}
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
  accent?: 'primary' | 'emerald' | 'amber';
}) {
  const valueClass =
    accent === 'primary'
      ? 'text-primary'
      : accent === 'emerald'
        ? 'text-emerald-600 dark:text-emerald-400'
        : accent === 'amber'
          ? 'text-amber-600 dark:text-amber-400'
          : '';
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums tracking-tight ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}
