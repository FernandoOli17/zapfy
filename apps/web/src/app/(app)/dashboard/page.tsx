import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { prisma } from '@zapfy/db';

import { auth } from '@/lib/auth';
import { getOnboardingProgress } from '@/lib/onboarding';
import { getDashboardStats } from '@/lib/dashboard-stats';

import { OnboardingChecklist } from './onboarding-checklist';
import { MetricStrip } from './metric-strip';
import { HandoffQueue } from './handoff-queue';
import { ActivityCard } from './activity-card';
import { QuickActions } from './quick-actions';
import { PlanBadge } from './plan-badge';

export const metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  const member = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    include: { workspace: { include: { subscription: true } } },
    orderBy: { createdAt: 'asc' },
  });
  if (!member) redirect('/onboarding');

  const ws = member.workspace;
  const [progress, stats] = await Promise.all([
    getOnboardingProgress(ws.id),
    getDashboardStats(ws.id),
  ]);

  const userName = session.user.name?.split(' ')[0] ?? session.user.email.split('@')[0] ?? 'lá';

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10 md:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Olá, {userName}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">{ws.name}</h1>
        </div>
        <PlanBadge
          status={ws.subscription?.status ?? 'INCOMPLETE'}
          plan={ws.subscription?.plan ?? 'STARTER'}
        />
      </div>

      {progress && !progress.complete && (
        <div className="mt-6">
          <OnboardingChecklist progress={progress} />
        </div>
      )}

      {stats && (
        <div className="mt-6 space-y-3">
          <MetricStrip
            conversasHoje={stats.conversasHoje}
            resolvidasIaCount={stats.resolvidasIaCount}
            resolvidasIaPct={stats.resolvidasIaPct}
            aguardandoTotal={stats.aguardandoTotal}
          />
          <HandoffQueue
            items={stats.aguardando}
            total={stats.aguardandoTotal}
            whatsappConnected={stats.whatsappConnected}
          />
          <ActivityCard atividade14d={stats.atividade14d} planoUso={stats.planoUso} />
        </div>
      )}

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold tracking-tight text-muted-foreground">Ações rápidas</h2>
        <QuickActions />
      </div>
    </div>
  );
}
