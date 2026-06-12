# UX do Cliente — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans para
> implementar este plano tarefa a tarefa. Passos usam checkboxes (`- [ ]`).

**Goal:** Jornada guiada de onboarding (card derivado de 5 passos "valor antes de
pagar") + guia embutido da Meta + simulador multi-turno + 13 quick wins do audit.

**Architecture:** Estado 100% derivado (zero schema): helper `getOnboardingProgress`
em `apps/web/src/lib/onboarding.ts` com derivador puro separado das queries. O card
REUSA o `OnboardingChecklist` existente do dashboard (que hoje tem passos errados:
knowledge/team em vez de simulador/plano), virando client component pra minimizar via
localStorage. Spec: `docs/superpowers/specs/2026-06-12-ux-cliente-design.md`.

**Tech Stack:** Next.js 15 RSC + client components, Prisma (queries existentes),
Playwright (e2e já configurado em `apps/web/e2e/`), AuditLog para marcar o passo 2.

**Regras transversais:** commits locais na master, sem push. Gate
(`pnpm typecheck && pnpm lint && pnpm test`) verde por tarefa. Zero migração.
`apps/web` e `apps/worker` não têm harness de unit — onde TDD não couber, justificar
no commit e cobrir via E2E (Task 8).

**Descoberta/desvio da spec (registrar no PLAN.md ao final):** prints reais do painel
da Meta não podem ser gerados por código. O guia (Task 4) usa passos textuais ricos +
links diretos + slots de imagem opcionais (`apps/web/public/guias/meta/passo-N.png`,
renderizados só se o arquivo existir). Capturar os prints reais = ação manual do
usuário (vira débito anotado).

---

### Task 1: Derivador de progresso (`lib/onboarding.ts`)

**Files:**
- Create: `apps/web/src/lib/onboarding.ts`

- [ ] **Step 1: Criar o helper com derivador puro + queries**

```ts
import 'server-only';

import { prisma } from '@zapfy/db';
import { createLogger } from '@zapfy/shared';

const log = createLogger('onboarding');

export type OnboardingStepId = 'forge' | 'simulator' | 'plan' | 'whatsapp' | 'first-reply';

export interface OnboardingStep {
  id: OnboardingStepId;
  title: string;
  description: string;
  href: string;
  done: boolean;
}

export interface OnboardingProgress {
  steps: OnboardingStep[];
  completedCount: number;
  complete: boolean;
  /** Primeiro passo não concluído (null quando complete). */
  next: OnboardingStep | null;
}

export interface OnboardingInputs {
  hasPublishedAgent: boolean;
  hasTestedAgent: boolean;
  hasActivePlan: boolean;
  hasWhatsAppConnected: boolean;
  hasFirstRealReply: boolean;
}

/**
 * Derivador PURO (testável sem DB): monta os 5 passos "valor antes de pagar"
 * a partir de booleans. Ordem fixa; passos feitos fora de ordem contam normal.
 */
export function deriveOnboardingSteps(inputs: OnboardingInputs): OnboardingProgress {
  const steps: OnboardingStep[] = [
    {
      id: 'forge',
      title: 'Montar seu agente no Forge',
      description: 'Responde 4 perguntas e a IA nasce configurada. ~3 min.',
      href: '/forge',
      done: inputs.hasPublishedAgent,
    },
    {
      id: 'simulator',
      title: 'Ver a IA funcionando',
      description: 'Converse com seu agente no simulador — é assim que seus clientes serão atendidos.',
      href: '/agent',
      done: inputs.hasTestedAgent,
    },
    {
      id: 'plan',
      title: 'Ativar seu plano',
      description: 'Garantia de 7 dias. Sem plano, o agente não atende no WhatsApp.',
      href: '/billing',
      done: inputs.hasActivePlan,
    },
    {
      id: 'whatsapp',
      title: 'Conectar seu WhatsApp',
      description: 'Guia passo a passo pra ligar seu número da Meta.',
      href: '/whatsapp',
      done: inputs.hasWhatsAppConnected,
    },
    {
      id: 'first-reply',
      title: 'Primeira conversa real',
      description: 'Mande uma mensagem de teste e veja a IA responder no WhatsApp.',
      href: '/whatsapp',
      done: inputs.hasFirstRealReply,
    },
  ];
  const completedCount = steps.filter((s) => s.done).length;
  return {
    steps,
    completedCount,
    complete: completedCount === steps.length,
    next: steps.find((s) => !s.done) ?? null,
  };
}

/**
 * Junta as queries (todas baratas, indexadas por workspaceId) e deriva.
 * Falha → retorna null e loga: o dashboard NUNCA quebra por causa do card.
 */
export async function getOnboardingProgress(
  workspaceId: string,
): Promise<OnboardingProgress | null> {
  try {
    const [publishedAgent, tested, sub, waConnected, firstReply] = await Promise.all([
      prisma.agent.findFirst({
        where: { workspaceId, currentVersionId: { not: null } },
        select: { id: true },
      }),
      prisma.auditLog.findFirst({
        where: { workspaceId, action: 'agent.test' },
        select: { id: true },
      }),
      prisma.subscription.findFirst({
        where: { workspaceId },
        select: { status: true },
      }),
      prisma.whatsAppAccount.findFirst({
        where: { workspaceId, status: 'CONNECTED' },
        select: { id: true },
      }),
      prisma.message.findFirst({
        where: {
          workspaceId,
          direction: 'OUTBOUND',
          fromAi: true,
          whatsappMessageId: { not: null },
        },
        select: { id: true },
      }),
    ]);
    return deriveOnboardingSteps({
      hasPublishedAgent: Boolean(publishedAgent),
      hasTestedAgent: Boolean(tested),
      hasActivePlan: sub?.status === 'ACTIVE' || sub?.status === 'PAST_DUE',
      hasWhatsAppConnected: Boolean(waConnected),
      hasFirstRealReply: Boolean(firstReply),
    });
  } catch (err) {
    log.error({ workspaceId, err: String(err) }, 'getOnboardingProgress falhou — card omitido');
    return null;
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @zapfy/web typecheck`
Expected: verde.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/onboarding.ts
git commit -m "feat(web): derivador de progresso de onboarding (5 passos, estado derivado)"
```

(Sem unit test: apps/web não tem harness Vitest; o derivador puro é coberto pelo E2E
da Task 8 — justificar no corpo do commit.)

---

### Task 2: Rework do card no dashboard

**Files:**
- Modify: `apps/web/src/app/(app)/dashboard/onboarding-checklist.tsx` (rework completo)
- Modify: `apps/web/src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Reescrever `onboarding-checklist.tsx` como client component**

Substituir o arquivo INTEIRO por:

```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, ChevronDown, ChevronUp, Circle } from 'lucide-react';
import { Button, cn } from '@zapfy/ui';

import type { OnboardingProgress } from '@/lib/onboarding';

const MINIMIZED_KEY = 'zapfy.onboarding.minimized';

/**
 * Card "Coloque sua IA pra atender" — jornada de 5 passos derivada do DB
 * (ver lib/onboarding.ts). Some sozinho quando completa; minimizável via
 * localStorage (estado de UI local, não de negócio).
 */
export function OnboardingChecklist({ progress }: { progress: OnboardingProgress }) {
  const [minimized, setMinimized] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setMinimized(localStorage.getItem(MINIMIZED_KEY) === '1');
    setHydrated(true);
  }, []);

  if (progress.complete) return null;

  function toggle() {
    const next = !minimized;
    setMinimized(next);
    localStorage.setItem(MINIMIZED_KEY, next ? '1' : '0');
  }

  const pct = Math.round((progress.completedCount / progress.steps.length) * 100);

  if (hydrated && minimized) {
    return (
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-2.5 text-sm transition-colors hover:border-primary/40"
        aria-expanded={false}
      >
        <span className="text-muted-foreground">
          Continuar configuração{' '}
          <span className="font-mono tabular-nums">
            ({progress.completedCount}/{progress.steps.length})
          </span>
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden />
      </button>
    );
  }

  return (
    <section className="animate-slide-up overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Coloque sua IA pra atender · {pct}%
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight md:text-2xl">
            {progress.completedCount} de {progress.steps.length} passos
          </h2>
        </div>
        <button
          type="button"
          onClick={toggle}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Minimizar checklist"
        >
          <ChevronUp className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="mt-5 space-y-2">
        {progress.steps.map((step) => {
          const isNext = progress.next?.id === step.id;
          return (
            <li
              key={step.id}
              className={cn(
                'flex items-center gap-3 rounded-lg border p-3',
                step.done && 'border-emerald-500/30 bg-emerald-500/5',
                isNext && 'border-primary/40 bg-primary/5',
                !step.done && !isNext && 'border-border bg-card opacity-70',
              )}
            >
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                  step.done
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : isNext
                      ? 'bg-primary/15 text-primary'
                      : 'bg-muted text-muted-foreground',
                )}
                aria-hidden
              >
                {step.done ? <Check className="h-4 w-4" /> : <Circle className="h-3 w-3" />}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    'text-sm font-medium',
                    step.done && 'text-muted-foreground line-through',
                  )}
                >
                  {step.title}
                </p>
                {isNext && (
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                )}
              </div>
              {isNext && (
                <Button asChild size="sm" className="shrink-0">
                  <Link href={step.href}>
                    Continuar
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
                  </Link>
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
```

- [ ] **Step 2: Ligar no `dashboard/page.tsx`**

a) Importar o helper e remover o status antigo:

