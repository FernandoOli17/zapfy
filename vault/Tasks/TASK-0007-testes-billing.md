---
id: TASK-0007
type: task
status: done
phase: Fase-5-Verde-e-Plan
priority: P1
area: billing
created: 2026-05-28
updated: 2026-05-29
related: [ADR-0002]
tags: [task, area/billing]
---
# Testes unitários de billing (é dinheiro)

## Objetivo
Cobrir a lógica de cobrança com Vitest (protocolo §4 exige).

## Plano
- `countAiConversationsThisCycle` (definição [[ADR-0002-definicao-conversa-de-ia]]).
- Decremento de `marketingCredits` no launch de broadcast + bloqueio por saldo.
- `assertPlanLimit` / `requirePlan` / `isAgentServingEnabled` por status.

## Critério de pronto
- [x] testes verdes cobrindo os casos (12 testes em `packages/shared/tests/billing.test.ts`)
- [x] gate verde (lint/typecheck 7/7, test 19)

## Notas de execução
- Lógica pura extraída pra `packages/shared/src/billing.ts` (isAgentServingStatus,
  planLimitState, requiredPlanForFeature, creditsSufficient) — testável sem DB.
  `plans.ts` e broadcasts/actions passaram a usar os helpers. Commit `c18b710`.
- Cobertura DB-coupled (contagem real via Prisma) fica pra integração futura.
