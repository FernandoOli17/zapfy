'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@zapfy/db';
import { createLogger } from '@zapfy/shared';

import { auth } from '@/lib/auth';
import { IMPERSONATE_COOKIE, signImpersonationToken } from '@/lib/impersonation';
import { syncStripeSubscription } from '@/lib/stripe-sync';

const log = createLogger('admin-actions');

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

const WorkspaceIdInput = z.object({ workspaceId: z.string().min(1).max(40) });
const ForceUpgradeInput = z.object({
  workspaceId: z.string().min(1).max(40),
  plan: z.enum(['STARTER', 'PRO', 'PREMIUM']),
});

const COOKIE_MAX_AGE_S = 60 * 60; // 1h

export async function impersonateWorkspace(
  workspaceId: string,
): Promise<{ status: 'ok' } | { status: 'error'; error: string }> {
  const parsed = WorkspaceIdInput.safeParse({ workspaceId });
  if (!parsed.success) return { status: 'error', error: 'workspaceId inválido' };
  const ctx = await requireSuperAdmin();
  if (!ctx.ok) return { status: 'error', error: ctx.error };

  const ws = await prisma.workspace.findUnique({
    where: { id: parsed.data.workspaceId },
    select: { id: true, name: true },
  });
  if (!ws) return { status: 'error', error: 'Workspace não encontrado' };

  // Cookie HMAC-signed vinculado ao userId do admin — outro admin no mesmo
  // browser NÃO consegue herdar (verify exige bater).
  const { token } = signImpersonationToken({
    workspaceId: ws.id,
    userId: ctx.user.id,
    maxAgeMs: COOKIE_MAX_AGE_S * 1000,
  });

  const cookieStore = await cookies();
  cookieStore.set(IMPERSONATE_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env['NODE_ENV'] === 'production',
    maxAge: COOKIE_MAX_AGE_S,
    path: '/',
  });

  // Audit dentro de transação com qualquer mudança DB (aqui nada além do log)
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
  const cookieStore = await cookies();
  const had = cookieStore.get(IMPERSONATE_COOKIE)?.value;
  cookieStore.delete(IMPERSONATE_COOKIE);

  if (ctx.ok && had) {
    // Mesmo sem decodificar o token, registramos o stop com o user da sessão
    await prisma.auditLog.create({
      data: {
        userId: ctx.user.id,
        action: 'admin.impersonate.stop',
        targetType: 'Workspace',
        metadata: { adminEmail: ctx.user.email },
      },
    });
  }

  revalidatePath('/', 'layout');
  return { status: 'ok' };
}

export async function forceUpgradeWorkspace(
  workspaceId: string,
  plan: 'STARTER' | 'PRO' | 'PREMIUM',
): Promise<{ status: 'ok'; stripeSynced: boolean } | { status: 'error'; error: string }> {
  const parsed = ForceUpgradeInput.safeParse({ workspaceId, plan });
  if (!parsed.success) {
    return { status: 'error', error: parsed.error.issues[0]?.message ?? 'Inválido' };
  }
  const ctx = await requireSuperAdmin();
  if (!ctx.ok) return { status: 'error', error: ctx.error };

  const wsFull = await prisma.workspace.findUnique({
    where: { id: parsed.data.workspaceId },
    include: { subscription: true },
  });
  if (!wsFull) return { status: 'error', error: 'Workspace não encontrado' };

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  // Atomicidade: mutation + audit numa transaction
  await prisma.$transaction(async (tx) => {
    await tx.subscription.upsert({
      where: { workspaceId: wsFull.id },
      create: {
        workspaceId: wsFull.id,
        plan: parsed.data.plan,
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
      update: {
        plan: parsed.data.plan,
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
      },
    });

    await tx.auditLog.create({
      data: {
        workspaceId: wsFull.id,
        userId: ctx.user.id,
        action: 'admin.force_upgrade',
        targetType: 'Subscription',
        targetId: wsFull.id,
        metadata: {
          adminEmail: ctx.user.email,
          workspaceName: wsFull.name,
          newPlan: parsed.data.plan,
          previousPlan: wsFull.subscription?.plan ?? null,
        },
      },
    });
  });

  // Sync com Stripe (no-op em STRIPE_MOCK; melhor effort no real)
  const synced = await syncStripeSubscription({
    workspaceId: wsFull.id,
    targetPlan: parsed.data.plan,
    stripeSubscriptionId: wsFull.subscription?.stripeSubscriptionId ?? null,
  });

  log.warn(
    { adminId: ctx.user.id, workspaceId: wsFull.id, plan: parsed.data.plan, stripeSynced: synced },
    'super-admin forçou mudança de plano',
  );

  revalidatePath('/admin');
  return { status: 'ok', stripeSynced: synced };
}
