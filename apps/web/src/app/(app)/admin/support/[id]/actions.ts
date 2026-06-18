'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import { prisma, SupportSender, type SupportTicketStatus } from '@zapfy/db';
import { replyTicket, setTicketStatus } from '@/lib/support';
import { createLogger } from '@zapfy/shared';
import { pendingVerificationForSession } from '@/lib/device-verification';

const log = createLogger('admin-support-actions');

async function requireSuperAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  // Fail-closed: sessão com verificação de device pendente não age como staff.
  const pending = await pendingVerificationForSession({
    userId: session.user.id,
    sessionToken: session.session.token,
  });
  if (pending) return null;
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isSuperAdmin: true, name: true, email: true },
  });
  if (!me?.isSuperAdmin) return null;
  return { session, me };
}

const replyInput = z.object({
  ticketId: z.string().min(1),
  body: z.string().trim().min(2).max(8000),
});

export async function adminReplyAction(
  raw: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireSuperAdmin();
  if (!ctx) return { ok: false, error: 'Não autorizado.' };

  const parsed = replyInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  try {
    await replyTicket({
      ticketId: parsed.data.ticketId,
      sender: SupportSender.STAFF,
      senderId: ctx.session.user.id,
      senderName: ctx.me.name ?? 'Equipe Zapfy',
      body: parsed.data.body,
    });
    revalidatePath(`/admin/support/${parsed.data.ticketId}`);
    revalidatePath('/admin/support');
    return { ok: true };
  } catch (err) {
    log.error({ err: String(err), ticketId: parsed.data.ticketId }, 'replyTicket (staff) falhou');
    return { ok: false, error: 'Falha ao enviar.' };
  }
}

const statusInput = z.object({
  ticketId: z.string().min(1),
  status: z.enum(['OPEN', 'AWAITING_USER', 'AWAITING_STAFF', 'RESOLVED', 'CLOSED']),
});

export async function adminSetStatusAction(
  raw: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireSuperAdmin();
  if (!ctx) return { ok: false, error: 'Não autorizado.' };

  const parsed = statusInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Status inválido.' };

  try {
    await setTicketStatus(parsed.data.ticketId, parsed.data.status as SupportTicketStatus);
    revalidatePath(`/admin/support/${parsed.data.ticketId}`);
    revalidatePath('/admin/support');
    return { ok: true };
  } catch (err) {
    log.error({ err: String(err), ticketId: parsed.data.ticketId }, 'setTicketStatus falhou');
    return { ok: false, error: 'Falha.' };
  }
}
