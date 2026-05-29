---
id: Fase-1-Fundacao
type: phase
status: done
started: 2026-05-28
completed: 2026-05-29
tags: [phase, phase/1]
---
# Fase 1 — Fundação (modelo de planos: shared + schema)

## Escopo
Novo modelo de planos em `constants.ts` + `schema.prisma`. Ver [[ADR-0001-modelo-de-planos]].

## Tarefas
- [[TASK-0001-modelo-planos-shared-schema]] ✅ (código)
- [[TASK-0005-migration-prod-enum]] ✅ (migração prod rodada 2026-05-29)

## Checkpoint verde
- [x] typecheck  - [x] lint  - [x] test  - [x] migração aplicada (sem perda de dados)
