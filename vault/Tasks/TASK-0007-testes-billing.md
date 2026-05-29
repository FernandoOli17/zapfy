---
id: TASK-0007
type: task
status: todo
phase: Fase-5-Verde-e-Plan
priority: P1
area: billing
created: 2026-05-28
updated: 2026-05-28
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
- [ ] testes vermelhos→verdes cobrindo os casos
- [ ] gate verde
