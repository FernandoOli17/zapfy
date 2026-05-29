---
id: TASK-0015
type: task
status: todo
phase: Fase-6-Motor-IA
priority: P1
area: ai
created: 2026-05-29
updated: 2026-05-29
related: [TASK-0010]
tags: [task, area/ai, phase/6]
---
# Política de handoff coberta por teste

## Objetivo
Cobrir os gatilhos de handoff (confiança baixa, pediu humano, irritação, fora de
escopo, ação sensível) com teste.

## Status
**Parcial.** O eval harness já tem 1 caso de handoff (clínica/medicação,
[[TASK-0010]]) e os guardrails de input (`detectPromptInjection`/blacklist) já
disparam handoff no `runAgent`. Falta: bateria dedicada cobrindo cada gatilho +
teste de "não escalar à toa" (handoff falso-positivo). Follow-up da Fase 6.
