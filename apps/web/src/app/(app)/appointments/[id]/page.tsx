import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, Clock, MessageSquare, Stethoscope, User } from 'lucide-react';
import { prisma, type AppointmentStatus } from '@zapai/db';
import { cn } from '@zapai/ui';

import { requireWorkspace } from '@/lib/inbox';

import { StatusChanger } from './status-changer';

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

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { workspace } = await requireWorkspace();
  const { id } = await params;

  const appt = await prisma.appointment.findFirst({
    where: { id, workspaceId: workspace.id },
    include: {
      contact: { select: { id: true, name: true, phoneE164: true } },
      conversation: { select: { id: true } },
      professional: { select: { id: true, name: true, specialty: true, email: true } },
    },
  });
  if (!appt) notFound();

  const audit = await prisma.auditLog.findMany({
    where: {
      workspaceId: workspace.id,
      targetType: 'Appointment',
      targetId: appt.id,
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { user: { select: { email: true } } },
  });

  const endsAt = new Date(appt.startsAt.getTime() + appt.durationMinutes * 60_000);
  const isPast = endsAt.getTime() < Date.now();

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 md:px-10 md:py-10">
      <Link
        href="/appointments"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar pra agenda
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Agendamento</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
            {appt.startsAt.toLocaleString('pt-BR', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={cn(
                'rounded-full border px-2 py-0.5 text-[11px] font-medium',
                STATUS_COLOR[appt.status],
              )}
            >
              {STATUS_LABEL[appt.status]}
            </span>
            {isPast && appt.status === 'SCHEDULED' && (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                Horário passou
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {appt.durationMinutes}min · termina às{' '}
              {endsAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
        <StatusChanger
          appointmentId={appt.id}
          currentStatus={appt.status}
          currentStartsAt={appt.startsAt.toISOString()}
          currentDurationMinutes={appt.durationMinutes}
        />
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <Card title="Profissional" icon={Stethoscope}>
            <p className="text-base font-medium">{appt.professional.name}</p>
            {appt.professional.specialty && (
              <p className="mt-0.5 text-sm text-muted-foreground">{appt.professional.specialty}</p>
            )}
            {appt.professional.email && (
              <p className="mt-1 text-xs text-muted-foreground">{appt.professional.email}</p>
            )}
            {appt.googleEventId && (
              <p className="mt-3 text-[11px] text-muted-foreground">
                Google Calendar:{' '}
                <span className="font-mono">{appt.googleEventId.slice(0, 20)}…</span>
              </p>
            )}
          </Card>

          <Card title="Detalhes" icon={Calendar}>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {appt.type && (
                <>
                  <dt className="text-muted-foreground">Tipo</dt>
                  <dd>{appt.type}</dd>
                </>
              )}
              <dt className="text-muted-foreground">Criado</dt>
              <dd>{appt.createdAt.toLocaleString('pt-BR')}</dd>
              <dt className="text-muted-foreground">Atualizado</dt>
              <dd>{appt.updatedAt.toLocaleString('pt-BR')}</dd>
            </dl>
            {appt.notes && (
              <div className="mt-4 border-t border-border pt-3">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Notas</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{appt.notes}</p>
              </div>
            )}
            {appt.cancellationReason && (
              <div className="mt-4 border-t border-border pt-3">
                <p className="text-xs uppercase tracking-widest text-rose-700 dark:text-rose-400">
                  Cancelamento
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{appt.cancellationReason}</p>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Cliente" icon={User}>
            {appt.contact ? (
              <div className="space-y-1">
                <p className="text-sm font-medium">{appt.contact.name ?? 'Sem nome'}</p>
                <p className="text-xs text-muted-foreground">{appt.contact.phoneE164}</p>
                {appt.conversation && (
                  <Link
                    href={`/inbox?conv=${appt.conversation.id}`}
                    className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <MessageSquare className="h-3 w-3" /> Abrir conversa →
                  </Link>
                )}
              </div>
            ) : (
              <p className="text-sm italic text-muted-foreground">Sem contato associado.</p>
            )}
          </Card>

          <Card title="Histórico" icon={Clock}>
            {audit.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem mudanças registradas.</p>
            ) : (
              <ol className="space-y-2 text-xs">
                {audit.map((ev) => {
                  const meta = ev.metadata as Record<string, unknown> | null;
                  const from = meta?.['from'];
                  const to = meta?.['to'];
                  const isResched = ev.action === 'appointment.reschedule';
                  return (
                    <li key={ev.id} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <div className="min-w-0">
                        <p>
                          {isResched && typeof from === 'string' && typeof to === 'string' ? (
                            <>
                              <span className="text-muted-foreground">reagendado:</span>{' '}
                              <span className="line-through">
                                {new Date(from).toLocaleString('pt-BR')}
                              </span>{' '}
                              → <strong>{new Date(to).toLocaleString('pt-BR')}</strong>
                            </>
                          ) : typeof from === 'string' && typeof to === 'string' ? (
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
