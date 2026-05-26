'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma, type Prisma } from '@zapai/db';
import { AppError, createLogger, workspaceSlugSchema } from '@zapai/shared';
import { z } from 'zod';

import { auth } from '@/lib/auth';

const log = createLogger('settings-actions');

async function requireOwner() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');
  const member = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    include: { workspace: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!member) redirect('/onboarding');
  if (member.role !== 'OWNER') {
    return { error: 'Apenas o Owner pode mudar configurações do workspace' as const };
  }
  return { user: session.user, workspace: member.workspace, member };
}

const renameInput = z.object({
  name: z.string().trim().min(2).max(80),
});

export async function renameWorkspace(raw: z.infer<typeof renameInput>) {
  const ctx = await requireOwner();
  if ('error' in ctx) return { status: 'error' as const, error: ctx.error };
  const parsed = renameInput.safeParse(raw);
  if (!parsed.success) {
    return { status: 'error' as const, error: parsed.error.issues[0]?.message ?? 'Inválido' };
  }
  await prisma.workspace.update({
    where: { id: ctx.workspace.id },
    data: { name: parsed.data.name },
  });
  await prisma.auditLog.create({
    data: {
      workspaceId: ctx.workspace.id,
      userId: ctx.user.id,
      action: 'workspace.rename',
      targetType: 'Workspace',
      targetId: ctx.workspace.id,
      metadata: { from: ctx.workspace.name, to: parsed.data.name },
    },
  });
  revalidatePath('/settings');
  revalidatePath('/dashboard');
  return { status: 'ok' as const };
}

const slugInput = z.object({ slug: workspaceSlugSchema });

export async function changeSlug(raw: z.infer<typeof slugInput>) {
  const ctx = await requireOwner();
  if ('error' in ctx) return { status: 'error' as const, error: ctx.error };
  const parsed = slugInput.safeParse(raw);
  if (!parsed.success) {
    return { status: 'error' as const, error: parsed.error.issues[0]?.message ?? 'Inválido' };
  }
  const conflict = await prisma.workspace.findUnique({
    where: { slug: parsed.data.slug },
    select: { id: true },
  });
  if (conflict && conflict.id !== ctx.workspace.id) {
    return { status: 'error' as const, error: 'Esse slug já está em uso' };
  }
  await prisma.workspace.update({
    where: { id: ctx.workspace.id },
    data: { slug: parsed.data.slug },
  });
  revalidatePath('/settings');
  revalidatePath('/dashboard');
  return { status: 'ok' as const };
}

const businessHoursInput = z.object({
  timezone: z.string().min(3),
  schedule: z.record(
    z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']),
    z
      .object({
        open: z.string().regex(/^\d{2}:\d{2}$/),
        close: z.string().regex(/^\d{2}:\d{2}$/),
      })
      .nullable(),
  ),
});

export async function saveBusinessHours(raw: z.infer<typeof businessHoursInput>) {
  const ctx = await requireOwner();
  if ('error' in ctx) return { status: 'error' as const, error: ctx.error };
  const parsed = businessHoursInput.safeParse(raw);
  if (!parsed.success) {
    return { status: 'error' as const, error: parsed.error.issues[0]?.message ?? 'Inválido' };
  }
  // Horários comerciais ficam na próxima AgentVersion publicada
  // (campo businessHours). Por ora, registramos no AuditLog como "intent"
  // até criarmos um modelo WorkspaceSettings dedicado.
  await prisma.auditLog.create({
    data: {
      workspaceId: ctx.workspace.id,
      userId: ctx.user.id,
      action: 'workspace.business_hours.set',
      targetType: 'Workspace',
      targetId: ctx.workspace.id,
      metadata: parsed.data as unknown as Prisma.InputJsonValue,
    },
  });
  revalidatePath('/settings');
  return { status: 'ok' as const };
}

export async function deleteWorkspace(confirmation: string) {
  const ctx = await requireOwner();
  if ('error' in ctx) return { status: 'error' as const, error: ctx.error };
  if (confirmation !== ctx.workspace.slug) {
    return {
      status: 'error' as const,
      error: `Pra confirmar, digite "${ctx.workspace.slug}" exatamente.`,
    };
  }

  try {
    await prisma.$transaction([
      prisma.message.deleteMany({ where: { workspaceId: ctx.workspace.id } }),
      prisma.conversation.deleteMany({ where: { workspaceId: ctx.workspace.id } }),
      prisma.broadcastRecipient.deleteMany({
        where: { broadcast: { workspaceId: ctx.workspace.id } },
      }),
      prisma.broadcast.deleteMany({ where: { workspaceId: ctx.workspace.id } }),
      prisma.messageTemplate.deleteMany({ where: { workspaceId: ctx.workspace.id } }),
      prisma.contact.deleteMany({ where: { workspaceId: ctx.workspace.id } }),
      prisma.knowledgeChunk.deleteMany({
        where: { document: { workspaceId: ctx.workspace.id } },
      }),
      prisma.knowledgeDocument.deleteMany({ where: { workspaceId: ctx.workspace.id } }),
      prisma.product.deleteMany({ where: { workspaceId: ctx.workspace.id } }),
      prisma.tag.deleteMany({ where: { workspaceId: ctx.workspace.id } }),
      prisma.outgoingWebhook.deleteMany({ where: { workspaceId: ctx.workspace.id } }),
      prisma.apiKey.deleteMany({ where: { workspaceId: ctx.workspace.id } }),
      prisma.usageRecord.deleteMany({ where: { workspaceId: ctx.workspace.id } }),
      prisma.whatsAppAccount.deleteMany({ where: { workspaceId: ctx.workspace.id } }),
      prisma.forgeSession.deleteMany({ where: { workspaceId: ctx.workspace.id } }),
      prisma.agentVersion.deleteMany({
        where: { agent: { workspaceId: ctx.workspace.id } },
      }),
      prisma.agent.deleteMany({ where: { workspaceId: ctx.workspace.id } }),
      prisma.workspaceMember.deleteMany({ where: { workspaceId: ctx.workspace.id } }),
      prisma.subscription.deleteMany({ where: { workspaceId: ctx.workspace.id } }),
      prisma.workspace.delete({ where: { id: ctx.workspace.id } }),
    ]);
  } catch (err) {
    log.error({ workspaceId: ctx.workspace.id, err: String(err) }, 'delete workspace falhou');
    throw new AppError(
      'DELETE_FAILED',
      500,
      'Falha ao apagar workspace. Tente novamente em instantes.',
    );
  }

  log.warn(
    { workspaceId: ctx.workspace.id, userId: ctx.user.id },
    'workspace apagado permanentemente',
  );
  redirect('/onboarding');
}
