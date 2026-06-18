# Redesign da Landing (nível máximo) — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL na execução: `frontend-design` (craft de
> alto nível, anti-genérico) + verificação no preview real (preview_* tools). Steps
> usam checkboxes (`- [ ]`).

**Goal:** Reconstruir a home de marketing como peça de marca distintiva que lidera pelo
moat (a IA que monta a IA), honesta (sem depoimento/métrica fake), tokenizada (verde),
dark-first preservado, mobile-first, AA — com `page.tsx` como composição de seções.

**Architecture:** Infra de dark-first (`.theme-dark` no design system + wrapper no
layout de marketing) → hook de revelação on-scroll → 8 componentes de seção em
`components/marketing/sections/` → `page.tsx` enxuta. Spec:
`docs/superpowers/specs/2026-06-18-redesign-landing-design.md`.

**Tech Stack:** Next.js 15 RSC + client islands (motion), Tailwind v4 tokens, Geist +
Instrument Serif italic, lucide-react, Playwright, preview_* para verificação visual.

**Regras transversais:** commits locais na master, sem push. Gate
(`pnpm --filter @zapfy/web typecheck && lint`) verde por tarefa; build + preview na
verificação. Zero schema. Reusar `header`/`footer`/`announcement-bar`/`MarketingFaq`/
`ForgeDemo` — não recriar. Preservar `metadata`/JSON-LD do `(marketing)/layout.tsx`.
**Honestidade:** nenhum número/claim sem lastro; só fatos do produto.

---

### Task 1: Infra dark-first + hook de movimento

**Files:**
- Modify: `packages/ui/src/styles.css` (utility `.theme-dark`)
- Modify: `apps/web/src/app/(marketing)/layout.tsx` (aplicar `.theme-dark`)
- Create: `apps/web/src/components/marketing/use-reveal.ts`

- [ ] **Step 1: `.theme-dark` que re-declara os tokens dark** (em `@layer base`, junto do `.light`):

```css
  /* Força tema escuro num subtree (marketing é dark-first, ignora o toggle do app). */
  .theme-dark {
    --color-background: hsl(0 0% 4%);
    --color-foreground: hsl(0 0% 98%);
    --color-card: hsl(0 0% 7%);
    --color-card-foreground: hsl(0 0% 98%);
    --color-popover: hsl(0 0% 5%);
    --color-popover-foreground: hsl(0 0% 98%);
    --color-primary: hsl(151 100% 45%);
    --color-primary-foreground: hsl(0 0% 4%);
    --color-secondary: hsl(0 0% 10%);
    --color-secondary-foreground: hsl(0 0% 98%);
    --color-muted: hsl(0 0% 10%);
    --color-muted-foreground: hsl(0 0% 53%);
    --color-accent: hsl(151 100% 10%);
    --color-accent-foreground: hsl(151 100% 75%);
    --color-destructive: hsl(0 84% 60%);
    --color-warning: hsl(43 96% 58%);
    --color-border: hsl(0 0% 10%);
    --color-input: hsl(0 0% 10%);
    --color-ring: hsl(151 100% 45%);
  }
```

- [ ] **Step 2: Aplicar no layout de marketing**

Em `(marketing)/layout.tsx`, no wrapper raiz: trocar `bg-[#0a0a0a]` por
`theme-dark bg-background text-foreground`. Conferir que `metadata`/`<Script>` JSON-LD
seguem intactos.

- [ ] **Step 3: Hook de revelação on-scroll** (`use-reveal.ts`):

```ts
'use client';

import { useEffect, useRef, useState } from 'react';

/** Revela um elemento quando entra na viewport (uma vez). Respeita reduced-motion. */
export function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, shown };
}
```

- [ ] **Step 4: Gate + commit**

Run: `pnpm --filter @zapfy/web typecheck && pnpm --filter @zapfy/web lint`

```bash
git add packages/ui/src/styles.css "apps/web/src/app/(marketing)/layout.tsx" apps/web/src/components/marketing/use-reveal.ts
git commit -m "feat(web): infra dark-first da landing (.theme-dark) + hook de revelacao on-scroll"
```

