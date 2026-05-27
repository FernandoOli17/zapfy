import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, FileText, MessageSquare, User } from 'lucide-react';
import { prisma, type QuoteStatus } from '@zapai/db';
import { cn } from '@zapai/ui';

import { requireWorkspace } from '@/lib/inbox';

import { QuoteEditor } from './quote-editor';
import { MarkAcceptedRejected } from './quote-actions';

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

interface QuoteItemPersisted {
  name: string;
  quantity: number;
  unitPriceCents: number;
  notes?: string;
}

function parseItems(json: unknown): QuoteItemPersisted[] {
  if (!Array.isArray(json)) return [];
  return json.flatMap((raw) => {
    if (!raw || typeof raw !== 'object') return [];
    const r = raw as Record<string, unknown>;
    const name = typeof r['name'] === 'string' ? r['name'] : null;
    const quantity = typeof r['quantity'] === 'number' ? r['quantity'] : null;
    const unitPriceCents = typeof r['unitPriceCents'] === 'number' ? r['unitPriceCents'] : null;
    if (!name || quantity == null || unitPriceCents == null) return [];
    const item: QuoteItemPersisted = { name, quantity, unitPriceCents };
    if (typeof r['notes'] === 'string') item.notes = r['notes'];
    return [item];
  });
}

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { workspace } = await requireWorkspace();
  const { id } = await params;

  const quote = await prisma.quote.findFirst({
    where: { id, workspaceId: workspace.id },
    include: {
      contact: { select: { id: true, name: true, phoneE164: true } },
      conversation: { select: { id: true } },
    },
  });
  if (!quote) notFound();

  const audit = await prisma.auditLog.findMany({
    where: { workspaceId: workspace.id, targetType: 'Quote', targetId: quote.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { user: { select: { email: true } } },
  });

  const items = parseItems(quote.items);
  const formatBRL = (cents: number) =>
    (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: quote.currency });

  const editable = quote.status === 'DRAFT';

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 md:px-10 md:py-10">
      <Link
        href="/quotes"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar pra orçamentos
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Orçamento</p>
          <h1 className="mt-1 font-mono text-2xl font-semibold tracking-tight md:text-3xl">
            {quote.publicNumber}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={cn(
                'rounded-full border px-2 py-0.5 text-[11px] font-medium',
                STATUS_COLOR[quote.status],
              )}
            >
              {STATUS_LABEL[quote.status]}
            </span>
            <span className="text-xs text-muted-foreground">
              criado em {quote.createdAt.toLocaleString('pt-BR')}
            </span>
            {quote.validUntil && (
              <span className="text-xs text-muted-foreground">
                · válido até {quote.validUntil.toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>
        </div>
        {quote.status === 'SENT' && <MarkAcceptedRejected quoteId={quote.id} />}
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          {editable ? (
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                Preencher orçamento
              </h2>
              <QuoteEditor
                quoteId={quote.id}
                initialServiceDescription={quote.serviceDescription}
                initialItems={items.map((it) => ({
                  name: it.name,
                  quantity: it.quantity,
                  unitPriceCents: it.unitPriceCents,
                  notes: it.notes ?? '',
                }))}
                initialValidUntil={quote.validUntil?.toISOString() ?? null}
                initialNotes={quote.notes ?? ''}
                currency={quote.currency}
              />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="mb-3 text-sm font-semibold">Serviço</h2>
                <p className="whitespace-pre-wrap text-sm">{quote.serviceDescription}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="mb-3 text-sm font-semibold">Itens</h2>
                {items.length === 0 ? (
                  <p className="text-sm italic text-muted-foreground">Sem itens.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {items.map((it, i) => (
                      <li key={i} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{it.name}</p>
                          {it.notes && (
                            <p className="mt-0.5 text-xs italic text-muted-foreground">
                              {it.notes}
                            </p>
                          )}
                        </div>
                        <p className="text-sm tabular-nums text-muted-foreground">
                          {it.quantity}× {formatBRL(it.unitPriceCents)}
                        </p>
                        <p className="w-24 text-right text-sm font-medium tabular-nums">
                          {formatBRL(Math.round(it.unitPriceCents * it.quantity))}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-3 flex justify-end border-t border-border pt-3 text-base font-semibold tabular-nums">
                  Total: {formatBRL(quote.totalCents)}
                </div>
              </div>
              {quote.notes && (
                <div className="rounded-xl border border-border bg-card p-5">
                  <h2 className="mb-2 text-sm font-semibold">Notas internas</h2>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">{quote.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <User className="h-3.5 w-3.5 text-muted-foreground" /> Cliente
            </h2>
            {quote.contact ? (
              <div className="space-y-1">
                <p className="text-sm font-medium">{quote.contact.name ?? 'Sem nome'}</p>
                <p className="text-xs text-muted-foreground">{quote.contact.phoneE164}</p>
                {quote.conversation && (
                  <Link
                    href={`/inbox?conv=${quote.conversation.id}`}
                    className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <MessageSquare className="h-3 w-3" /> Abrir conversa →
                  </Link>
                )}
              </div>
            ) : (
              <p className="text-sm italic text-muted-foreground">Sem contato.</p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold">Histórico</h2>
            {audit.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem mudanças registradas.</p>
            ) : (
              <ol className="space-y-2 text-xs">
                {audit.map((ev) => {
                  const meta = ev.metadata as Record<string, unknown> | null;
                  const from = meta?.['from'];
                  const to = meta?.['to'];
                  return (
                    <li key={ev.id} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <div className="min-w-0">
                        <p>
                          {typeof from === 'string' && typeof to === 'string' ? (
                            <>
                              <span className="text-muted-foreground line-through">{from}</span>{' '}
                              → <strong>{to}</strong>
                            </>
                          ) : (
                            <span className="font-mono">{ev.action}</span>
                          )}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {ev.user?.email ?? 'sistema'} · {ev.createdAt.toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
