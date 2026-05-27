'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@zapai/db';
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

  // Cancelamento requer razão se fornecida pelo user; transição saindo
  // de CANCELLED limpa o motivo antigo pra não exibir 'Cancelamento' stale.
  const isCancellation = parsed.data.status === 'CANCELLED';
  const leavingCancellation = existing.status === 'CANCELLED' && !isCancellation;

  await prisma.appointment.update({
    where: { id: existing.id },
    data: {
      status: parsed.data.status,
      ...(isCancellation && parsed.data.cancellationReason
        ? { cancellationReason: parsed.data.cancellationReason }
        : {}),
      ...(leavingCancellation && { cancellationReason: null }),
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
        // cancellationReason intencionalmente NÃO duplicada aqui —
        // já persiste em Appointment.cancellationReason e o audit log é
        // imutável (LGPD: erasure não toca audit). Texto vai pra um lugar só.
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
  const guard = await requireOwnerOrAdmin();
  if (!guard.ok) return { status: 'error', error: guard.error };
  const { workspace, user, impersonating } = guard.ctx;

  const existing = await prisma.appointment.findFirst({
    where: { id: parsed.data.appointmentId, workspaceId: workspace.id },
    select: { id: true, startsAt: true, durationMinutes: true, professionalId: true },
  });
  if (!existing) return { status: 'error', error: 'Agendamento não encontrado' };

  const newStart = new Date(parsed.data.startsAt);
  if (Number.isNaN(newStart.getTime())) {
    return { status: 'error', error: 'Data inválida' };
  }

  // Conflict check: overlap com OUTROS appointments do mesmo profissional.
  // Buscamos TODOS os candidatos (que começam antes do novo fim) e checamos
  // cada um — findFirst() sem orderBy poderia retornar um não-overlap mesmo
  // existindo um overlap real. Limite 100 pra blindar contra agendas absurdas.
  const newDuration = parsed.data.durationMinutes ?? existing.durationMinutes;
  const newEnd = new Date(newStart.getTime() + newDuration * 60_000);
  const candidates = await prisma.appointment.findMany({
    where: {
      workspaceId: workspace.id,
      professionalId: existing.professionalId,
      id: { not: existing.id },
      status: { in: ['SCHEDULED', 'CONFIRMED'] },
      startsAt: { lt: newEnd },
    },
    select: { id: true, startsAt: true, durationMinutes: true },
    take: 100,
  });
  for (const c of candidates) {
    const cEnd = new Date(c.startsAt.getTime() + c.durationMinutes * 60_000);
    if (cEnd > newStart) {
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
