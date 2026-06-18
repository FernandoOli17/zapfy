---
id: TASK-0028
type: task
status: todo
phase: Sub-1-Zerar-Erros
priority: P2
area: billing
created: 2026-06-12
updated: 2026-06-12
related: [TASK-0007]
tags: [task, area/billing, audit-2026-06-10, testes]
---
# Testes de integração dos caminhos reais de billing — BI-A11

## Objetivo
TASK-0007 entregou só testes de helpers puros — `countAiConversationsThisCycle`,
o gate real do worker e o webhook Stripe não têm NENHUM teste. Os bugs BI-A2,
A7, A8 e A9 passam com a suíte verde (falsa confiança nos caminhos de dinheiro).
CLAUDE.md exige integração com Postgres real pra esses caminhos.

## Plano
- Testes de integração (Postgres containerizado): delimitação de ciclo,
  distinct por conversa, fallback 30d do contador; gate do worker por status
  (INCOMPLETE/CANCELED não atendem E2E).
- Unitários: `STATUS_MAP` e `mapPriceToDbPlan` do webhook Stripe.
- Naturalmente vira a rede de regressão das TASK-0023..0027.

## Critério de pronto
- [ ] contador coberto (dentro/fora do ciclo, multi-conversa)
- [ ] gate do worker coberto por status
- [ ] gate verde
