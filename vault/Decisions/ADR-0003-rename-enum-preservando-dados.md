---
id: ADR-0003
type: adr
status: accepted
date: 2026-05-28
supersedes:
tags: [adr, area/db]
---
# ADR-0003 — Rename de enum PlanId PREMIUM→BUSINESS preservando dados

## Contexto
O projeto usa `prisma db push` (sem pasta de migrations). Mudar o valor do enum
`PlanId` de `PREMIUM` para `BUSINESS` via `db push` é detectado como **drop +
add**, que falha (ou perde dados) se houver linha `Subscription` com `PREMIUM`.
O `.env` aponta pro **Neon de produção** — zona vermelha (lei 6).

## Decisão
Migração em duas etapas, **idempotente e preservando dados**:
1. `ALTER TYPE "PlanId" RENAME VALUE 'PREMIUM' TO 'BUSINESS'` (SQL puro, mantém as
   linhas). Script: `packages/db/scripts/rename-premium-to-business.ts` (checa se
   `BUSINESS` já existe / `PREMIUM` não existe → no-op).
2. `pnpm db:push` pra aplicar o resto (coluna `marketingCredits`, default de
   `status` = `INCOMPLETE`).

**Pré-condição:** OK explícito do usuário antes de rodar (banco de produção).

## Consequências
- Sem perda de dados de assinatura.
- Bloqueado pelo auto-mode classifier até autorização → [[BLK-db-migration-enum]].

## Alternativas consideradas
- `db push --accept-data-loss` — rejeitado: pode dropar dados de cobrança.
