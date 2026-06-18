# Redesign do Dashboard — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans para
> implementar este plano tarefa a tarefa. Passos usam checkboxes (`- [ ]`).

**Goal:** Reimaginar a home autenticada como central de ação operacional (Direção 1:
strip de métricas → fila de handoff → atividade/plano → ações rápidas), em verde
elétrico, sem gradiente azul, com estado derivado e nunca-quebra.

**Architecture:** Um lib de dados (`lib/dashboard-stats.ts`, com derivação pura
separada das queries, retorna `null` em falha) + 4 componentes presentacionais focados
+ uma `page.tsx` de composição enxuta que remove os blocos mortos. Spec:
`docs/superpowers/specs/2026-06-18-redesign-dashboard-design.md`.

**Tech Stack:** Next.js 15 RSC + client islands, Prisma (queries existentes + helpers
de `lib/plans.ts`), lucide-react, Tailwind v4 com tokens de tema (`text-primary` já é
verde `hsl(151 100% 45%)`), Playwright (E2E em `apps/web/e2e/`).

**Regras transversais:** commits locais na master, sem push. Gate
(`pnpm --filter @zapfy/web typecheck && lint`) verde por tarefa. Zero schema/migração.
`apps/web` não tem harness Vitest — derivação pura fica isolada e testável em
princípio, mas a cobertura efetiva é E2E (justificar no commit, padrão dos
sub-projetos 1–2). Números de linha são referência: localizar trechos por conteúdo.

---

### Task 1: Lib de dados `dashboard-stats.ts`

**Files:**
- Create: `apps/web/src/lib/dashboard-stats.ts`

- [ ] **Step 1: Criar o arquivo**