---

### Task 2: Hero (centerpiece) — `sections/hero.tsx`

**Files:**
- Create: `apps/web/src/components/marketing/sections/hero.tsx`
- Read antes: `apps/web/src/app/(marketing)/page.tsx:48-113` (hero atual, mídia/vídeo)

**REQUIRED:** usar a skill `frontend-design` pra esta seção (é o rosto do produto).

- [ ] **Step 1: Construir o hero** seguindo o sistema da spec:
  - Badge: "Forge · monta seu agente conversando" (pill, `border-primary/40 bg-primary/[0.06] text-primary`, com dot pulsante).
  - h1: **"A IA que `<em class="font-serif italic text-primary not-italic">`monta a IA`</em>` que atende no seu WhatsApp."** — `text-[clamp(2.75rem,8vw,5.5rem)] font-semibold tracking-[-0.03em] leading-[0.98] text-foreground`. (O trecho "monta a IA" em Instrument Serif italic verde.)
  - Subhead: "Você conversa com o Forge, ele entrevista seu negócio e gera o agente inteiro — tom, fluxos, agenda. Em minutos, no ar." (`text-lg text-muted-foreground max-w-xl`).
  - CTAs: primary "Montar meu agente grátis →" (`bg-primary text-primary-foreground rounded-full`, `href="/signup"`); secondary "Ver o Forge ao vivo" (`border-border bg-card`, `href="#forge"`).
  - Microcopy: "Sem cartão pra montar · Cloud API oficial da Meta" (`text-xs text-muted-foreground`).
  - Mídia: reusar o `<video>` real (`/videos/prompt1.mp4`) do hero atual, porém maior e melhor integrado (moldura `border-border rounded-2xl`, `max-w-2xl`), com vinheta tokenizada.
  - Ambiente atrás: glow verde sutil tokenizado (`bg-cosmic-glow` já existe em `@zapfy/ui` — usa `--color-primary`) + dot-grid (`bg-dot-grid`); **sem purple-pink, sem mockup flutuante falso**.
  - Entrada com `animate-fade-up` + stagger (`style={{ animationDelay }}`); respeita reduced-motion (já global).
- [ ] **Step 2: Verificar no preview** (preview_start → screenshot desktop + mobile; checar tipografia, contraste verde/near-black, espaçamento, vídeo). Iterar até o craft bater com a spec.
- [ ] **Step 3: Gate + commit**

```bash
git add apps/web/src/components/marketing/sections/hero.tsx
git commit -m "feat(web): hero da landing liderando pelo moat (a IA que monta a IA)"
```

---

### Task 3: "A virada" + "Como o Forge monta" — `sections/problem.tsx`, `sections/how-it-works.tsx`

**Files:**
- Create: `apps/web/src/components/marketing/sections/problem.tsx`
- Create: `apps/web/src/components/marketing/sections/how-it-works.tsx`
- Read antes: `page.tsx:178-235` (Problem) e `:237-348` (HowItWorks + STEPS data)

- [ ] **Step 1: `problem.tsx`** — editorial assimétrico, `max-w-3xl`, 1 número grande
  (sem estatística inventada; enquadramento qualitativo da dor de responder no WhatsApp
  na mão). Tokenizar. h2 com 1 acento Instrument Serif italic.
- [ ] **Step 2: `how-it-works.tsx`** — reusar a estrutura dos 3 STEPS (você conversa →
  ele monta → ele atende) com os ghost-numbers grandes (`text-primary/[0.06]`),
  realçando a recursão "a IA que monta a IA". Reusar a data `STEPS` (copiar pro
  componente). `useReveal` pra stagger on-scroll. Tokenizar.
- [ ] **Step 3: Preview** (as duas seções no fluxo; mobile). Iterar.
- [ ] **Step 4: Gate + commit**

```bash
git add apps/web/src/components/marketing/sections/problem.tsx apps/web/src/components/marketing/sections/how-it-works.tsx
git commit -m "feat(web): secoes 'a virada' + 'como o Forge monta' (editorial + recursao)"
```

---

