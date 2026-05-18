'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma, PlanId, SubscriptionStatus, WorkspaceRole } from '@zapai/db';
import { AppError, createLogger, createWorkspaceSchema, TRIAL_DAYS } from '@zapai/shared';

import { auth } from '@/lib/auth';
import { env } from '@/env';
import { sendEmail } from '@/lib/email/client';
import { welcomeEmail } from '@/lib/email/templates';

const log = createLogger('onboarding');

type ActionState = { error?: string } | undefined;

export async function createWorkspaceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect('/login');
  }

  const parsed = createWorkspaceSchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  const existing = await prisma.workspace.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) {
    return { error: 'Esse slug já está em uso. Escolha outro.' };
  }

  try {
    const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    await prisma.workspace.create({
      data: {
        ...parsed.data,
        members: {
          create: {
            userId: session.user.id,
            role: WorkspaceRole.OWNER,
          },
        },
        subscription: {
          create: {
            plan: PlanId.STARTER,
            status: SubscriptionStatus.TRIALING,
            trialEndsAt,
          },
        },
      },
    });
  } catch (err) {
    if (err instanceof AppError) {
      return { error: err.userMessage };
    }
    log.error({ err: String(err) }, 'createWorkspace failed');
    return { error: 'Falha ao criar workspace. Tenta de novo em instantes.' };
  }

  // Welcome email (best-effort, não bloqueia redirect)
  void sendWelcomeEmailAsync({
    name: session.user.name ?? session.user.email,
    email: session.user.email,
    workspaceSlug: parsed.data.slug,
  });

  redirect('/dashboard');
}

async function sendWelcomeEmailAsync(input: {
  name: string;
  email: string;
  workspaceSlug: string;
}): Promise<void> {
  try {
    const tmpl = welcomeEmail({
      name: input.name,
      workspaceSlug: input.workspaceSlug,
      appUrl: env.NEXT_PUBLIC_APP_URL,
    });
    await sendEmail({
      to: input.email,
      subject: tmpl.subject,
      html: tmpl.html,
      text: tmpl.text,
    });
  } catch (err) {
    log.warn({ err: String(err), email: input.email }, 'welcome email falhou');
  }
}
