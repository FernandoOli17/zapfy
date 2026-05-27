'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@zapai/db';
import { createLogger } from '@zapai/shared';

import { requireWorkspace } from '@/lib/inbox';

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

export async function updateAppointmentStatus(
  input: z.infer<typeof UpdateInput>,
): Promise<UpdateAppointmentResult> {
  const parsed = UpdateInput.safeParse(input);
  if (!parsed.success) {
    return { status: 'error', error: parsed.error.issues[0]?.message ?? 'Inválido' };
  }
  const { workspace, user, impersonating } = await requireWorkspace();

  const existing = await prisma.appointment.findFirst({
    where: { id: parsed.data.appointmentId, workspaceId: workspace.id },
    select: { id: true, status: true, startsAt: true },
  });
  if (!existing) return { status: 'error', error: 'Agendamento não encontrado' };

  if (existing.status === parsed.data.status) return { status: 'ok' };

  // Cancelamento requer razão se fornecida pelo user
  const isCancellation = parsed.data.status === 'CANCELLED';

  await prisma.appointment.update({
    where: { id: existing.id },
    data: {
      status: parsed.data.status,
      ...(isCancellation && parsed.data.cancellationReason
        ? { cancellationReason: parsed.data.cancellationReason }
        : {}),
    },
  });

  await prisma.auditLog.create({
    data: {
      workspaceId: workspace.id,
      userId: user.id,
      action: 'appointment.status_change',
      targetType: 'Appointment',
      targetId: existing.id,
      metadata: {
        from: existing.status,
        to: parsed.data.status,
        ...(parsed.data.cancellationReason && { reason: parsed.data.cancellationReason }),
        ...(impersonating && { impersonating: true, adminEmail: user.email }),
      },
    },
  });

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
  const { workspace, user, impersonating } = await requireWorkspace();

  const existing = await prisma.appointment.findFirst({
    where: { id: parsed.data.appointmentId, workspaceId: workspace.id },
    select: { id: true, startsAt: true, durationMinutes: true, professionalId: true },
  });
  if (!existing) return { status: 'error', error: 'Agendamento não encontrado' };

  const newStart = new Date(parsed.data.startsAt);
  if (Number.isNaN(newStart.getTime())) {
    return { status: 'error', error: 'Data inválida' };
  }

  // Conflict check: overlap com outro appointment do mesmo profissional
  const newDuration = parsed.data.durationMinutes ?? existing.durationMinutes;
  const newEnd = new Date(newStart.getTime() + newDuration * 60_000);
  const conflict = await prisma.appointment.findFirst({
    where: {
      workspaceId: workspace.id,
      professionalId: existing.professionalId,
      id: { not: existing.id },
      status: { in: ['SCHEDULED', 'CONFIRMED'] },
      startsAt: { lt: newEnd },
    },
    select: { id: true, startsAt: true, durationMinutes: true },
  });
  if (conflict) {
    const conflictEnd = new Date(
      conflict.startsAt.getTime() + conflict.durationMinutes * 60_000,
    );
    if (conflictEnd > newStart) {
      return { status: 'error', error: 'Conflito com outro agendamento do mesmo profissional' };
    }
  }

  await prisma.appointment.update({
    where: { id: existing.id },
    data: {
      startsAt: newStart,
      ...(parsed.data.durationMinutes !== undefined && {
        durationMinutes: parsed.data.durationMinutes,
      }),
    },
  });

  await prisma.auditLog.create({
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

  revalidatePath('/appointments');
  revalidatePath(`/appointments/${existing.id}`);
  return { status: 'ok' };
}
