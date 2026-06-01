# Forge Guiada — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o início da Forge em 4 passos guiados com botões (nome → tipo → estilo humano/bot → objetivo) que caem no chat conversacional existente, sem chamar IA nos passos.

**Architecture:** Wizard determinístico client-side (passos 1–4) grava as respostas via server action `saveForgeBasics` (sem LLM), seta `currentPhase=KNOWLEDGE` e semeia a 1ª mensagem do assistente. O `forge-workspace.tsx` renderiza o wizard enquanto a sessão está em DISCOVERY com transcript vazio; senão renderiza o chat atual (`runForgeStep`, intocado).

**Tech Stack:** Next.js 15 (App Router, React 19), TypeScript strict, Zod, Vitest (unit em `packages/ai`), Playwright (E2E em `apps/web/e2e`), Prisma 6.

**Spec:** `docs/superpowers/specs/2026-06-01-forge-guiada-design.md`

---

## File Structure

- `packages/ai/src/forge/types.ts` (modify) — adiciona `personaSchema` + campo `persona` no `forgeAnswersSchema`.
- `packages/ai/src/forge/verticals.ts` (create) — metadados de vertical (label, emoji, objetivos sugeridos) para os botões.
- `packages/ai/src/forge/basics.ts` (create) — função pura `buildForgeBasics` (input do wizard → patch de answers + mensagem de abertura). Testável sem DB/IA.
- `packages/ai/src/forge/prompts/meta-prompt.ts` (modify) — inclui `persona` no user message e a regra de identidade/disclosure no system.
- `packages/ai/src/forge/index.ts` (modify) — re-exporta `verticals` e `basics`.
- `packages/ai/tests/forge-guiada.test.ts` (create) — unit tests (persona no schema, verticals, basics, meta-prompt).
- `apps/web/src/app/(app)/forge/actions.ts` (modify) — server action `saveForgeBasics`.
- `apps/web/src/app/(app)/forge/forge-wizard.tsx` (create) — UI dos 4 passos.
- `apps/web/src/app/(app)/forge/forge-workspace.tsx` (modify) — orquestra wizard ↔ chat.
- `apps/web/e2e/forge.spec.ts` (modify) — E2E do wizard.

---

## Task 1: Campo `persona` no schema + dados de vertical

**Files:**
- Modify: `packages/ai/src/forge/types.ts`
- Create: `packages/ai/src/forge/verticals.ts`
- Modify: `packages/ai/src/forge/index.ts`
- Test: `packages/ai/tests/forge-guiada.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/ai/tests/forge-guiada.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { forgeAnswersSchema } from '../src/forge/types';
import { VERTICAL_LIST, VERTICAL_META } from '../src/forge/verticals';
import { VERTICAL_IDS } from '../src/forge/types';

describe('persona no forgeAnswersSchema', () => {
  it('aceita persona com style human + displayName opcional', () => {
    const parsed = forgeAnswersSchema.parse({
      persona: { style: 'human', displayName: 'Sofia' },
    });
    expect(parsed.persona?.style).toBe('human');
    expect(parsed.persona?.displayName).toBe('Sofia');
  });

  it('aceita persona assistant sem displayName', () => {
    const parsed = forgeAnswersSchema.parse({ persona: { style: 'assistant' } });
    expect(parsed.persona?.style).toBe('assistant');
  });
});

describe('VERTICAL_META', () => {
  it('cobre todos os verticais com label, emoji e sugestões', () => {
    for (const id of VERTICAL_IDS) {
      const meta = VERTICAL_META[id];
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.emoji.length).toBeGreaterThan(0);
      expect(meta.goalSuggestions.length).toBeGreaterThan(0);
    }
  });

  it('VERTICAL_LIST tem a mesma quantidade que VERTICAL_IDS', () => {
    expect(VERTICAL_LIST.length).toBe(VERTICAL_IDS.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @zapfy/ai test -- forge-guiada`
Expected: FAIL — `verticals` não existe e `persona` não está no schema.

- [ ] **Step 3: Add persona to the schema**

In `packages/ai/src/forge/types.ts`, add after `personalitySchema` (around line 37):

```ts
export const personaSchema = z.object({
  style: z.enum(['human', 'assistant']).default('human'),
  displayName: z.string().optional(),
});
export type Persona = z.infer<typeof personaSchema>;
```

Then add `persona` to `forgeAnswersSchema` (right after the `tone` line):

