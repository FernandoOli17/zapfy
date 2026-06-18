'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  BroadcastStatus,
  BroadcastRecipientStatus,
  prisma,
  type Prisma,
} from '@zapfy/db';
import { createLogger } from '@zapfy/shared';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import { enqueue, type SendBroadcastJob } from '@/lib/queues';
import { captureEvent } from '@/lib/posthog';

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
    include: { recipients: { select: { contactId: true } } },
  });
  if (!broadcast) return { status: 'error', error: 'Broadcast não encontrado' };
  if (
    broadcast.status !== BroadcastStatus.DRAFT &&
    broadcast.status !== BroadcastStatus.SCHEDULED
  ) {
    return { status: 'error', error: `Broadcast em status ${broadcast.status} não pode ser lançado` };
  }

  // Disparos proativos consomem créditos de marketing (1 por destinatário).
  // Vendidos em pacotes à parte (fluxo de compra é fase futura) — por ora só
  // bloqueia quando o saldo não cobre o envio.
  const needed = broadcast.recipients.length;
  const previousStatus = broadcast.status;

  // Dinheiro: o débito e a transição de status precisam ser atômicos, senão dois
  // launches concorrentes (double-click no mesmo broadcast, ou dois broadcasts
  // com saldo pra só um) passam ambos num check separado e debitam 2× / deixam
  // o saldo negativo. Sequência:
  //   1. claim atômico DRAFT/SCHEDULED→RUNNING (só um launcher vence o mesmo broadcast);
  //   2. débito condicional (`gte`) — saldo nunca fica negativo;
  //   3. se o débito não pegar (saldo insuficiente), reverte o status pro original.
  const claimed = await prisma.broadcast.updateMany({
    where: {
      id: broadcast.id,
      status: { in: [BroadcastStatus.DRAFT, BroadcastStatus.SCHEDULED] },
    },
    data: { status: BroadcastStatus.RUNNING, startedAt: new Date() },
  });
  if (claimed.count === 0) {
    return { status: 'error', error: 'Broadcast já foi lançado' };
  }

  const debited = await prisma.subscription.updateMany({
    where: { workspaceId: ctx.workspace.id, marketingCredits: { gte: needed } },
    data: { marketingCredits: { decrement: needed } },
  });
  if (debited.count === 0) {
    // Não conseguiu debitar — desfaz o claim de status pra não deixar o
    // broadcast RUNNING sem créditos nem jobs enfileirados.
    await prisma.broadcast.updateMany({
      where: { id: broadcast.id, status: BroadcastStatus.RUNNING },
      data: { status: previousStatus, startedAt: null },
    });
    const sub = await prisma.subscription.findUnique({
      where: { workspaceId: ctx.workspace.id },
      select: { marketingCredits: true },
    });
    const balance = sub?.marketingCredits ?? 0;
    return {
      status: 'error',
      error: `Saldo de créditos de marketing insuficiente: ${balance} crédito(s) pra ${needed} destinatário(s). Compre mais créditos pra disparar.`,
    };
  }

  // Enfileira um job por recipient. BullMQ worker tem concurrency=3 globalmente
  // (apps/worker/src/index.ts) — efetivamente já rate-limita envios pra Meta.
  // Cada job tem jobId determinístico (broadcast:contactId) pra dedup natural
  // em re-enqueue/retry.
  let enqueued = 0;
  const failedToEnqueue: string[] = [];
  for (const r of broadcast.recipients) {
    const job: SendBroadcastJob = {
      workspaceId: ctx.workspace.id,
      broadcastId: broadcast.id,
      recipientId: r.contactId, // Contact.id, NÃO BroadcastRecipient.id
    };
    const res = await enqueue('send-broadcast', job, {
      jobId: `broadcast:${broadcast.id}:${r.contactId}`,
      attempts: 3,
    });
    if (res.ok) enqueued += 1;
    else failedToEnqueue.push(r.contactId);
  }

  // Fila totalmente indisponível (Redis fora): nada foi enfileirado. Reverte o
  // launch INTEIRO — estorna os créditos debitados e volta o status — pra não
  // perder dinheiro nem deixar o broadcast travado em RUNNING sem jobs.
  if (enqueued === 0) {
    await prisma.subscription.updateMany({
      where: { workspaceId: ctx.workspace.id },
      data: { marketingCredits: { increment: needed } },
    });
    await prisma.broadcast.updateMany({
      where: { id: broadcast.id, status: BroadcastStatus.RUNNING },
      data: { status: previousStatus, startedAt: null },
    });
    log.error(
      { broadcastId: broadcast.id, needed },
      'fila indisponível no launch — revertido (créditos estornados)',
    );
    return {
      status: 'error',
      error: 'A fila de envio está indisponível agora. Nada foi cobrado — tente de novo em instantes.',
    };
  }

  // Falha parcial de enqueue: marca os não-enfileirados como FAILED pra que o
  // settle do broadcast os estorne (senão ficariam PENDING pra sempre, com o
  // crédito preso). Os enfileirados seguem normalmente.
  if (failedToEnqueue.length > 0) {
    await prisma.broadcastRecipient.updateMany({
      where: { broadcastId: broadcast.id, contactId: { in: failedToEnqueue } },
      data: {
        status: BroadcastRecipientStatus.FAILED,
        errorMessage: 'não enfileirado (fila indisponível no launch)',
      },
    });
    log.warn(
      { broadcastId: broadcast.id, enqueued, total: needed, failed: failedToEnqueue.length },
      'launch parcial — recipients não-enfileirados marcados FAILED (serão estornados no settle)',
    );
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

  captureEvent({
    event: 'broadcast.launched',
    distinctId: ctx.user.id,
    workspaceId: ctx.workspace.id,
    properties: { recipientCount: broadcast.recipients.length },
  });

  revalidatePath('/automations/broadcasts');
  revalidatePath(`/automations/broadcasts/${broadcast.id}`);
  return { status: 'ok', broadcastId: broadcast.id };
}

