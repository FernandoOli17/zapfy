import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Eye, ShieldAlert, TrendingUp, Users } from 'lucide-react';
import { prisma, type Prisma } from '@zapfy/db';
import { PLANS, type PlanId } from '@zapfy/shared';
import { Button, cn, EmptyState } from '@zapfy/ui';

import { auth } from '@/lib/auth';
import { getImpersonatedWorkspaceId } from '@/lib/impersonation';

import { ImpersonateButton, ForcePlanButton } from './client-buttons';

export const metadata = { title: 'Super-admin · Trato' };
export const dynamic = 'force-dynamic';

const PLAN_COLOR: Record<PlanId, string> = {
  STARTER: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/30',
  PRO: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30',
  PREMIUM: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/30',
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, isSuperAdmin: true, email: true },
  });
  if (!user?.isSuperAdmin) redirect('/dashboard');

  const params = await searchParams;
  const search = params.q?.trim() ?? '';

  const where: Prisma.WorkspaceWhereInput = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {};

  const [
    workspaces,
    totalWorkspaces,
    totalContacts,
    totalMessages,
    recentAudit,
    activeSubsByPlan,
  ] = await Promise.all([
    prisma.workspace.findMany({
      where,
      include: {
        subscription: true,
        _count: { select: { members: true, contacts: true, conversations: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.workspace.count(),
    prisma.contact.count(),
    prisma.message.count(),
    prisma.auditLog.findMany({
      where: { action: { startsWith: 'admin.' } },
      orderBy: { createdAt: 'desc' },
      take: 15,
      include: {
        user: { select: { email: true } },
        workspace: { select: { name: true, slug: true } },
      },
    }),
    prisma.subscription.groupBy({
      by: ['plan'],
      where: { status: 'ACTIVE' },
      _count: { _all: true },
    }),
  ]);

  // MRR estimado e plan counts: agregados sobre TODOS os workspaces, não só
  // os 100 da página (que é uma view paginada/filtrada). Antes contávamos só
  // os 100 visíveis — subestimava após cruzar esse limite.
  let mrrCents = 0;
  const planCounts: Record<PlanId, number> = { STARTER: 0, PRO: 0, PREMIUM: 0 };
  for (const row of activeSubsByPlan) {
    const p = row.plan as PlanId;
    planCounts[p] = row._count._all;
    mrrCents += PLANS[p].priceBRLCents * row._count._all;
  }

  const currentImpersonationId = await getImpersonatedWorkspaceId(session.user.id);

  return (
    <div className="mx-auto max-w-7xl animate-fade-in px-4 py-6 md:px-10 md:py-10 lg:px-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Plataforma · Super-admin</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight md:text-3xl">
            Console global
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visibilidade total de todos os workspaces.{' '}
            <strong>Toda impersonação e force-upgrade fica auditada.</strong>
          </p>
        </div>
      </div>

      {/* Métricas globais */}
      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard label="MRR estimado" value={formatBRL(mrrCents)} accent="text-emerald-600 dark:text-emerald-400" />
        <MetricCard label="Workspaces" value={totalWorkspaces.toLocaleString('pt-BR')} />
        <MetricCard label="Contatos" value={totalContacts.toLocaleString('pt-BR')} />
        <MetricCard label="Mensagens" value={totalMessages.toLocaleString('pt-BR')} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <PlanCount label="STARTER" count={planCounts.STARTER} />
        <PlanCount label="PRO" count={planCounts.PRO} />
        <PlanCount label="PREMIUM" count={planCounts.PREMIUM} />
      </div>

      {/* Busca */}
      <form className="mt-8 flex items-center gap-2" action="/admin">
        <input
          type="text"
          name="q"
          defaultValue={search}
          placeholder="Buscar workspace por nome ou slug…"
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
        <Button type="submit" size="sm" variant="outline">
          Buscar
        </Button>
        {search && (
          <Button asChild size="sm" variant="ghost">
            <Link href="/admin">Limpar</Link>
          </Button>
        )}
      </form>

      {/* Workspaces */}
      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        {workspaces.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Users}
              title="Nenhum workspace encontrado"
              description={search ? `Nada bate com "${search}".` : 'Banco vazio.'}
            />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Workspace</th>
                <th className="px-4 py-2 text-left font-medium">Plano</th>
                <th className="px-4 py-2 text-right font-medium">Membros</th>
                <th className="px-4 py-2 text-right font-medium">Contatos</th>
                <th className="px-4 py-2 text-right font-medium">Conversas</th>
                <th className="px-4 py-2 text-left font-medium">Criado</th>
                <th className="px-4 py-2 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {workspaces.map((w) => {
                const plan: PlanId = (w.subscription?.plan as PlanId | undefined) ?? 'STARTER';
                const status = w.subscription?.status ?? 'TRIALING';
                const isCurrent = currentImpersonationId === w.id;
                return (
                  <tr key={w.id} className={cn('hover:bg-muted/30', isCurrent && 'bg-amber-500/5')}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{w.name}</p>
                      <p className="text-[11px] text-muted-foreground">{w.slug}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium',
                          PLAN_COLOR[plan],
                        )}
                      >
                        {plan}
                      </span>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">{status.toLowerCase()}</p>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{w._count.members}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{w._count.contacts}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{w._count.conversations}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {w.createdAt.toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <ImpersonateButton workspaceId={w.id} disabled={isCurrent} />
                        <ForcePlanButton workspaceId={w.id} currentPlan={plan} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Audit recent */}
      <div className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <TrendingUp className="h-4 w-4 text-muted-foreground" /> Ações recentes de admin
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Toda impersonação e force-upgrade. Mantém histórico permanente.
        </p>
        <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
          {recentAudit.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Nenhuma ação de admin registrada ainda.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {recentAudit.map((a) => (
                <li key={a.id} className="flex items-center gap-3 p-3 text-sm">
                  <Eye className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate">
                      <span className="font-mono text-xs">{a.action}</span>
                      {a.workspace && (
                        <>
                          {' '}
                          em <strong className="font-medium">{a.workspace.name}</strong>
                        </>
                      )}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {a.user?.email ?? 'sistema'} · {a.createdAt.toLocaleString('pt-BR')}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function MetricCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={cn('mt-1 text-2xl font-semibold tabular-nums', accent)}>{value}</p>
    </div>
  );
}

function PlanCount({ label, count }: { label: PlanId; count: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums">{count}</p>
    </div>
  );
}
