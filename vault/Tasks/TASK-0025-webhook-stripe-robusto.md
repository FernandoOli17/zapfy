---
id: TASK-0025
type: task
status: todo
phase: Sub-1-Zerar-Erros
priority: P1
area: billing
created: 2026-06-12
updated: 2026-06-12
related: [ADR-0001]
tags: [task, area/billing, audit-2026-06-10, dinheiro, webhook]
---
# Webhook Stripe robusto: retry, ordem, price e paused — BI-A3/A4/A7/A8

## Objetivo
Quatro bugs CONFIRMADOS no mesmo handler (`api/webhooks/stripe/route.ts`):
- **BI-A3 (crítico):** catch devolve 200 → Stripe nunca re-tenta; cliente que
  pagou durante um blip de DB fica INCOMPLETE (agente mudo) pra sempre.
- **BI-A4:** sem idempotência/ordem — `updated` atrasado reativa workspace
  cancelado (aplica payload cru em vez de re-buscar).
- **BI-A7:** price desconhecido (env STRIPE_PRICE_* faltando) degrada o plano
  pra STARTER em silêncio — cliente BUSINESS vira STARTER no DB.
- **BI-A8:** `paused` mapeado pra PAST_DUE → atende de graça indefinidamente.

## Plano
- Catch → 500 (handlers são upserts, re-processar é seguro); 200 só pra evento
  ignorado/payload irrecuperável.
- `stripe.subscriptions.retrieve` no handler (estado atual vence) e/ou guardar
  `event.created` por subscription, descartando eventos mais antigos.
- Price desconhecido: NÃO sobrescrever `plan`, log.error + Sentry.
- `paused` → `UNPAID` (bloqueia atendimento; recuperável).
- Zona vermelha: webhook de produção + dinheiro — OK antes de deploy.

## Critério de pronto
- [ ] teste unitário do STATUS_MAP e do mapPriceToDbPlan (sem fallback STARTER)
- [ ] erro de handler → 500 (Stripe re-tenta) — teste
- [ ] evento atrasado não regride status — teste
- [ ] gate verde
