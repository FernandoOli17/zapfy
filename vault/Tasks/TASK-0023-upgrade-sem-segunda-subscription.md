---
id: TASK-0023
type: task
status: todo
phase: Sub-1-Zerar-Erros
priority: P1
area: billing
created: 2026-06-12
updated: 2026-06-12
related: [ADR-0001]
tags: [task, area/billing, audit-2026-06-10, dinheiro]
---
# Upgrade de plano cria SEGUNDA subscription no Stripe (dupla cobrança) — BI-A1

## Objetivo
Cliente ACTIVE que clica "Mudar pra esse plano" passa por
`createCheckoutSession` → o Stripe cria uma subscription NOVA sem cancelar a
antiga. Cliente paga R$97 + R$247 todo mês; eventos das duas subscriptions
flip-flopam `plan`/`status` no DB. CONFIRMADO: nenhum `subscriptions.cancel`
ou `update` existe no fluxo de checkout (`billing/actions.ts:116-139`).

## Plano
- Se já existe `stripeSubscriptionId` ACTIVE/PAST_DUE: usar
  `stripe.subscriptions.update` do item pro novo price (com proração) — ou
  Billing Portal — em vez de novo Checkout.
- Defensivo: em `handleCheckoutCompleted`, se o subscription id mudou, cancelar
  a anterior.
- Verificar no Stripe live se já existe cliente com 2 subscriptions ativas
  (reparação manual se houver).
- Zona vermelha: caminho de dinheiro — precisa OK + teste em modo test do Stripe.

## Critério de pronto
- [ ] upgrade/downgrade nunca resulta em 2 subscriptions ativas
- [ ] proração correta visível na invoice de teste
- [ ] gate verde
