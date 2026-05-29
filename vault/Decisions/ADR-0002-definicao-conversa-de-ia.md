---
id: ADR-0002
type: adr
status: accepted
date: 2026-05-28
supersedes:
tags: [adr, area/billing]
---
# ADR-0002 — Definição de "conversa de IA" (unidade de cobrança)

## Contexto
O novo modelo ([[ADR-0001-modelo-de-planos]]) cobra por conversas de IA por ciclo
(1.500 Starter / 6.000 Pro / ∞ Business). Precisava de uma definição precisa,
mensurável com as tabelas que já existem, justa pro cliente e barata de contar.

## Decisão
**1 conversa de IA = 1 `Conversation` distinta que teve ≥1 mensagem `fromAi=true`
dentro do ciclo de cobrança corrente.**
- Ciclo = `Subscription.currentPeriodStart` (fallback: últimos
  `AI_CONVERSATION_WINDOW_DAYS` = 30 dias).
- Implementado em `apps/web/src/lib/plans.ts`: `countAiConversationsThisCycle`,
  `dailyAiConversationsLastDays`.

## Consequências
- Reaproveita `Message.fromAi` (já existia) — zero schema novo pra contagem.
- Mensagens humanas (handoff) não contam; conversa só conta se a IA atuou nela.
- `assertPlanLimit(..., 'aiConversations', count)` faz o enforcement.

## Alternativas consideradas
- Por contato ativo (modelo antigo) — descartado, não reflete custo de tokens.
- Por mensagem — descartado, penaliza conversa longa e é confuso pro cliente.
