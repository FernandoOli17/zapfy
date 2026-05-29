---
id: TASK-0008
type: task
status: done
phase: Fase-5-Verde-e-Plan
priority: P1
area: infra
created: 2026-05-28
updated: 2026-05-29
related: [BLK-db-migration-enum, BLK-stripe-prices, BLK-vercel-resend-env]
tags: [task, area/infra]
---
# Deploy de produção do refactor de billing

## Objetivo
Levar o novo modelo de planos a produção, com segurança.

## Plano (ordem importa)
1. Migração de banco aplicada → [[TASK-0005-migration-prod-enum]].
2. Price objects + envs Stripe em prod → [[BLK-stripe-prices]].
3. `RESEND_FROM_EMAIL` corrigido → [[TASK-0006-fix-login-prod-resend]].
4. Commit + push + deploy Vercel; smoke test via `/api/health`.

## Critério de pronto
- [x] checkpoint OK do usuário ("pode deployar")
- [x] smoke tests verdes pós-deploy (home/preços/login/signup/health = 200, copy nova no ar)

## Notas de execução
- 2026-05-29: Stripe live configurado (sk_live + whsec na Vercel, 3 Price IDs),
  `STRIPE_MOCK` removido de produção. `git push origin master` (ebdc0e9..d5109c7)
  → deploy `dpl_828TS1...` READY, alias www.zapfy.store. Copy nova confirmada no ar.
- ⚠️ Gate ativo: 9 workspaces TRIALING param de atender até assinarem (real agora).