```ts
import 'server-only';

import { prisma, ConversationStatus } from '@zapfy/db';
import { createLogger } from '@zapfy/shared';

import { countAiConversationsThisCycle, dailyAiConversationsLastDays, getWorkspacePlan } from './plans';

const log = createLogger('dashboard-stats');

export interface HandoffItem {
  conversationId: string;
  contactLabel: string; // contact.name ?? "Contato ••1234"
  preview: string;      // última mensagem, truncada
  waitingSince: string | null; // ISO de lastMessageAt
}

export interface DashboardStats {
  conversasHoje: number;
  resolvidasIaCount: number;
  resolvidasIaPct: number; // 0–100
  aguardando: HandoffItem[]; // top 5, mais antigo primeiro
  aguardandoTotal: number;
  atividade14d: Array<{ label: string; value: number }>;
  planoUso: { usado: number; limite: number | null }; // null = ilimitado
  contatos: number;
  whatsappConnected: boolean;
}

export interface DashboardStatsInputs {
  conversasHoje: number;
  handoffHojeCount: number;
  aguandandoRaw: Array<{
    conversationId: string;
    contactName: string | null;
    contactPhone: string;
    preview: string;
    waitingSince: Date | null;
  }>;
  aguardandoTotal: number;
  atividade14d: Array<{ label: string; value: number }>;
  aiUsado: number;
  aiLimite: number | 'unlimited';
  contatos: number;
  whatsappConnected: boolean;
}

function maskPhone(phone: string): string {
  const tail = phone.slice(-4);
  return `Contato ••${tail}`;
}

/** Derivação PURA (sem DB): testável a partir de inputs simples. */
export function deriveDashboardStats(input: DashboardStatsInputs): DashboardStats {
  const resolvidasIaCount = Math.max(0, input.conversasHoje - input.handoffHojeCount);
  const resolvidasIaPct =
    input.conversasHoje > 0 ? Math.round((resolvidasIaCount / input.conversasHoje) * 100) : 0;
  const aguardando: HandoffItem[] = input.aguandandoRaw.map((r) => ({
    conversationId: r.conversationId,
    contactLabel: r.contactName?.trim() ? r.contactName.trim() : maskPhone(r.contactPhone),
    preview: r.preview.length > 70 ? `${r.preview.slice(0, 70)}…` : r.preview,
    waitingSince: r.waitingSince ? r.waitingSince.toISOString() : null,
  }));
  return {
    conversasHoje: input.conversasHoje,
    resolvidasIaCount,
    resolvidasIaPct,
    aguardando,
    aguardandoTotal: input.aguardandoTotal,
    atividade14d: input.atividade14d,
    planoUso: {
      usado: input.aiUsado,
      limite: input.aiLimite === 'unlimited' ? null : input.aiLimite,
    },
    contatos: input.contatos,
    whatsappConnected: input.whatsappConnected,
  };
}

/** Início do dia no fuso de Brasília (-03:00 fixo, sem DST desde 2019). */
function brtDayStart(): Date {
  const BRT_OFFSET_MS = 3 * 3_600_000;
  const key = new Date(Date.now() - BRT_OFFSET_MS).toISOString().slice(0, 10);
  return new Date(`${key}T00:00:00.000-03:00`);
}

function previewOf(content: unknown): string {
  if (content && typeof content === 'object') {
    const t = (content as Record<string, unknown>)['text'];
    if (typeof t === 'string' && t.trim()) return t.trim();
  }
  return '[mídia]';
}

/**
 * Junta as queries do pulso operacional e deriva. Falha → null + log: o
 * dashboard renderiza sem os blocos operacionais e NUNCA quebra.
 */
export async function getDashboardStats(workspaceId: string): Promise<DashboardStats | null> {
  try {
    const dayStart = brtDayStart();
    const [
      conversasHoje,
      handoffHojeCount,
      aguardandoRows,
      aguardandoTotal,
      atividade14d,
      aiUsado,
      planInfo,
      contatos,
      waConnected,
    ] = await Promise.all([
      prisma.conversation.count({ where: { workspaceId, createdAt: { gte: dayStart } } }),
      prisma.conversation.count({
        where: { workspaceId, createdAt: { gte: dayStart }, status: ConversationStatus.HUMAN_HANDLING },
      }),
      prisma.conversation.findMany({
        where: { workspaceId, status: ConversationStatus.HUMAN_HANDLING },
        orderBy: { lastMessageAt: 'asc' },
        take: 5,
        select: {
          id: true,
          lastMessageAt: true,
          contact: { select: { name: true, phoneE164: true } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { content: true } },
        },
      }),
      prisma.conversation.count({
        where: { workspaceId, status: ConversationStatus.HUMAN_HANDLING },
      }),
      dailyAiConversationsLastDays(workspaceId, 14),
      countAiConversationsThisCycle(workspaceId),
      getWorkspacePlan(workspaceId),
      prisma.contact.count({ where: { workspaceId, deletedAt: null } }),
      prisma.whatsAppAccount.findFirst({ where: { workspaceId, status: 'CONNECTED' }, select: { id: true } }),
    ]);

    return deriveDashboardStats({
      conversasHoje,
      handoffHojeCount,
      aguandandoRaw: aguardandoRows.map((c) => ({
        conversationId: c.id,
        contactName: c.contact.name,
        contactPhone: c.contact.phoneE164,
        preview: previewOf(c.messages[0]?.content),
        waitingSince: c.lastMessageAt,
      })),
      aguardandoTotal,
      atividade14d,
      aiUsado,
      aiLimite: planInfo.features.aiConversations,
      contatos,
      whatsappConnected: Boolean(waConnected),
    });
  } catch (err) {
    log.error({ workspaceId, err: String(err) }, 'getDashboardStats falhou — pulso omitido');
    return null;
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @zapfy/web typecheck`
Expected: verde. (Conferir que `getWorkspacePlan`, `countAiConversationsThisCycle`,
`dailyAiConversationsLastDays` são exportados de `./plans` com essas assinaturas — são.)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/dashboard-stats.ts
git commit -m "feat(web): lib de dados do dashboard operacional (pulso derivado, nunca quebra)"
```

(Sem unit test: apps/web sem harness Vitest; `deriveDashboardStats` é puro e coberto
pelo E2E da Task 7 — justificar no corpo do commit.)

---

### Task 2: Componente `metric-strip.tsx`

**Files:**
- Create: `apps/web/src/app/(app)/dashboard/metric-strip.tsx`

- [ ] **Step 1: Criar o componente (server component, sem interatividade)**

```tsx
import { Bot, Clock, MessageSquare } from 'lucide-react';
import { cn } from '@zapfy/ui';

interface Props {
  conversasHoje: number;
  resolvidasIaCount: number;
  resolvidasIaPct: number;
  aguardandoTotal: number;
}

