import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { type PlanId, prisma, SubscriptionStatus } from '@zapfy/db';
import { createLogger } from '@zapfy/shared';

import { env } from '@/env';
import { captureException } from '@/lib/sentry';
import { getStripeClient } from '@/lib/stripe';
import { mapPriceToDbPlan, STATUS_MAP } from '@/lib/stripe-webhook-mappers';

const log = createLogger('stripe-webhook');

/**
 * Webhook do Stripe. Trata eventos de Subscription, Invoice e Checkout.
 *
 * Em erro de handler devolvemos 500 pra Stripe re-tentar: os handlers são
 * upserts idempotentes, então reprocessar é seguro, e um blip transitório de DB
 * não pode deixar um cliente pago em INCOMPLETE pra sempre (BI-A3). Só
 * devolvemos 200 quando o evento é ignorado ou o payload é irrecuperável
 * (early-return dentro do handler) — nesses casos retry não ajudaria.
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
        await handleSubscriptionEvent(stripe, event.data.object);
        break;
      case 'invoice.paid':
      case 'invoice.payment_failed':
        await handleInvoiceEvent(event.data.object);
        break;
      default:
        log.info({ type: event.type, id: event.id }, 'evento ignorado');
    }
  } catch (err) {
    log.error({ type: event.type, eventId: event.id, err: String(err) }, 'handler explodiu');
    captureException(err, { context: 'stripe.webhook', eventType: event.type, eventId: event.id });
    // 500 → Stripe re-tenta. Handlers são upserts idempotentes; reprocessar é
    // seguro e evita perder o evento num blip transitório de DB (BI-A3).
    return new NextResponse('Webhook handler failed', { status: 500 });
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

  // Defensivo (TASK-0023): se o workspace já tinha OUTRA subscription no Stripe,
  // esse checkout criou uma segunda. Cancela a antiga pra nunca deixar duas
  // ativas (cobrança dupla). O fluxo normal de mudança de plano usa
  // subscriptions.update e nem chega aqui; isso cobre o caso residual.
  const existing = await prisma.subscription.findUnique({
    where: { workspaceId },
    select: { stripeSubscriptionId: true },
  });
  const previousSubId = existing?.stripeSubscriptionId;
  if (previousSubId && previousSubId !== subscriptionId) {
    try {
      await stripe.subscriptions.cancel(previousSubId, {
        invoice_now: false,
        prorate: true,
      });
      log.warn(
        { workspaceId, previousSubId, newSubId: subscriptionId },
        'checkout criou nova subscription — cancelada a anterior pra evitar cobrança dupla',
      );
    } catch (err) {
      // Já cancelada/inexistente é OK; outros erros logamos mas seguimos pro upsert.
      log.error(
        { workspaceId, previousSubId, err: String(err) },
        'falha ao cancelar subscription anterior — verificar 2 subs ativas no Stripe',
      );
      captureException(err, {
        context: 'stripe.webhook.cancelPrevious',
        workspaceId,
        previousSubId,
      });
    }
  }

  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  await upsertFromStripeSubscription(workspaceId, customerId, sub);
}

async function handleSubscriptionEvent(stripe: Stripe, eventSub: Stripe.Subscription) {
  // Re-busca o estado atual no Stripe em vez de aplicar o payload do evento:
  // webhooks podem chegar fora de ordem e um `updated` atrasado reativaria um
  // workspace já cancelado. O estado vivo do Stripe vence (BI-A4). Se a sub não
  // existe mais (404), o payload do evento (último estado conhecido) é o
  // fallback — tipicamente um `deleted` já com status canceled.
  let sub = eventSub;
  try {
    sub = await stripe.subscriptions.retrieve(eventSub.id);
  } catch (err) {
    log.warn(
      { subId: eventSub.id, err: String(err) },
      'falha ao re-buscar subscription no Stripe — usando payload do evento',
    );
  }

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
  // Price desconhecido (env STRIPE_PRICE_* faltando/divergente) NÃO pode
  // rebaixar o plano pra STARTER em silêncio — um BUSINESS viraria STARTER no
  // DB (BI-A7). Nesses casos deixamos `plan` undefined: no create o default do
  // schema (STARTER) vale; no update o plano existente é preservado.
  const plan: PlanId | undefined = priceId ? (mapPriceToDbPlan(priceId) ?? undefined) : undefined;
  if (priceId && plan === undefined) {
    log.error(
      { workspaceId, subId: sub.id, priceId },
      'price desconhecido no Stripe — plan NÃO sobrescrito; conferir env STRIPE_PRICE_*',
    );
    captureException(new Error(`Unknown Stripe price ${priceId}`), {
      context: 'stripe.webhook.unknownPrice',
      workspaceId,
      subId: sub.id,
      priceId,
    });
  } else if (!priceId) {
    log.error(
      { workspaceId, subId: sub.id },
      'subscription sem price/item — plan NÃO sobrescrito',
    );
  }
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
      ...(plan ? { plan } : {}),
      status,
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      ...(trialEndsAt ? { trialEndsAt } : {}),
      ...(periodStart ? { currentPeriodStart: periodStart } : {}),
      ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
    update: {
      ...(plan ? { plan } : {}),
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
      metadata: { plan: plan ?? null, customerId },
    },
  });
}
