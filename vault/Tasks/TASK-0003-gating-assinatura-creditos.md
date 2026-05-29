---
id: TASK-0003
type: task
status: done
phase: Fase-3-Gating
priority: P1
area: billing
created: 2026-05-28
updated: 2026-05-28
related: [ADR-0001, ADR-0002]
tags: [task, area/billing, area/worker]
---
# Gating — agente só com assinatura ativa + limites

## Plano (arquivos + abordagem)
- `lib/plans.ts`: `getWorkspacePlan` default `INCOMPLETE`; `isAgentServingEnabled`;
  `countAiConversationsThisCycle` / `dailyAiConversationsLastDays`; `assertPlanLimit`
  com `aiConversations`; requiredPlan BUSINESS.
- `worker/jobs/process-message.ts`: gate — só atende se `ACTIVE`/`PAST_DUE`.
- `automations/broadcasts/actions.ts`: bloqueia launch por saldo `marketingCredits`
  (1 crédito por destinatário) + decremento.
- `billing/page.tsx`: UI conversas de IA + créditos, badges sem trial, copy garantia.

## Critério de pronto
- [x] typecheck verde (web + worker)
- [ ] testes unitários de billing → débito [[TASK-0007-testes-billing]]

## Notas de execução
- Gate efetivo só após migração ([[TASK-0005-migration-prod-enum]]) + assinatura ACTIVE.
- Em dev, ativar via mock checkout (`STRIPE_MOCK`) seta `ACTIVE`.

## Commits
- (pendente)
