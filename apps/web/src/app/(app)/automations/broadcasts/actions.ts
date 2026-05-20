'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  BroadcastStatus,
  prisma,
  type Prisma,
} from '@zapai/db';
import { createLogger } from '@zapai/shared';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import { enqueue, type SendBroadcastJob } from '@/lib/queues';

const log = createLogger('broadcasts-actions');

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');
  const member = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    include: { workspace: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!member) redirect('/onboarding');
  if (member.role !== 'OWNER' && member.role !== 'ADMIN') {
    return { error: 'Apenas Owner/Admin podem gerenciar broadcasts' as const };
  }
  return { user: session.user, workspace: member.workspace };
}

const recipientTargetSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('all') }),
  z.object({ mode: z.literal('tag'), tag: z.string().trim().min(1).max(60) }),
  z.object({
    mode: z.literal('ids'),
    contactIds: z.array(z.string().cuid()).min(1).max(10000),
  }),
]);

const createInput = z.object({
  name: z.string().trim().min(2).max(120),
  templateId: z.string().cuid(),
  scheduledFor: z.string().datetime().optional(),
  target: recipientTargetSchema,
});

export type CreateBroadcastInput = z.infer<typeof createInput>;
export type BroadcastActionResult =
  | { status: 'ok'; broadcastId: string }
  | { status: 'error'; error: string };