```ts
import { getOnboardingProgress } from '@/lib/onboarding';
```

b) Apagar o bloco `const onboardingStatus = { ... }` (linhas ~96-102) e os counts que
só existiam pra ele (`publishedAgents`, `waConnected`, `memberCount`, `messageCount`
saem do `$transaction` SE não usados em outro lugar — `waConnected` continua usado no
StatusRow do passo (d); manter os que forem usados). Buscar o progresso:

```ts
const progress = await getOnboardingProgress(ws.id);
```

c) Trocar a renderização (linhas ~123-126) por:

```tsx
{progress && !progress.complete && (
  <div className="mt-6">
    <OnboardingChecklist progress={progress} />
  </div>
)}
```

d) Quick wins no MESMO arquivo:
- Linha 62: card "Base de conhecimento" → `ready: true`.
- Linha 208: `<StatusRow label="WhatsApp" done={false} ...>` → `done={waConnected > 0}`.
- Linha 215: `<StatusRow label="Time" done={false} ...>` → `done={memberCount > 1}`.
- `PlanBadge` (linhas 116-120 e 223-244): o default `status ?? 'TRIALING'` exibe
  "X dias de trial" — trial não existe no modelo. Trocar a chamada por
  `status={sub?.status ?? 'INCOMPLETE'}` e no componente trocar o branch `isTrial`
  por: `const noPlan = status === 'INCOMPLETE' || status === 'TRIALING';` exibindo
  `noPlan ? 'sem plano ativo' : status.toLowerCase()` (remover prop `days` e o
  cálculo `daysLeft`/`trialEndsAt` das linhas 79-82, que ficam órfãos).

