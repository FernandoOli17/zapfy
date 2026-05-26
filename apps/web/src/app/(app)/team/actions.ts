'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma, WorkspaceRole } from '@zapai/db';
import { createLogger, emailSchema } from '@zapai/shared';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import { env } from '@/env';
import { sendEmail } from '@/lib/email/client';
import { teamInviteEmail } from '@/lib/email/templates';
import { signInviteToken } from '@/lib/invite-token';

const log = createLogger('team-actions');

async function requireOwnerOrAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');
  const member = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    include: { workspace: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!member) redirect('/onboarding');
  if (member.role !== 'OWNER' && member.role !== 'ADMIN') {
    return { error: 'Apenas Owner/Admin podem convidar membros' as const };
  }
  return { user: session.user, workspace: member.workspace, member };
}

const inviteInput = z.object({
  email: emailSchema,
  role: z.enum(['ADMIN', 'AGENT']),
});

export type InviteResult =
  | { status: 'ok'; email: string; inviteUrl: string; emailDelivered: boolean }
  | { status: 'error'; error: string };

export async function inviteTeamMember(
  raw: z.infer<typeof inviteInput>,
): Promise<InviteResult> {
  const ctx = await requireOwnerOrAdmin();
  if ('error' in ctx) return { status: 'error', error: ctx.error };

  const parsed = inviteInput.safeParse(raw);
  if (!parsed.success) {
    return { status: 'error', error: parsed.error.issues[0]?.message ?? 'Inválido' };
  }

  // Já é membro?
  const existingUser = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });
  if (existingUser) {
    const existingMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: ctx.workspace.id,
          userId: existingUser.id,
        },
      },
    });
    if (existingMember) {
      return {
        status: 'error',
        error: 'Esse e-mail já é membro do workspace.',
      };
    }
  }

  const { token, expiresAt } = signInviteToken({
    workspaceId: ctx.workspace.id,
    workspaceName: ctx.workspace.name,
    inviterUserId: ctx.user.id,
    inviterName: ctx.user.name ?? ctx.user.email,
    email: parsed.data.email,
    role: parsed.data.role,
  });

  const inviteUrl = `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/invite/${token}`;

  const tmpl = teamInviteEmail({
    inviterName: ctx.user.name ?? ctx.user.email,
    workspaceName: ctx.workspace.name,
    inviteUrl,
    recipientEmail: parsed.data.email,
  });

  const emailResult = await sendEmail({
    to: parsed.data.email,
    subject: tmpl.subject,
    html: tmpl.html,
    text: tmpl.text,
    replyTo: ctx.user.email,
  });

  await prisma.auditLog.create({
    data: {
      workspaceId: ctx.workspace.id,
      userId: ctx.user.id,
      action: 'team.invite',
      targetType: 'WorkspaceMember',
      metadata: {
        email: parsed.data.email,
        role: parsed.data.role,
        expiresAt: expiresAt.toISOString(),
        emailDelivered: emailResult.ok,
      },
    },
  });

  log.info(
    {
      workspaceId: ctx.workspace.id,
      inviterUserId: ctx.user.id,
      email: parsed.data.email,
      emailDelivered: emailResult.ok,
    },
    'team invite enviado',
  );

  // Mantém WorkspaceRole import vivo (linter)
  void WorkspaceRole;

  revalidatePath('/team');

  return {
    status: 'ok',
    email: parsed.data.email,
    inviteUrl,
    emailDelivered: emailResult.ok,
  };
}
