'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@zapai/db';
import { createLogger } from '@zapai/shared';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import { AVAILABLE_SCOPES, generateApiKey } from '@/lib/api-auth';
import { assertPlanFeature } from '@/lib/plans';
import { PlanLimitError } from '@zapai/shared';

const log = createLogger('integrations-actions');

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
    return { error: 'Apenas owner/admin podem gerenciar API keys' as const };
  }
  return { user: session.user, workspace: member.workspace };
}

const createInput = z.object({
  name: z.string().trim().min(2).max(60),
  scopes: z.array(z.enum(AVAILABLE_SCOPES)).min(1).max(20),
  expiresInDays: z
    .number()
    .int()
    .positive()
    .max(365)
    .optional(),
});

export type CreateApiKeyResult =
  | { status: 'ok'; secret: string; prefix: string; name: string }
  | { status: 'error'; error: string };

export async function createApiKey(
  raw: z.infer<typeof createInput>,
): Promise<CreateApiKeyResult> {
  const parsed = createInput.safeParse(raw);
  if (!parsed.success) {
    return { status: 'error', error: parsed.error.issues[0]?.message ?? 'Inválido' };
  }
  const ctx = await requireOwnerOrAdmin();
  if ('error' in ctx) return { status: 'error', error: ctx.error };
  const { workspace, user } = ctx;

  // Scopes não-LGPD exigem plano Premium (apiAccess=true). LGPD é
  // compliance obrigatório — qualquer plano pode criar chave só com
  // lgpd:* pra automatizar atendimento ao titular.
  const onlyLgpd = parsed.data.scopes.every((s) => s.startsWith('lgpd:'));
  if (!onlyLgpd) {
    try {
      await assertPlanFeature(workspace.id, 'apiAccess');
    } catch (err) {
      if (err instanceof PlanLimitError) {
        return {
          status: 'error',
          error: `${err.userMessage} Pra essa chave, use só scopes de LGPD (lgpd:export, lgpd:delete, lgpd:opt-out).`,
        };
      }
      throw err;
    }
  }

  const { secret, keyHash, prefix } = generateApiKey();
  const expiresAt = parsed.data.expiresInDays
    ? new Date(Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  await prisma.apiKey.create({
    data: {
      workspaceId: workspace.id,
      name: parsed.data.name,
      keyHash,
      prefix,
      scopes: parsed.data.scopes,
      ...(expiresAt ? { expiresAt } : {}),
    },
  });

  await prisma.auditLog.create({
    data: {
      workspaceId: workspace.id,
      userId: user.id,
      action: 'apikey.create',
      targetType: 'ApiKey',
      metadata: { prefix, scopes: parsed.data.scopes },
    },
  });

  log.info({ workspaceId: workspace.id, prefix }, 'api key criada');
  revalidatePath('/integrations');

  return { status: 'ok', secret, prefix, name: parsed.data.name };
}

export async function revokeApiKey(apiKeyId: string) {
  const ctx = await requireOwnerOrAdmin();
  if ('error' in ctx) return { status: 'error' as const, error: ctx.error };
  const { workspace, user } = ctx;

  const key = await prisma.apiKey.findFirst({
    where: { id: apiKeyId, workspaceId: workspace.id },
  });
  if (!key) return { status: 'error' as const, error: 'API key não encontrada' };
  if (key.revokedAt) return { status: 'ok' as const };

  await prisma.apiKey.update({
    where: { id: key.id },
    data: { revokedAt: new Date() },
  });
  await prisma.auditLog.create({
    data: {
      workspaceId: workspace.id,
      userId: user.id,
      action: 'apikey.revoke',
      targetType: 'ApiKey',
      targetId: key.id,
      metadata: { prefix: key.prefix },
    },
  });
  log.info({ workspaceId: workspace.id, prefix: key.prefix }, 'api key revogada');
  revalidatePath('/integrations');
  return { status: 'ok' as const };
}
