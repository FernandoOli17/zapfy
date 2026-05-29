---
id: TASK-0005
type: task
status: done
phase: Fase-1-Fundacao
priority: P0
area: db
created: 2026-05-28
updated: 2026-05-29
related: [ADR-0003, BLK-db-migration-enum]
tags: [task, area/db]
---
# Rodar migração de produção (enum + colunas billing)

## Objetivo
Aplicar no Neon de produção: rename `PlanId` PREMIUM→BUSINESS, coluna
`marketingCredits`, default status `INCOMPLETE`.

## Plano (arquivos + abordagem)
1. `npx tsx --env-file=.env packages/db/scripts/rename-premium-to-business.ts`
2. `pnpm db:push`

## Critério de pronto
- [ ] OK explícito do usuário (checkpoint — banco de produção)
- [ ] enum renomeado sem perda de dados
- [ ] `db push` aplicado, typecheck/health verdes

## Notas de execução
- ✅ Rodado 2026-05-29 com OK do usuário. Rename via `::text` cast (tipo `name` do
  pg não desserializa no Prisma raw). `db push` ok. 0 linhas BUSINESS → prod segura
  com código antigo. Ver [[BLK-db-migration-enum]] / [[ADR-0003-rename-enum-preservando-dados]].