- [ ] **Step 3: Verificar visual no preview**

Run: `pnpm --filter @zapfy/web typecheck && pnpm --filter @zapfy/web lint`
Expected: verde. Com dev server: dashboard mostra o card no passo certo; minimizar
persiste após reload; card some quando os 5 passos estão completos (validar de vez
no E2E da Task 8).

- [ ] **Step 4: Commit**

```bash
git add "apps/web/src/app/(app)/dashboard"
git commit -m "feat(web): card de onboarding com 5 passos derivados + quick wins do dashboard"
```

---

### Task 3: Simulador multi-turno + marca do passo 2

**Files:**
- Modify: `apps/web/src/app/(app)/agent/actions.ts:80-83` (testInput) e `:182-208` (history) e `:210-219` (AuditLog)
- Modify: `apps/web/src/app/(app)/agent/test-agent.tsx` (chat multi-turno)

- [ ] **Step 1: `testInput` aceita histórico e a action repassa**

Em `actions.ts`, trocar o schema (linha 80):

```ts
const historyItem = z.object({
  role: z.enum(['user', 'assistant']),
  text: z.string().trim().min(1).max(2000),
});

const testInput = z.object({
  agentId: z.string().cuid(),
  inboundText: z.string().trim().min(1).max(1000),
  history: z.array(historyItem).max(20).default([]),
});
```

Nos dois call sites (`executeFlow` linha ~186 e `runAgent` linha ~200), trocar
`messageHistory: []` por `messageHistory: parsed.data.history`.

- [ ] **Step 2: Gravar `AuditLog 'agent.test'` no primeiro teste do workspace**

Logo após o `log.info(... 'test agent run')` (linha ~219), antes do `return`:

```ts
    // Marca o passo 2 do onboarding (estado derivado — ver lib/onboarding.ts).
    // Grava só uma vez por workspace; falha aqui não derruba o teste.
    try {
      const already = await prisma.auditLog.findFirst({
        where: { workspaceId: member.workspaceId, action: 'agent.test' },
        select: { id: true },
      });
      if (!already) {
        await prisma.auditLog.create({
          data: {
            workspaceId: member.workspaceId,
            userId: session.user.id,
            action: 'agent.test',
            targetType: 'Agent',
            targetId: agent.id,
          },
        });
      }
    } catch (err) {
      log.warn({ err: String(err) }, 'auditLog agent.test falhou — passo não marcado');
    }
```

- [ ] **Step 3: `test-agent.tsx` vira chat multi-turno**

Trocar o estado e o handler (mantendo exemplos, rate-limit feedback e o ResultView
de métricas do último turno):

```tsx
type ChatMsg = { role: 'user' | 'assistant'; text: string };

export function TestAgent({ agentId, vertical }: Props) {
  const [text, setText] = useState('');
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<TestAgentResult | null>(null);

  const examples = EXAMPLES_BY_VERTICAL[vertical] ?? EXAMPLES_BY_VERTICAL['OTHER']!;

  function onRun() {
    const msg = text.trim();
    if (!msg) return;
    setText('');
    setChat((c) => [...c, { role: 'user', text: msg }]);
    startTransition(async () => {
      const r = await testAgent({ agentId, inboundText: msg, history: chat });
      setResult(r);
      if (r.status === 'ok') {
        setChat((c) => [...c, { role: 'assistant', text: r.replyText }]);
      }
    });
  }
```

