import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
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
    <div className="relative overflow-hidden">
      <div className="bg-radial-fade absolute inset-0 -z-10" aria-hidden />
      <div className="mx-auto max-w-6xl px-6 py-12 md:px-10 md:py-16">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Billing</p>
        <h1 className="mt-3 text-4xl font-medium leading-[1.05] tracking-tight md:text-5xl">
          Seu plano e{' '}
          <span className="font-serif italic font-normal text-primary">consumo.</span>
        </h1>

        {params.success && (
          <div className="mt-6 rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
            <CheckCircle2 className="mr-2 inline h-4 w-4 text-primary" />
            Assinatura ativada! Pode demorar alguns segundos pra refletir aqui.
          </div>
        )}
        {params.canceled && (
          <div className="mt-6 rounded-md border border-border/60 bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
            Checkout cancelado. Você pode tentar de novo a qualquer momento.
          </div>
        )}
        {!stripeConfigured && (
          <div className="mt-6 rounded-md border border-yellow-500/40 bg-yellow-500/5 px-4 py-3 text-sm">
            <strong>Modo demo:</strong> Stripe ainda não configurado. Botões de upgrade não vão
            funcionar até preencher <code>STRIPE_SECRET_KEY</code> e <code>STRIPE_PRICE_*</code>{' '}
            no <code>.env</code>.
          </div>
        )}

        <section className="mt-12 grid gap-6 md:grid-cols-[1.4fr_1fr]">
          {/* Card resumo do plano atual */}
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 md:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-primary">Plano atual</p>
                <h2 className="mt-2 text-3xl font-medium tracking-tight">
                  {PLAN_NAMES[plan]}
                </h2>
                <p className="mt-1 text-muted-foreground">{PLAN_BLURBS[plan]}</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Status</p>
                <p className="mt-2 text-sm">
                  {status === 'TRIALING' && trialDaysLeft !== null ? (
                    <span className="text-primary">
                      Trial · {trialDaysLeft} dia{trialDaysLeft === 1 ? '' : 's'}
                    </span>
                  ) : (
                    <span className="capitalize">{status.toLowerCase()}</span>
                  )}
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <UsageBar
                label="Conversas IA neste ciclo"
                used={aiUsed}
                limit={features.aiConversations}
              />
              <KeyValue
                label="Números WhatsApp"
                value={limitLabel(features.whatsappNumbers, 'numero')}
              />
              <KeyValue label="Usuários no time" value={limitLabel(features.teamSeats, 'seat')} />
              <KeyValue
                label="Documentos RAG"
                value={limitLabel(features.knowledgeDocs, 'doc')}
              />
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {subscription?.stripeCustomerId && <ManageSubscriptionButton />}
              {status === 'TRIALING' && (
                <p className="text-xs text-muted-foreground">
                  Cobramos no fim do trial. Cancele em um clique até lá.
                </p>
              )}
            </div>
          </div>

          {/* Card highlight do moat */}
          <div className="rounded-2xl border border-border/60 bg-card/40 p-6 md:p-8">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="mt-3 text-xl font-medium tracking-tight">
              Sem dark pattern, sem letrinha miúda.
            </h3>
            <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
              <Bullet>Trial sem cartão. Sem renovação automática surpresa.</Bullet>
              <Bullet>Cancele em 1 clique pelo portal Stripe.</Bullet>
              <Bullet>Limites avisados em 80%. Sem cobrança escondida.</Bullet>
              <Bullet>Suas conversas nunca treinam modelos de IA.</Bullet>
            </ul>
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-sm uppercase tracking-widest text-muted-foreground">
            {plan === 'PREMIUM' ? 'Outros planos' : 'Mudar de plano'}
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {(['STARTER', 'PRO', 'PREMIUM'] as const).map((p) => (
              <PlanCard
                key={p}
                planId={p}
                features={PLANS[p]}
                isCurrent={plan === p}
                disabled={!stripeConfigured || plan === p}
              />
            ))}
          </div>
        </section>
      </div>
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
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <p className="text-2xl font-medium tracking-tight">
          {used.toLocaleString('pt-BR')}
          {isUnlimited ? null : (
            <span className="text-base text-muted-foreground"> / {limit.toLocaleString('pt-BR')}</span>
          )}
        </p>
        {!isUnlimited && (
          <span className={cn('text-xs', isHot ? 'text-destructive' : 'text-muted-foreground')}>
            {pct}%
          </span>
        )}
      </div>
      {!isUnlimited && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div
            className={cn(
              'h-full transition-all',
              isHot ? 'bg-destructive' : 'bg-primary',
            )}
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
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-medium tracking-tight">{value}</p>
    </div>
  );
}

function PlanCard({
  planId,
  features,
  isCurrent,
  disabled,
}: {
  planId: PlanId;
  features: PlanFeature;
  isCurrent: boolean;
  disabled: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border bg-card/40 p-6 transition',
        isCurrent ? 'border-primary/40' : 'border-border/60',
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-medium tracking-tight">{PLAN_NAMES[planId]}</h3>
        {isCurrent && (
          <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-primary">
            Atual
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{PLAN_BLURBS[planId]}</p>
      <p className="mt-5 text-3xl font-medium tracking-tight">
        R$ <span className="tabular-nums">{(features.priceBRLCents / 100).toLocaleString('pt-BR')}</span>
        <span className="ml-1 text-sm text-muted-foreground">/mês</span>
      </p>
      <ul className="mt-5 space-y-2 text-sm">
        <li>· {limitLabel(features.aiConversations, 'conversa')} IA/mês</li>
        <li>· {limitLabel(features.whatsappNumbers, 'numero')} WhatsApp</li>
        <li>· {limitLabel(features.teamSeats, 'seat')} no time</li>
        <li>· {features.customTools ? 'Tools customizadas' : 'Tools padrão'}</li>
        <li>· {features.apiAccess ? 'API pública' : 'Sem API'}</li>
      </ul>
      <ChangePlanButtons plan={planId} disabled={disabled} isCurrent={isCurrent} />
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-primary" />
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