### Task 4: "O que o agente faz" (bento) + "Por vertical" — `sections/capabilities.tsx`, `sections/segments.tsx`

**Files:**
- Create: `apps/web/src/components/marketing/sections/capabilities.tsx`
- Create: `apps/web/src/components/marketing/sections/segments.tsx`
- Read antes: `page.tsx:307-404` (FEATURES + SEGMENTS data)

- [ ] **Step 1: `capabilities.tsx`** — bento ousado (grid assimétrico) das capacidades
  REAIS: atende 24/7, vende/recomenda, agenda, usa a base de conhecimento (RAG), faz
  handoff pro humano. Reusar a data `FEATURES` (honesty-check: remover qualquer claim
  sem lastro). Um tile maior dominante. Tokenizar; verde pontual; hover micro-interação.
- [ ] **Step 2: `segments.tsx`** — restaurante / clínica / loja / serviços, cada um com
  1 frase do que o agente resolve. Reusar `SEGMENTS`. Tokenizar.
- [ ] **Step 3: Preview + iterar. Gate + commit**

```bash
git add apps/web/src/components/marketing/sections/capabilities.tsx apps/web/src/components/marketing/sections/segments.tsx
git commit -m "feat(web): secoes de capacidades (bento) + verticais"
```

---

### Task 5: Prova honesta + planos + CTA final — `sections/product-proof.tsx`, `sections/pricing-teaser.tsx`, `sections/final-cta.tsx`

**Files:**
- Create: `apps/web/src/components/marketing/sections/product-proof.tsx`
- Create: `apps/web/src/components/marketing/sections/pricing-teaser.tsx`
- Create: `apps/web/src/components/marketing/sections/final-cta.tsx`
- Read antes: `page.tsx:548-582` (FinalCta atual)

- [ ] **Step 1: `product-proof.tsx`** (substitui os depoimentos fake) — 4 cards de prova
  REAL: "Cloud API oficial da Meta" · "LGPD-friendly" · "Garantia de 7 dias —
  reembolso" · "Monte de graça no Forge antes de assinar". Header honesto: "Seja um dos
  primeiros a ligar o agente." Sem nome/métrica inventada. Tokenizar; ícones lucide.
- [ ] **Step 2: `pricing-teaser.tsx`** — 3 planos REAIS espelhados de `/precos`:
  STARTER R$97 · PRO R$247 · BUSINESS R$597 (1.500 / 6.000 / ∞ conversas de IA),
  glanceável, com link "ver todos os planos →" (`/precos`). PRO destacado. Tokenizar.
- [ ] **Step 3: `final-cta.tsx`** — foco único forte: "Monte seu agente agora", 1 CTA
  primary (`/signup`), microcopy "Sem cartão pra montar · Garantia de 7 dias". Glow
  tokenizado.
- [ ] **Step 4: Preview + iterar. Gate + commit**

```bash
git add apps/web/src/components/marketing/sections/product-proof.tsx apps/web/src/components/marketing/sections/pricing-teaser.tsx apps/web/src/components/marketing/sections/final-cta.tsx
git commit -m "feat(web): prova de produto honesta (sem depoimento fake) + planos + CTA final"
```

---

### Task 6: Composição `page.tsx` + remover monólito/fakes + tokenizar resto

**Files:**
- Modify (rewrite): `apps/web/src/app/(marketing)/page.tsx`

- [ ] **Step 1: Reescrever `page.tsx`** como composição:

```tsx
import { Hero } from '@/components/marketing/sections/hero';
import { Problem } from '@/components/marketing/sections/problem';
import { HowItWorks } from '@/components/marketing/sections/how-it-works';
import { Capabilities } from '@/components/marketing/sections/capabilities';
import { Segments } from '@/components/marketing/sections/segments';
import { ForgeDemo } from '@/components/marketing/forge-demo';
import { ProductProof } from '@/components/marketing/sections/product-proof';
import { PricingTeaser } from '@/components/marketing/sections/pricing-teaser';
import { MarketingFaq } from '@/components/marketing/faq';
import { FinalCta } from '@/components/marketing/sections/final-cta';

export default function HomePage() {
  return (
    <>
      <Hero />
      <Problem />
      <HowItWorks />
      <Capabilities />
      <Segments />
      <div id="forge">
        <ForgeDemo />
      </div>
      <ProductProof />
      <PricingTeaser />
      <MarketingFaq />
      <FinalCta />
    </>
  );
}
```