Renderizar as bolhas acima do textarea (antes do bloco do input):

```tsx
      {chat.length > 0 && (
        <div className="mt-4 max-h-80 space-y-2 overflow-y-auto rounded-lg border border-border bg-background p-3">
          {chat.map((m, i) => (
            <div
              key={i}
              className={cn(
                'max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap',
                m.role === 'user'
                  ? 'ml-auto bg-primary/15 text-foreground'
                  : 'mr-auto bg-muted',
              )}
            >
              {m.text}
            </div>
          ))}
          {pending && (
            <div className="mr-auto inline-flex items-center gap-1.5 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> digitando…
            </div>
          )}
        </div>
      )}
```

(Importar `cn` de `@zapfy/ui`.) Adicionar botão "Limpar conversa" pequeno
(`onClick={() => { setChat([]); setResult(null); }}`) ao lado dos exemplos, e trocar
a copy do header pra: "Converse com seu agente — é assim que seus clientes serão
atendidos. Nada é enviado nem cobrado."

- [ ] **Step 4: Gate dirigido + commit**

Run: `pnpm --filter @zapfy/web typecheck && pnpm --filter @zapfy/web lint`
Expected: verde.

```bash
git add "apps/web/src/app/(app)/agent"
git commit -m "feat(web): simulador multi-turno + marca passo 2 do onboarding (AuditLog agent.test)"
```

---

### Task 4: Guia embutido "Conectar WhatsApp"

**Files:**
- Create: `apps/web/src/app/(app)/whatsapp/meta-guide.tsx`
- Create: `apps/web/public/guias/meta/.gitkeep` (slots de prints — ver desvio no topo)
- Modify: `apps/web/src/app/(app)/whatsapp/page.tsx` (renderizar o guia na seção de conexão)
- Modify: `apps/web/src/app/(app)/whatsapp/connect-form.tsx` (validação client)
- Modify: `apps/web/src/app/(app)/whatsapp/actions.ts:110-130` (hints acionáveis)

- [ ] **Step 1: Componente `MetaGuide` (server component, acordeão nativo)**

```tsx
import Image from 'next/image';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

interface GuideStep {
  slug: string;
  title: string;
  body: React.ReactNode;
}

/** Print opcional: renderiza só se o arquivo existir em public/guias/meta/. */
function StepImage({ slug, alt }: { slug: string; alt: string }) {
  const file = `/guias/meta/${slug}.png`;
  if (!existsSync(join(process.cwd(), 'public', file))) return null;
  return (
    <Image
      src={file}
      alt={alt}
      width={720}
      height={400}
      className="mt-3 rounded-lg border border-border"
    />
  );
}

const STEPS: GuideStep[] = [
  {
    slug: 'passo-1-app',
    title: '1. Crie (ou abra) seu app na Meta',
    body: (
      <>
        Acesse{' '}
        <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer" className="text-primary underline-offset-4 hover:underline">
          developers.facebook.com/apps
        </a>{' '}
        e crie um app do tipo <strong>Business</strong>. Dentro dele, adicione o produto{' '}
        <strong>WhatsApp</strong> no menu lateral.
      </>
    ),
  },
  {
    slug: 'passo-2-ids',
    title: '2. Copie o Phone Number ID e o WABA ID',
    body: (
      <>
        Em <strong>WhatsApp → API Setup</strong>, logo abaixo do número de teste, estão o{' '}
        <code className="font-mono text-xs">Phone number ID</code> e o{' '}
        <code className="font-mono text-xs">WhatsApp Business Account ID</code>. São os dois
        números longos que o formulário ao lado pede.
      </>
    ),
  },
  {
    slug: 'passo-3-token',
    title: '3. Gere um token PERMANENTE (não o temporário)',
    body: (
      <>
        O token da página API Setup expira em 24h. Pra produção: em{' '}
        <a href="https://business.facebook.com/settings/system-users" target="_blank" rel="noreferrer" className="text-primary underline-offset-4 hover:underline">
          Business Settings → System users
        </a>
        , crie um usuário de sistema, dê acesso ao app + WABA e gere um token com as
        permissões <code className="font-mono text-xs">whatsapp_business_messaging</code> e{' '}
        <code className="font-mono text-xs">whatsapp_business_management</code>. Ele começa
        com <code className="font-mono text-xs">EAA</code>.
      </>
    ),
  },
  {
    slug: 'passo-4-secret',
    title: '4. Copie o App Secret',
    body: (
      <>
        Em <strong>App Settings → Basic</strong> do seu app, clique em <em>Show</em> no campo{' '}
        <strong>App secret</strong>. Usamos ele pra validar a assinatura dos webhooks da Meta
        (nada chega aqui sem essa verificação).
      </>
    ),
  },
];

export function MetaGuide() {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="text-sm font-semibold tracking-tight">Onde acho essas credenciais?</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Antes de começar você precisa de: conta no Meta Business, um app criado e um número
        de telefone dedicado (que NÃO esteja em uso no app do WhatsApp).
      </p>
      <div className="mt-4 space-y-2">
        {STEPS.map((s) => (
          <details key={s.slug} className="group rounded-lg border border-border bg-background px-4 py-3">
            <summary className="cursor-pointer list-none text-sm font-medium marker:hidden">
              {s.title}
            </summary>
            <div className="mt-2 text-sm text-muted-foreground">{s.body}</div>
            <StepImage slug={s.slug} alt={s.title} />
          </details>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Renderizar na página**

Em `page.tsx`, na seção "Conectar primeiro número" (linha ~80), envolver o form num
grid com o guia ao lado (empilha no mobile):

```tsx
<section className="mt-8 grid gap-4 lg:grid-cols-[1fr_1.1fr]">
  <div>
    <h2 className="text-sm font-semibold tracking-tight">
      {accounts.length > 0 ? 'Adicionar outro número' : 'Conectar primeiro número'}
    </h2>
    <div className="mt-3">
      <ConnectForm />
    </div>
  </div>
  <MetaGuide />
