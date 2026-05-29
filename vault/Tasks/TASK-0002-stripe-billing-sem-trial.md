---
id: TASK-0002
type: task
status: done
phase: Fase-2-Stripe
priority: P1
area: billing
created: 2026-05-28
updated: 2026-05-28
related: [ADR-0001, BLK-stripe-prices]
tags: [task, area/billing]
---
# Stripe + fluxo de billing (sem trial)

## Plano (arquivos + abordagem)
- `lib/stripe.ts`: mapping STARTER/PRO/BUSINESS; `STRIPE_PRICE_BUSINESS`.
- `env.ts` (web): `STRIPE_PRICE_PREMIUM`→`STRIPE_PRICE_BUSINESS`.
- `billing/actions.ts`: zod enum BUSINESS; checkout já cobra na hora (sem trial).
- `onboarding/actions.ts`: cria Subscription `INCOMPLETE` (sem `trialEndsAt`).
- `webhooks/stripe/route.ts`: `mapPriceToDbPlan` BUSINESS.

## Critério de pronto
- [x] typecheck verde
- [x] Blocker de Price objects registrado → [[BLK-stripe-prices]]

## Notas de execução
- Dev usa `STRIPE_MOCK=true`. `.env` ainda referencia `STRIPE_PRICE_PREMIUM` —
  ajustar pra `STRIPE_PRICE_BUSINESS` junto com a config de prod.

## Commits
- (pendente)
