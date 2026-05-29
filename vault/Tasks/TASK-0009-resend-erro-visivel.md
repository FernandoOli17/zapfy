---
id: TASK-0009
type: task
status: todo
phase: Fase-5-Verde-e-Plan
priority: P2
area: web
created: 2026-05-28
updated: 2026-05-28
related: [ERR-0001]
tags: [task, area/web]
---
# Falha de envio de e-mail não pode ser engolida

## Objetivo
Evitar repetir [[ERR-0001-resend-from-dominio]]: hoje a falha vira só `log.warn`
em `device-verification.ts` e o app finge que enviou.

## Plano
- Propagar/loggar como `error` quando o envio do verify-device falha.
- Considerar sinalizar ao usuário "não consegui enviar, tenta de novo".

## Critério de pronto
- [ ] erro visível (log error / Sentry), sem swallow (lei 3)
- [ ] gate verde