</section>
```

(Importar `MetaGuide`; ajustar o JSX existente da seção conforme a estrutura atual.)

- [ ] **Step 3: Validação client no `connect-form.tsx`**

Antes do submit (no handler existente), validar formato e setar erro inline sem ir
ao servidor:

```ts
function validateFormat(input: { accessToken: string; phoneNumberId: string; businessAccountId: string }): string | null {
  if (!/^EAA/.test(input.accessToken.trim())) {
    return 'O token deve começar com "EAA" — veja o passo 3 do guia (token permanente).';
  }
  if (!/^\d{8,20}$/.test(input.phoneNumberId.trim())) {
    return 'Phone Number ID é só números (passo 2 do guia).';
  }
  if (!/^\d{8,20}$/.test(input.businessAccountId.trim())) {
    return 'WABA ID é só números (passo 2 do guia).';
  }
  return null;
}
```

(Adaptar nomes dos campos aos do form existente; exibir no mesmo slot de erro atual.)

- [ ] **Step 4: Hints acionáveis nos erros da Meta (`actions.ts`)**

No catch do `testConnection` (linha ~114), enriquecer com dica por código:

```ts
function metaErrorHint(code: number | undefined): string {
  if (code === 190) return ' Dica: gere um token PERMANENTE via System User (passo 3 do guia) — o da API Setup expira em 24h.';
  if (code === 100 || code === 33) return ' Dica: confira se o Phone Number ID e o WABA ID são os da página WhatsApp → API Setup (passo 2 do guia).';
  if (code === 131030) return ' Dica: em modo dev, o número de DESTINO precisa estar na lista de destinatários permitidos do app.';
  if (code === 10) return ' Dica: o token não tem as permissões whatsapp_business_messaging/management (passo 3 do guia).';
  return '';
}
```

E no retorno de erro: `` error: `Meta rejeitou as credenciais: ${err.userMessage}${metaErrorHint(err.code)}` `` —
conferir o campo de código disponível em `WaApiError` (`packages/wa`) e ajustar
(`err.code` ou `err.metaCode`, o que existir).

- [ ] **Step 5: Gate dirigido + commit**

Run: `pnpm --filter @zapfy/web typecheck && pnpm --filter @zapfy/web lint`
Expected: verde.

```bash
git add "apps/web/src/app/(app)/whatsapp" apps/web/public/guias
git commit -m "feat(web): guia embutido da Meta + validacao de formato + erros com dica acionavel"
```

---

### Task 5: Reenvio de código no /verify-device + tema

**Files:**
- Modify: `apps/web/src/lib/device-verification.ts` (extrair envio de e-mail + função de reenvio)
- Create: `apps/web/src/app/verify-device/actions.ts` (server action de reenvio)
- Modify: `apps/web/src/app/verify-device/page.tsx` (botão + tema claro/escuro)

- [ ] **Step 1: Extrair `sendVerificationEmail` e criar `resendDeviceVerification`**

Em `device-verification.ts`: extrair o bloco de montagem+envio do e-mail (linhas
~185-213 dentro de `createDeviceVerification`) numa função interna reutilizável:

```ts
async function sendVerificationEmail(input: {
  userId: string;
  email: string;
  name: string | null;
  ipAddress: string;
  userAgent: string;
  location: string | null;
  appUrl: string;
  code: string;
  verifyToken: string;
  revokeToken: string;
}): Promise<{ ok: boolean }> {
  const appUrl = input.appUrl.replace(/\/$/, '');
  const tmpl = newDeviceVerificationEmail({
    name: input.name ?? input.email.split('@')[0] ?? 'usuário',
    ip: input.ipAddress,
    ...(input.location ? { location: input.location } : {}),
    device: describeDevice(input.userAgent, input.location),
    timestampLabel: new Date().toLocaleString('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
    }),
    verifyUrl: `${appUrl}/verify-device?token=${input.verifyToken}`,
    code: input.code,
    revokeUrl: `${appUrl}/api/auth/revoke-device?token=${input.revokeToken}`,
  });
  const result = await sendEmail({
    to: input.email, subject: tmpl.subject, html: tmpl.html, text: tmpl.text,
  });
  if (!result.ok) {
    log.error({ userId: input.userId, err: result.error }, 'e-mail verify-device NÃO enviado');
  }
  return { ok: result.ok };
}
```

`createDeviceVerification` passa a chamar essa função (removendo o try/catch morto —
`sendEmail` não lança). Nova função pública:

```ts
/**
 * Reenvia o código pra verificação PENDENTE da sessão: regenera código e
 * estende o TTL (não cria registro novo — verifyToken/revokeToken preservados).
 */
