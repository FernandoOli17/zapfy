import Link from 'next/link';
import { Calendar, Clock } from 'lucide-react';
import { prisma, type AppointmentStatus } from '@zapai/db';
import { cn, EmptyState } from '@zapai/ui';

import { requireWorkspace } from '@/lib/inbox';

export const metadata = { title: 'Agendamentos' };
export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  SCHEDULED: 'agendado',
  CONFIRMED: 'confirmado',
  CANCELLED: 'cancelado',
  NO_SHOW: 'não compareceu',
  COMPLETED: 'realizado',
};

const STATUS_COLOR: Record<AppointmentStatus, string> = {
  SCHEDULED: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30',
  CONFIRMED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  CANCELLED: 'bg-muted text-muted-foreground border-border',
  NO_SHOW: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30',
  COMPLETED: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/30',
};

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: AppointmentStatus; pro?: string }>;
}) {
  const { workspace } = await requireWorkspace();
  const params = await searchParams;

  const where: { workspaceId: string; status?: AppointmentStatus; professionalId?: string } = {
    workspaceId: workspace.id,
  };
  if (params.status) where.status = params.status;
  if (params.pro) where.professionalId = params.pro;

  const [appointments, professionals] = await Promise.all([
    prisma.appointment.findMany({
      where,
      orderBy: { startsAt: 'desc' },
      take: 100,
      include: {
        contact: { select: { name: true, phoneE164: true } },
        professional: { select: { id: true, name: true, specialty: true } },
      },
    }),
    prisma.professional.findMany({
      where: { workspaceId: workspace.id, active: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10 md:py-10">
      <div>
        <p className="text-sm text-muted-foreground">Agenda</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
          Agendamentos
          <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {appointments.length}
          </span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Consultas / sessões / atendimentos agendados pelo agente IA no WhatsApp.
        </p>
      </div>

      {professionals.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            Profissional:
          </span>
          <Link
            href="/appointments"
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
              !params.pro
                ? 'bg-primary text-primary-foreground'
                : 'border border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground',
            )}
          >
            Todos
          </Link>
          {professionals.map((p) => (
            <Link
              key={p.id}
              href={`/appointments?pro=${p.id}`}
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                params.pro === p.id
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground',
              )}
            >
              {p.name}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-6">
        {appointments.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="Sem agendamentos"
            description="Quando alguém agendar pelo WhatsApp, aparece aqui."
          />
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {appointments.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center gap-4 p-4 hover:bg-muted/30"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Clock className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {a.startsAt.toLocaleString('pt-BR', {
                      weekday: 'short',
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {a.professional.name}
                    {a.professional.specialty && ` (${a.professional.specialty})`} ·{' '}
                    {a.contact?.name ?? a.contact?.phoneE164 ?? 'sem contato'} ·{' '}
                    {a.durationMinutes}min
                    {a.type && ` · ${a.type}`}
                  </p>
                </div>
                <span
                  className={cn(
                    'rounded-full border px-2 py-0.5 text-[11px] font-medium',
                    STATUS_COLOR[a.status],
                  )}
                >
                  {STATUS_LABEL[a.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
