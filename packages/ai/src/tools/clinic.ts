import { tool, type Tool } from 'ai';
import { z } from 'zod';
import { prisma, AppointmentStatus, type Prisma } from '@zapfy/db';
import { createLogger } from '@zapfy/shared';
import type { VerticalRuntimeDeps } from './runtime/types';

const log = createLogger('tools:clinic');

/**
 * Tools do vertical CLINIC.
 *
 * Google Calendar sync: stubbed até OAuth ficar pronto (BLOCKED.md → Google Calendar).
 * Sem credencial, agendamentos vivem só no Postgres; com credencial, sincroniza
 * via Calendar API quando `professional.googleCalendarTokenEncrypted` estiver setado.
 *
 * Geração de slots: usa horários comerciais HARDCODED (9h-12h, 14h-18h, dias úteis)
 * mais slots já ocupados no DB. Workspace.businessHours JSON ainda não persistido
 * (próxima feature).
 */

const BUSINESS_HOURS_DEFAULT = {
  weekdays: [1, 2, 3, 4, 5], // seg-sex
  morningStart: 9,
  morningEnd: 12,
  afternoonStart: 14,
  afternoonEnd: 18,
  slotMinutes: 30,
};

export function buildClinicTools(deps: VerticalRuntimeDeps): Record<string, Tool> {
  return {
    list_available_slots: tool({
      description:
        'Retorna horários livres pra agendamento, por profissional e janela de datas. Use depois que cliente disser pra quem quer marcar e em qual dia/semana.',
      inputSchema: z.object({
        professionalId: z.string().cuid().optional().describe('Se não passar, lista todos os profissionais.'),
        startDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD')
          .describe('Data inicial. Use hoje se cliente não especificar.'),
        daysAhead: z.number().int().min(1).max(14).default(7),
      }),
      execute: async ({ professionalId, startDate, daysAhead }) => {
        const where: Prisma.ProfessionalWhereInput = {
          workspaceId: deps.workspaceId,
          active: true,
        };
        if (professionalId) where.id = professionalId;
        const professionals = await prisma.professional.findMany({
          where,
          select: { id: true, name: true, specialty: true },
        });
        if (professionals.length === 0) {
          return { ok: false as const, error: 'nenhum profissional cadastrado nesse workspace' };
        }

        const start = new Date(startDate + 'T00:00:00.000-03:00'); // BRT
        const end = new Date(start);
        end.setDate(end.getDate() + daysAhead);

        const existing = await prisma.appointment.findMany({
          where: {
            workspaceId: deps.workspaceId,
            professionalId: { in: professionals.map((p) => p.id) },
            startsAt: { gte: start, lt: end },
            status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] },
          },
          select: { professionalId: true, startsAt: true, durationMinutes: true },
        });

        const slotsByProf = professionals.map((p) => {
          const busy = existing.filter((a) => a.professionalId === p.id);
          const free = generateSlots(start, end, BUSINESS_HOURS_DEFAULT, busy).slice(0, 12);
          return {
            professionalId: p.id,
            professionalName: p.name,
            specialty: p.specialty,
            slots: free.map((s) => ({
              startsAt: s.toISOString(),
              dayLabel: s.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }),
              timeLabel: s.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            })),
          };
        });

        return { ok: true as const, professionals: slotsByProf };
      },
    }),

    book_appointment: tool({
      description:
        'Agenda consulta no horário escolhido. Cria registro no DB. Se profissional tiver Google Calendar conectado, também cria evento lá. NÃO chame sem confirmar com o cliente nome + horário.',
      inputSchema: z.object({
        professionalId: z.string().cuid(),
        startsAtIso: z.string().datetime().describe('Horário escolhido em ISO 8601 com timezone'),
        durationMinutes: z.number().int().min(15).max(180).default(30),
        type: z.string().max(60).optional().describe('Ex: consulta, retorno, avaliação'),
        notes: z.string().max(500).optional(),
      }),
      execute: async ({ professionalId, startsAtIso, durationMinutes, type, notes }) => {
        const professional = await prisma.professional.findFirst({
          where: { id: professionalId, workspaceId: deps.workspaceId, active: true },
        });
        if (!professional) {
          return { ok: false as const, error: 'profissional não encontrado' };
        }

        const startsAt = new Date(startsAtIso);
        // Conflito? Outro agendamento ativo nesse mesmo horário?
        const overlapping = await prisma.appointment.findFirst({
          where: {
            professionalId,
            status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] },
            startsAt: {
              gte: new Date(startsAt.getTime() - durationMinutes * 60_000),
              lt: new Date(startsAt.getTime() + durationMinutes * 60_000),
            },
          },
          select: { id: true },
        });
        if (overlapping) {
          return { ok: false as const, error: 'horário não está mais livre — peça pra cliente escolher outro' };
        }

        // TODO(credentials): integrar Google Calendar quando OAuth ficar pronto
        // if (professional.googleCalendarTokenEncrypted) {
        //   const event = await createGoogleEvent(...)
        //   googleEventId = event.id
        // }

        const appointment = await prisma.appointment.create({
          data: {
            workspaceId: deps.workspaceId,
            professionalId,
            contactId: deps.contactId === 'test-contact' ? null : deps.contactId,
            conversationId: deps.conversationId === 'test-conversation' ? null : deps.conversationId,
            status: AppointmentStatus.SCHEDULED,
            startsAt,
            durationMinutes,
            ...(type ? { type } : {}),
            ...(notes ? { notes } : {}),
          },
          select: { id: true, startsAt: true, durationMinutes: true },
        });

        log.info(
          { workspaceId: deps.workspaceId, appointmentId: appointment.id, professionalId },
          'agendamento criado',
        );

        return {
          ok: true as const,
          appointmentId: appointment.id,
          professionalName: professional.name,
          when: appointment.startsAt.toLocaleString('pt-BR', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit',
          }),
          message: `Consulta marcada com ${professional.name} pra ${appointment.startsAt.toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`,
        };
      },
    }),

    confirm_appointment: tool({
      description:
        'Marca agendamento como CONFIRMED (cliente respondeu confirmando presença). Use quando enviar lembrete 24h antes e cliente responder "sim, posso ir".',
      inputSchema: z.object({
        appointmentId: z.string().cuid(),
      }),
      execute: async ({ appointmentId }) => {
        const updated = await prisma.appointment.updateMany({
          where: {
            id: appointmentId,
            workspaceId: deps.workspaceId,
            status: AppointmentStatus.SCHEDULED,
          },
          data: { status: AppointmentStatus.CONFIRMED },
        });
        if (updated.count === 0) {
          return { ok: false as const, error: 'agendamento não encontrado ou já não está SCHEDULED' };
        }
        return { ok: true as const, message: 'Presença confirmada' };
      },
    }),

    cancel_appointment: tool({
      description:
        'Cancela agendamento e libera o horário. Sempre pergunte o motivo. Ofereça reagendamento na sequência (usando list_available_slots).',
      inputSchema: z.object({
        appointmentId: z.string().cuid(),
        reason: z.string().min(2).max(200).describe('Motivo do cancelamento dito pelo cliente'),
      }),
      execute: async ({ appointmentId, reason }) => {
        const apt = await prisma.appointment.findFirst({
          where: { id: appointmentId, workspaceId: deps.workspaceId },
          select: { id: true, status: true },
        });
        if (!apt) return { ok: false as const, error: 'agendamento não encontrado' };
        if (apt.status === AppointmentStatus.CANCELLED) {
          return { ok: false as const, error: 'já estava cancelado' };
        }
        await prisma.appointment.update({
          where: { id: appointmentId },
          data: { status: AppointmentStatus.CANCELLED, cancellationReason: reason.slice(0, 200) },
        });
        // TODO(credentials): se tinha googleEventId, deletar evento via Calendar API
        return { ok: true as const, message: 'Agendamento cancelado. Quer reagendar?' };
      },
    }),
  };
}

