---
id: TASK-0008
type: task
status: todo
phase: Fase-5-Verde-e-Plan
priority: P1
area: infra
created: 2026-05-28
updated: 2026-05-28
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
- [ ] checkpoint OK do usuário (lei 6 — deploy de produção)
- [ ] smoke tests verdes pós-deploy
