# Redesign da Landing — Design (reconstrução nível máximo)

- **Data:** 2026-06-18
- **Status:** aprovado (design, nível máximo); spec para revisão do usuário antes do plano
- **Autor:** Fernando + Claude
- **Escopo:** quarto e último sub-projeto do pedido "otimizar e transformar o projeto"
  (1 Zerar erros ✅ → 2 UX do cliente ✅ → 3 Redesign do dashboard ✅ →
  **4 Redesign da landing**). Cobre a home de marketing:
  `apps/web/src/app/(marketing)/page.tsx` e os componentes de seção que ela compõe.

## Problema

A landing atual é competente mas genérica e tem dívidas: lidera com benefício morno
("WhatsApp com cérebro próprio") em vez do diferencial único (o Forge — a IA que monta
a IA); tem **depoimentos fabricados** com métricas inventadas (viola CLAUDE.md e é
risco de credibilidade/legal); usa **53 cores hardcoded** em vez dos tokens; e mora num
único arquivo de 582 linhas com 12 seções (difícil de evoluir). O usuário pediu **nível
máximo**: não polir — reconstruir como uma peça de marca distintiva e memorável.

## Objetivos

1. **Liderar pelo moat:** o visitante entende em 3 segundos que isto é "a IA que monta
   a IA que atende" — o que ninguém mais tem.
2. **Alto acabamento:** sistema tipográfico deliberado, ritmo de espaçamento, coreografia
   de movimento sutil, layouts ousados (assimetria, números grandes, momentos
   editoriais em Instrument Serif italic) — distintivo, não template.
3. **Honestidade total:** zero claim/métrica/depoimento inventado. Prova é o produto
   real (Cloud API oficial, LGPD, garantia 7d, Forge grátis pra montar).
4. **Consistência técnica:** verde elétrico via tokens, dark-first preservado,
   mobile-first, acessibilidade AA.
5. **Manutenibilidade:** quebrar o monólito de 582 linhas em componentes de seção
   focados.

## Não-objetivos (fora de escopo)

- Outras páginas de marketing (`/precos`, `/sobre`, `/casos`, `/blog`, legais) — só a
  home. (A home pode *linkar* pra elas e espelhar dados honestos, ex.: preços.)
- Backend/schema/dado dinâmico — a landing é estática.
- Reescrever `header.tsx`/`footer.tsx`/`announcement-bar.tsx` (reusar como estão; só
  tokenizar cor se trivial).
- TASKs de zona vermelha; push/deploy (commits locais, OK do usuário pra publicar).
- Refazer `forge-demo.tsx`/`brand-film.tsx` do zero — **reusar e elevar** (são vídeos
  reais Veo 3).

## Decisões aprovadas

1. **Ambição: reconstrução completa (nível máximo).**
2. **Hero lidera pelo moat:** h1 "A IA que *monta a IA* que atende no seu WhatsApp."
   (*monta a IA* em Instrument Serif italic verde).
3. **Depoimentos fake → prova de produto honesta** (Cloud API oficial da Meta, LGPD,
   garantia de 7 dias, montar de graça no Forge; enquadrar "seja um dos primeiros"
   sem inventar métrica).
4. **Paleta:** verde elétrico `#00E676` via tokens (`text-primary`/`bg-primary`),
   neutros via tokens, **dark-first forçado** na landing.

## Sistema de design (camada de craft)

- **Tipografia:** Geist (sans) para UI; **Instrument Serif italic** só em momentos
  editoriais (1 acento por seção, no máximo). Escala modular deliberada:
  hero `clamp(2.75rem, 8vw, 5.5rem)`; h2 de seção `clamp(2rem, 5vw, 3.25rem)`;
  corpo 16–18px, leading 1.6. `tracking-[-0.03em]` em títulos grandes.