/** Strip de 3 métricas grandes (Direção 1). "Aguardando você" em âmbar quando >0. */
export function MetricStrip({ conversasHoje, resolvidasIaCount, resolvidasIaPct, aguardandoTotal }: Props) {
  const waiting = aguardandoTotal > 0;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Metric
        icon={<MessageSquare className="h-4 w-4" aria-hidden />}
        label="Conversas hoje"
        value={conversasHoje.toLocaleString('pt-BR')}
        tone="neutral"
      />
      <Metric
        icon={<Bot className="h-4 w-4" aria-hidden />}
        label="Resolvidas pela IA"
        value={resolvidasIaCount.toLocaleString('pt-BR')}
        hint={conversasHoje > 0 ? `${resolvidasIaPct}% do total` : 'sem conversas hoje'}
        tone="primary"
      />
      <Metric
        icon={<Clock className="h-4 w-4" aria-hidden />}
        label="Aguardando você"
        value={aguardandoTotal.toLocaleString('pt-BR')}
        hint={waiting ? 'precisam de atendimento' : 'nada na fila'}
        tone={waiting ? 'warn' : 'neutral'}
      />
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone: 'neutral' | 'primary' | 'warn';
}) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-4',
        tone === 'warn' ? 'border-amber-500/40' : 'border-border',
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-lg',
          tone === 'primary'
            ? 'bg-primary/10 text-primary'
            : tone === 'warn'
              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
              : 'bg-muted text-muted-foreground',
        )}
      >
        {icon}
      </div>
      <div
        className={cn(
          'mt-3 text-3xl font-semibold tracking-tight tabular-nums',
          tone === 'primary' && 'text-primary',
          tone === 'warn' && 'text-amber-600 dark:text-amber-400',
        )}
      >
        {value}
      </div>
      <div className="mt-0.5 text-xs font-medium">{label}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + commit**

Run: `pnpm --filter @zapfy/web typecheck`

```bash
git add "apps/web/src/app/(app)/dashboard/metric-strip.tsx"
git commit -m "feat(web): strip de 3 metricas grandes do dashboard"
```

---

### Task 3: Componente `handoff-queue.tsx`

**Files:**
- Create: `apps/web/src/app/(app)/dashboard/handoff-queue.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Phone } from 'lucide-react';

import type { HandoffItem } from '@/lib/dashboard-stats';

interface Props {
  items: HandoffItem[];
  total: number;
  whatsappConnected: boolean;
}

function initials(label: string): string {
  const parts = label.replace(/[^\p{L}\s]/gu, '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '·';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function waitingLabel(iso: string | null): string {
  if (!iso) return '';
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return 'agora';
  if (mins < 60) return `há ${mins} min`;
  const h = Math.floor(mins / 60);
  return `há ${h}h`;
}

/** Fila "Aguardando você" — conversas em HUMAN_HANDLING, mais antigo primeiro. */
export function HandoffQueue({ items, total, whatsappConnected }: Props) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          Aguardando você
          {total > 0 && (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
              {total}
            </span>
          )}
        </h2>
        {items.length > 0 && (
          <Link
            href="/inbox"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80"
          >
            Abrir inbox <ArrowRight className="h-3 w-3" aria-hidden />
          </Link>
        )}
      </div>

      {!whatsappConnected ? (
        <EmptyState
          icon={<Phone className="h-5 w-5" aria-hidden />}
          title="Conecte o WhatsApp pra ver o pulso"
          body="Quando seu número estiver no ar, as conversas que precisam de você aparecem aqui."
          cta={{ href: '/whatsapp', label: 'Conectar WhatsApp' }}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" aria-hidden />}
          title="Tudo em dia"
          body="A IA está dando conta — ninguém esperando atendimento humano agora."
        />
      ) : (
        <ul role="list" className="mt-4 space-y-1">
          {items.map((it) => (
            <li key={it.conversationId}>
              <Link
                href="/inbox"
                className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground"
                  aria-hidden
                >
                  {initials(it.contactLabel)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{it.contactLabel}</span>
                  <span className="block truncate text-xs text-muted-foreground">{it.preview}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{waitingLabel(it.waitingSince)}</span>
              </Link>
            </li>
          ))}
          {total > items.length && (
            <li className="pt-1 text-center">
              <Link href="/inbox" className="text-xs font-medium text-primary hover:text-primary/80">
                + {total - items.length} na fila
              </Link>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}

function EmptyState({
  icon,
  title,
  body,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="mt-4 flex flex-col items-center rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
      <div className="text-muted-foreground">{icon}</div>
      <p className="mt-2 text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">{body}</p>
      {cta && (
        <Link
          href={cta.href}
          className="mt-3 inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          {cta.label} <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      )}
    </div>
  );
}
```

