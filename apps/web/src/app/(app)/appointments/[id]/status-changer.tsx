'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, ChevronDown, Loader2 } from 'lucide-react';
import type { AppointmentStatus } from '@zapai/db';
import { Button, cn, useToast } from '@zapai/ui';

import { rescheduleAppointment, updateAppointmentStatus } from './actions';

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  SCHEDULED: 'agendado',
  CONFIRMED: 'confirmado',
  CANCELLED: 'cancelado',
  NO_SHOW: 'não compareceu',
  COMPLETED: 'realizado',
};

const QUICK_ACTIONS: Record<AppointmentStatus, { next: AppointmentStatus; label: string } | null> = {
  SCHEDULED: { next: 'CONFIRMED', label: 'Confirmar' },
  CONFIRMED: { next: 'COMPLETED', label: 'Marcar como realizado' },
  CANCELLED: null,
  NO_SHOW: null,
  COMPLETED: null,
};

export function StatusChanger({
  appointmentId,
  currentStatus,
  currentStartsAt,
  currentDurationMinutes,
}: {
  appointmentId: string;
  currentStatus: AppointmentStatus;
  currentStartsAt: string;
  currentDurationMinutes: number;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);

  function onChange(next: AppointmentStatus) {
    if (next === currentStatus) {
      setOpen(false);
      return;
    }

    let reason: string | undefined;
    if (next === 'CANCELLED') {
      const r = prompt('Razão do cancelamento (opcional):');
      if (r === null) {
        setOpen(false);
        return;
      }
      reason = r.trim() || undefined;
    }

    setOpen(false);
    startTransition(async () => {
      const r = await updateAppointmentStatus({
        appointmentId,
        status: next,
        ...(reason !== undefined && { cancellationReason: reason }),
      });
      if (r.status === 'ok') {
        push({ type: 'success', message: `Status: ${STATUS_LABEL[next]}` });
        router.refresh();
      } else {
        push({ type: 'error', message: r.error });
      }
    });
  }

  const quick = QUICK_ACTIONS[currentStatus];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {quick && (
        <Button type="button" size="sm" disabled={pending} onClick={() => onChange(quick.next)}>
          {pending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          {quick.label}
        </Button>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => setShowReschedule((s) => !s)}
      >
        <Calendar className="mr-1.5 h-3 w-3" /> Reagendar
      </Button>

      <div className="relative">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => setOpen((s) => !s)}
        >
          Mudar status <ChevronDown className="ml-1 h-3 w-3" />
        </Button>
        {open && (
          <div className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-md border border-border bg-popover shadow-md">
            {(Object.keys(STATUS_LABEL) as AppointmentStatus[]).map((s) => {
              const destructive = s === 'CANCELLED' || s === 'NO_SHOW';
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => onChange(s)}
                  className={cn(
                    'flex w-full items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-muted',
                    destructive && 'text-rose-600 dark:text-rose-400',
                  )}
                >
                  {STATUS_LABEL[s]}
                  {s === currentStatus && <span className="text-muted-foreground">(atual)</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {showReschedule && (
        <RescheduleForm
          appointmentId={appointmentId}
          currentStartsAt={currentStartsAt}
          currentDurationMinutes={currentDurationMinutes}
          onDone={() => {
            setShowReschedule(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

/**
 * datetime-local representa o WALL TIME do navegador (sem TZ). Pra evitar shift
 * de timezone toda vez que reagenda, convertemos UTC → wall local via offset
 * do navegador na hora de prefill, e wall local → UTC subtraindo o offset
 * na hora de submeter.
 */
function utcIsoToLocalInput(utcIso: string): string {
  const d = new Date(utcIso);
  const tzOffsetMs = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

function localInputToUtcIso(localInput: string): string {
  // new Date('YYYY-MM-DDTHH:mm') é interpretado como hora local
  return new Date(localInput).toISOString();
}

function RescheduleForm({
  appointmentId,
  currentStartsAt,
  currentDurationMinutes,
  onDone,
}: {
  appointmentId: string;
  currentStartsAt: string;
  currentDurationMinutes: number;
  onDone: () => void;
}) {
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [startsAt, setStartsAt] = useState(() => utcIsoToLocalInput(currentStartsAt));
  const [duration, setDuration] = useState(currentDurationMinutes);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const iso = localInputToUtcIso(startsAt);
      const r = await rescheduleAppointment({
        appointmentId,
        startsAt: iso,
        durationMinutes: duration,
      });
      if (r.status === 'ok') {
        push({ type: 'success', message: 'Agendamento reagendado' });
        onDone();
      } else {
        push({ type: 'error', message: r.error });
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-2 flex w-full flex-wrap items-end gap-2 rounded-md border border-border bg-muted/40 p-3"
    >
      <div>
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Novo horário
        </label>
        <input
          type="datetime-local"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
          required
          className="mt-1 block rounded-md border border-border bg-background px-2 py-1 text-xs focus:border-primary focus:outline-none"
        />
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Duração (min)
        </label>
        <input
          type="number"
          min={5}
          max={480}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="mt-1 block w-20 rounded-md border border-border bg-background px-2 py-1 text-xs focus:border-primary focus:outline-none"
        />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Salvar'}
      </Button>
    </form>
  );
}