- **Cor:** base near-black tokenizada (`bg-background` #0a0a0a, surfaces `bg-card`),
  **um** accent verde elétrico (`text-primary`/`bg-primary`), neutros
  `text-muted-foreground`. Proibido purple-pink. Verde usado com parcimônia (accent,
  não preenchimento).
- **Espaçamento:** ritmo vertical consistente — seções `py-24 md:py-32`, container
  `max-w-6xl` (editorial `max-w-3xl`), gutters `px-6`.
- **Movimento:** entrada com `animate-fade-up` + stagger por `animationDelay` inline
  (utilities já existem em `@zapfy/ui`); revelar on-scroll via IntersectionObserver
  leve (um hook client `useReveal`); hover micro-interações (translate/scale sutis);
  ambiente sutil no hero. **Tudo respeita `prefers-reduced-motion`** (a regra já existe
  no styles.css).
- **Acessibilidade:** contraste AA verificado (verde sobre near-black passa), foco
  visível, `<h1>` único, hierarquia de headings correta, `alt`/`aria` em mídia
  decorativa, navegação por teclado nos CTAs.

## Seções (ordem narrativa reconstruída)

Cada seção vira um componente em `apps/web/src/components/marketing/sections/`.

1. **Hero** (`hero.tsx`): badge "Forge · monta seu agente conversando" → h1 do moat →
   subhead que explica pra leigo ("Você conversa com o Forge, ele entrevista seu
   negócio e gera o agente inteiro — tom, fluxos, agenda. Em minutos, no ar.") → CTAs
   "Montar meu agente grátis →" (primary, `/signup`) + "Ver o Forge ao vivo" (âncora
   `#forge`) → microcopy honesta "Sem cartão pra montar · Cloud API oficial da Meta" →
   mídia: o vídeo-demo real, integrado e maior (não thumbnail solto). Ambiente sutil
   verde-tingido atrás (sem purple-pink, sem mockup flutuante falso).
2. **A virada** (`problem.tsx`): editorial curto, assimétrico, com 1 número grande — a
   dor de responder no WhatsApp manualmente. Sem estatística inventada (usar
   enquadramento qualitativo).
3. **Como o Forge monta** (`how-it-works.tsx`): os 3 passos "você conversa → ele monta →
   ele atende", visualizando a recursão (a IA que monta a IA). Manter/realçar os
   ghost-numbers grandes.
4. **O que o agente faz** (`capabilities.tsx`): bento ousado das capacidades reais
   (atende 24/7, vende, agenda, usa a base de conhecimento via RAG, faz handoff pro
   humano). Só o que o produto faz de verdade.
5. **Por vertical** (`segments.tsx`): restaurante / clínica / loja / serviços, cada um
   com uma frase do que o agente resolve ali. Reusa/eleva a seção atual.
6. **Veja ao vivo** (`#forge`): reusar `ForgeDemo` (vídeo Veo 3), com moldura/título
   elevados — é a prova do moat em movimento.
7. **Prova de produto honesta** (`product-proof.tsx`): substitui os depoimentos fake.
   Cards: Cloud API oficial da Meta · LGPD-friendly · Garantia de 7 dias (reembolso) ·
   Monte de graça no Forge antes de assinar. Enquadramento "seja um dos primeiros a
   ligar o agente" — honesto, sem métrica inventada.
8. **Planos num relance** (`pricing-teaser.tsx`): STARTER R$97 / PRO R$247 / BUSINESS
   R$597 (dados reais, espelhados de `/precos`) com link "ver planos". Honesto.
9. **FAQ**: reusar `MarketingFaq`.
10. **CTA final** (`final-cta.tsx`): foco único, forte — "Monte seu agente agora".

`page.tsx` vira composição enxuta importando as seções + header/footer existentes.

## Honestidade — varredura

- Remover `TESTIMONIALS` (3 depoimentos fabricados) e a `Testimonials`/`TestimonialCard`.
- Varrer todas as seções por números/claims sem lastro (ex.: "+340%", "70% resolvidas")
  e remover/qualificar. Métricas só se forem do produto (planos, limites) ou
  verificáveis (Cloud API oficial, LGPD).
- Manter os CTAs apontando pra rotas reais (`/signup`, `/precos`, `#forge`).

## Tokenização / dark-first

- Trocar os ~53 hardcodes (`bg-[#0a0a0a]`→`bg-background`, `text-white`→`text-foreground`,
  `text-[#888]`→`text-muted-foreground`, `text-[#00E676]`→`text-primary`,
  `bg-[#00E676]`→`bg-primary`, `border-[#1a1a1a]`→`border-border`, `bg-[#111]/[#0d0d0d]`→
  `bg-card`).
- **Preservar dark-first:** a landing deve renderizar sempre escura, independente do
  toggle de tema do app. Investigar o escopo do ThemeProvider (Task 1 do plano): se a
  marketing herda o `.light`, forçar dark no `(marketing)/layout.tsx` (wrapper sem
  `.light`, ou classe/tokens dark fixos). NÃO deixar a home virar light por
  preferência do usuário do app.

## Erros / testes

- Conteúdo estático → sem caminho de erro de runtime. Cobertura:
  - `pnpm --filter @zapfy/web build` compila (tokens/utilities válidos, sem hardcode
    que o lint rejeite).
  - E2E leve (Playwright, harness existente): a home (`/`) carrega; o novo h1 do moat
    está visível; o CTA "Montar meu agente grátis" tem `href` pra `/signup`; a seção de
    depoimentos fake NÃO existe mais (assert ausência de "Ana Lima"/"+340%").
  - Verificação visual no preview (dark + mobile) antes de fechar.
- **Execução com a skill `frontend-design`:** dado o "nível máximo", a construção das
  seções usa os princípios da skill frontend-design (estética distintiva, anti-genérico)
  — invocada na fase de implementação, não no brainstorm.

## Critério de sucesso

- Visitante entende o moat ("a IA que monta a IA") no hero, sem rolar.
- Zero conteúdo inventado; toda prova é verdade verificável.
- Verde tokenizado consistente; dark-first preservado; mobile-first; AA.
- `page.tsx` é composição; cada seção é um componente focado.
- Gate verde (typecheck/lint/test/build) + E2E da home.

## Riscos e mitigação

- **Subjetividade de "nível máximo"** → ancorar em sistema (tipografia/espaçamento/
  movimento/cor acima) e numa revisão adversarial de design na execução; verificação
  visual no preview antes de fechar.
- **Tokenização quebrar o dark-first** → investigação explícita do ThemeProvider +
  forçar dark no layout de marketing (declarado acima).
- **Regressão de SEO/metadata** → preservar `metadata`, JSON-LD e og:image existentes
  da `(marketing)/layout.tsx` (não tocar no que já funciona).
- **Escopo crescer pra outras páginas** → só a home; seções extraídas ficam reusáveis,
  mas não migro `/precos` etc. agora.
