'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import { openTicket } from '@/lib/support';
import { prisma, type SupportTicketCategory } from '@zapfy/db';

const inputSchema = z.object({
  category: z.enum([
    'BILLING',
    'BUG',
    'WHATSAPP_SETUP',
    'AGENT_CONFIG',
    'FEATURE_REQUEST',
    'OTHER',
  ]),
  subject: z.string().trim().min(4).max(120),
  body: z.string().trim().min(10).max(4000),
});

export async function createTicketAction(
  raw: unknown,
): Promise<{ ok: true; ticketId: string } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: 'Sessão expirada.' };

  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  // Tenta achar o workspace ativo do user pra linkar o ticket
  const member = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'asc' },
    select: { workspaceId: true },
  });

  try {
    const result = await openTicket({
      userId: session.user.id,
      ...(member ? { workspaceId: member.workspaceId } : {}),
      subject: parsed.data.subject,
      category: parsed.data.category as SupportTicketCategory,
      body: parsed.data.body,
      senderName: session.user.name ?? session.user.email,
    });
    return { ok: true, ticketId: result.ticketId };
  } catch {
    return { ok: false, error: 'Falha ao abrir ticket. Tente novamente.' };
  }
}

export async function redirectToTicket(ticketId: string): Promise<never> {
  redirect(`/support/${ticketId}`);
}
