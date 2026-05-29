'use server';

import { headers } from 'next/headers';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import { openTicket } from '@/lib/support';
import { type SupportTicketCategory } from '@zapfy/db';

const inputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
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

export type SubmitTicketResult =
  | { ok: true; publicNumber: number }
  | { ok: false; error: string };

export async function submitSupportTicketAction(
  raw: unknown,
): Promise<SubmitTicketResult> {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? 'Dados inválidos.' };
  }
  const data = parsed.data;

  // Se user está logado, pega userId pra linkar o ticket
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user.id;

  try {
    const result = await openTicket({
      ...(userId
        ? { userId }
        : { guestEmail: data.email, guestName: data.name }),
      subject: data.subject,
      category: data.category as SupportTicketCategory,
      body: data.body,
      senderName: session?.user.name ?? data.name,
    });
    return { ok: true, publicNumber: result.publicNumber };
  } catch {
    return { ok: false, error: 'Não consegui abrir o ticket. Tente novamente.' };
  }
}
