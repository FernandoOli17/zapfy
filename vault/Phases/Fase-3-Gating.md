---
id: Fase-3-Gating
type: phase
status: done
started: 2026-05-28
completed: 2026-05-28
tags: [phase, phase/3]
---
# Fase 3 — Gating (assinatura ativa + limites)

## Escopo
Agente só atende com assinatura `ACTIVE`/`PAST_DUE`; conta conversas de IA;
bloqueia broadcast por saldo de crédito.

## Tarefas
- [[TASK-0003-gating-assinatura-creditos]] ✅

## Checkpoint verde
- [x] typecheck (web + worker)  - [x] lint  - [x] test
- [ ] testes unitários de billing → [[TASK-0007-testes-billing]] (débito P1)
