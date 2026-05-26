'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@zapai/db';
import { createLogger } from '@zapai/shared';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import { env } from '@/env';
import {
  getPriceIdForPlan,
  getStripeClient,
  isStripeConfigured,
} from '@/lib/stripe';

const log = createLogger('billing-actions');

async function requireWorkspace() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');
  const member = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    include: { workspace: { include: { subscription: true } } },
    orderBy: { createdAt: 'asc' },
  });
  if (!member) redirect('/onboarding');
  return { user: session.user, workspace: member.workspace };
}

const checkoutInput = z.object({
  plan: z.enum(['STARTER', 'PRO', 'PREMIUM']),
});

export type CheckoutResult =
  | { status: 'ok'; url: string }
  | { status: 'error'; error: string };

/** Cria Checkout Session pra plano novo ou upgrade. Retorna URL pra redirect. */
export async function createCheckoutSession(
  raw: z.infer<typeof checkoutInput>,
): Promise<CheckoutResult> {
  const parsed = checkoutInput.safeParse(raw);
  if (!parsed.success) {
    return { status: 'error', error: parsed.error.issues[0]?.message ?? 'Plano inválido' };
  }
  if (!isStripeConfigured()) {
    return {
      status: 'error',
      error: 'Pagamentos não estão configurados ainda. Avise o admin pra setar STRIPE_SECRET_KEY.',
    };
  }
  const stripe = getStripeClient();
  if (!stripe) {
    return { status: 'error', error: 'Stripe indisponível' };
  }

  const priceId = getPriceIdForPlan(parsed.data.plan);
  if (!priceId) {
    return {
      status: 'error',
      error: `Plano ${parsed.data.plan} sem priceId configurado (STRIPE_PRICE_${parsed.data.plan}).`,
    };
  }

  const { user, workspace } = await requireWorkspace();
  const sub = workspace.subscription;
  const successUrl = `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/billing?success=1`;
  const cancelUrl = `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/billing?canceled=1`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      ...(sub?.stripeCustomerId
        ? { customer: sub.stripeCustomerId }
        : { customer_email: user.email }),
      client_reference_id: workspace.id,
      subscription_data: {
        metadata: {
          workspaceId: workspace.id,
          userId: user.id,
          plan: parsed.data.plan,
        },
      },
      metadata: {
        workspaceId: workspace.id,
        plan: parsed.data.plan,
      },
      locale: 'pt-BR',
    });
    if (!session.url) {
      return { status: 'error', error: 'Stripe não retornou URL de checkout' };
    }
    return { status: 'ok', url: session.url };
  } catch (err) {
    log.error({ workspaceId: workspace.id, err: String(err) }, 'checkout falhou');
    return { status: 'error', error: err instanceof Error ? err.message : 'Falha no Stripe' };
  }
}

export type PortalResult =
  | { status: 'ok'; url: string }
  | { status: 'error'; error: string };

/** Cria sessão do customer portal pra gerenciar assinatura. */
export async function createPortalSession(): Promise<PortalResult> {
  if (!isStripeConfigured()) {
    return {
      status: 'error',
      error: 'Pagamentos não configurados. Aguarde o admin setar STRIPE_SECRET_KEY.',
    };
  }
  const stripe = getStripeClient();
  if (!stripe) {
    return { status: 'error', error: 'Stripe indisponível' };
  }

  const { workspace } = await requireWorkspace();
  if (!workspace.subscription?.stripeCustomerId) {
    return { status: 'error', error: 'Sem assinatura ativa pra gerenciar' };
  }

  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: workspace.subscription.stripeCustomerId,
      return_url: `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/billing`,
      locale: 'pt-BR',
    });
    return { status: 'ok', url: portal.url };
  } catch (err) {
    log.error({ workspaceId: workspace.id, err: String(err) }, 'portal falhou');
    return { status: 'error', error: err instanceof Error ? err.message : 'Falha no Stripe' };
  }
}

/** Trigger pra forçar revalidate da página /billing (usado em retorno do checkout). */
export async function refreshBilling(): Promise<void> {
  revalidatePath('/billing');
}