export async function resendDeviceVerification(
  sessionToken: string,
  appUrl: string,
): Promise<{ ok: boolean; error?: string }> {
  const pending = await prisma.deviceVerification.findFirst({
    where: { sessionToken, verifiedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  if (!pending) return { ok: false, error: 'Nenhuma verificação pendente.' };

  const user = await prisma.user.findUnique({
    where: { id: pending.userId },
    select: { email: true, name: true },
  });
  if (!user) return { ok: false, error: 'Usuário não encontrado.' };

  const code = randomInt(0, 1_000_000).toString().padStart(CODE_LENGTH, '0');
  await prisma.deviceVerification.update({
    where: { id: pending.id },
    data: { codeHash: hashCode(code), expiresAt: new Date(Date.now() + CODE_TTL_MS) },
  });

  const sent = await sendVerificationEmail({
    userId: pending.userId,
    email: user.email,
    name: user.name,
    ipAddress: pending.ipAddress,
    userAgent: pending.userAgent,
    location: pending.location,
    appUrl,
    code,
    verifyToken: pending.verifyToken,
    revokeToken: pending.revokeToken,
  });
  if (!sent.ok) return { ok: false, error: 'Falha ao enviar o e-mail. Tenta de novo em instantes.' };
  return { ok: true };
}
```

- [ ] **Step 2: Server action + botão na página**

`apps/web/src/app/verify-device/actions.ts`:

```ts
'use server';

import { headers } from 'next/headers';

import { auth } from '@/lib/auth';
import { resendDeviceVerification } from '@/lib/device-verification';
import { env } from '@/env';
import { enforceRateLimit } from '@/lib/rate-limit';

const RL_RESEND = { name: 'verify-device-resend', limit: 3, windowSec: 300 } as const;

export async function resendCodeAction(): Promise<{ ok: boolean; error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: 'Sessão expirada — faça login de novo.' };

  const rl = await enforceRateLimit(`user:${session.user.id}`, RL_RESEND);
  if (!rl.success) return { ok: false, error: 'Muitos reenvios. Aguarde alguns minutos.' };

  return resendDeviceVerification(session.session.token, env.BETTER_AUTH_URL);
}
```

(Conferir import do rate-limit: usar o mesmo helper/preset-shape do
`enforceRateLimit` já usado em `agent/actions.ts`; conferir como a página obtém o
sessionToken — `session.session.token` no Better Auth.)

Na `page.tsx`: componente client pequeno `ResendButton` (botão + cooldown de 60s no
client + feedback "Enviado!"/erro), renderizado abaixo do texto da linha 84 (que já
promete o botão).

- [ ] **Step 3: Tema claro/escuro (quick win 3)**

Na mesma `page.tsx`, trocar `bg-[#0a0a0a]` (linha 46) e demais cores hardcoded por
tokens do tema (`bg-background`, `text-foreground`, `border-border`, `bg-card`) —
mesma paleta usada pelas páginas `(auth)`.

- [ ] **Step 4: Gate dirigido + commit**

Run: `pnpm --filter @zapfy/web typecheck && pnpm --filter @zapfy/web lint`
Expected: verde.

```bash
git add apps/web/src/lib/device-verification.ts apps/web/src/app/verify-device
git commit -m "feat(web): reenvio de codigo no verify-device + tema do app (quick wins 1 e 3)"
```

---

### Task 6: Quick wins do worker (7, 8, 9)

**Files:**
- Modify: `apps/worker/src/jobs/process-message.ts`

- [ ] **Step 1: (#8) Botões/listas interativas viram texto processável**

O webhook persiste `content = m.interactive` (`{ type:'button_reply', button_reply:{ id,title } }`
ou `list_reply`) e `m.button` (`{ payload, text }`) com `type: INTERACTIVE`. No
worker, trocar a extração (linha ~114-115, `const inboundText = ...`) por:

```ts
  const content = message.content as Record<string, unknown>;
  const inboundText = extractInboundText(content);
```

E adicionar o helper no fim do arquivo:

```ts
/**
 * Texto processável da mensagem inbound. Respostas interativas (botões/listas)
 * carregam o title/text do item clicado — antes eram ignoradas sem resposta.
 */
function extractInboundText(content: Record<string, unknown>): string {
  const direct = content['text'];
  if (typeof direct === 'string' && direct.trim()) return direct.trim();
  const br = content['button_reply'] as { title?: unknown } | undefined;
  if (typeof br?.title === 'string' && br.title.trim()) return br.title.trim();
  const lr = content['list_reply'] as { title?: unknown } | undefined;
  if (typeof lr?.title === 'string' && lr.title.trim()) return lr.title.trim();
  return '';
}
```

- [ ] **Step 2: (#7) Resposta da IA atualiza `lastMessageAt`**

Após o loop de envio/persistência de chunks (depois do `for` do passo 12), quando
`sentChunks > 0`:

```ts
  if (sentChunks > 0) {
    // Ordenação/preview do inbox: sem isto a conversa ficava "parada" no
    // timestamp da mensagem do contato.
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });
  }
```

- [ ] **Step 3: (#9) Mensagem-ponte de handoff persiste no inbox**

No `handleHandoff`, após o `waClient.sendText(...)` bem-sucedido (dentro do try):

```ts
    const bridgeText =
      'Vou transferir você para um de nossos atendentes. Em instantes alguém irá te ajudar! 🙌';
    const sent = await waClient.sendText(contact.phoneE164, bridgeText);
    const waId = sent.messages[0]?.id;
    await prisma.message.create({
      data: {
        workspaceId,
        conversationId,
        contactId: contact.id,
        direction: MessageDirection.OUTBOUND,
        type: MessageType.TEXT,
        content: { text: bridgeText },
        status: MessageStatus.SENT,
        fromAi: false,
        ...(waId ? { whatsappMessageId: waId } : {}),
      },
    });
```

(Substitui o `sendText` simples atual; o catch existente continua cobrindo falha.)

- [ ] **Step 4: Gate dirigido + commit**

Run: `pnpm --filter @zapfy/worker typecheck && pnpm --filter @zapfy/worker lint`
Expected: verde.

```bash
git add apps/worker/src/jobs/process-message.ts
git commit -m "fix(worker): interativas respondidas, lastMessageAt da IA, ponte de handoff no inbox (quick wins 7-9)"
```

(Sem teste: worker sem harness — justificar no corpo do commit, padrão do audit.)

---

### Task 7: Quick wins restantes do web (2, 4, 5, 6, 11, 12, 13)

**Files:**
- Modify: `apps/web/src/app/onboarding/page.tsx:35`, `apps/web/src/app/onboarding/onboarding-form.tsx:55`, `apps/web/src/app/invite/[token]/page.tsx:46`
- Modify: `apps/web/src/app/(app)/forge/forge-wizard.tsx:93`
- Modify: `apps/web/src/app/(app)/forge/forge-workspace.tsx:235,333,577`
- Modify: `apps/web/src/app/(app)/billing/page.tsx:148-152`
- Modify: `apps/web/src/app/(app)/analytics/page.tsx:376`
- Modify: `apps/web/src/app/(app)/quotes/[id]/actions.ts:147-149`

- [ ] **Step 1: (#2) Branding Zapfy**

- `onboarding/page.tsx:35`: texto `Trato` → `Zapfy`.
- `onboarding-form.tsx:55`: prefixo de slug `Trato.dev/` → `zapfy.store/`.
- `invite/[token]/page.tsx:46`: `Trato` → `Zapfy`.
- Rodar `rg -n "Trato" apps/web/src --type tsx` e corrigir qualquer sobra user-facing
  (NÃO mexer em comentários de código nem no codinome interno do CLAUDE.md/vault).

- [ ] **Step 2: (#4) Wizard limita 80 chars no client**

`forge-wizard.tsx` input do passo 1 (linha ~93): adicionar `maxLength={80}` e hint
`<p className="text-xs text-muted-foreground">{brandName.length}/80</p>` quando
`brandName.length > 60`.

- [ ] **Step 3: (#5 e #6) Forge workspace**

- Linha ~577: trocar `Versão 1 ativa. Em breve conecte o WhatsApp pra começar a atender.`
  por JSX com link real:
  ```tsx
  Versão 1 ativa.{' '}
  <Link href="/whatsapp" className="text-primary underline-offset-4 hover:underline">
    Conecte o WhatsApp
  </Link>{' '}
  pra começar a atender.
  ```
  (importar `Link` de `next/link` se ausente).
- Linha ~235 (placeholder `isPublished`): manter coerente com a realidade atual
  (REFINEMENT não existe — TASK-0031): trocar por
  `'Agente publicado. Refinamento pós-publicação chega em breve — por ora, use o reset pra recomeçar.'`.
- EmptyState morto (linha ~333): remover o componente/branch inalcançável (sessão
  não-DISCOVERY com transcript vazio não existe no fluxo atual) e qualquer import
  órfão.

- [ ] **Step 4: (#11) Billing INCOMPLETE não mente o plano**

`billing/page.tsx` linhas 148-152: quando `status === 'INCOMPLETE' || status === 'TRIALING'`,
o header mostra:

```tsx
<h2 className="mt-1 text-2xl font-semibold tracking-tight">
  {noPlan ? 'Nenhum plano ativo' : PLAN_NAMES[plan]}
</h2>
<p className="mt-0.5 text-sm text-muted-foreground">
  {noPlan ? 'Escolha um plano abaixo pro agente atender no WhatsApp.' : PLAN_BLURBS[plan]}
</p>
```

com `const noPlan = status === 'INCOMPLETE' || status === 'TRIALING';` declarado
junto das demais derivações da página.

- [ ] **Step 5: (#12) Analytics e (#13) Quotes**

- `analytics/page.tsx:376`: trocar o parágrafo por
  `Os números desta página são atualizados a cada visita.` (remove a promessa "em breve"
  e a contradição com o header).
- `quotes/[id]/actions.ts` (~linha 147, junto das guardas existentes): adicionar
  ```ts
  if (parsed.data.status === 'EXPIRED' && q.status !== 'SENT') {
    return { status: 'error', error: 'Só orçamento enviado pode expirar' };
  }
  ```

- [ ] **Step 6: Gate dirigido + commit**

Run: `pnpm --filter @zapfy/web typecheck && pnpm --filter @zapfy/web lint`
Expected: verde.

```bash
git add apps/web/src
git commit -m "fix(web): branding Zapfy, limites do wizard, links/copy honestos, guarda EXPIRED (quick wins 2,4,5,6,11,12,13)"
```

---

### Task 8: E2E do card + gate final + PLAN.md

**Files:**
- Create: `apps/web/e2e/onboarding-card.spec.ts`
- Modify: `PLAN.md`

- [ ] **Step 1: E2E (usar os helpers existentes de `apps/web/e2e/helpers.ts`)**

Ler `helpers.ts` e `signup.spec.ts`/`forge.spec.ts` pra reusar o fluxo de
signup/login dos testes atuais. Espinha do teste:

```ts
import { test, expect } from '@playwright/test';
// reusar helper de signup/login existente (ver e2e/helpers.ts)

test('card de onboarding mostra o próximo passo e avança', async ({ page }) => {
  // 1. signup + onboarding (helper existente cria workspace novo)
  // 2. dashboard: card visível no passo 1
  await page.goto('/dashboard');
  await expect(page.getByText('Coloque sua IA pra atender')).toBeVisible();
  await expect(page.getByRole('link', { name: /Continuar/ })).toHaveAttribute('href', '/forge');

  // 3. minimizar persiste após reload
  await page.getByRole('button', { name: 'Minimizar checklist' }).click();
  await page.reload();
  await expect(page.getByText(/Continuar configuração \(0\/5\)/)).toBeVisible();
});
```

Ajustar à API real dos helpers (nomes/fixtures); se os specs atuais publicam agente
via fixture (forge.spec.ts), adicionar um segundo teste: após publicar, o CTA do card
aponta pra `/agent` (passo 2).

- [ ] **Step 2: Rodar o E2E**

Run: `pnpm --filter @zapfy/web exec playwright test e2e/onboarding-card.spec.ts`
Expected: PASS (requer Postgres/Redis local: `docker compose up -d`).
Se o harness E2E não rodar no ambiente (dep de serviços), registrar o motivo no
PLAN.md e validar manualmente via preview antes do commit.

- [ ] **Step 3: Gate completo**

Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
Expected: tudo verde (7/7, 7/7, 3 pacotes de teste, build 2/2).

- [ ] **Step 4: PLAN.md + commit final**

Adicionar bullet no topo de "Estado atual":

```markdown
- **Sub-projeto 2/4 "UX do cliente" CONCLUÍDO (data).** Card de onboarding com 5
  passos derivados (valor antes de pagar), simulador multi-turno marca o passo 2,
  guia embutido da Meta com validação + erros acionáveis, reenvio de código no
  verify-device, 13 quick wins do audit aplicados. Débito: capturar prints reais
  do painel da Meta pra `apps/web/public/guias/meta/passo-{1..4}.png` (slots já
  renderizam quando os arquivos existirem). Próximo: sub-projeto 3 (redesign do
  dashboard).
```

```bash
git add apps/web/e2e PLAN.md
git commit -m "test(web): e2e do card de onboarding + PLAN atualizado (sub-projeto 2 concluido)"
```

- [ ] **Step 5: Apresentar resumo ao usuário** (o que mudou, débito dos prints,
  lembrete de que commits são locais e o PR #1 segue aberto aguardando merge).
