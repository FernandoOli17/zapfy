'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@zapai/db';
import { createLogger } from '@zapai/shared';

import { auth } from '@/lib/auth';

const log = createLogger('agent-actions');

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
    return { error: 'Apenas Owner/Admin podem alterar agente' as const };
  }
  return { user: session.user, workspace: member.workspace };
}

export async function rollbackToVersion(input: {
  agentId: string;
  versionId: string;
}) {
  const ctx = await requireAdmin();
  if ('error' in ctx) return { status: 'error' as const, error: ctx.error };

  const agent = await prisma.agent.findFirst({
    where: { id: input.agentId, workspaceId: ctx.workspace.id },
  });
  if (!agent) return { status: 'error' as const, error: 'Agente não encontrado' };

  const target = await prisma.agentVersion.findFirst({
    where: { id: input.versionId, agentId: agent.id },
  });
  if (!target) return { status: 'error' as const, error: 'Versão não encontrada' };

  if (agent.currentVersionId === target.id) {
    return { status: 'error' as const, error: 'Essa já é a versão atual' };
  }

  await prisma.agent.update({
    where: { id: agent.id },
    data: { currentVersionId: target.id },
  });
  await prisma.auditLog.create({
    data: {
      workspaceId: ctx.workspace.id,
      userId: ctx.user.id,
      action: 'agent.rollback',
      targetType: 'Agent',
      targetId: agent.id,
      metadata: {
        fromVersionId: agent.currentVersionId,
        toVersionId: target.id,
        toVersionNumber: target.versionNumber,
      },
    },
  });
  log.info(
    { agentId: agent.id, toVersionNumber: target.versionNumber },
    'agent rollback aplicado',
  );
  revalidatePath('/agent');
  return { status: 'ok' as const };
}
