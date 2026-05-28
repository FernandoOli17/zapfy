import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MapPin, MessageSquare, Package, Truck, User } from 'lucide-react';

import { ProductImage } from '@/components/product-image';
import { prisma, type OrderStatus } from '@zapfy/db';
import { cn } from '@zapfy/ui';

import { requireWorkspace } from '@/lib/inbox';

import { StatusChanger } from './status-changer';

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

interface Address {
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip?: string;
  reference?: string;
}

function asAddress(json: unknown): Address | null {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null;
  return json as Address;
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { workspace } = await requireWorkspace();
  const { id } = await params;

  const order = await prisma.order.findFirst({
    where: { id, workspaceId: workspace.id },
    include: {
      contact: { select: { id: true, name: true, phoneE164: true } },
      conversation: { select: { id: true } },
      items: { orderBy: { createdAt: 'asc' }, include: { product: { select: { name: true, imageUrl: true } } } },
    },
  });
  if (!order) notFound();

  // Audit recente desse pedido
  const auditEvents = await prisma.auditLog.findMany({
    where: { workspaceId: workspace.id, targetType: 'Order', targetId: order.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { user: { select: { email: true } } },
  });

  const address = asAddress(order.shippingAddress);
  const formatBRL = (cents: number) =>
    (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: order.currency });

  return (
    <div className="mx-auto max-w-5xl animate-fade-in px-4 py-6 md:px-10 md:py-10 lg:px-6">
      <Link
        href="/orders"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar pra pedidos
      </Link>

      {/* Header */}
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Pedido</p>
          <h1 className="mt-1 font-mono text-2xl font-semibold tracking-tight md:text-3xl">
            {order.publicNumber}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={cn(
                'rounded-full border px-2 py-0.5 text-[11px] font-medium',
                STATUS_COLOR[order.status],
              )}
            >
              {STATUS_LABEL[order.status]}
            </span>
            <span className="text-xs text-muted-foreground">
              criado em {order.createdAt.toLocaleString('pt-BR')}
            </span>
          </div>
        </div>
        <StatusChanger orderId={order.id} currentStatus={order.status} />
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {/* Coluna esquerda: items + endereço */}
        <div className="space-y-6 md:col-span-2">
          <Card title="Itens" icon={Package}>
            {order.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Pedido sem itens.</p>
            ) : (
              <ul className="divide-y divide-border">
                {order.items.map((it) => (
                  <li key={it.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <ProductImage src={it.product?.imageUrl ?? null} />

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{it.nameSnapshot}</p>
                      {it.notes && (
                        <p className="mt-0.5 text-xs italic text-muted-foreground">"{it.notes}"</p>
                      )}
                    </div>
                    <p className="text-sm tabular-nums text-muted-foreground">
                      {it.quantity}× {formatBRL(it.unitPriceCents)}
                    </p>
                    <p className="w-24 text-right text-sm font-medium tabular-nums">
                      {formatBRL(it.unitPriceCents * it.quantity)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {order.items.length > 0 && (
              <div className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
                <Row label="Subtotal" value={formatBRL(order.subtotalCents)} />
                {order.discountCents > 0 && (
                  <Row
                    label={`Desconto${order.couponCode ? ` (${order.couponCode})` : ''}`}
                    value={`- ${formatBRL(order.discountCents)}`}
                    accent="text-emerald-600 dark:text-emerald-400"
                  />
                )}
                {order.shippingCents > 0 && (
                  <Row label="Entrega" value={formatBRL(order.shippingCents)} />
                )}
                <Row label="Total" value={formatBRL(order.totalCents)} bold />
              </div>
            )}
          </Card>

          {address && (
            <Card title="Entrega" icon={MapPin}>
              <p className="text-sm">
                {address.street}{address.number ? `, ${address.number}` : ''}
                {address.complement && ` — ${address.complement}`}
              </p>
              <p className="text-sm text-muted-foreground">
                {[address.neighborhood, address.city, address.state].filter(Boolean).join(' · ')}
                {address.zip && ` · CEP ${address.zip}`}
              </p>
              {address.reference && (
                <p className="mt-2 text-xs italic text-muted-foreground">
                  Referência: {address.reference}
                </p>
              )}
              {order.etaMinutes && (
                <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-violet-700 dark:text-violet-400">
                  <Truck className="h-3.5 w-3.5" />
                  ETA: {order.etaMinutes} min a partir da criação
                </p>
              )}
            </Card>
          )}

          {order.notes && (
            <Card title="Observações" icon={MessageSquare}>
              <p className="whitespace-pre-wrap text-sm">{order.notes}</p>
            </Card>
          )}
        </div>

        {/* Coluna direita: cliente + meta + timeline */}
        <div className="space-y-6">
          <Card title="Cliente" icon={User}>
            {order.contact ? (
              <div className="space-y-1">
                <p className="text-sm font-medium">{order.contact.name ?? 'Sem nome'}</p>
                <p className="text-xs text-muted-foreground">{order.contact.phoneE164}</p>
                {order.conversation && (
                  <Link
                    href={`/inbox/${order.conversation.id}`}
                    className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Abrir conversa →
                  </Link>
                )}
              </div>
            ) : (
              <p className="text-sm italic text-muted-foreground">Sem contato associado.</p>
            )}
          </Card>

          <Card title="Pagamento">
            <div className="space-y-1 text-sm">
              <p className="text-muted-foreground">Método</p>
              <p className="font-medium">{order.paymentMethod ?? 'não informado'}</p>
              {order.externalId && (
                <>
                  <p className="mt-2 text-muted-foreground">ID externo</p>
                  <p className="font-mono text-xs">{order.externalId}</p>
                </>
              )}
            </div>
          </Card>

          <Card title="Histórico">
            {auditEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem mudanças registradas ainda.</p>
            ) : (
              <ol className="space-y-2 text-xs">
                {auditEvents.map((ev) => {
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
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
        {title}
      </h2>
      {children}
    </div>
  );
}

function Row({ label, value, accent, bold }: { label: string; value: string; accent?: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={cn('text-muted-foreground', bold && 'font-semibold text-foreground')}>{label}</span>
      <span className={cn('tabular-nums', accent, bold && 'font-semibold')}>{value}</span>
    </div>
  );
}
