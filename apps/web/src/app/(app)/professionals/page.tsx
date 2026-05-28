import { Stethoscope } from 'lucide-react';
import { prisma } from '@zapfy/db';
import { EmptyState } from '@zapfy/ui';

import { requireWorkspace } from '@/lib/inbox';

import { ProfessionalsManager } from './professionals-manager';

export const metadata = { title: 'Profissionais' };
export const dynamic = 'force-dynamic';

export default async function ProfessionalsPage() {
  const { workspace, member } = await requireWorkspace();
  const isAdmin = member.role === 'OWNER' || member.role === 'ADMIN';

  const professionals = await prisma.professional.findMany({
    where: { workspaceId: workspace.id },
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
    include: {
      _count: { select: { appointments: true } },
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 md:px-10 md:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Equipe</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
            Profissionais
            <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {professionals.length}
            </span>
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Cadastra cada profissional que pode receber agendamentos. O agente IA usa essa lista
            quando o cliente pede pra marcar consulta.
          </p>
        </div>
      </div>

      <div className="mt-6">
        {professionals.length === 0 && !isAdmin ? (
          <EmptyState
            icon={Stethoscope}
            title="Sem profissionais cadastrados"
            description="Peça pro OWNER ou ADMIN cadastrar."
          />
        ) : (
          <ProfessionalsManager
            isAdmin={isAdmin}
            professionals={professionals.map((p) => ({
              id: p.id,
              name: p.name,
              specialty: p.specialty,
              email: p.email,
              active: p.active,
              appointmentsCount: p._count.appointments,
              hasGoogleCalendar: Boolean(p.googleCalendarTokenEncrypted),
            }))}
          />
        )}
      </div>
    </div>
  );
}
