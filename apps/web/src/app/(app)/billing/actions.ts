'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@zapfy/db';
import { createLogger } from '@zapfy/shared';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import { env } from '@/env';
import { enforceDeviceVerified } from '@/lib/device-verification';
import {
  getPriceIdForPlan,
  getStripeClient,
  isStripeConfigured,
  isStripeMock,
} from '@/lib/stripe';

const log = createLogger('billing-actions');

async function requireWorkspace() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');
  await enforceDeviceVerified({ userId: session.user.id, sessionToken: session.session.token });
  const member = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    include: { workspace: { include: { subscription: true } } },
    orderBy: { createdAt: 'asc' },
  });
  if (!member) redirect('/onboarding');
  return { user: session.user, workspace: member.workspace, role: member.role };
}

/**
 * Billing é restrito a OWNER/ADMIN. Um AGENT não deve poder abrir checkout,
 * mudar plano ou acessar o customer portal (que permite cancelar a assinatura
 * inteira).
 */
function assertBillingPermission(role: 'OWNER' | 'ADMIN' | 'AGENT'): { ok: true } | { ok: false; error: string } {
  if (role === 'OWNER' || role === 'ADMIN') return { ok: true };
  return {
    ok: false,
    error: 'Apenas OWNER ou ADMIN do workspace podem gerenciar billing. Peça pra um deles.',
  };
}

const checkoutInput = z.object({
  plan: z.enum(['STARTER', 'PRO', 'BUSINESS']),
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

  const { user, workspace, role } = await requireWorkspace();
  const perm = assertBillingPermission(role);
  if (!perm.ok) return { status: 'error', error: perm.error };
  const sub = workspace.subscription;
  const successUrl = `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/billing?success=1&mock_plan=${parsed.data.plan}`;
  const cancelUrl = `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/billing?canceled=1`;
  // Mudança de plano (não primeira assinatura): atualiza no banner sem "mock_plan"
  // (esse é só pra modo demo). Sinaliza ao usuário que o ciclo foi ajustado.
  const changedUrl = `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/billing?success=1&changed=${parsed.data.plan}`;

  // STRIPE_MOCK: bypass total, atualiza Subscription local e devolve URL fake.
  if (isStripeMock()) {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    await prisma.subscription.upsert({
      where: { workspaceId: workspace.id },
      create: {
        workspaceId: workspace.id,
        plan: parsed.data.plan,
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        stripeCustomerId: `mock_cus_${workspace.id.slice(0, 12)}`,
        stripeSubscriptionId: `mock_sub_${workspace.id.slice(0, 12)}`,
      },
      update: {
        plan: parsed.data.plan,
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });
    log.info({ workspaceId: workspace.id, plan: parsed.data.plan }, 'mock checkout success');
    return { status: 'ok', url: successUrl };
  }

  // Stripe real
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

  // Já existe assinatura viva no Stripe → mudança de plano é UPDATE do item
  // (com proração), NUNCA um novo Checkout. Criar outro Checkout geraria uma
  // SEGUNDA subscription ativa e cobrança dupla (BI-A1 / TASK-0023).
  // TRIALING também entra aqui: o cliente já tem subscription, troca o price.
  // INCOMPLETE/CANCELED/UNPAID caem no fluxo de Checkout normal (sem sub viva).
  const hasLiveStripeSub =
    Boolean(sub?.stripeSubscriptionId) &&
    (sub?.status === 'ACTIVE' || sub?.status === 'PAST_DUE' || sub?.status === 'TRIALING');

  if (hasLiveStripeSub && sub?.stripeSubscriptionId) {
    const stripeSubscriptionId = sub.stripeSubscriptionId;
    try {
      const current = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      const currentItem = current.items.data[0];
      if (!currentItem) {
        log.error(
          { workspaceId: workspace.id, subId: stripeSubscriptionId },
          'subscription Stripe sem item — não dá pra trocar price',
        );
        return {
          status: 'error',
          error: 'Assinatura sem item no Stripe. Use "Gerenciar no Stripe" pra ajustar.',
        };
      }

      // Já está no price certo? Nada a fazer — evita proração de R$0 e cobrança.
      if (currentItem.price.id === priceId) {
        return { status: 'ok', url: changedUrl };
      }

      const updated = await stripe.subscriptions.update(stripeSubscriptionId, {
        items: [{ id: currentItem.id, price: priceId }],
        // Upgrade/downgrade no meio do ciclo: Stripe credita o não-usado do plano
        // antigo e cobra o pro-rata do novo. Nunca cobra um mês cheio a mais.
        proration_behavior: 'create_prorations',
        payment_behavior: 'pending_if_incomplete',
        cancel_at_period_end: false,
        metadata: {
          workspaceId: workspace.id,
          userId: user.id,
          plan: parsed.data.plan,
        },
      });

      await prisma.subscription.update({
        where: { workspaceId: workspace.id },
        data: { plan: parsed.data.plan, stripeSubscriptionId: updated.id },
      });

      log.info(
        { workspaceId: workspace.id, subId: stripeSubscriptionId, plan: parsed.data.plan },
        'plano atualizado via subscriptions.update (proração)',
      );
      return { status: 'ok', url: changedUrl };
    } catch (err) {
      log.error(
        { workspaceId: workspace.id, subId: stripeSubscriptionId, err: String(err) },
        'falha ao atualizar plano da subscription existente',
      );
      return {
        status: 'error',
        error: err instanceof Error ? err.message : 'Falha ao mudar de plano no Stripe',
      };
    }
  }

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
  const { workspace, role } = await requireWorkspace();
  const perm = assertBillingPermission(role);
  if (!perm.ok) return { status: 'error', error: perm.error };
  if (!workspace.subscription?.stripeCustomerId) {
    return { status: 'error', error: 'Sem assinatura ativa pra gerenciar' };
  }

  // STRIPE_MOCK: devolve URL fake — UI mostra alerta "modo demo"
  if (isStripeMock()) {
    return {
      status: 'ok',
      url: `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/billing?mock_portal=1`,
    };
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return { status: 'error', error: 'Stripe indisponível' };
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
