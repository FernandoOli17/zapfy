'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import { prisma, SupportSender } from '@zapfy/db';
import { replyTicket } from '@/lib/support';
import { createLogger } from '@zapfy/shared';

const log = createLogger('support-actions');

const inputSchema = z.object({
  ticketId: z.string().min(1),
  body: z.string().trim().min(2).max(4000),
});

export async function replyAsUserAction(
  raw: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: 'Sessão expirada.' };

  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  // Garante que esse user é o dono do ticket
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: parsed.data.ticketId },
    select: { userId: true },
  });
  if (!ticket || ticket.userId !== session.user.id) {
    return { ok: false, error: 'Ticket não encontrado.' };
  }

  try {
    await replyTicket({
      ticketId: parsed.data.ticketId,
      sender: SupportSender.USER,
      senderId: session.user.id,
      senderName: session.user.name ?? session.user.email,
      body: parsed.data.body,
    });
    revalidatePath(`/support/${parsed.data.ticketId}`);
    return { ok: true };
  } catch (err) {
    log.error({ err: String(err), ticketId: parsed.data.ticketId }, 'replyTicket (user) falhou');
    return { ok: false, error: 'Falha ao enviar resposta.' };
  }
}
