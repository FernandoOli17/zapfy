---
id: TASK-0019
type: task
status: review
phase: Fase-3-Forge
priority: P1
area: forge
created: 2026-06-01
updated: 2026-06-01
related: [TASK-0018]
tags: [task, area/forge, phase/3, status/review]
---
# Forge guiada — wizard híbrido (4 passos → chat)

## Objetivo
Início da Forge vira 4 passos guiados com botões (nome → tipo → estilo humano/bot →
objetivo) que caem no chat conversacional existente, sem chamar IA nos passos.
Spec: `docs/superpowers/specs/2026-06-01-forge-guiada-design.md`.
Plano: `docs/superpowers/plans/2026-06-01-forge-guiada.md`.

## Plano (8 tasks, subagent-driven)
- [x] T1 — campo `persona` no schema + `verticals.ts` (packages/ai) · TDD — `8dd8e24`
- [x] T2 — meta-prompt aplica persona (humano honesto vs assistente) · TDD — `59c9b95`
- [x] T3 — `buildForgeBasics` puro (wizard → answers + abertura) · TDD — `bc38e0e`
- [x] T4 — server action `saveForgeBasics` (grava sem IA, phase→KNOWLEDGE) — `e81b8d1`
- [x] T5 — componente `ForgeWizard` (4 passos) — `581b51a`
- [x] T6 — `ForgeWorkspace` renderiza wizard↔chat — `b63505a`
- [x] T7 — E2E Playwright do wizard + limpeza @trato-test.dev — `69ef85c` (2 testes verdes; descoberta: wizard gateia chat, teste de chat reescrito p/ passar pelo wizard)
- [x] T8 — gate verde final (+ build, toca rota) + PLAN.md — `40cbda1`

## Critério de pronto
- [x] lint / typecheck / test verdes (+ build, toca rota/SSR)
- [x] E2E do wizard passa em navegador real (2 testes, 30.6s)
- [x] dados de teste @trato-test.dev limpos
- [x] 1 commit local por task, SEM push (checkpoint de deploy aguarda OK — lei 6)

## Notas de execução
- 2026-06-01: spec + plano commitados (fc89e26). Execução subagent-driven (1 subagente fresco
  por task, controle revisa entre tasks). T1-T6 implementadas; T7 E2E; T8 gate final.
- **Descoberta no T7:** o wizard gateia o chat em sessão nova → o E2E de chat foi reescrito pra
  passar pelo wizard antes de testar resiliência.
- **Bug pego pelo build (T8):** `forge-wizard.tsx` (client) importava `VERTICAL_LIST/META` do
  barrel `@zapfy/ai/forge`, que re-exporta `engine.ts` (node:crypto + AI SDK) → quebrava o
  bundle do cliente. Typecheck/dev não pegaram; só `pnpm build`. Corrigido com entry dedicado
  `@zapfy/ai/forge/verticals` (dado puro). Reforça a lei 1 (build se toca rota).

## Commits
- `8dd8e24` feat(forge): campo persona + metadados de vertical
- `59c9b95` feat(forge): meta-prompt aplica persona
- `bc38e0e` feat(forge): buildForgeBasics
- `e81b8d1` feat(forge): server action saveForgeBasics
- `581b51a` feat(forge): componente ForgeWizard
- `b63505a` feat(forge): ForgeWorkspace wizard↔chat
- `69ef85c` test(forge): E2E do wizard + chat resiliente
- `40cbda1` fix(forge): wizard importa verticals de entry dedicado (build)