Nota: `waitingLabel` usa `Date.now()` em render de server component — é avaliado no
request (aceitável; não é hidratação client com mismatch porque a fila não re-renderiza
no client). Manter no server.

- [ ] **Step 2: Typecheck + commit**

Run: `pnpm --filter @zapfy/web typecheck`

```bash
git add "apps/web/src/app/(app)/dashboard/handoff-queue.tsx"
git commit -m "feat(web): fila de handoff 'aguardando voce' + empty-states"
```

---

### Task 4: Componente `activity-card.tsx`

**Files:**
- Create: `apps/web/src/app/(app)/dashboard/activity-card.tsx`

- [ ] **Step 1: Criar o componente (sparkline em barras + uso do plano)**

```tsx
interface Props {
  atividade14d: Array<{ label: string; value: number }>;
  planoUso: { usado: number; limite: number | null };
}

/** Atividade (14 dias) + uso do plano no ciclo. Lado a lado; empilha no mobile. */
export function ActivityCard({ atividade14d, planoUso }: Props) {
  const max = Math.max(1, ...atividade14d.map((d) => d.value));
  const totalPeriodo = atividade14d.reduce((acc, d) => acc + d.value, 0);
  const pct =
    planoUso.limite && planoUso.limite > 0
      ? Math.min(100, Math.round((planoUso.usado / planoUso.limite) * 100))
      : null;

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.5fr_1fr]">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold tracking-tight">Atividade · 14 dias</h2>
          <span className="text-xs text-muted-foreground tabular-nums">
            {totalPeriodo.toLocaleString('pt-BR')} conversas
          </span>
        </div>
        <div className="mt-4 flex h-24 items-end gap-1" aria-hidden>
          {atividade14d.map((d, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm bg-primary/60 transition-all"
              style={{ height: `${Math.max(3, (d.value / max) * 100)}%` }}
              title={`${d.label}: ${d.value}`}
            />
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold tracking-tight">Plano · ciclo</h2>
        <div className="mt-3 text-2xl font-semibold tabular-nums">
          {planoUso.usado.toLocaleString('pt-BR')}
          <span className="ml-1 text-sm font-normal text-muted-foreground">
            / {planoUso.limite === null ? '∞' : planoUso.limite.toLocaleString('pt-BR')}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">conversas de IA neste ciclo</p>
        {pct !== null && (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + commit**

Run: `pnpm --filter @zapfy/web typecheck`

```bash
git add "apps/web/src/app/(app)/dashboard/activity-card.tsx"
git commit -m "feat(web): card de atividade 14d + uso do plano"
```

---

### Task 5: Componente `quick-actions.tsx`

**Files:**
- Create: `apps/web/src/app/(app)/dashboard/quick-actions.tsx`

- [ ] **Step 1: Criar a faixa de ações**

```tsx
import Link from 'next/link';
import { BookOpen, Inbox, Megaphone, Sparkles } from 'lucide-react';

const ACTIONS = [
  { href: '/forge', label: 'Forge', icon: Sparkles },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/knowledge', label: 'Conhecimento', icon: BookOpen },
  { href: '/automations/broadcasts', label: 'Broadcasts', icon: Megaphone },
] as const;

