import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { MessageSquare } from 'lucide-react';

import { prisma, type SupportTicketStatus } from '@zapfy/db';
import { auth } from '@/lib/auth';

import { StatusBadge } from '../../support/status-badge';

export const metadata = { title: 'Admin · Suporte' };
export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminSupportPage({ searchParams }: PageProps) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isSuperAdmin: true },
  });
  if (!me?.isSuperAdmin) notFound();

  const params = await searchParams;
  const statusFilter = (params.status?.toUpperCase() as SupportTicketStatus | undefined) ?? null;

  const where = statusFilter ? { status: statusFilter } : {};
  const tickets = await prisma.supportTicket.findMany({
    where,
    orderBy: [{ status: 'asc' }, { lastMessageAt: 'desc' }],
    take: 100,
    select: {
      id: true,
      publicNumber: true,
      subject: true,
      category: true,
      status: true,
      lastMessageAt: true,
      guestEmail: true,
      guestName: true,
      user: { select: { email: true, name: true } },
      workspace: { select: { name: true, slug: true } },
      _count: { select: { messages: true } },
    },
  });

  const counts = await prisma.supportTicket.groupBy({
    by: ['status'],
    _count: true,
  });
  const countByStatus: Record<string, number> = {};
  for (const c of counts) countByStatus[c.status] = c._count;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10 md:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Admin</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
            Suporte · todos os tickets
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterChip label="Todos" total={tickets.length} active={!statusFilter} href="/admin/support" />
          {(['AWAITING_STAFF', 'AWAITING_USER', 'OPEN', 'RESOLVED', 'CLOSED'] as const).map((s) => (
            <FilterChip
              key={s}
              label={s.replace('_', ' ').toLowerCase()}
              total={countByStatus[s] ?? 0}
              active={statusFilter === s}
              href={`/admin/support?status=${s}`}
            />
          ))}
        </div>
      </div>

      {tickets.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-border bg-card p-12 text-center">
          <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-4 text-sm text-muted-foreground">Nenhum ticket nesse filtro.</p>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-border rounded-2xl border border-border bg-card">
          {tickets.map((t) => {
            const from =
              t.user?.name ??
              t.user?.email ??
              t.guestName ??
              t.guestEmail ??
              '—';
            const ws = t.workspace?.name ?? '—';
            return (
              <li key={t.id}>
                <Link
                  href={`/admin/support/${t.id}`}
                  className="block px-5 py-4 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-mono text-muted-foreground">
                        #{t.publicNumber} · {t.category}
                      </p>
                      <p className="mt-1 truncate text-sm font-medium">{t.subject}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {from} · {ws} · {t._count.messages} msg ·{' '}
                        {new Date(t.lastMessageAt).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FilterChip({
  label,
  total,
  active,
  href,
}: {
  label: string;
  total: number;
  active: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'border border-border bg-card text-muted-foreground hover:text-foreground'
      }`}
    >
      {label}
      <span className="rounded-full bg-black/20 px-1.5 py-0.5 text-[10px]">{total}</span>
    </Link>
  );
}
