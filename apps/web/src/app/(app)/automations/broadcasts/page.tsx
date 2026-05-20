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
    <div className="relative overflow-hidden">
      <div className="bg-radial-fade absolute inset-0 -z-10" aria-hidden />
      <div className="mx-auto max-w-5xl px-6 py-12 md:px-10 md:py-16">
        <AutomationsTabs current="broadcasts" />

        <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Automations · Broadcasts
            </p>
            <h1 className="mt-3 text-4xl font-medium leading-[1.05] tracking-tight md:text-5xl">
              Disparo em{' '}
              <span className="font-serif italic font-normal text-primary">massa.</span>
            </h1>
          </div>
          <Link
            href="/automations/broadcasts/new"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Novo broadcast
          </Link>
        </div>

        <p className="mt-4 max-w-2xl text-muted-foreground md:text-lg">
          Envie um template HSM aprovado pra uma lista de contatos. Filtra por tag, escolhe
          todos ou IDs específicos. Respeita opt-out e contatos deletados.
        </p>

        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Rascunhos" value={counts.DRAFT} />
          <Stat label="Agendados" value={counts.SCHEDULED} />
          <Stat label="Rodando" value={counts.RUNNING} accent />
          <Stat label="Concluídos" value={counts.COMPLETED} />
        </div>

        <section className="mt-12">
          <h2 className="text-sm uppercase tracking-widest text-muted-foreground">
            Seus broadcasts
          </h2>
          {broadcasts.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-border/60 p-10 text-center">
              <Megaphone className="mx-auto h-10 w-10 text-muted-foreground/60" />
              <p className="mt-4 font-medium">Nenhum broadcast ainda.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Crie um broadcast pra disparar uma campanha. Precisa de pelo menos um template
                aprovado.
              </p>
              <Link
                href="/automations/broadcasts/new"
                className="mt-6 inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Criar primeiro broadcast <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-border/60 rounded-xl border border-border/60 bg-card/40">
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
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`mt-2 text-3xl font-medium tabular-nums tracking-tight ${accent ? 'text-primary' : ''}`}>
        {value}
      </p>
    </div>
  );
}
