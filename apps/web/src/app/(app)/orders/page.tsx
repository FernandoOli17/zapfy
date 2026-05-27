import Link from 'next/link';
import { Package, ShoppingCart } from 'lucide-react';
import { prisma, type OrderStatus } from '@zapai/db';
import { cn, EmptyState } from '@zapai/ui';

import { requireWorkspace } from '@/lib/inbox';

export const metadata = { title: 'Pedidos' };
export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'aguardando',
  CONFIRMED: 'confirmado',
  PREPARING: 'preparando',
  OUT_FOR_DELIVERY: 'em entrega',
  DELIVERED: 'entregue',
  CANCELLED: 'cancelado',
  REFUNDED: 'reembolsado',
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  PENDING: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
  CONFIRMED: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30',
  PREPARING: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30',
  OUT_FOR_DELIVERY: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/30',
  DELIVERED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  CANCELLED: 'bg-muted text-muted-foreground border-border',
  REFUNDED: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30',
};

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: OrderStatus }>;
}) {
  const { workspace } = await requireWorkspace();
  const params = await searchParams;

  const where = params.status
    ? { workspaceId: workspace.id, status: params.status }
    : { workspaceId: workspace.id };

  const [orders, statusCounts] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        contact: { select: { name: true, phoneE164: true } },
        items: { select: { id: true }, take: 50 },
      },
    }),
    prisma.order.groupBy({
      by: ['status'],
      where: { workspaceId: workspace.id },
      _count: { _all: true },
    }),
  ]);

  const filters: Array<{ id: OrderStatus | 'all'; label: string; count: number }> = [
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
        <p className="text-sm text-muted-foreground">Vendas</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
          Pedidos
          <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {orders.length}
          </span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pedidos criados pelo agente IA via WhatsApp. Atualizações de status sincronizam
          automaticamente quando você integrar PDV/iFood.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <Link
            key={f.id}
            href={f.id === 'all' ? '/orders' : `/orders?status=${f.id}`}
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
        {orders.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title={params.status ? `Sem pedidos "${STATUS_LABEL[params.status]}"` : 'Sem pedidos ainda'}
            description="Quando o agente IA fechar um pedido pelo WhatsApp, aparece aqui."
          />
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {orders.map((o) => (
              <li
                key={o.id}
                className="flex flex-wrap items-center gap-4 p-4 hover:bg-muted/30"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Package className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm font-medium">{o.publicNumber}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {o.contact?.name ?? o.contact?.phoneE164 ?? 'contato anônimo'} ·{' '}
                    {o.items.length} item{o.items.length === 1 ? '' : 'ns'} ·{' '}
                    {o.createdAt.toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <span
                  className={cn(
                    'rounded-full border px-2 py-0.5 text-[11px] font-medium',
                    STATUS_COLOR[o.status],
                  )}
                >
                  {STATUS_LABEL[o.status]}
                </span>
                <p className="text-right text-sm font-semibold">
                  {(o.totalCents / 100).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: o.currency,
                  })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
