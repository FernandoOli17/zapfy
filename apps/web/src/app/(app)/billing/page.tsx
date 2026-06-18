import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  Code2,
  Info,
  KeyRound,
  Lock,
  Sparkles,
  X,
} from 'lucide-react';
import { prisma } from '@zapfy/db';
import { PLANS, type PlanId, type PlanFeature } from '@zapfy/shared';
import { Button, cn } from '@zapfy/ui';

import {
  countAiConversationsThisCycle,
  countBroadcastsThisCycle,
  dailyAiConversationsLastDays,
  getWorkspacePlan,
} from '@/lib/plans';
import { isStripeConfigured, isStripeMock } from '@/lib/stripe';
import { requireWorkspace } from '@/lib/inbox';

import { ChangePlanButtons, ManageSubscriptionButton } from './billing-buttons';
import { UsageSparkline } from './usage-sparkline';

export const metadata = { title: 'Billing' };
export const dynamic = 'force-dynamic';

const PLAN_NAMES: Record<PlanId, string> = {
  STARTER: 'Starter',
  PRO: 'Pro',
  BUSINESS: 'Business',
};

const PLAN_BLURBS: Record<PlanId, string> = {
  STARTER: 'Pra autônomos e negócios começando.',
  PRO: 'Pra quem já vende e quer escalar.',
  BUSINESS: 'Pra operações que precisam de volume.',
};

/** Mapeia features bloqueadas pro plano necessário (usado pelo `?upgrade=feature`). */
const FEATURE_REQUIRES_PLAN: Record<string, { plan: PlanId; label: string; icon: typeof Code2 }> = {
  customTools: { plan: 'PRO', label: 'Tools customizadas', icon: Code2 },
  apiAccess: { plan: 'BUSINESS', label: 'API pública', icon: KeyRound },
};

interface PageProps {
  searchParams: Promise<{
    success?: string;
    canceled?: string;
    changed?: string;
    upgrade?: string;
    mock_portal?: string;
    mock_plan?: string;
  }>;
}

