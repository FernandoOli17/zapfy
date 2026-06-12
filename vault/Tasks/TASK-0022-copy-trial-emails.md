---
id: TASK-0022
type: task
status: todo
phase: Sub-1-Zerar-Erros
priority: P2
area: web
created: 2026-06-12
updated: 2026-06-12
related: [TASK-0002]
tags: [task, area/web, audit-2026-06-10, billing]
---
# E-mails prometem trial que não existe — AU-A10 (decisão de produto)

## Objetivo
`welcomeEmail` diz "7 dias de trial sem cartão" mas o onboarding cria
assinatura `INCOMPLETE` sem trial (ADR-0001: sem trial, garantia 7d =
reembolso). Os templates `day3`/`day6` também assumem trial — `day6` promete
"continue atendendo" a workspaces TRIALING que o gate nunca deixa atender.
Expectativa de cobrança errada pra TODO cliente novo. Zona vermelha por ser
decisão de produto: corrigir copy OU implementar trial.

## Plano
- Decisão do usuário: (a) alinhar copy ao modelo real (sem trial, garantia 7d
  de reembolso) — recomendado, 1h de trabalho; ou (b) implementar trial de
  verdade (mexe em billing inteiro).
- Revisar os 3 templates (`welcome`, `day3_forge_nudge`, `day6_trial_ending`)
  e a janela do sweep `day6` (consulta `status: TRIALING` que não nasce mais).

## Critério de pronto
- [ ] decisão registrada no PLAN.md
- [ ] copy dos 3 templates coerente com o modelo de cobrança real
- [ ] gate verde