/**
 * Settle idempotente de um broadcast CANCELED: reivindica `finishedAt` (null→now)
 * e, se vencer, estorna 1 crédito por recipient FAILED/SKIPPED (estado FINAL — SENT
 * não estorna). Só dispara com PENDING===0; senão os jobs do worker settam ao
 * drenar. Mesma lógica do `maybeCompleteBroadcast` do worker — espelhada aqui pro
 * caso de cancel sem jobs em voo. Retorna quantos créditos foram estornados agora.
 */
async function settleCanceledBroadcast(broadcastId: string, workspaceId: string): Promise<number> {
  const remaining = await prisma.broadcastRecipient.count({
    where: { broadcastId, status: BroadcastRecipientStatus.PENDING },
  });
  if (remaining > 0) return 0; // jobs em voo settam depois

  const claimed = await prisma.broadcast.updateMany({
    where: { id: broadcastId, finishedAt: null },
    data: { finishedAt: new Date() },
  });
  if (claimed.count === 0) return 0;

  const refundCount = await prisma.broadcastRecipient.count({
    where: {
      broadcastId,
      status: { in: [BroadcastRecipientStatus.FAILED, BroadcastRecipientStatus.SKIPPED] },
    },
  });
  if (refundCount > 0) {
    await prisma.subscription.updateMany({
      where: { workspaceId },
      data: { marketingCredits: { increment: refundCount } },
    });
    log.info({ workspaceId, broadcastId, refundCount }, 'créditos estornados no settle do cancelamento');
  }
  return refundCount;
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

  // Transição atômica pra CANCELED, SEM finishedAt: o estorno NÃO acontece aqui.
  // Quem estorna é o settle (`settleCanceledBroadcast`), reivindicado por
  // `finishedAt` — assim ele conta o estado FINAL dos recipients. Estornar PENDING
  // aqui dava over-refund: um envio em voo (sendTemplate já feito, prestes a virar
  // SENT) seria contado como não-entregue e estornado mesmo tendo consumido crédito.
  const canceled = await prisma.broadcast.updateMany({
    where: {
      id: broadcast.id,
      status: { notIn: [BroadcastStatus.COMPLETED, BroadcastStatus.CANCELED] },
    },
    data: { status: BroadcastStatus.CANCELED },
  });
  if (canceled.count === 0) {
    return { status: 'error', error: 'Broadcast já foi finalizado' };
  }

  // Se não há mais recipients PENDING (nenhum job em voo), settla aqui; senão os
  // jobs do worker, ao verem CANCELED, marcam SKIPPED e o último a drenar settla.
  const refundCount = await settleCanceledBroadcast(broadcast.id, ctx.workspace.id);

  await prisma.auditLog.create({
    data: {
      workspaceId: ctx.workspace.id,
      userId: ctx.user.id,
      action: 'broadcast.canceled',
      targetType: 'Broadcast',
      targetId: broadcast.id,
      metadata: { refundedCredits: refundCount },
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
