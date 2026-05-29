---
id: TASK-0001
type: task
status: done
phase: Fase-1-Fundacao
priority: P1
area: billing
created: 2026-05-28
updated: 2026-05-28
related: [ADR-0001, ADR-0002, ADR-0003]
tags: [task, area/billing]
---
# Fundação — modelo de planos (shared + schema)

## Objetivo
Trocar o modelo de planos pra STARTER/PRO/BUSINESS, conversas de IA, sem trial.

## Plano (arquivos + abordagem)
- `packages/shared/src/constants.ts`: PLAN_IDS, preços 9700/24700/59700,
  `aiConversations` no lugar de `activeContacts`, remover `TRIAL_DAYS`.
- `packages/db/prisma/schema.prisma`: enum `PREMIUM`→`BUSINESS`, default status
  `INCOMPLETE`, coluna `marketingCredits`.

## Critério de pronto
- [x] typecheck verde (após ajustar consumidores — bloco coerente)
- [x] ADRs registrados

## Notas de execução
- `prisma generate` rodado pra atualizar tipos do client.
- Migração de dado NÃO rodada (zona vermelha) → [[TASK-0005-migration-prod-enum]].

## Commits
- (pendente commit da sessão)
