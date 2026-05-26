import { ArrowRight, Check, CheckCircle2, Sparkles, X } from 'lucide-react';
import { prisma } from '@zapai/db';
import { PLANS, type PlanId, type PlanFeature } from '@zapai/shared';
import { Button, cn } from '@zapai/ui';

import { countAiConversationsThisCycle, getWorkspacePlan } from '@/lib/plans';
import { isStripeConfigured } from '@/lib/stripe';
import { requireWorkspace } from '@/lib/inbox';

import { ChangePlanButtons, ManageSubscriptionButton } from './billing-buttons';

export const metadata = { title: 'Billing' };
export const dynamic = 'force-dynamic';

const PLAN_NAMES: Record<PlanId, string> = {
  STARTER: 'Starter',
  PRO: 'Pro',
  PREMIUM: 'Premium',
};

const PLAN_BLURBS: Record<PlanId, string> = {
  STARTER: 'Pra começar a atender com IA sem dor.',
  PRO: 'Pra time pequeno escalando atendimento.',
  PREMIUM: 'Pra operação séria com API e onboarding.',
};

interface PageProps {
  searchParams: Promise<{ success?: string; canceled?: string }>;
}

export default async function BillingPage({ searchParams }: PageProps) {
  const { workspace } = await requireWorkspace();
  const subscription = await prisma.subscription.findUnique({
    where: { workspaceId: workspace.id },
  });
  const { plan, features, status, trialEndsAt } = await getWorkspacePlan(workspace.id);
  const aiUsed = await countAiConversationsThisCycle(workspace.id);
  const stripeConfigured = isStripeConfigured();
  const params = await searchParams;

  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86_400_000))
    : null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10 md:py-10">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Gestão</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
            Billing
          </h1>
        </div>
      </div>

      {params.success && (
        <div className="mt-6 flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>Assinatura ativada! Pode demorar alguns segundos pra refletir aqui.</span>
        </div>
      )}
      {params.canceled && (
        <div className="mt-6 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Checkout cancelado. Você pode tentar de novo a qualquer momento.
        </div>
      )}
      {!stripeConfigured && (
        <div className="mt-6 rounded-lg border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm">
          <strong>Modo demo:</strong> Stripe ainda não configurado. Botões de upgrade não vão
          funcionar até preencher <code className="font-mono text-xs">STRIPE_SECRET_KEY</code> e{' '}
          <code className="font-mono text-xs">STRIPE_PRICE_*</code> no{' '}
          <code className="font-mono text-xs">.env</code>.
        </div>
      )}

      <section className="mt-6 grid gap-4 md:grid-cols-[1.6fr_1fr]">
        {/* Card resumo do plano atual */}
        <div className="overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-sm">
          <div className="border-b border-primary/15 bg-primary/[0.04] px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                  Plano atual
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                  {PLAN_NAMES[plan]}
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">{PLAN_BLURBS[plan]}</p>
              </div>
              <div className="text-right">
                {status === 'TRIALING' && trialDaysLeft !== null ? (
                  <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
                    Trial · {trialDaysLeft} dia{trialDaysLeft === 1 ? '' : 's'}
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium uppercase text-emerald-700 dark:text-emerald-400">
                    {status.toLowerCase()}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="px-6 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <UsageBar
                label="Conversas IA neste ciclo"
                used={aiUsed}
                limit={features.aiConversations}
              />
              <KeyValue
                label="Números WhatsApp"
                value={limitLabel(features.whatsappNumbers, 'numero')}
              />
              <KeyValue
                label="Usuários no time"
                value={limitLabel(features.teamSeats, 'seat')}
              />
              <KeyValue
                label="Documentos RAG"
                value={limitLabel(features.knowledgeDocs, 'doc')}
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-5">
              {subscription?.stripeCustomerId && <ManageSubscriptionButton />}
              {status === 'TRIALING' && (
                <p className="text-xs text-muted-foreground">
                  Cobramos no fim do trial. Cancele em um clique até lá.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Card highlight do moat */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <h3 className="mt-3 text-base font-semibold tracking-tight">
            Sem dark pattern, sem letrinha miúda.
          </h3>
          <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
            <Bullet>Trial sem cartão. Sem renovação automática surpresa.</Bullet>
            <Bullet>Cancele em 1 clique pelo portal Stripe.</Bullet>
            <Bullet>Limites avisados em 80%. Sem cobrança escondida.</Bullet>
            <Bullet>Suas conversas nunca treinam modelos de IA.</Bullet>
          </ul>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold tracking-tight">
          {plan === 'PREMIUM' ? 'Outros planos' : 'Mudar de plano'}
        </h2>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          {(['STARTER', 'PRO', 'PREMIUM'] as const).map((p) => (
            <PlanCard
              key={p}
              planId={p}
              features={PLANS[p]}
              isCurrent={plan === p}
              disabled={!stripeConfigured || plan === p}
              recommended={p === 'PRO'}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function UsageBar({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number | 'unlimited';
}) {
  const isUnlimited = limit === 'unlimited';
  const pct = isUnlimited ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const isHot = pct >= 80;
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="mt-1.5 flex items-baseline justify-between gap-2">
        <p className="text-2xl font-semibold tracking-tight tabular-nums">
          {used.toLocaleString('pt-BR')}
          {isUnlimited ? null : (
            <span className="text-base font-normal text-muted-foreground">
              {' '}
              / {limit.toLocaleString('pt-BR')}
            </span>
          )}
        </p>
        {!isUnlimited && (
          <span
            className={cn(
              'text-xs font-medium',
              isHot ? 'text-destructive' : 'text-muted-foreground',
            )}
          >
            {pct}%
          </span>
        )}
      </div>
      {!isUnlimited && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn('h-full transition-all', isHot ? 'bg-destructive' : 'bg-primary')}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {isUnlimited && <p className="mt-2 text-xs text-muted-foreground">Sem limite.</p>}
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function PlanCard({
  planId,
  features,
  isCurrent,
  disabled,
  recommended,
}: {
  planId: PlanId;
  features: PlanFeature;
  isCurrent: boolean;
  disabled: boolean;
  recommended?: boolean;
}) {
  const featureRows: Array<{ has: boolean; text: string }> = [
    { has: true, text: `${limitLabel(features.aiConversations, 'conversa')} IA/mês` },
    { has: true, text: `${limitLabel(features.whatsappNumbers, 'numero')} WhatsApp` },
    { has: true, text: `${limitLabel(features.teamSeats, 'seat')} no time` },
    { has: features.customTools, text: 'Tools customizadas' },
    { has: features.apiAccess, text: 'API pública' },
  ];

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-2xl border bg-card p-6 transition-all',
        recommended && !isCurrent
          ? 'border-primary/40 shadow-md ring-1 ring-primary/20'
          : isCurrent
            ? 'border-primary/40'
            : 'border-border hover:border-primary/30',
      )}
    >
      {recommended && !isCurrent && (
        <span className="absolute -top-2.5 left-6 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground shadow-sm">
          <Sparkles className="h-2.5 w-2.5" />
          Recomendado
        </span>
      )}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold tracking-tight">{PLAN_NAMES[planId]}</h3>
        {isCurrent && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
            Atual
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{PLAN_BLURBS[planId]}</p>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-sm font-medium text-muted-foreground">R$</span>
        <span className="text-3xl font-semibold tracking-tight tabular-nums">
          {(features.priceBRLCents / 100).toLocaleString('pt-BR')}
        </span>
        <span className="text-sm text-muted-foreground">/mês</span>
      </div>
      <ul className="mt-5 flex-1 space-y-2.5 text-sm">
        {featureRows.map((row) => (
          <li key={row.text} className="flex items-start gap-2">
            {row.has ? (
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            ) : (
              <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" />
            )}
            <span className={row.has ? 'text-foreground' : 'text-muted-foreground/70 line-through'}>
              {row.text}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <ChangePlanButtons plan={planId} disabled={disabled} isCurrent={isCurrent} />
      </div>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <Check className="mt-0.5 h-4 w-4 flex-none text-primary" />
      <span>{children}</span>
    </li>
  );
}

function limitLabel(value: number | 'unlimited', noun: string): string {
  if (value === 'unlimited') return 'Ilimitado';
  if (value === 1) return `${value} ${noun}`;
  return `${value.toLocaleString('pt-BR')} ${noun}s`;
}

void Button;
void ArrowRight;
