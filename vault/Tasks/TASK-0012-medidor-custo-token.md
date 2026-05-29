---
id: TASK-0012
type: task
status: done
phase: Fase-6-Motor-IA
priority: P1
area: ai
created: 2026-05-29
updated: 2026-05-29
related: [TASK-0010, ADR-0004]
tags: [task, area/ai, phase/6]
---
# Medidor de custo/token por conversa

## Objetivo
Transformar contagem de tokens em custo real (USD/BRL) — base de margem. Popular
`UsageRecord.costCents` e `Message.costCents` (campos existiam, ninguém preenchia).

## Plano
- Tabela de preços por modelo (Sonnet/Haiku/Voyage) + desconto de cache.
- `estimateCostUsd/Cents`, `summarizeCost`, BRL — fonte única de preço.
- Expor `cachedTokensIn` no `RunAgentResult` (medir cache hit).
- Wirar no worker.

## Critério de pronto
- [x] `packages/ai/src/cost/pricing.ts` + 11 testes (`tests/cost.test.ts`)
- [x] `runAgent` retorna `cachedTokensIn`
- [x] worker grava `costCents` em Message + UsageRecord (+ metadata model/cache)
- [x] gate verde (lint/typecheck/test)

## Notas de execução
- Preços são ESTIMATIVA (USD/MTok): Sonnet 3/15 (cache 0.3), Haiku 1/5 (cache 0.1),
  Voyage-3 0.06. Conferir na página de pricing antes de fechar número de margem.
  Override por env (`USD_BRL_RATE`, `ANTHROPIC_MODEL_*`).
- Custo real por conversa: `pnpm tsx scripts/cost-report.ts [workspaceId]` (lê
  UsageRecord pós "Mensagem de teste"). Pendente rodar com token real (#6 da sessão).
