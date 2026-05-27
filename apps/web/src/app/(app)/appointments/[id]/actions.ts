'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Prisma, prisma } from '@zapai/db';
import type { AppointmentStatus } from '@zapai/db';
import { createLogger } from '@zapai/shared';

import { requireOwnerOrAdmin } from '@/lib/inbox';

const log = createLogger('appointments-actions');

const StatusSchema = z.enum(['SCHEDULED', 'CONFIRMED', 'CANCELLED', 'NO_SHOW', 'COMPLETED']);

const UpdateInput = z.object({
  appointmentId: z.string().min(1),
  status: StatusSchema,
  cancellationReason: z.string().max(500).optional(),
});

const RescheduleInput = z.object({
  appointmentId: z.string().min(1),
  startsAt: z.string().datetime({ message: 'data inválida' }),
  durationMinutes: z.number().int().min(5).max(480).optional(),
});

export type UpdateAppointmentResult =
  | { status: 'ok' }
  | { status: 'error'; error: string };

/**
 * Máquina de estados de Appointment. Cada from->to válido é EXPLÍCITO.
 * Movimento backwards (e.g., COMPLETED → SCHEDULED) bloqueado pra não
 * corromper state downstream (billing, Google Calendar sync, métricas).
 */
const ALLOWED_TRANSITIONS: Record<AppointmentStatus, ReadonlyArray<AppointmentStatus>> = {
  SCHEDULED: ['CONFIRMED', 'CANCELLED', 'NO_SHOW', 'COMPLETED'],
  CONFIRMED: ['CANCELLED', 'NO_SHOW', 'COMPLETED'],
  // CANCELLED é terminal — re-abrir exige criar appointment novo
  CANCELLED: [],
  // NO_SHOW é terminal
  NO_SHOW: [],
  // COMPLETED é terminal
  COMPLETED: [],
};

function isAllowedTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export async function updateAppointmentStatus(
  input: z.infer<typeof UpdateInput>,
): Promise<UpdateAppointmentResult> {
  const parsed = UpdateInput.safeParse(input);
  if (!parsed.success) {
    return { status: 'error', error: parsed.error.issues[0]?.message ?? 'Inválido' };
  }
  const guard = await requireOwnerOrAdmin();
  if (!guard.ok) return { status: 'error', error: guard.error };
  const { workspace, user, impersonating } = guard.ctx;

  const existing = await prisma.appointment.findFirst({
    where: { id: parsed.data.appointmentId, workspaceId: workspace.id },
    select: { id: true, status: true, startsAt: true },
  });
  if (!existing) return { status: 'error', error: 'Agendamento não encontrado' };

  if (existing.status === parsed.data.status) return { status: 'ok' };

  if (!isAllowedTransition(existing.status, parsed.data.status)) {
    return {
      status: 'error',
      error: `Transição ${existing.status} → ${parsed.data.status} não permitida`,
    };
  }

  const isCancellation = parsed.data.status === 'CANCELLED';

  // Mutation + audit numa transação — se um falhar, o outro também desfaz.
  await prisma.$transaction([
    prisma.appointment.update({
      where: { id: existing.id },
      data: {
        status: parsed.data.status,
        ...(isCancellation && parsed.data.cancellationReason
          ? { cancellationReason: parsed.data.cancellationReason }
          : {}),
      },
    }),
    prisma.auditLog.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        action: 'appointment.status_change',
        targetType: 'Appointment',
        targetId: existing.id,
        metadata: {
          from: existing.status,
          to: parsed.data.status,
          ...(impersonating && { impersonating: true, adminEmail: user.email }),
        },
      },
    }),
  ]);

  log.info(
    { workspaceId: workspace.id, appointmentId: existing.id, from: existing.status, to: parsed.data.status },
    'appointment status updated',
  );

  revalidatePath('/appointments');
  revalidatePath(`/appointments/${existing.id}`);
  return { status: 'ok' };
}

