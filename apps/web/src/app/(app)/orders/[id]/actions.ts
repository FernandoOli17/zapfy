'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@zapai/db';
import { createLogger } from '@zapai/shared';

import { requireWorkspace } from '@/lib/inbox';

const log = createLogger('orders-actions');

const StatusSchema = z.enum([
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
]);

const UpdateInput = z.object({
  orderId: z.string().min(1),
  status: StatusSchema,
  etaMinutes: z.number().int().min(1).max(600).optional(),
  notes: z.string().max(500).optional(),
});

export type UpdateOrderResult =
  | { status: 'ok' }
  | { status: 'error'; error: string };

export async function updateOrderStatus(
  input: z.infer<typeof UpdateInput>,
): Promise<UpdateOrderResult> {
  const parsed = UpdateInput.safeParse(input);
  if (!parsed.success) {
    return { status: 'error', error: parsed.error.issues[0]?.message ?? 'Inválido' };
  }
  const { workspace, user } = await requireWorkspace();

  const existing = await prisma.order.findFirst({
    where: { id: parsed.data.orderId, workspaceId: workspace.id },
    select: { id: true, status: true, publicNumber: true },
  });
  if (!existing) return { status: 'error', error: 'Pedido não encontrado' };

  if (existing.status === parsed.data.status) {
    return { status: 'ok' };
  }

  await prisma.order.update({
    where: { id: existing.id },
    data: {
      status: parsed.data.status,
      ...(parsed.data.etaMinutes !== undefined && { etaMinutes: parsed.data.etaMinutes }),
      ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
    },
  });

  await prisma.auditLog.create({
    data: {
      workspaceId: workspace.id,
      userId: user.id,
      action: 'order.status_change',
      targetType: 'Order',
      targetId: existing.id,
      metadata: {
        publicNumber: existing.publicNumber,
        from: existing.status,
        to: parsed.data.status,
      },
    },
  });

  log.info(
    { workspaceId: workspace.id, orderId: existing.id, from: existing.status, to: parsed.data.status },
    'order status updated',
  );

  revalidatePath('/orders');
  revalidatePath(`/orders/${existing.id}`);
  return { status: 'ok' };
}
