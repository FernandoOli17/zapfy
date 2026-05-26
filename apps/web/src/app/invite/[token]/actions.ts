'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma, WorkspaceRole } from '@zapai/db';
import { AppError, createLogger } from '@zapai/shared';

import { auth } from '@/lib/auth';
import { verifyInviteToken } from '@/lib/invite-token';

const log = createLogger('invite-accept');

const ROLE_MAP = {
  ADMIN: WorkspaceRole.ADMIN,
  AGENT: WorkspaceRole.AGENT,
} as const;

export type AcceptInviteResult =
  | { status: 'ok'; workspaceSlug: string }
  | { status: 'error'; error: string };

export async function acceptInviteAction(token: string): Promise<AcceptInviteResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { status: 'error', error: 'Você precisa estar logado pra aceitar o convite.' };
  }

  let payload: ReturnType<typeof verifyInviteToken>;
  try {
    payload = verifyInviteToken(token);
  } catch (err) {
    if (err instanceof AppError) {
      return { status: 'error', error: err.userMessage };
    }
    log.error({ err: String(err) }, 'verifyInviteToken erro inesperado');
    return { status: 'error', error: 'Convite inválido.' };
  }

  // O e-mail logado precisa ser o do convite (case-insensitive)
  if (session.user.email.toLowerCase() !== payload.email.toLowerCase()) {
    return {
      status: 'error',
      error: `Esse convite é pro e-mail ${payload.email}. Você está logado como ${session.user.email}. Saia e entre com o e-mail certo.`,
    };
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: payload.workspaceId },
    select: { id: true, slug: true, name: true, deletedAt: true },
  });
  if (!workspace || workspace.deletedAt) {
    return { status: 'error', error: 'Workspace não existe mais.' };
  }

  // Já é membro?
  const existing = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId: workspace.id, userId: session.user.id },
    },
  });
  if (existing) {
    log.info(
      { workspaceId: workspace.id, userId: session.user.id },
      'aceite de convite ignorado — já é membro',
    );
    redirect('/dashboard');
  }

  await prisma.workspaceMember.create({
    data: {
      workspaceId: workspace.id,
      userId: session.user.id,
      role: ROLE_MAP[payload.role],
      invitedAt: new Date(payload.expiresAt - 7 * 24 * 60 * 60 * 1000),
      joinedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      workspaceId: workspace.id,
      userId: session.user.id,
      action: 'team.invite_accepted',
      targetType: 'WorkspaceMember',
      metadata: {
        inviterUserId: payload.inviterUserId,
        role: payload.role,
        email: payload.email,
      },
    },
  });

  log.info(
    { workspaceId: workspace.id, userId: session.user.id, role: payload.role },
    'convite aceito',
  );

  redirect('/dashboard');
}