export async function rescheduleAppointment(
  input: z.infer<typeof RescheduleInput>,
): Promise<UpdateAppointmentResult> {
  const parsed = RescheduleInput.safeParse(input);
  if (!parsed.success) {
    return { status: 'error', error: parsed.error.issues[0]?.message ?? 'Inválido' };
  }
  const guard = await requireOwnerOrAdmin();
  if (!guard.ok) return { status: 'error', error: guard.error };
  const { workspace, user, impersonating } = guard.ctx;

  const existing = await prisma.appointment.findFirst({
    where: { id: parsed.data.appointmentId, workspaceId: workspace.id },
    select: { id: true, startsAt: true, durationMinutes: true, professionalId: true, status: true },
  });
  if (!existing) return { status: 'error', error: 'Agendamento não encontrado' };

  // Estados terminais não podem ser remanejados
  if (existing.status === 'CANCELLED' || existing.status === 'NO_SHOW' || existing.status === 'COMPLETED') {
    return { status: 'error', error: 'Agendamento finalizado não pode ser reagendado' };
  }

  const newStart = new Date(parsed.data.startsAt);
  if (Number.isNaN(newStart.getTime())) {
    return { status: 'error', error: 'Data inválida' };
  }

  // Past-date guard — UX: usuário poderia digitar 2025 em vez de 2026
  if (newStart.getTime() < Date.now() - 60_000) {
    return { status: 'error', error: 'Horário no passado' };
  }

  const newDuration = parsed.data.durationMinutes ?? existing.durationMinutes;
  const newEnd = new Date(newStart.getTime() + newDuration * 60_000);

  /**
   * Conflict check + update DENTRO de uma transação SERIALIZABLE com
   * advisory_xact_lock no professionalId. Isso resolve o TOCTOU clássico:
   * outra reschedule concorrente fica esperando o lock (mesmo professional)
   * — só uma escreve por vez.
   *
   * `pg_advisory_xact_lock(hashtext(text))` é seguro pra cuid arbitrário.
   * O lock libera no fim da transação automaticamente.
   */
  try {
    await prisma.$transaction(
      async (tx) => {
        // Serialize por profissional — outras reschedules no mesmo prof esperam
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${existing.professionalId}))`;

        const candidates = await tx.appointment.findMany({
          where: {
            workspaceId: workspace.id,
            professionalId: existing.professionalId,
            id: { not: existing.id },
            status: { in: ['SCHEDULED', 'CONFIRMED'] },
            startsAt: { lt: newEnd },
          },
          select: { id: true, startsAt: true, durationMinutes: true },
          take: 200,
        });

        for (const c of candidates) {
          const cEnd = new Date(c.startsAt.getTime() + c.durationMinutes * 60_000);
          if (cEnd > newStart) {
            throw new Prisma.PrismaClientKnownRequestError(
              'Conflito com outro agendamento do mesmo profissional',
              { code: 'P2002', clientVersion: 'app' },
            );
          }
        }

        await tx.appointment.update({
          where: { id: existing.id },
          data: {
            startsAt: newStart,
            ...(parsed.data.durationMinutes !== undefined && {
              durationMinutes: parsed.data.durationMinutes,
            }),
          },
        });

        await tx.auditLog.create({
          data: {
            workspaceId: workspace.id,
            userId: user.id,
            action: 'appointment.reschedule',
            targetType: 'Appointment',
            targetId: existing.id,
            metadata: {
              from: existing.startsAt.toISOString(),
              to: newStart.toISOString(),
              ...(parsed.data.durationMinutes !== undefined && {
                durationMinutes: parsed.data.durationMinutes,
              }),
              ...(impersonating && { impersonating: true, adminEmail: user.email }),
            },
          },
        });
      },
      { isolationLevel: 'Serializable' },
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return { status: 'error', error: err.message };
    }
    log.warn({ err: err instanceof Error ? err.message : String(err) }, 'reschedule txn failed');
    return { status: 'error', error: 'Não foi possível reagendar. Tente de novo.' };
  }

  revalidatePath('/appointments');
  revalidatePath(`/appointments/${existing.id}`);
  return { status: 'ok' };
}
