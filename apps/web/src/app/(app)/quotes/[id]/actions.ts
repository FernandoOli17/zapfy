'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@zapai/db';
import { createLogger } from '@zapai/shared';

import { requireOwnerOrAdmin } from '@/lib/inbox';

const log = createLogger('quotes-actions');

export const QuoteItemSchema = z.object({
  name: z.string().min(1, 'nome obrigatório').max(200),
  quantity: z.number().positive('quantidade > 0').max(10_000),
  unitPriceCents: z.number().int().min(0).max(100_000_000),
  notes: z.string().max(300).optional(),
});

const SaveDraftInput = z.object({
  quoteId: z.string().min(1),
  serviceDescription: z.string().min(1, 'descrição obrigatória').max(2000),
  items: z.array(QuoteItemSchema).min(1, 'adicione ao menos 1 item').max(50),
  validUntil: z.string().nullable().optional(),
  notes: z.string().max(2000).optional(),
});

const StatusInput = z.object({
  quoteId: z.string().min(1),
  status: z.enum(['SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED']),
});

export type SaveDraftResult =
  | { status: 'ok'; totalCents: number }
  | { status: 'error'; error: string };

export type StatusResult = { status: 'ok' } | { status: 'error'; error: string };

export async function saveQuoteDraft(
  input: z.infer<typeof SaveDraftInput>,
): Promise<SaveDraftResult> {
  const parsed = SaveDraftInput.safeParse(input);
  if (!parsed.success) {
    return { status: 'error', error: parsed.error.issues[0]?.message ?? 'Inválido' };
  }
  const guard = await requireOwnerOrAdmin();
  if (!guard.ok) return { status: 'error', error: guard.error };
  const { workspace, user, impersonating } = guard.ctx;

  const existing = await prisma.quote.findFirst({
    where: { id: parsed.data.quoteId, workspaceId: workspace.id },
    select: { id: true, status: true },
  });
  if (!existing) return { status: 'error', error: 'Orçamento não encontrado' };
  if (existing.status !== 'DRAFT') {
    return { status: 'error', error: 'Orçamento já foi enviado — não pode editar' };
  }

  const totalCents = parsed.data.items.reduce(
    (acc, it) => acc + Math.round(it.unitPriceCents * it.quantity),
    0,
  );

  // Postgres int4 ceiling é 2_147_483_647 (R$ 21.474.836,47). Limita ainda
  // mais conservador pra evitar uncaught Prisma error.
  const MAX_TOTAL_CENTS = 2_000_000_000;
  if (totalCents > MAX_TOTAL_CENTS) {
    return {
      status: 'error',
      error: 'Valor total muito alto. Quebre em mais de um orçamento.',
    };
  }

  const validUntilDate = parsed.data.validUntil
    ? (() => {
        const d = new Date(parsed.data.validUntil!);
        return Number.isNaN(d.getTime()) ? null : d;
      })()
    : null;

  await prisma.$transaction([
    prisma.quote.update({
      where: { id: existing.id },
      data: {
        serviceDescription: parsed.data.serviceDescription,
        items: parsed.data.items,
        totalCents,
        validUntil: validUntilDate,
        ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
      },
    }),
    prisma.auditLog.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        action: 'quote.draft_saved',
        targetType: 'Quote',
        targetId: existing.id,
        metadata: {
          itemCount: parsed.data.items.length,
          totalCents,
          ...(impersonating && { impersonating: true, adminEmail: user.email }),
        },
      },
    }),
  ]);

  log.info(
    { workspaceId: workspace.id, quoteId: existing.id, totalCents },
    'quote draft saved',
  );

  revalidatePath(`/quotes/${existing.id}`);
  revalidatePath('/quotes');
  return { status: 'ok', totalCents };
}

export async function changeQuoteStatus(
  input: z.infer<typeof StatusInput>,
): Promise<StatusResult> {
  const parsed = StatusInput.safeParse(input);
  if (!parsed.success) {
    return { status: 'error', error: parsed.error.issues[0]?.message ?? 'Inválido' };
  }
  const guard = await requireOwnerOrAdmin();
  if (!guard.ok) return { status: 'error', error: guard.error };
  const { workspace, user, impersonating } = guard.ctx;

  const q = await prisma.quote.findFirst({
    where: { id: parsed.data.quoteId, workspaceId: workspace.id },
    select: { id: true, status: true, items: true, totalCents: true },
  });
  if (!q) return { status: 'error', error: 'Orçamento não encontrado' };

  // Validações por transição
  if (parsed.data.status === 'SENT') {
    if (q.status !== 'DRAFT') {
      return { status: 'error', error: 'Só DRAFT pode ser enviado' };
    }
    const items = Array.isArray(q.items) ? q.items : [];
    if (items.length === 0) {
      return { status: 'error', error: 'Adicione ao menos 1 item antes de enviar' };
    }
    if (q.totalCents <= 0) {
      return { status: 'error', error: 'Total precisa ser > 0' };
    }
  }
  if ((parsed.data.status === 'ACCEPTED' || parsed.data.status === 'REJECTED') && q.status !== 'SENT') {
    return { status: 'error', error: 'Aceitar/recusar só depois de enviado' };
  }

  await prisma.$transaction([
    prisma.quote.update({
      where: { id: q.id },
      data: { status: parsed.data.status },
    }),
    prisma.auditLog.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        action: 'quote.status_change',
        targetType: 'Quote',
        targetId: q.id,
        metadata: {
          from: q.status,
          to: parsed.data.status,
          ...(impersonating && { impersonating: true, adminEmail: user.email }),
        },
      },
    }),
  ]);

  // TODO(notify): quando status=SENT, enfileirar envio de WhatsApp pro contato
  // com link do PDF. Implementar quando upload do PDF estiver pronto.

  log.info(
    { workspaceId: workspace.id, quoteId: q.id, from: q.status, to: parsed.data.status },
    'quote status changed',
  );

  revalidatePath(`/quotes/${q.id}`);
  revalidatePath('/quotes');
  return { status: 'ok' };
}
