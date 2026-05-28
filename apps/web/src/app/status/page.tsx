import Link from 'next/link';
import { AlertCircle, CheckCircle2, ChevronLeft, Clock, ServerCog, XCircle } from 'lucide-react';
import { prisma } from '@zapfy/db';
import type { StatusComponent } from '@zapfy/db';

import { runStatusChecks, type ComponentStatus } from '@/lib/status-checks';

export const metadata = {
  title: 'Status — Trato',
  description: 'Status de uptime do Trato em tempo real',
};
export const dynamic = 'force-dynamic';
export const revalidate = 30; // cache 30s pra não bater DB a cada hit

const COMPONENT_LABEL: Record<StatusComponent, string> = {
  API: 'API (web)',
  WORKER: 'Worker',
  WHATSAPP: 'WhatsApp Cloud API',
  DATABASE: 'Banco de dados',
};

const STATUS_COLOR: Record<ComponentStatus, string> = {
  operational: 'bg-emerald-500',
  degraded: 'bg-amber-500',
  down: 'bg-rose-500',
};

const STATUS_LABEL: Record<ComponentStatus, string> = {
  operational: 'Operacional',
  degraded: 'Degradado',
  down: 'Indisponível',
};

const SEVERITY_STYLE: Record<'MINOR' | 'MAJOR' | 'CRITICAL', string> = {
  MINOR: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
  MAJOR: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30',
  CRITICAL: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30',
};

export default async function StatusPage() {
  const lastChecked = new Date();
  const [checks, incidents] = await Promise.all([
    runStatusChecks(),
    prisma.statusIncident.findMany({
      where: {
        startedAt: { gte: new Date(Date.now() - 30 * 86_400_000) },
      },
      orderBy: { startedAt: 'desc' },
      take: 30,
    }),
  ]);

  const allOperational = (Object.keys(checks) as Array<keyof typeof checks>).every(
    (k) => checks[k].status === 'operational',
  );
  const anyDown = (Object.keys(checks) as Array<keyof typeof checks>).some(
    (k) => checks[k].status === 'down',
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card/50">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 md:px-6">
          <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" />
            <span className="font-semibold tracking-tight">Trato</span>
          </Link>
          <p className="font-mono text-xs text-muted-foreground">status.trato.dev</p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl animate-fade-in px-4 py-10 md:px-6 md:py-16">
        {/* Big banner */}
        <section
          className={`rounded-2xl border p-6 md:p-8 ${
            anyDown
              ? 'border-rose-500/30 bg-rose-500/5'
              : allOperational
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : 'border-amber-500/30 bg-amber-500/5'
          }`}
        >
          <div className="flex flex-wrap items-center gap-4">
            {anyDown ? (
              <XCircle className="h-10 w-10 text-rose-500" />
            ) : allOperational ? (
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            ) : (
              <AlertCircle className="h-10 w-10 text-amber-500" />
            )}
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                {anyDown
                  ? 'Alguns serviços com problema'
                  : allOperational
                    ? 'Todos os sistemas operacionais'
                    : 'Operação parcialmente degradada'}
              </h1>
              <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                Última verificação: {lastChecked.toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        </section>

        {/* Components grid */}
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Componentes
          </h2>
          <ul className="animate-stagger mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {(Object.keys(checks) as Array<keyof typeof checks>).map((key) => {
              const c = checks[key];
              return (
                <li key={key} className="flex flex-wrap items-center gap-3 p-4">
                  <ServerCog className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{COMPONENT_LABEL[key]}</p>
                    {c.detail && (
                      <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                        {c.detail}
                      </p>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      c.status === 'operational'
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        : c.status === 'degraded'
                          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                          : 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${STATUS_COLOR[c.status]}`} />
                    {STATUS_LABEL[c.status]}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Incidents */}
        <section className="mt-12">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Incidentes (últimos 30 dias)
            </h2>
            <p className="text-xs text-muted-foreground">
              {incidents.length} {incidents.length === 1 ? 'registro' : 'registros'}
            </p>
          </div>

          {incidents.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-border bg-card/40 py-12 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
              <p className="mt-2 text-sm font-medium">Nenhum incidente nos últimos 30 dias.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Sistema 100% operacional. ✨
              </p>
            </div>
          ) : (
            <ol className="mt-4 space-y-3">
              {incidents.map((inc) => {
                const resolved = inc.resolvedAt !== null;
                const updates = Array.isArray(inc.updates)
                  ? (inc.updates as Array<{ at: string; message: string }>)
                  : [];
                return (
                  <li
                    key={inc.id}
                    className="overflow-hidden rounded-xl border border-border bg-card p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold">{inc.title}</h3>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest ${
                              SEVERITY_STYLE[inc.severity]
                            }`}
                          >
                            {inc.severity}
                          </span>
                          <span className="rounded-full border border-border/60 bg-secondary/40 px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                            {COMPONENT_LABEL[inc.component]}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Início: {inc.startedAt.toLocaleString('pt-BR')}
                          {resolved &&
                            ` · Resolvido: ${inc.resolvedAt!.toLocaleString('pt-BR')}`}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                          resolved
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        {resolved ? 'Resolvido' : 'Em andamento'}
                      </span>
                    </div>

                    {inc.description && (
                      <p className="mt-3 text-sm">{inc.description}</p>
                    )}

                    {updates.length > 0 && (
                      <ol className="mt-3 space-y-1.5 border-t border-border pt-3 text-xs">
                        {updates.map((u, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-primary" />
                            <p>
                              <span className="text-muted-foreground">
                                {new Date(u.at).toLocaleString('pt-BR')}
                              </span>{' '}
                              — {u.message}
                            </p>
                          </li>
                        ))}
                      </ol>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <footer className="mt-16 border-t border-border pt-8 text-center text-xs text-muted-foreground">
          <p>
            Subscribe pra updates via RSS:{' '}
            <Link href="/api/status/rss" className="text-primary hover:underline">
              /api/status/rss
            </Link>
          </p>
          <p className="mt-2">Status verificado a cada 30 segundos.</p>
        </footer>
      </main>
    </div>
  );
}
