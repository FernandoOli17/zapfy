---
id: ADR-0001
type: adr
status: accepted
date: 2026-05-28
supersedes:
tags: [adr, area/billing]
---
# ADR-0001 — Novo modelo de planos (copy nova como fonte da verdade)

## Contexto
A copy de marketing nova reposicionou o produto: Forge monta/demonstra de graça,
agente só vai ao ar com assinatura paga, garantia de 7 dias (não trial). Os
planos, preços e a unidade de cobrança divergiam do que estava implementado
(STARTER/PRO/PREMIUM, R$97/297/697, cobrança por contatos ativos + trial).
Usuário escolheu **alinhamento total** com a copy como fonte da verdade.

## Decisão
- Planos cobráveis: **STARTER / PRO / BUSINESS** (enum `PlanId`). `Enterprise` é
  **só marketing** ("Falar com vendas" → `/contato`), fora do enum/Stripe.
- Preços: **R$97 / R$247 / R$597** (`priceBRLCents` 9700/24700/59700).
- Unidade de cobrança: **conversas de IA** (1.500 / 6.000 / ilimitado) — ver [[ADR-0002-definicao-conversa-de-ia]].
- **Sem trial.** Workspace nasce `INCOMPLETE`; agente só atende com assinatura
  `ACTIVE` (ou `PAST_DUE` com graça). Garantia de 7 dias = reembolso.
- Broadcasts (disparos de marketing) = **créditos** vendidos à parte
  (`Subscription.marketingCredits`); por ora só bloqueia por saldo, sem fluxo de
  compra (fase futura).

## Consequências
- Migração de schema em produção necessária → ver [[BLK-db-migration-enum]] / [[ADR-0003-rename-enum-preservando-dados]].
- Preços novos precisam de Price objects no Stripe → ver [[BLK-stripe-prices]].
- Workspaces `TRIALING` existentes **param de servir** até assinarem (efeito do gate).
- Lógica de billing exige testes unitários (dinheiro) → [[TASK-0007-testes-billing]].

## Alternativas consideradas
- Só marketing (texto) sem mexer no backend — rejeitada: site mentiria sobre o produto.
- Manter Stripe atual como fonte da verdade — rejeitada pelo usuário.
