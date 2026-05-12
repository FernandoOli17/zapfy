import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { PlanId, prisma, SubscriptionStatus } from '@zapai/db';
import { createLogger } from '@zapai/shared';

import { env } from '@/env';
import { getStripeClient, planIdFromStripePrice } from '@/lib/stripe';

const log = createLogger('stripe-webhook');

const STATUS_MAP: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
  trialing: SubscriptionStatus.TRIALING,
  active: SubscriptionStatus.ACTIVE,
  past_due: SubscriptionStatus.PAST_DUE,
  canceled: SubscriptionStatus.CANCELED,
  unpaid: SubscriptionStatus.UNPAID,
  incomplete: SubscriptionStatus.INCOMPLETE,
  incomplete_expired: SubscriptionStatus.CANCELED,
  paused: SubscriptionStatus.PAST_DUE,
};

/**
 * Webhook do Stripe. Trata eventos de Subscription, Invoice e Checkout.
 * Retorna 200 mesmo em erro pra Stripe parar de fazer retry — logamos pra investigação.
 */
export async function POST(req: NextRequest) {
  const stripe = getStripeClient();
  if (!stripe) {
    log.warn('webhook chegou mas Stripe não configurado — devolvendo 200');
    return new NextResponse('OK', { status: 200 });
  }
  if (!env.STRIPE_WEBHOOK_SECRET) {
    log.error('STRIPE_WEBHOOK_SECRET não configurado');
    return new NextResponse('Webhook secret missing', { status: 503 });
  }

  const sig = req.headers.get('stripe-signature');
  if (!sig) return new NextResponse('Missing signature', { status: 400 });

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    log.warn({ err: String(err) }, 'falha ao validar assinatura Stripe');
    return new NextResponse('Bad signature', { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(stripe, event.data.object);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionEvent(event.data.object);
        break;
      case 'invoice.paid':
      case 'invoice.payment_failed':
        await handleInvoiceEvent(event.data.object);
        break;
      default:
        log.info({ type: event.type, id: event.id }, 'evento ignorado');
    }
  } catch (err) {
    log.error({ type: event.type, err: String(err) }, 'handler explodiu');
    // mesmo assim 200 pra Stripe não bombardear de retry — Stripe Dashboard mostra a falha
  }

  return new NextResponse('OK', { status: 200 });
}

async function handleCheckoutCompleted(stripe: Stripe, session: Stripe.Checkout.Session) {
  const workspaceId = session.metadata?.['workspaceId'] ?? session.client_reference_id;
  if (!workspaceId) {
    log.warn({ sessionId: session.id }, 'checkout sem workspaceId nos metadados');
    return;
  }
  const subscriptionId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
  const customerId =
    typeof session.customer === 'string' ? session.customer : session.customer?.id;
  if (!subscriptionId || !customerId) return;

  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  await upsertFromStripeSubscription(workspaceId, customerId, sub);
}

async function handleSubscriptionEvent(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const workspaceId =
    sub.metadata['workspaceId'] ??
    (await findWorkspaceIdByCustomer(customerId));
  if (!workspaceId) {
    log.warn({ subId: sub.id }, 'subscription sem workspaceId resolvível');
    return;
  }
  await upsertFromStripeSubscription(workspaceId, customerId, sub);
}

async function handleInvoiceEvent(invoice: Stripe.Invoice) {
  // log apenas; status da Subscription é a fonte de verdade
  log.info(
    {
      invoiceId: invoice.id,
      status: invoice.status,
      customerId:
        typeof invoice.customer === 'string'
          ? invoice.customer
          : invoice.customer?.id ?? null,
      amount_paid: invoice.amount_paid,
    },
    'invoice event',
  );
}

async function findWorkspaceIdByCustomer(customerId: string): Promise<string | null> {
  const sub = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
    select: { workspaceId: true },
  });
  return sub?.workspaceId ?? null;
}

async function upsertFromStripeSubscription(
  workspaceId: string,
  customerId: string,
  sub: Stripe.Subscription,
) {
  const item = sub.items.data[0];
  const priceId = item?.price.id ?? null;
  const plan: PlanId = priceId ? mapPriceToDbPlan(priceId) : PlanId.STARTER;
  const status = STATUS_MAP[sub.status] ?? SubscriptionStatus.INCOMPLETE;

  // Em Stripe API recente (2025+) os periods estão no item, não no subscription.
  // Cast leve pra tolerar ambas as versões da API.
  const subAny = sub as unknown as {
    current_period_start?: number;
    current_period_end?: number;
  };
  const itemAny = item as unknown as {
    current_period_start?: number;
    current_period_end?: number;
  } | undefined;
  const periodStartTs = itemAny?.current_period_start ?? subAny.current_period_start ?? null;
  const periodEndTs = itemAny?.current_period_end ?? subAny.current_period_end ?? null;
  const periodStart = periodStartTs ? new Date(periodStartTs * 1000) : null;
  const periodEnd = periodEndTs ? new Date(periodEndTs * 1000) : null;
  const trialEndsAt = sub.trial_end ? new Date(sub.trial_end * 1000) : null;

  await prisma.subscription.upsert({
    where: { workspaceId },
    create: {
      workspaceId,
      plan,
      status,
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      ...(trialEndsAt ? { trialEndsAt } : {}),
      ...(periodStart ? { currentPeriodStart: periodStart } : {}),
      ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
    update: {
      plan,
      status,
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      ...(trialEndsAt ? { trialEndsAt } : { trialEndsAt: null }),
      ...(periodStart ? { currentPeriodStart: periodStart } : {}),
      ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
  });

  await prisma.auditLog.create({
    data: {
      workspaceId,
      action: `subscription.${sub.status}`,
      targetType: 'Subscription',
      targetId: sub.id,
      metadata: { plan, customerId },
    },
  });
}

function mapPriceToDbPlan(priceId: string): PlanId {
  const id = planIdFromStripePrice(priceId);
  if (id === 'STARTER') return PlanId.STARTER;
  if (id === 'PRO') return PlanId.PRO;
  if (id === 'PREMIUM') return PlanId.PREMIUM;
  return PlanId.STARTER;
}
