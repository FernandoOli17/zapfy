---
id: TASK-0019
type: task
status: doing
phase: Fase-3-Forge
priority: P1
area: forge
created: 2026-06-01
updated: 2026-06-01
related: [TASK-0018]
tags: [task, area/forge, phase/3, status/doing]
---
# Forge guiada — wizard híbrido (4 passos → chat)

## Objetivo
Início da Forge vira 4 passos guiados com botões (nome → tipo → estilo humano/bot →
objetivo) que caem no chat conversacional existente, sem chamar IA nos passos.
Spec: `docs/superpowers/specs/2026-06-01-forge-guiada-design.md`.
Plano: `docs/superpowers/plans/2026-06-01-forge-guiada.md`.

## Plano (8 tasks, subagent-driven)
- [ ] T1 — campo `persona` no schema + `verticals.ts` (packages/ai) · TDD
- [ ] T2 — meta-prompt aplica persona (humano honesto vs assistente) · TDD
- [ ] T3 — `buildForgeBasics` puro (wizard → answers + abertura) · TDD
- [ ] T4 — server action `saveForgeBasics` (grava sem IA, phase→KNOWLEDGE)
- [ ] T5 — componente `ForgeWizard` (4 passos)
- [ ] T6 — `ForgeWorkspace` renderiza wizard↔chat
- [ ] T7 — E2E Playwright do wizard + limpeza @trato-test.dev
- [ ] T8 — gate verde final (+ build, toca rota) + PLAN.md

## Critério de pronto
- [ ] lint / typecheck / test verdes (+ build, toca rota/SSR)
- [ ] E2E do wizard passa em navegador real
- [ ] dados de teste @trato-test.dev limpos
- [ ] 1 commit local por task, SEM push (checkpoint de deploy aguarda OK — lei 6)

## Notas de execução
- 2026-06-01: spec + plano commitados (fc89e26). Iniciando execução subagent-driven.

## Commits
- (por task)