```ts
  persona: personaSchema.optional(),
```

- [ ] **Step 4: Create the verticals data module**

Create `packages/ai/src/forge/verticals.ts`:

```ts
import type { VerticalId } from './types';

export interface VerticalMeta {
  id: VerticalId;
  label: string;
  emoji: string;
  /** Objetivos sugeridos — viram os botões do passo 4 do wizard. */
  goalSuggestions: string[];
}

export const VERTICAL_META: Record<VerticalId, VerticalMeta> = {
  RESTAURANT: {
    id: 'RESTAURANT',
    label: 'Restaurante',
    emoji: '🍕',
    goalSuggestions: ['Mostrar o cardápio', 'Anotar pedido', 'Status da entrega', 'Reservar mesa'],
  },
  ECOMMERCE: {
    id: 'ECOMMERCE',
    label: 'Loja / e-commerce',
    emoji: '🛍️',
    goalSuggestions: ['Recomendar produto', 'Status do pedido', 'Política de troca', 'Enviar link de pagamento'],
  },
  CLINIC: {
    id: 'CLINIC',
    label: 'Clínica / agendamento',
    emoji: '🩺',
    goalSuggestions: ['Marcar consulta', 'Confirmar presença', 'Responder horários', 'Cancelar ou remarcar'],
  },
  INFOPRODUCT: {
    id: 'INFOPRODUCT',
    label: 'Curso / mentoria',
    emoji: '🎓',
    goalSuggestions: ['Qualificar lead', 'Tirar dúvida', 'Enviar página de vendas', 'Agendar call'],
  },
  SERVICE: {
    id: 'SERVICE',
    label: 'Serviço',
    emoji: '🔧',
    goalSuggestions: ['Coletar dados pra orçamento', 'Agendar visita', 'Enviar proposta', 'Dar retorno'],
  },
  OTHER: {
    id: 'OTHER',
    label: 'Outro',
    emoji: '💬',
    goalSuggestions: ['Responder dúvidas frequentes', 'Coletar dados do cliente', 'Passar pra um atendente'],
  },
};

export const VERTICAL_LIST: VerticalMeta[] = [
  VERTICAL_META.RESTAURANT,
  VERTICAL_META.ECOMMERCE,
  VERTICAL_META.CLINIC,
  VERTICAL_META.INFOPRODUCT,
  VERTICAL_META.SERVICE,
  VERTICAL_META.OTHER,
];
```

- [ ] **Step 5: Export verticals from the forge barrel**

In `packages/ai/src/forge/index.ts`, add after `export * from './generate';`:

```ts
export * from './verticals';
export * from './basics';
```

(`basics` is created in Task 3 — adding the export now is fine; Task 3 creates the file before tests run again. If running strictly in order, add `export * from './basics';` in Task 3 instead.)

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm --filter @zapfy/ai test -- forge-guiada`
Expected: the persona + VERTICAL_META tests PASS (basics tests come in Task 3).

- [ ] **Step 7: Commit**

```bash
git add packages/ai/src/forge/types.ts packages/ai/src/forge/verticals.ts packages/ai/src/forge/index.ts packages/ai/tests/forge-guiada.test.ts
git commit -m "feat(forge): campo persona + metadados de vertical pro wizard"
```

---

## Task 2: Meta-prompt consome `persona`

**Files:**
- Modify: `packages/ai/src/forge/prompts/meta-prompt.ts`
- Test: `packages/ai/tests/forge-guiada.test.ts` (append)

- [ ] **Step 1: Write the failing test**

Append to `packages/ai/tests/forge-guiada.test.ts`:

```ts
import { buildMetaPromptUserMessage, META_PROMPT_SYSTEM } from '../src/forge/prompts/meta-prompt';

