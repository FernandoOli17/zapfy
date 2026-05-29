---
id: BLK-stripe-prices
type: blocker
severity: medium
status: resolved
owner: user
requires: manual-action
created: 2026-05-28
resolved: 2026-05-29
tags: [blocker, area/billing]
---
# Stripe — criar Price objects dos planos novos (prod)

## O que está bloqueado
Cobrança real em produção. Preço no Stripe não se edita — preço novo = novo
`Price` object. Os planos novos ([[ADR-0001-modelo-de-planos]]) precisam de Prices
pra R$247 (Pro) e R$597 (Business), + produto "Business". Em dev rodamos com
`STRIPE_MOCK=true` (sem tocar Stripe real).

## Passos exatos pra resolver (ação do usuário)
1. No dashboard Stripe, criar/ajustar os Price objects (recorrência mensal, BRL):
   - Starter R$97  → env `STRIPE_PRICE_STARTER`
   - Pro R$247     → env `STRIPE_PRICE_PRO`
   - Business R$597 → env `STRIPE_PRICE_BUSINESS`  *(env renomeada de `STRIPE_PRICE_PREMIUM`)*
2. Setar essas envs na Vercel (produção) + redeploy.
3. Configurar webhook `/api/webhooks/stripe` com `STRIPE_WEBHOOK_SECRET`.

> Eu não crio cobrança real. Sem valores de chave aqui.

## Resolução (2026-05-29)
Usuário criou os produtos + preços no Stripe (live) e setou na Vercel: 3
`STRIPE_PRICE_*` (Price IDs), `STRIPE_SECRET_KEY` (sk_live), `STRIPE_WEBHOOK_SECRET`
(endpoint www.zapfy.store/api/webhooks/stripe). `STRIPE_MOCK` removido de produção.
Cobrança real ativa. Ver [[TASK-0008-deploy-prod-billing]].