(Conferir a ordem real dos imports/anchors; manter `BrandFilmSection` se fizer sentido
no fluxo — decidir no preview. NÃO manter `TESTIMONIALS`/`Testimonials`/`BackgroundDecor`
monolítico: o ambiente vai no Hero.)

- [ ] **Step 2: Garantir que `TESTIMONIALS` e qualquer claim fake sumiram** —
  `rg -n "Ana Lima|340%|70% das|TESTIMONIALS|Dr. Carlos" apps/web/src/app/(marketing)` deve
  retornar vazio.

- [ ] **Step 3: Gate + commit**

Run: `pnpm --filter @zapfy/web typecheck && pnpm --filter @zapfy/web lint`

```bash
git add "apps/web/src/app/(marketing)/page.tsx"
git commit -m "feat(web): landing como composicao de secoes; remove monolito + depoimentos fake"
```

---

### Task 7: E2E + gate final + verificação visual + PLAN.md

**Files:**
- Create: `apps/web/e2e/landing.spec.ts`
- Modify: `PLAN.md`

- [ ] **Step 1: E2E (reusar helpers existentes)** — espinha:

```ts
import { test, expect } from '@playwright/test';

test('landing lidera pelo moat e nao tem depoimento fake', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('monta a IA');
  await expect(page.getByRole('link', { name: /Montar meu agente/i }).first()).toHaveAttribute('href', '/signup');
  await expect(page.getByText('Ana Lima')).toHaveCount(0);
  await expect(page.getByText('+340%')).toHaveCount(0);
});
```

- [ ] **Step 2: Verificação visual no preview** — preview_start; screenshot da home em
  desktop e mobile (preview_resize); checar: hero legível, verde tokenizado consistente,
  dark-first (forçar tema light no app e confirmar que a landing segue escura), sem
  purple-pink, espaçamento/ritmo, motion suave. Iterar até o acabamento bater.
- [ ] **Step 3: Gate completo**

Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
Expected: tudo verde + E2E da landing.

- [ ] **Step 4: PLAN.md + commit final**

Bullet no topo de "Estado atual":

```markdown
- **Sub-projeto 4/4 "Redesign da landing" CONCLUÍDO (data).** Home reconstruída (nível
  máximo): hero lidera pelo moat ("a IA que monta a IA"), depoimentos fabricados
  substituídos por prova de produto honesta (Cloud API oficial, LGPD, garantia 7d,
  Forge grátis), 53 hardcodes tokenizados (verde via tokens), dark-first preservado
  via `.theme-dark`, seções extraídas em components/marketing/sections/. Gate verde +
  E2E + verificação visual. **As 4 frentes do pedido original concluídas.** Commits
  locais, sem push.
```

```bash
git add apps/web/e2e PLAN.md
git commit -m "test(web): e2e da landing + PLAN atualizado (sub-projeto 4 concluido; 4/4 frentes)"
```

- [ ] **Step 5: Apresentar ao usuário** — resumo + screenshots da landing nova +
  lembrete de que as 4 frentes estão prontas, tudo local sem push, e os PRs/deploy
  aguardam OK.

---

## Self-review (cobertura da spec)

- Hero moat → Task 2. Honestidade (remover fakes + prova real) → Tasks 5/6. Tokenização
  + dark-first → Tasks 1/6. Sistema de movimento → Task 1 (hook) + uso nas seções.
  Extração de seções → Tasks 2–6. Composição → Task 6. Pricing honesto → Task 5.
  Testes/preview → Task 7.
- Reuso confirmado: `ForgeDemo`, `MarketingFaq`, header/footer/announcement-bar.
- Craft: execução usa `frontend-design` + verificação no preview real (não só código).
- Risco dark-first resolvido com `.theme-dark` (Task 1) — verificado no preview (Task 7).