describe('meta-prompt com persona', () => {
  it('inclui persona no user message', () => {
    const msg = buildMetaPromptUserMessage({
      business: { brandName: 'Bella Pizza' },
      persona: { style: 'human' },
    } as never);
    expect(msg).toContain('"persona"');
    expect(msg).toContain('"human"');
  });

  it('META_PROMPT_SYSTEM tem a regra de disclosure honesto', () => {
    expect(META_PROMPT_SYSTEM).toContain('persona');
    expect(META_PROMPT_SYSTEM.toLowerCase()).toContain('admita');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @zapfy/ai test -- forge-guiada`
Expected: FAIL — persona não está no user message nem no system.

- [ ] **Step 3: Add persona to the user message**

In `packages/ai/src/forge/prompts/meta-prompt.ts`, inside `buildMetaPromptUserMessage`, add to the `cleaned` object (after the `vertical` line):

```ts
    persona: answers.persona ?? { style: 'human' },
```

- [ ] **Step 4: Add the identity/persona rule to the system prompt**

In `META_PROMPT_SYSTEM`, replace the `# Identidade` block (lines ~16-20) with:

```ts
# Identidade
- Nome do agente
- Empresa que ele representa (descrição em 1 frase)
- Canal (WhatsApp Business — sempre)
- Função primária (vender, agendar, qualificar, etc.)
- Estilo de presença (campo persona): se persona.style = "human", dê ao agente um nome próprio brasileiro amigável (use persona.displayName se vier; senão escolha um) e um tom de pessoa real e calorosa — porém com a REGRA: se o cliente perguntar DIRETO se é um robô ou atendimento automático, admita com leveza e naturalidade, sem insistir no assunto nem mentir. Se persona.style = "assistant", o agente se apresenta abertamente como assistente virtual da empresa.
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @zapfy/ai test -- forge-guiada`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/ai/src/forge/prompts/meta-prompt.ts packages/ai/tests/forge-guiada.test.ts
git commit -m "feat(forge): meta-prompt aplica persona (humano honesto vs assistente)"
```

---

## Task 3: Função pura `buildForgeBasics`

**Files:**
- Create: `packages/ai/src/forge/basics.ts`
- Test: `packages/ai/tests/forge-guiada.test.ts` (append)

- [ ] **Step 1: Write the failing test**

Append to `packages/ai/tests/forge-guiada.test.ts`:

```ts
import { buildForgeBasics } from '../src/forge/basics';

describe('buildForgeBasics', () => {
  it('monta o patch de answers e a mensagem de abertura', () => {
    const r = buildForgeBasics({
      brandName: 'Bella Pizza',
      vertical: 'RESTAURANT',
      personaStyle: 'human',
      goals: ['Mostrar o cardápio', 'Anotar pedido'],
    });
    expect(r.answers.business?.brandName).toBe('Bella Pizza');
    expect(r.answers.vertical).toBe('RESTAURANT');
    expect(r.answers.persona?.style).toBe('human');
    expect(r.answers.goals).toEqual(['Mostrar o cardápio', 'Anotar pedido']);
    expect(r.openingMessage).toContain('Bella Pizza');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @zapfy/ai test -- forge-guiada`
Expected: FAIL — `basics` não existe.

- [ ] **Step 3: Create the pure function**

Create `packages/ai/src/forge/basics.ts`:

```ts
import type { ForgeAnswers, VerticalId } from './types';
import { VERTICAL_META } from './verticals';

export interface ForgeBasicsInput {
  brandName: string;
  vertical: VerticalId;
  personaStyle: 'human' | 'assistant';
  goals: string[];
}

export interface ForgeBasicsResult {
  /** Patch raso pra mesclar no ForgeAnswers da sessão. */
  answers: Partial<ForgeAnswers>;
  /** 1ª mensagem do assistente, semeada no transcript (sem chamar IA). */
  openingMessage: string;
}

/**
 * Converte as respostas dos 4 passos guiados num patch de answers + a mensagem
 * de abertura do chat. PURA — sem IO, sem IA. A descrição do negócio é
 * sintetizada de nome + tipo (o passo guiado não pede uma frase descritiva).
 */
export function buildForgeBasics(input: ForgeBasicsInput): ForgeBasicsResult {
  const label = VERTICAL_META[input.vertical].label;
  const answers: Partial<ForgeAnswers> = {
    business: { brandName: input.brandName, description: `${input.brandName} — ${label}` },
    vertical: input.vertical,
    persona: { style: input.personaStyle },
    goals: input.goals,
  };
  const openingMessage =
    `Boa, ${input.brandName}! Já anotei o básico. ` +
    `Agora, pra ela responder direito: me manda o que ela precisa saber — ` +
    `cardápio, FAQ, política de troca, horários… pode colar o texto ou mandar um link. ` +
    `Se não tiver nada agora, é só dizer "não tenho" que a gente segue.`;
  return { answers, openingMessage };
}
```

- [ ] **Step 4: Ensure it's exported**

Confirm `packages/ai/src/forge/index.ts` has `export * from './basics';` (added in Task 1, Step 5). If running tasks strictly in order and it isn't there yet, add it now.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @zapfy/ai test -- forge-guiada`
Expected: PASS (all forge-guiada tests green).

- [ ] **Step 6: Commit**

```bash
git add packages/ai/src/forge/basics.ts packages/ai/src/forge/index.ts packages/ai/tests/forge-guiada.test.ts
git commit -m "feat(forge): buildForgeBasics — respostas do wizard viram answers + abertura"
```

---

## Task 4: Server action `saveForgeBasics`

**Files:**
- Modify: `apps/web/src/app/(app)/forge/actions.ts`

> Glue de IO (auth + DB) — verificado por typecheck + pelo E2E da Task 7, não por unit test.

- [ ] **Step 1: Add imports**

In `apps/web/src/app/(app)/forge/actions.ts`, add `randomUUID`:

```ts
import { randomUUID } from 'node:crypto';
```

And extend the `@zapfy/ai` import to include `VERTICAL_IDS` and `buildForgeBasics`:

```ts
import {
  forgeAnswersSchema,
  forgeMessageSchema,
  runForgeStep,
  buildForgeBasics,
  VERTICAL_IDS,
  type ForgePhaseId,
  type ForgeState,
  type ForgeAnswers,
  type ForgeMessage,
} from '@zapfy/ai';
```

- [ ] **Step 2: Add the action**

Append to `apps/web/src/app/(app)/forge/actions.ts` (before the `// helpers` section):

```ts
const saveBasicsInput = z.object({
  sessionId: z.string(),
  brandName: z.string().trim().min(1).max(80),
  vertical: z.enum(VERTICAL_IDS),
  personaStyle: z.enum(['human', 'assistant']),
  goals: z.array(z.string().trim().min(1)).min(1).max(8),
});

/**
 * Grava os 4 passos guiados (wizard) SEM chamar IA: monta o patch de answers,
 * semeia a 1ª mensagem do assistente e move a sessão pra KNOWLEDGE (onde o chat
 * conversacional assume).
 */
export async function saveForgeBasics(
  raw: z.infer<typeof saveBasicsInput>,
): Promise<SendMessageResult> {
  const parsed = saveBasicsInput.safeParse(raw);
  if (!parsed.success) {
    return { status: 'error', error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }
  const { workspace } = await requireSessionAndWorkspace();

  const sessionRow = await prisma.forgeSession.findFirst({
    where: { id: parsed.data.sessionId, workspaceId: workspace.id },
  });
  if (!sessionRow) {
    return { status: 'error', error: 'Sessão não encontrada nesse workspace.' };
  }
  if (sessionRow.status !== ForgeStatus.IN_PROGRESS) {
    return { status: 'error', error: 'Sessão já encerrada.' };
  }

  const state = hydrateState(sessionRow);
  const { answers: patch, openingMessage } = buildForgeBasics({
    brandName: parsed.data.brandName,
    vertical: parsed.data.vertical,
    personaStyle: parsed.data.personaStyle,
    goals: parsed.data.goals,
  });

  const mergedAnswers: ForgeAnswers = {
    ...state.answers,
    ...patch,
    business: { ...state.answers.business, ...patch.business },
  };

  const assistantMsg: ForgeMessage = {
    id: randomUUID(),
    role: 'assistant',
    content: openingMessage,
    createdAt: new Date().toISOString(),
  };
  const newTranscript = [...state.transcript, assistantMsg];

  await prisma.forgeSession.update({
    where: { id: sessionRow.id },
    data: {
      collectedAnswers: mergedAnswers as unknown as Prisma.InputJsonValue,
      transcript: newTranscript as unknown as Prisma.InputJsonValue,
      currentPhase: DbForgePhase.KNOWLEDGE,
    },
  });

  revalidatePath('/dashboard');

  const newState: ForgeState = {
    sessionId: state.sessionId,
    workspaceId: state.workspaceId,
    currentPhase: 'KNOWLEDGE',
    answers: mergedAnswers,
    transcript: newTranscript,
  };

  return {
    status: 'ok',
    state: newState,
    assistantMessage: openingMessage,
    toolCallsExecuted: [],
    phaseChanged: true,
  };
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @zapfy/web typecheck`
Expected: PASS (no type errors).

- [ ] **Step 4: Commit**

```bash
git add "apps/web/src/app/(app)/forge/actions.ts"
git commit -m "feat(forge): server action saveForgeBasics (wizard sem IA)"
```

---

## Task 5: Componente `ForgeWizard`

**Files:**
- Create: `apps/web/src/app/(app)/forge/forge-wizard.tsx`

> UI — verificada por lint/typecheck + E2E (Task 7).

- [ ] **Step 1: Create the component**

Create `apps/web/src/app/(app)/forge/forge-wizard.tsx`:

```tsx
'use client';

import { useState, useTransition } from 'react';
import { ArrowRight, Check, Loader2, Sparkles } from 'lucide-react';
import { Button, cn } from '@zapfy/ui';
import { VERTICAL_LIST, VERTICAL_META } from '@zapfy/ai/forge';
import type { ForgeState } from '@zapfy/ai/forge/types';
import type { VerticalId } from '@zapfy/ai/forge/types';

import { saveForgeBasics } from './actions';

type PersonaStyle = 'human' | 'assistant';

interface Props {
  sessionId: string;
  onComplete: (state: ForgeState) => void;
}

const TOTAL_STEPS = 4;

export function ForgeWizard({ sessionId, onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [brandName, setBrandName] = useState('');
  const [vertical, setVertical] = useState<VerticalId | null>(null);
  const [personaStyle, setPersonaStyle] = useState<PersonaStyle | null>(null);
  const [goals, setGoals] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  const goalOptions = vertical ? VERTICAL_META[vertical].goalSuggestions : [];

  function toggleGoal(g: string) {
    setGoals((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  function finish() {
    if (!vertical || !personaStyle || goals.length === 0) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await saveForgeBasics({
          sessionId,
          brandName: brandName.trim(),
          vertical,
          personaStyle,
          goals,
        });
        if (result.status === 'error') {
          setError(result.error);
          return;
        }
        onComplete(result.state);
      } catch {
        setError('Falha ao salvar. Tenta de novo.');
      }
    });
  }

  return (
    <div className="flex h-[calc(100vh-3.75rem)] flex-col lg:h-screen">
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 py-10">
        {/* Progresso */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Forge · passo {step} de {TOTAL_STEPS}
          </div>
          <div className="mt-3 h-1 rounded-full bg-secondary">
            <div
              className="h-1 rounded-full bg-primary transition-all"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Passo 1: nome */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-medium tracking-tight md:text-3xl">
              Como chama o seu negócio?
            </h2>
            <p className="mt-2 text-muted-foreground">É o nome que aparece pro seu cliente.</p>
            <input
              autoFocus
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && brandName.trim()) setStep(2);
              }}
              placeholder="Ex: Bella Pizza"
              className="mt-6 w-full rounded-xl border border-border/60 bg-card/40 px-4 py-3 text-lg focus:border-primary/60 focus:outline-none"
            />
            <Button
              type="button"
              onClick={() => setStep(2)}
              disabled={!brandName.trim()}
              className="mt-6 gap-2"
            >
              Próximo <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Passo 2: tipo de negócio (auto-avança) */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-medium tracking-tight md:text-3xl">
              Que tipo de negócio é?
            </h2>
            <p className="mt-2 text-muted-foreground">Escolho um modelo pronto pra você.</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {VERTICAL_LIST.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    setVertical(v.id);
                    setGoals([]);
                    setStep(3);
                  }}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border px-4 py-4 text-left transition-colors',
                    vertical === v.id
                      ? 'border-primary/60 bg-primary/5'
                      : 'border-border/60 bg-card/40 hover:border-primary/40',
                  )}
                >
                  <span className="text-2xl">{v.emoji}</span>
                  <span className="text-sm font-medium">{v.label}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="mt-6 text-sm text-muted-foreground hover:text-foreground"
            >
              ‹ Voltar
            </button>
          </div>
        )}

        {/* Passo 3: estilo de atendimento (auto-avança) */}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-medium tracking-tight md:text-3xl">
              Como ela deve atender?
            </h2>
            <p className="mt-2 text-muted-foreground">Dá pra mudar depois.</p>
            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={() => {
                  setPersonaStyle('human');
                  setStep(4);
                }}
                className="flex w-full items-start gap-3 rounded-xl border border-border/60 bg-card/40 px-4 py-4 text-left transition-colors hover:border-primary/40"
              >
                <span className="text-2xl">🧑</span>
                <span>
                  <span className="block text-sm font-medium">Como uma pessoa real</span>
                  <span className="block text-sm text-muted-foreground">
                    Calorosa, com nome próprio. Se perguntarem direto se é um robô, ela admite com leveza.
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPersonaStyle('assistant');
                  setStep(4);
                }}
                className="flex w-full items-start gap-3 rounded-xl border border-border/60 bg-card/40 px-4 py-4 text-left transition-colors hover:border-primary/40"
              >
                <span className="text-2xl">🤖</span>
                <span>
                  <span className="block text-sm font-medium">Assistente virtual</span>
                  <span className="block text-sm text-muted-foreground">
                    Se apresenta como atendimento automático da empresa, direto ao ponto.
                  </span>
                </span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="mt-6 text-sm text-muted-foreground hover:text-foreground"
            >
              ‹ Voltar
            </button>
          </div>
        )}

        {/* Passo 4: objetivos (multi-escolha) */}
        {step === 4 && (
          <div>
            <h2 className="text-2xl font-medium tracking-tight md:text-3xl">
              O que ela deve resolver sozinha?
            </h2>
            <p className="mt-2 text-muted-foreground">Escolha uma ou mais.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {goalOptions.map((g) => {
                const active = goals.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleGoal(g)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
                      active
                        ? 'border-primary/60 bg-primary/10 text-foreground'
                        : 'border-border/60 bg-card/40 text-muted-foreground hover:border-primary/40',
                    )}
                  >
                    {active && <Check className="h-3.5 w-3.5 text-primary" />}
                    {g}
                  </button>
                );
              })}
            </div>
            <Button
              type="button"
              onClick={finish}
              disabled={goals.length === 0 || busy}
              className="mt-8 gap-2"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Concluir e montar
            </Button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="mt-6 ml-4 text-sm text-muted-foreground hover:text-foreground"
            >
              ‹ Voltar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Lint + typecheck**

Run: `pnpm --filter @zapfy/web lint && pnpm --filter @zapfy/web typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/src/app/(app)/forge/forge-wizard.tsx"
git commit -m "feat(forge): componente ForgeWizard (4 passos guiados)"
```

---

## Task 6: Orquestrar wizard ↔ chat no ForgeWorkspace

**Files:**
- Modify: `apps/web/src/app/(app)/forge/forge-workspace.tsx`

- [ ] **Step 1: Import the wizard**

In `apps/web/src/app/(app)/forge/forge-workspace.tsx`, add after the `AudioRecorder` import:

```tsx
import { ForgeWizard } from './forge-wizard';
```

- [ ] **Step 2: Render the wizard when the session is brand-new**

In `ForgeWorkspace`, add this right BEFORE the main `return (` (and AFTER all hooks — i.e., after `const isPublished = ...`):

```tsx
  // Sessão novinha (nada coletado ainda) → wizard guiado. Assim que ele grava
  // o básico (phase=KNOWLEDGE + 1ª msg semeada), cai no chat. Sessões já em
  // andamento (transcript não-vazio) seguem direto no chat — backward compat.
  const showWizard = state.currentPhase === 'DISCOVERY' && state.transcript.length === 0;
  if (showWizard) {
    return <ForgeWizard sessionId={state.sessionId} onComplete={setState} />;
  }
```

- [ ] **Step 3: Lint + typecheck**

Run: `pnpm --filter @zapfy/web lint && pnpm --filter @zapfy/web typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add "apps/web/src/app/(app)/forge/forge-workspace.tsx"
git commit -m "feat(forge): ForgeWorkspace renderiza wizard em sessão nova, senão chat"
```

---

## Task 7: E2E do wizard

**Files:**
- Modify: `apps/web/e2e/forge.spec.ts`

- [ ] **Step 1: Add the E2E test**

In `apps/web/e2e/forge.spec.ts`, add a new test inside `test.describe('forge', ...)`:

```ts
  test('forge guiada: wizard de 4 passos cai no chat com mensagem semeada', async ({ page }) => {
    await signupNewUser(page);
    await page.goto('/forge');

    // Passo 1: nome
    await page.getByPlaceholder(/Bella Pizza|nome/i).first().fill('Bella Pizza');
    await page.getByRole('button', { name: /próximo/i }).click();

    // Passo 2: tipo (auto-avança ao clicar)
    await page.getByRole('button', { name: /restaurante/i }).click();

    // Passo 3: estilo (auto-avança ao clicar)
    await page.getByRole('button', { name: /como uma pessoa real/i }).click();

    // Passo 4: objetivos + concluir
    await page.getByRole('button', { name: /mostrar o cardápio/i }).click();
    await page.getByRole('button', { name: /concluir e montar/i }).click();

    // Caiu no chat: a mensagem de abertura semeada menciona o nome do negócio.
    await expect(page.getByText(/Bella Pizza/).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/me manda o que ela precisa saber|cardápio/i).first()).toBeVisible();
  });
```

- [ ] **Step 2: Run only this E2E test**

Run: `cd apps/web && pnpm exec playwright test -g "wizard de 4 passos" --reporter=list`
Expected: PASS (1 passed). O wizard não chama IA, então é determinístico.

- [ ] **Step 3: Clean up the test data** (banco aponta pro Neon principal)

Criar `scripts/e2e-cleanup.ts` (temporário) com:

```ts
import 'dotenv/config';
import { prisma, WorkspaceRole } from '../packages/db/src/index';

async function main() {
  const users = await prisma.user.findMany({
    where: { email: { endsWith: '@trato-test.dev' } },
    select: { id: true },
  });
  if (users.length === 0) return console.info('Nada a apagar.');
  const ids = users.map((u) => u.id);
  const ms = await prisma.workspaceMember.findMany({
    where: { userId: { in: ids }, role: WorkspaceRole.OWNER },
    select: { workspaceId: true },
  });
  const wsIds = [...new Set(ms.map((m) => m.workspaceId))];
  if (wsIds.length) await prisma.workspace.deleteMany({ where: { id: { in: wsIds } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  console.info(`Apagados ${users.length} users + ${wsIds.length} workspaces de teste.`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
```

Run (do root): `pnpm tsx scripts/e2e-cleanup.ts` → depois `rm scripts/e2e-cleanup.ts`.

- [ ] **Step 4: Commit**

```bash
git add "apps/web/e2e/forge.spec.ts"
git commit -m "test(forge): E2E do wizard guiado de 4 passos"
```

---

## Task 8: Gate verde final + PLAN.md

- [ ] **Step 1: Run the full gate**

Run (do root): `pnpm lint && pnpm typecheck && pnpm test`
Expected: tudo verde (typecheck 7/7, lint limpo, testes — agora incluindo `forge-guiada.test.ts`).

- [ ] **Step 2: Update PLAN.md**

Em `PLAN.md`, no Histórico, adicionar entrada `2026-06-XX` registrando: Forge guiada (wizard híbrido) implementada — 4 passos determinísticos + persona humano/assistente no meta-prompt + E2E. Marcar a "Próxima ação" pro próximo sub-projeto (cardápio+fotos / tutorial / paywall).

- [ ] **Step 3: Commit**

```bash
git add PLAN.md
git commit -m "docs(plan): Forge guiada implementada"
```

---

## Self-Review

**Spec coverage:**
- Layout híbrido (wizard → chat) → Tasks 5, 6 ✓
- Persona humano-honesto vs assistente → Tasks 1, 2 ✓
- Arquitetura wizard-sem-IA + chat → Tasks 3, 4 ✓
- Fluxo 4 passos (nome/tipo/estilo/objetivo) adaptativo → Tasks 1 (dados), 5 (UI) ✓
- Campo `persona` no schema → Task 1 ✓
- `verticals.ts` fonte única de objetivos → Task 1 ✓
- Mensagem semeada + phase=KNOWLEDGE → Tasks 3, 4 ✓
- Retomada via currentPhase → Task 6 (regra `showWizard`) ✓
- Testes unit + E2E → Tasks 1-3 (unit), 7 (E2E) ✓
- Fora de escopo (foto, tutorial, paywall, streaming) → não há tasks, correto ✓

**Type consistency:** `ForgeBasicsInput`/`ForgeBasicsResult` (Task 3) batem com a chamada em `saveForgeBasics` (Task 4); `personaSchema.style` ('human'|'assistant') consistente em Tasks 1, 3, 4, 5; `VerticalId`/`VERTICAL_META`/`VERTICAL_LIST` consistentes em Tasks 1, 3, 5; `saveForgeBasics` retorna `SendMessageResult` (tipo já existente, reusado).

**Notas:** A fase GOALS do chat fica inalcançável no fluxo guiado (o wizard pula direto pra KNOWLEDGE) — isso é esperado; o prompt da GOALS continua pro caminho de template/legado. Débito conhecido (não bloqueia): Forge ignora `MOCK_AI`.
