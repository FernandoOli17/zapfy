import Link from 'next/link';
import { FileText, ScrollText } from 'lucide-react';
import { prisma, type QuoteStatus } from '@zapai/db';
import { cn, EmptyState } from '@zapai/ui';

import { requireWorkspace } from '@/lib/inbox';

export const metadata = { title: 'Orçamentos' };
export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<QuoteStatus, string> = {
  DRAFT: 'rascunho',
  SENT: 'enviado',
  ACCEPTED: 'aceito',
  REJECTED: 'recusado',
  EXPIRED: 'expirado',
};

const STATUS_COLOR: Record<QuoteStatus, string> = {
  DRAFT: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
  SENT: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30',
  ACCEPTED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  REJECTED: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30',
  EXPIRED: 'bg-muted text-muted-foreground border-border',
};

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: QuoteStatus }>;
}) {
  const { workspace } = await requireWorkspace();
  const params = await searchParams;

  const where = params.status
    ? { workspaceId: workspace.id, status: params.status }
    : { workspaceId: workspace.id };

  const [quotes, statusCounts] = await Promise.all([
    prisma.quote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        contact: { select: { name: true, phoneE164: true } },
      },
    }),
    prisma.quote.groupBy({
      by: ['status'],
      where: { workspaceId: workspace.id },
      _count: { _all: true },
    }),
  ]);

  const filters: Array<{ id: QuoteStatus | 'all'; label: string; count: number }> = [
    {
      id: 'all',
      label: 'Todos',
      count: statusCounts.reduce((acc, s) => acc + s._count._all, 0),
    },
    ...statusCounts.map((s) => ({
      id: s.status,
      label: STATUS_LABEL[s.status],
      count: s._count._all,
    })),
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10 md:py-10">
      <div>
        <p className="text-sm text-muted-foreground">Comercial</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
          Orçamentos
          <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {quotes.length}
          </span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Orçamentos solicitados pelo agente IA. Rascunhos esperam você preencher itens + valor
          antes de enviar pro cliente.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <Link
            key={f.id}
            href={f.id === 'all' ? '/quotes' : `/quotes?status=${f.id}`}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
              (params.status === f.id || (f.id === 'all' && !params.status))
                ? 'bg-primary text-primary-foreground'
                : 'border border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground',
            )}
          >
            {f.label} <span className="opacity-70">·{f.count}</span>
          </Link>
        ))}
      </div>

      <div className="mt-6">
        {quotes.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="Sem orçamentos"
            description="Quando o agente IA solicitar um orçamento pelo WhatsApp, aparece aqui."
          />
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {quotes.map((q) => (
              <li
                key={q.id}
                className="flex flex-wrap items-center gap-4 p-4 hover:bg-muted/30"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm font-medium">{q.publicNumber}</p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {q.serviceDescription}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground/80">
                    {q.contact?.name ?? q.contact?.phoneE164 ?? 'sem contato'} ·{' '}
                    {q.createdAt.toLocaleDateString('pt-BR')}
                    {q.validUntil && ` · válido até ${q.validUntil.toLocaleDateString('pt-BR')}`}
                  </p>
                </div>
                <span
                  className={cn(
                    'rounded-full border px-2 py-0.5 text-[11px] font-medium',
                    STATUS_COLOR[q.status],
                  )}
                >
                  {STATUS_LABEL[q.status]}
                </span>
                <p className="text-right text-sm font-semibold">
                  {q.totalCents > 0
                    ? (q.totalCents / 100).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: q.currency,
                      })
                    : '—'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
