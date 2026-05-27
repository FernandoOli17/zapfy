'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@zapai/db';
import { createLogger } from '@zapai/shared';

import { auth } from '@/lib/auth';

const log = createLogger('admin-actions');

const IMPERSONATE_COOKIE = 'x-impersonate-workspace';

async function requireSuperAdmin(): Promise<
  | { ok: true; user: { id: string; email: string } }
  | { ok: false; error: string }
> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, isSuperAdmin: true },
  });
  if (!user || !user.isSuperAdmin) {
    return { ok: false, error: 'Apenas super-admin' };
  }
  return { ok: true, user: { id: user.id, email: user.email } };
}

/**
 * Impersona um workspace — seta cookie httpOnly. Outras queries do app
 * checam `getImpersonatedWorkspaceId()` antes de usar o workspace do user.
 *
 * Audit log obrigatório — toda impersonação fica registrada com workspaceId
 * alvo + admin que fez.
 */
export async function impersonateWorkspace(
  workspaceId: string,
): Promise<{ status: 'ok' } | { status: 'error'; error: string }> {
  const ctx = await requireSuperAdmin();
  if (!ctx.ok) return { status: 'error', error: ctx.error };

  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, name: true },
  });
  if (!ws) return { status: 'error', error: 'Workspace não encontrado' };

  const cookieStore = await cookies();
  cookieStore.set(IMPERSONATE_COOKIE, ws.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env['NODE_ENV'] === 'production',
    maxAge: 60 * 60, // 1h
    path: '/',
  });

  await prisma.auditLog.create({
    data: {
      workspaceId: ws.id,
      userId: ctx.user.id,
      action: 'admin.impersonate.start',
      targetType: 'Workspace',
      targetId: ws.id,
      metadata: { adminEmail: ctx.user.email, workspaceName: ws.name },
    },
  });

  log.warn(
    { adminId: ctx.user.id, workspaceId: ws.id, workspaceName: ws.name },
    'super-admin iniciou impersonação',
  );

  revalidatePath('/', 'layout');
  return { status: 'ok' };
}

export async function stopImpersonating(): Promise<{ status: 'ok' }> {
  const ctx = await requireSuperAdmin();
  if (!ctx.ok) {
    // Mesmo sem ser admin, deixa parar — só remove cookie
    const cookieStore = await cookies();
    cookieStore.delete(IMPERSONATE_COOKIE);
    return { status: 'ok' };
  }

  const cookieStore = await cookies();
  const current = cookieStore.get(IMPERSONATE_COOKIE)?.value;
  cookieStore.delete(IMPERSONATE_COOKIE);

  if (current) {
    await prisma.auditLog.create({
      data: {
        workspaceId: current,
        userId: ctx.user.id,
        action: 'admin.impersonate.stop',
        targetType: 'Workspace',
        targetId: current,
        metadata: { adminEmail: ctx.user.email },
      },
    });
  }

  revalidatePath('/', 'layout');
  return { status: 'ok' };
}

/**
 * Força mudança de plano em qualquer workspace. SUPER_ADMIN only.
 * Útil pra dar/tirar acesso premium em casos especiais (compensação,
 * cliente VIP, etc.). Bypassa Stripe — só atualiza DB local.
 */
export async function forceUpgradeWorkspace(
  workspaceId: string,
  plan: 'STARTER' | 'PRO' | 'PREMIUM',
): Promise<{ status: 'ok' } | { status: 'error'; error: string }> {
  const ctx = await requireSuperAdmin();
  if (!ctx.ok) return { status: 'error', error: ctx.error };

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  await prisma.subscription.upsert({
    where: { workspaceId },
    create: {
      workspaceId,
      plan,
      status: 'ACTIVE',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
    update: {
      plan,
      status: 'ACTIVE',
    },
  });

  await prisma.auditLog.create({
    data: {
      workspaceId,
      userId: ctx.user.id,
      action: 'admin.force_upgrade',
      targetType: 'Subscription',
      targetId: workspaceId,
      metadata: { adminEmail: ctx.user.email, newPlan: plan },
    },
  });

  log.warn(
    { adminId: ctx.user.id, workspaceId, plan },
    'super-admin forçou mudança de plano',
  );

  revalidatePath('/admin');
  return { status: 'ok' };
}
