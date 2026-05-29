---
id: TASK-0006
type: task
status: done
phase: Fase-4-Marketing
priority: P0
area: infra
created: 2026-05-28
updated: 2026-05-29
related: [ERR-0001, BLK-vercel-resend-env]
tags: [task, area/infra]
---
# Fix login de produção (RESEND_FROM_EMAIL na Vercel)

## Objetivo
Fazer o código de verify-device chegar no e-mail no site no ar.

## Plano
1. Autorizar OAuth Vercel.
2. Setar `RESEND_FROM_EMAIL = noreply@zapfy.store` (e-mail puro) na Vercel.
3. Confirmar `RESEND_API_KEY` de prod = conta com `zapfy.store` verificado.
4. Redeploy.

## Critério de pronto
- [ ] env corrigida em prod + redeploy
- [ ] login real entrega o código

## Notas de execução
- ✅ Resolvido 2026-05-29: env setada no painel + redeploy via integração Vercel.
  Login testado em produção, código chega no e-mail. Ver [[BLK-vercel-resend-env]].
