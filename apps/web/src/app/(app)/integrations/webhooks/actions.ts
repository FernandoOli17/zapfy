'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@zapai/db';
import { createLogger } from '@zapai/shared';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import {
  generateWebhookSecret,
  OUTGOING_EVENT_NAMES,
} from '@/lib/webhooks-outgoing';

const log = createLogger('webhooks-actions');

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
    return { error: 'Apenas Owner/Admin podem gerenciar webhooks' as const };
  }
  return { user: session.user, workspace: member.workspace };
}

const createInput = z.object({
  url: z.string().url(),
  events: z.array(z.enum(OUTGOING_EVENT_NAMES)).min(1),
});

export type CreateWebhookResult =
  | { status: 'ok'; secret: string; id: string }
  | { status: 'error'; error: string };

export async function createWebhook(
  raw: z.infer<typeof createInput>,
): Promise<CreateWebhookResult> {
  const ctx = await requireAdmin();
  if ('error' in ctx) return { status: 'error', error: ctx.error };
  const parsed = createInput.safeParse(raw);
  if (!parsed.success) {
    return { status: 'error', error: parsed.error.issues[0]?.message ?? 'Inválido' };
  }
  const secret = generateWebhookSecret();
  const created = await prisma.outgoingWebhook.create({
    data: {
      workspaceId: ctx.workspace.id,
      url: parsed.data.url,
      secret,
      events: parsed.data.events,
      active: true,
    },
  });
  await prisma.auditLog.create({
    data: {
      workspaceId: ctx.workspace.id,
      userId: ctx.user.id,
      action: 'webhook.create',
      targetType: 'OutgoingWebhook',
      targetId: created.id,
      metadata: { url: parsed.data.url, events: parsed.data.events },
    },
  });
  log.info({ workspaceId: ctx.workspace.id, webhookId: created.id }, 'webhook criado');
  revalidatePath('/integrations/webhooks');
  return { status: 'ok', secret, id: created.id };
}

export async function toggleWebhook(webhookId: string) {
  const ctx = await requireAdmin();
  if ('error' in ctx) return { status: 'error' as const, error: ctx.error };
  const wh = await prisma.outgoingWebhook.findFirst({
    where: { id: webhookId, workspaceId: ctx.workspace.id },
  });
  if (!wh) return { status: 'error' as const, error: 'Webhook não encontrado' };
  await prisma.outgoingWebhook.update({
    where: { id: wh.id },
    data: { active: !wh.active },
  });
  revalidatePath('/integrations/webhooks');
  return { status: 'ok' as const, active: !wh.active };
}

export async function deleteWebhook(webhookId: string) {
  const ctx = await requireAdmin();
  if ('error' in ctx) return { status: 'error' as const, error: ctx.error };
  await prisma.outgoingWebhook.deleteMany({
    where: { id: webhookId, workspaceId: ctx.workspace.id },
  });
  await prisma.auditLog.create({
    data: {
      workspaceId: ctx.workspace.id,
      userId: ctx.user.id,
      action: 'webhook.delete',
      targetType: 'OutgoingWebhook',
      targetId: webhookId,
    },
  });
  revalidatePath('/integrations/webhooks');
  return { status: 'ok' as const };
}