// ─── Slot generation ────────────────────────────────────────────────────────

interface BusinessHours {
  weekdays: number[]; // 0=domingo, 1=seg, ..., 6=sab
  morningStart: number;
  morningEnd: number;
  afternoonStart: number;
  afternoonEnd: number;
  slotMinutes: number;
}

function generateSlots(
  start: Date,
  end: Date,
  hours: BusinessHours,
  busy: Array<{ startsAt: Date; durationMinutes: number }>,
): Date[] {
  const slots: Date[] = [];
  const cursor = new Date(start);
  const now = new Date();
  while (cursor < end) {
    const dow = cursor.getDay();
    if (hours.weekdays.includes(dow)) {
      // manhã
      for (let h = hours.morningStart; h < hours.morningEnd; h += hours.slotMinutes / 60) {
        const slot = new Date(cursor);
        slot.setHours(Math.floor(h), (h % 1) * 60, 0, 0);
        if (slot > now && !slotConflicts(slot, busy, hours.slotMinutes)) slots.push(slot);
      }
      // tarde
      for (let h = hours.afternoonStart; h < hours.afternoonEnd; h += hours.slotMinutes / 60) {
        const slot = new Date(cursor);
        slot.setHours(Math.floor(h), (h % 1) * 60, 0, 0);
        if (slot > now && !slotConflicts(slot, busy, hours.slotMinutes)) slots.push(slot);
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return slots;
}

function slotConflicts(
  slot: Date,
  busy: Array<{ startsAt: Date; durationMinutes: number }>,
  slotMinutes: number,
): boolean {
  const slotEnd = new Date(slot.getTime() + slotMinutes * 60_000);
  return busy.some((b) => {
    const bEnd = new Date(b.startsAt.getTime() + b.durationMinutes * 60_000);
    return slot < bEnd && slotEnd > b.startsAt;
  });
}