export default async function BillingPage({ searchParams }: PageProps) {
  const { workspace, member } = await requireWorkspace();
  const isAdmin = member.role === 'OWNER' || member.role === 'ADMIN';

  const [subscription, planInfo, aiConversationsUsed, broadcastsUsed, usageSeries] =
    await Promise.all([
      prisma.subscription.findUnique({ where: { workspaceId: workspace.id } }),
      getWorkspacePlan(workspace.id),
      countAiConversationsThisCycle(workspace.id),
      countBroadcastsThisCycle(workspace.id),
      dailyAiConversationsLastDays(workspace.id, 14),
    ]);
  const { plan, features, status } = planInfo;
  const noPlan = status === 'INCOMPLETE' || status === 'TRIALING';
  const stripeConfigured = isStripeConfigured();
  const stripeMock = isStripeMock();
  const params = await searchParams;

  const usageTotal = usageSeries.reduce((acc, p) => acc + p.value, 0);
  const upgradeFeature = params.upgrade ? FEATURE_REQUIRES_PLAN[params.upgrade] : null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10 md:py-10">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Gestão</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">Billing</h1>
        </div>
      </div>

      {/* Banners de feedback */}
      <div className="mt-6 space-y-3">
        {params.success && (
          <Banner kind="success" icon={CheckCircle2}>
            {params.mock_plan ? (
              <>
                <strong>Modo demo:</strong> assinatura "{params.mock_plan}" ativada localmente.
                Em produção, isso passaria pelo Stripe.
              </>
            ) : params.changed ? (
              'Plano alterado! A diferença do ciclo atual entra como proração na próxima fatura. Pode demorar alguns segundos pra refletir aqui.'
            ) : (
              'Assinatura ativada! Pode demorar alguns segundos pra refletir aqui.'
            )}
          </Banner>
        )}
        {params.canceled && (
          <Banner kind="info" icon={Info}>
            Checkout cancelado. Você pode tentar de novo a qualquer momento.
          </Banner>
        )}
        {params.mock_portal && (
          <Banner kind="warn" icon={Info}>
            <strong>Modo demo:</strong> customer portal real do Stripe só funciona com{' '}
            <code className="font-mono text-xs">STRIPE_SECRET_KEY</code> configurada.
          </Banner>
        )}
        {upgradeFeature && plan !== upgradeFeature.plan && (
          <Banner kind="warn" icon={Lock}>
            <strong>{upgradeFeature.label}</strong> está disponível no plano{' '}
            <strong>{PLAN_NAMES[upgradeFeature.plan]}</strong>. Você está no{' '}
            {PLAN_NAMES[plan]} — faça upgrade abaixo.
          </Banner>
        )}
        {!stripeConfigured && (
          <Banner kind="warn" icon={AlertCircle}>
            <strong>Stripe não configurado:</strong> botões de upgrade desativados. Pra ativar
            billing real, preencha <code className="font-mono text-xs">STRIPE_SECRET_KEY</code> e{' '}
            <code className="font-mono text-xs">STRIPE_PRICE_*</code> no{' '}
            <code className="font-mono text-xs">.env</code>. Pra testar a UI, ative{' '}
            <code className="font-mono text-xs">STRIPE_MOCK=true</code>.
          </Banner>
        )}
        {stripeMock && stripeConfigured && (
          <Banner kind="info" icon={Info}>
            <strong>Modo demo ativo</strong> (
            <code className="font-mono text-xs">STRIPE_MOCK=true</code>). Checkout / portal não
            chamam Stripe real — atualizam Subscription local.
          </Banner>
        )}
      </div>

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
                  {noPlan ? 'Nenhum plano ativo' : PLAN_NAMES[plan]}
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {noPlan
                    ? 'Escolha um plano abaixo pro agente atender no WhatsApp.'
                    : PLAN_BLURBS[plan]}
                </p>
              </div>
              <div className="text-right">
                {status === 'INCOMPLETE' || status === 'TRIALING' ? (
                  <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium uppercase text-amber-700 dark:text-amber-400">
                    sem assinatura
                  </span>
                ) : status === 'PAST_DUE' || status === 'UNPAID' ? (
                  <span className="rounded-full bg-destructive/15 px-2.5 py-1 text-xs font-medium uppercase text-destructive">
                    {status.toLowerCase().replace('_', ' ')}
                  </span>
                ) : status === 'CANCELED' ? (
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium uppercase text-muted-foreground">
                    cancelado
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium uppercase text-emerald-700 dark:text-emerald-400">
                    {status.toLowerCase()}
                  </span>
                )}
                {subscription?.cancelAtPeriodEnd && (
                  <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-400">
                    cancela no fim do ciclo
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="px-6 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <UsageBar
                label="Conversas de IA (ciclo)"
                used={aiConversationsUsed}
                limit={features.aiConversations}
              />
              <KeyValue
                label="Disparos / créditos mkt"
                value={`${broadcastsUsed} no ciclo · ${(subscription?.marketingCredits ?? 0).toLocaleString('pt-BR')} créditos`}
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
              <KeyValue
                label="Respostas do agente"
                value="Gratuitas (Meta)"
              />
            </div>

            {subscription?.currentPeriodEnd && (
              <p className="mt-4 text-[11px] text-muted-foreground">
                Próxima renovação:{' '}
                <strong className="text-foreground">
                  {subscription.currentPeriodEnd.toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </strong>
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-5">
              {subscription?.stripeCustomerId && isAdmin && <ManageSubscriptionButton />}
              {(status === 'INCOMPLETE' || status === 'TRIALING') && (
                <p className="text-xs text-muted-foreground">
                  O Forge monta e demonstra o agente de graça. Assine pra ele atender no
                  WhatsApp — garantia de 7 dias, cancele quando quiser.
                </p>
              )}
              {!isAdmin && (
                <p className="text-xs text-muted-foreground">
                  Apenas OWNER/ADMIN podem mudar plano ou gerenciar assinatura.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Card uso histórico — gráfico de 14d */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Conversas de IA 14d</h3>
              <p className="text-xs text-muted-foreground">
                {aiConversationsUsed.toLocaleString('pt-BR')} conversa
                {aiConversationsUsed === 1 ? '' : 's'} no ciclo
              </p>
            </div>
          </div>
          <div className="mt-5">
            <UsageSparkline data={usageSeries} height={80} />
          </div>
          {usageTotal === 0 && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Conecte o WhatsApp pra começar a registrar uso.
            </p>
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold tracking-tight">
          {plan === 'BUSINESS' ? 'Outros planos' : 'Mudar de plano'}
        </h2>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          {(['STARTER', 'PRO', 'BUSINESS'] as const).map((p) => (
            <PlanCard
              key={p}
              planId={p}
              features={PLANS[p]}
              isCurrent={plan === p}
              disabled={!stripeConfigured || plan === p || !isAdmin}
              recommended={p === 'PRO'}
              highlighted={upgradeFeature?.plan === p && plan !== p}
            />
          ))}
        </div>
        {!isAdmin && (
          <p className="mt-3 text-xs text-muted-foreground">
            Você é {member.role.toLowerCase()}. Apenas OWNER/ADMIN podem fazer upgrade.
          </p>
        )}
      </section>

      {/* Card moat — anti-dark-pattern */}
      <section className="mt-10 rounded-2xl border border-border bg-card p-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <h3 className="mt-3 text-base font-semibold tracking-tight">
          Sem dark pattern, sem letrinha miúda.
        </h3>
        <ul className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          <Bullet>Monte e veja o agente funcionando antes de pagar.</Bullet>
          <Bullet>Garantia de 7 dias. Não gostou, devolvemos.</Bullet>
          <Bullet>Cancele em 1 clique pelo portal Stripe. Sem fidelidade.</Bullet>
          <Bullet>Limites avisados em 80%. Sem cobrança escondida.</Bullet>
          <Bullet>Suas conversas nunca treinam modelos de IA.</Bullet>
          <Bullet>Cobrança por conversas de IA no mês. Disparos de marketing em créditos à parte.</Bullet>
        </ul>
      </section>
    </div>
  );
}

function Banner({
  kind,
  icon: Icon,
  children,
}: {
  kind: 'success' | 'info' | 'warn' | 'error';
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  const cls = {
    success: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400',
    info: 'border-border bg-muted/30 text-foreground',
    warn: 'border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-300',
    error: 'border-destructive/40 bg-destructive/5 text-destructive',
  }[kind];
  return (
    <div className={cn('flex items-start gap-2 rounded-lg border px-4 py-3 text-sm', cls)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
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
  const isCritical = pct >= 95;
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
              isCritical
                ? 'text-destructive'
                : isHot
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-muted-foreground',
            )}
          >
            {pct}%
          </span>
        )}
      </div>
      {!isUnlimited && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              'h-full transition-all duration-500',
              isCritical ? 'bg-destructive' : isHot ? 'bg-amber-500' : 'bg-primary',
            )}
            style={{ width: `${Math.max(2, pct)}%` }}
          />
        </div>
      )}
      {!isUnlimited && isHot && (
        <p
          className={cn(
            'mt-1.5 text-[10px]',
            isCritical ? 'text-destructive' : 'text-amber-600 dark:text-amber-400',
          )}
        >
          {isCritical
            ? 'Quase no limite — considere upgrade pra não pausar.'
            : 'Próximo do limite — fique de olho.'}
        </p>
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
  highlighted,
}: {
  planId: PlanId;
  features: PlanFeature;
  isCurrent: boolean;
  disabled: boolean;
  recommended?: boolean;
  highlighted?: boolean;
}) {
  const featureRows: Array<{ has: boolean; text: string }> = [
    { has: true, text: `${limitLabel(features.aiConversations, 'conversa')} de IA/mês` },
    { has: true, text: `${limitLabel(features.whatsappNumbers, 'numero')} WhatsApp` },
    { has: true, text: `${limitLabel(features.teamSeats, 'usuario')} no time` },
    { has: true, text: `${limitLabel(features.knowledgeDocs, 'doc')} de conhecimento` },
    { has: features.customTools, text: 'Integrações + tools customizadas' },
    { has: features.apiAccess, text: 'API pública' },
  ];

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-2xl border bg-card p-6 transition-all',
        highlighted
          ? 'border-amber-500/60 ring-2 ring-amber-500/30 shadow-lg'
          : recommended && !isCurrent
            ? 'border-primary/40 shadow-md ring-1 ring-primary/20'
            : isCurrent
              ? 'border-primary/40'
              : 'border-border hover:border-primary/30',
      )}
    >
      {highlighted && (
        <span className="absolute -top-2.5 left-6 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-50 shadow-sm">
          <Lock className="h-2.5 w-2.5" />
          Necessário
        </span>
      )}
      {!highlighted && recommended && !isCurrent && (
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