/** Faixa fina de navegação rápida — substitui o grid "Próximos passos" antigo. */
export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {ACTIONS.map((a) => {
        const Icon = a.icon;
        return (
          <Link
            key={a.href}
            href={a.href}
            className="group flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary/40"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="text-sm font-medium">{a.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + commit**

Run: `pnpm --filter @zapfy/web typecheck`

```bash
git add "apps/web/src/app/(app)/dashboard/quick-actions.tsx"
git commit -m "feat(web): faixa de acoes rapidas do dashboard"
```

---

### Task 6: Reescrever `page.tsx` + remover azul

**Files:**
- Modify: `apps/web/src/app/(app)/dashboard/page.tsx` (rework completo do corpo)
- Modify: `apps/web/src/app/manifest.ts` (theme_color azul → verde)

- [ ] **Step 1: Reescrever o corpo do dashboard**

Manter o topo (auth/session/member/redirect, `getOnboardingProgress`, header,
`OnboardingChecklist`) e SUBSTITUIR o miolo (stats antigos, CTA gradiente do Forge,
"Próximos passos", "Atividade recente", "Status do workspace") pela composição nova.
O componente vira:

```tsx
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { prisma } from '@zapfy/db';

import { auth } from '@/lib/auth';
import { getOnboardingProgress } from '@/lib/onboarding';
import { getDashboardStats } from '@/lib/dashboard-stats';

import { OnboardingChecklist } from './onboarding-checklist';
import { MetricStrip } from './metric-strip';
import { HandoffQueue } from './handoff-queue';
import { ActivityCard } from './activity-card';
import { QuickActions } from './quick-actions';
import { PlanBadge } from './plan-badge';

export const metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  const member = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    include: { workspace: { include: { subscription: true } } },
    orderBy: { createdAt: 'asc' },
  });
  if (!member) redirect('/onboarding');

  const ws = member.workspace;
  const [progress, stats] = await Promise.all([
    getOnboardingProgress(ws.id),
    getDashboardStats(ws.id),
  ]);

  const userName = session.user.name?.split(' ')[0] ?? session.user.email.split('@')[0] ?? 'lá';

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10 md:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Olá, {userName}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">{ws.name}</h1>
        </div>
        <PlanBadge status={ws.subscription?.status ?? 'INCOMPLETE'} plan={ws.subscription?.plan ?? 'STARTER'} />
      </div>

      {progress && !progress.complete && (
        <div className="mt-6">
          <OnboardingChecklist progress={progress} />
        </div>
      )}

      {stats && (
        <div className="mt-6 space-y-3">
          <MetricStrip
            conversasHoje={stats.conversasHoje}
            resolvidasIaCount={stats.resolvidasIaCount}
            resolvidasIaPct={stats.resolvidasIaPct}
            aguardandoTotal={stats.aguardandoTotal}
          />
          <HandoffQueue
            items={stats.aguardando}
            total={stats.aguardandoTotal}
            whatsappConnected={stats.whatsappConnected}
          />
          <ActivityCard atividade14d={stats.atividade14d} planoUso={stats.planoUso} />
        </div>
      )}

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold tracking-tight text-muted-foreground">Ações rápidas</h2>
        <QuickActions />
      </div>
    </div>
  );
}
```

IMPORTANTE — `PlanBadge`:
- O `PlanBadge` hoje vive DENTRO de `page.tsx` (função local). Extraí-lo para
  `apps/web/src/app/(app)/dashboard/plan-badge.tsx` (server component) com a assinatura
  `{ status: string; plan: string }`, usando a lógica SEM trial fake já corrigida no
  sub-projeto 2 (`const noPlan = status === 'INCOMPLETE' || status === 'TRIALING'`,
  exibindo `noPlan ? 'sem plano ativo' : status.toLowerCase()`), com `text-primary`
  no plano. Remover a função local de `page.tsx`.
- Conferir o campo do nome do workspace no schema: usar `ws.name` se existir; se o
  modelo usar `ws.slug` como display, manter o que `page.tsx` já usava no header antes
  (ler o arquivo). NÃO inventar campo.

- [ ] **Step 2: Extrair `plan-badge.tsx`**

Criar `apps/web/src/app/(app)/dashboard/plan-badge.tsx`:

```tsx
import { cn } from '@zapfy/ui';

export function PlanBadge({ status, plan }: { status: string; plan: string }) {
  const noPlan = status === 'INCOMPLETE' || status === 'TRIALING';
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs">
      <span className="font-semibold uppercase tracking-wider">{plan}</span>
      <span className="text-muted-foreground/40">·</span>
      <span className={cn('font-medium', noPlan ? 'text-muted-foreground' : 'text-primary')}>
        {noPlan ? 'sem plano ativo' : status.toLowerCase()}
      </span>
    </div>
  );
}
```

- [ ] **Step 3: Manifest theme_color verde**

Em `apps/web/src/app/manifest.ts`: `theme_color: '#60A5FA'` → `theme_color: '#00E676'`.

- [ ] **Step 4: Conferir imports órfãos**

Rodar `pnpm --filter @zapfy/web lint` — o ESLint acusa imports não usados
(lucide antigos: ArrowRight/ArrowUpRight/TrendingUp/Phone/Users/Button etc. que
saíram com os blocos removidos). Limpar todos.

- [ ] **Step 5: Typecheck + lint + commit**

Run: `pnpm --filter @zapfy/web typecheck && pnpm --filter @zapfy/web lint`
Expected: verde.

```bash
git add "apps/web/src/app/(app)/dashboard/page.tsx" "apps/web/src/app/(app)/dashboard/plan-badge.tsx" apps/web/src/app/manifest.ts
git commit -m "feat(web): dashboard operacional (strip + handoff + atividade + acoes), sem gradiente azul"
```

---

### Task 7: E2E + gate final + PLAN.md

**Files:**
- Create: `apps/web/e2e/dashboard.spec.ts`
- Modify: `PLAN.md`

- [ ] **Step 1: E2E (reusar helpers de `apps/web/e2e/helpers.ts`)**

Ler `helpers.ts` + `onboarding-card.spec.ts` (criado no sub-projeto 2) pra reusar o
fluxo de signup/login. Espinha:

```ts
import { test, expect } from '@playwright/test';
// reusar helper de signup/login existente (ver e2e/helpers.ts)

test('dashboard novo mostra acoes rapidas e empty-state do pulso', async ({ page }) => {
  // signup + onboarding (helper cria workspace novo, sem WhatsApp conectado)
  await page.goto('/dashboard');
  // ações rápidas sempre presentes
  await expect(page.getByRole('link', { name: 'Forge' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Inbox' })).toBeVisible();
  // sem WhatsApp conectado → empty-state da fila aponta pra conexão
  await expect(page.getByText('Conecte o WhatsApp pra ver o pulso')).toBeVisible();
});
```

Ajustar à API real dos helpers. Se o `getDashboardStats` retornar dados (workspace
novo: conversasHoje 0, aguardando vazio, whatsapp não conectado), o bloco `stats`
renderiza com a métrica zerada + empty-state — o teste acima cobre isso.

- [ ] **Step 2: Rodar o E2E**

Run: `pnpm --filter @zapfy/web exec playwright test e2e/dashboard.spec.ts`
Expected: PASS (DB real via Neon/443, como no sub-projeto 2). Se não rodar por
ambiente, registrar motivo no PLAN.md e validar via preview.

- [ ] **Step 3: Gate completo**

Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
Expected: tudo verde (7/7, 7/7, 3 pacotes de teste, build 2/2).

- [ ] **Step 4: PLAN.md + commit**

Adicionar bullet no topo de "Estado atual":

```markdown
- **Sub-projeto 3/4 "Redesign do dashboard" CONCLUÍDO (data).** Home reimaginada como
  central de ação: strip de 3 métricas (conversas hoje, resolvidas pela IA, aguardando
  você), fila de handoff dominante (HUMAN_HANDLING, mais antigo primeiro) com
  empty-states, atividade 14d + uso do plano, faixa de ações rápidas. Verde elétrico
  consistente; gradiente azul do CTA removido; manifest theme_color alinhado. Estado
  derivado de `lib/dashboard-stats.ts` (nunca quebra). Blocos mortos removidos
  (StatusRow, grid de ações, hero gradiente). Gate verde; E2E do dashboard. Commits
  locais, sem push. Próximo: sub-projeto 4 (redesign da landing).
```

```bash
git add apps/web/e2e PLAN.md
git commit -m "test(web): e2e do dashboard + PLAN atualizado (sub-projeto 3 concluido)"
```

- [ ] **Step 5: Apresentar resumo ao usuário** (o que mudou, screenshot/preview se
  possível, lembrete de que commits são locais e o PR #1 segue aberto).

---

## Self-review (cobertura da spec)

- Strip de métricas → Task 2. Fila de handoff + empty-states → Task 3. Atividade+plano
  → Task 4. Ações rápidas → Task 5. Composição + remoção de mortos + azul → Task 6.
  Lib de dados derivada + nunca-quebra → Task 1. Dois estados (card + empty) →
  Tasks 1/3/6. Paleta verde / manifest → Task 6. Testes/E2E → Task 7.
- Tipos consistentes: `DashboardStats`/`HandoffItem` definidos na Task 1 e consumidos
  com os mesmos nomes nas Tasks 2–6 (`aguardando`/`aguardandoTotal`/`resolvidasIaCount`
  /`resolvidasIaPct`/`planoUso.limite`/`atividade14d`/`whatsappConnected`).
- Sem placeholders: todo passo de código tem o código completo.
- Risco aberto declarado no plano: confirmar `ws.name` vs `ws.slug` no header
  (Task 6 Step 1) lendo o schema/arquivo antes de editar.