export async function createBroadcast(raw: CreateBroadcastInput): Promise<BroadcastActionResult> {
  const ctx = await requireAdmin();
  if ('error' in ctx) return { status: 'error', error: ctx.error };
  const parsed = createInput.safeParse(raw);
  if (!parsed.success) {
    return { status: 'error', error: parsed.error.issues[0]?.message ?? 'Inválido' };
  }

  const tpl = await prisma.messageTemplate.findFirst({
    where: { id: parsed.data.templateId, workspaceId: ctx.workspace.id },
  });
  if (!tpl) return { status: 'error', error: 'Template não encontrado' };
  if (tpl.status !== 'APPROVED') {
    return {
      status: 'error',
      error: 'Template precisa estar APPROVED pra ser usado em broadcast',
    };
  }

  // Resolve recipientes
  const baseWhere: Prisma.ContactWhereInput = {
    workspaceId: ctx.workspace.id,
    deletedAt: null,
    optedOut: false,
  };
  let contactIds: string[] = [];
  if (parsed.data.target.mode === 'all') {
    const rows = await prisma.contact.findMany({ where: baseWhere, select: { id: true } });
    contactIds = rows.map((r) => r.id);
  } else if (parsed.data.target.mode === 'tag') {
    const rows = await prisma.contact.findMany({
      where: { ...baseWhere, tags: { has: parsed.data.target.tag } },
      select: { id: true },
    });
    contactIds = rows.map((r) => r.id);
  } else {
    const rows = await prisma.contact.findMany({
      where: { ...baseWhere, id: { in: parsed.data.target.contactIds } },
      select: { id: true },
    });
    contactIds = rows.map((r) => r.id);
  }

  if (contactIds.length === 0) {
    return { status: 'error', error: 'Nenhum contato elegível pro broadcast' };
  }

  const scheduledFor = parsed.data.scheduledFor ? new Date(parsed.data.scheduledFor) : null;
  const status: BroadcastStatus = scheduledFor
    ? BroadcastStatus.SCHEDULED
    : BroadcastStatus.DRAFT;

  const broadcast = await prisma.broadcast.create({
    data: {
      workspaceId: ctx.workspace.id,
      name: parsed.data.name,
      templateId: tpl.id,
      status,
      ...(scheduledFor ? { scheduledFor } : {}),
      recipients: {
        createMany: {
          data: contactIds.map((contactId) => ({ contactId })),
        },
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      workspaceId: ctx.workspace.id,
      userId: ctx.user.id,
      action: 'broadcast.created',
      targetType: 'Broadcast',
      targetId: broadcast.id,
      metadata: { name: broadcast.name, recipients: contactIds.length, status },
    },
  });

  log.info(
    {
      workspaceId: ctx.workspace.id,
      broadcastId: broadcast.id,
      recipients: contactIds.length,
      status,
    },
    'broadcast criado',
  );

  revalidatePath('/automations/broadcasts');
  return { status: 'ok', broadcastId: broadcast.id };
}

export async function launchBroadcast(broadcastId: string): Promise<BroadcastActionResult> {
  const ctx = await requireAdmin();
  if ('error' in ctx) return { status: 'error', error: ctx.error };

  const broadcast = await prisma.broadcast.findFirst({
    where: { id: broadcastId, workspaceId: ctx.workspace.id },
    include: { recipients: { select: { id: true } } },
  });
  if (!broadcast) return { status: 'error', error: 'Broadcast não encontrado' };
  if (
    broadcast.status !== BroadcastStatus.DRAFT &&
    broadcast.status !== BroadcastStatus.SCHEDULED
  ) {
    return { status: 'error', error: `Broadcast em status ${broadcast.status} não pode ser lançado` };
  }

  await prisma.broadcast.update({
    where: { id: broadcast.id },
    data: { status: BroadcastStatus.RUNNING, startedAt: new Date() },
  });

  // Enfileira um job por recipient. Worker processa com throttle global no provider.
  let enqueued = 0;
  for (const r of broadcast.recipients) {
    const job: SendBroadcastJob = {
      workspaceId: ctx.workspace.id,
      broadcastId: broadcast.id,
      recipientId: r.id,
    };
    const res = await enqueue('send-broadcast', job, {
      jobId: `broadcast:${broadcast.id}:${r.id}`,
      attempts: 3,
    });
    if (res.ok) enqueued += 1;
  }

  await prisma.auditLog.create({
    data: {
      workspaceId: ctx.workspace.id,
      userId: ctx.user.id,
      action: 'broadcast.launched',
      targetType: 'Broadcast',
      targetId: broadcast.id,
      metadata: { enqueued, total: broadcast.recipients.length },
    },
  });

  log.info(
    { broadcastId: broadcast.id, enqueued, total: broadcast.recipients.length },
    'broadcast lançado',
  );

  revalidatePath('/automations/broadcasts');
  revalidatePath(`/automations/broadcasts/${broadcast.id}`);
  return { status: 'ok', broadcastId: broadcast.id };
}

export async function cancelBroadcast(broadcastId: string): Promise<BroadcastActionResult> {
  const ctx = await requireAdmin();
  if ('error' in ctx) return { status: 'error', error: ctx.error };

  const broadcast = await prisma.broadcast.findFirst({
    where: { id: broadcastId, workspaceId: ctx.workspace.id },
  });
  if (!broadcast) return { status: 'error', error: 'Broadcast não encontrado' };
  if (
    broadcast.status === BroadcastStatus.COMPLETED ||
    broadcast.status === BroadcastStatus.CANCELED
  ) {
    return { status: 'error', error: `Broadcast já está ${broadcast.status}` };
  }

  await prisma.broadcast.update({
    where: { id: broadcast.id },
    data: { status: BroadcastStatus.CANCELED, finishedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      workspaceId: ctx.workspace.id,
      userId: ctx.user.id,
      action: 'broadcast.canceled',
      targetType: 'Broadcast',
      targetId: broadcast.id,
    },
  });

  revalidatePath('/automations/broadcasts');
  revalidatePath(`/automations/broadcasts/${broadcast.id}`);
  return { status: 'ok', broadcastId: broadcast.id };
}

export async function deleteBroadcast(broadcastId: string): Promise<BroadcastActionResult> {
  const ctx = await requireAdmin();
  if ('error' in ctx) return { status: 'error', error: ctx.error };

  const broadcast = await prisma.broadcast.findFirst({
    where: { id: broadcastId, workspaceId: ctx.workspace.id },
  });
  if (!broadcast) return { status: 'error', error: 'Broadcast não encontrado' };
  if (broadcast.status === BroadcastStatus.RUNNING) {
    return { status: 'error', error: 'Cancele antes de deletar' };
  }

  await prisma.broadcast.delete({ where: { id: broadcast.id } });
  await prisma.auditLog.create({
    data: {
      workspaceId: ctx.workspace.id,
      userId: ctx.user.id,
      action: 'broadcast.deleted',
      targetType: 'Broadcast',
      targetId: broadcast.id,
    },
  });

  revalidatePath('/automations/broadcasts');
  return { status: 'ok', broadcastId: broadcast.id };
}
