---
id: BLK-db-migration-enum
type: blocker
severity: critical
status: resolved
owner: user
requires: decision
created: 2026-05-28
resolved: 2026-05-29
tags: [blocker, area/db]
---
# Migração do banco de PRODUÇÃO (enum PlanId + colunas billing)

## O que está bloqueado
O backend de billing ([[ADR-0001-modelo-de-planos]]) compila verde mas **não
funciona em runtime** até o schema do banco refletir: enum `PREMIUM`→`BUSINESS`,
coluna `Subscription.marketingCredits`, default de `status`=`INCOMPLETE`.
O `.env` aponta pro Neon de **produção** (`neondb`), então é migração de dado real.
O script foi **negado pelo auto-mode classifier** — correto, é zona vermelha.

## Passos exatos pra resolver
1. Você dá **OK explícito** pra rodar a migração no banco de produção.
2. Eu rodo (estratégia [[ADR-0003-rename-enum-preservando-dados]]):
   - `npx tsx --env-file=.env packages/db/scripts/rename-premium-to-business.ts`
   - `pnpm db:push`
3. ⚠️ Efeito colateral: workspaces hoje `TRIALING` **param de ter o agente
   atendendo** até assinarem (gate novo). Confirmar que é aceitável.

## Resolução (2026-05-29)
Usuário deu OK ("pode rodar"). Executado:
- `rename-premium-to-business.ts` (com cast `::text` pro tipo `name`): enum agora
  `STARTER, PRO, BUSINESS`, sem perda de dados.
- `pnpm db:push`: coluna `marketingCredits` + default `INCOMPLETE` aplicados.
- Verificação (`check-plan-distribution.ts`): 9 STARTER (TRIALING) + 1 PRO
  (ACTIVE), **0 BUSINESS** → código antigo no ar continua seguro.

> ⏭️ Pendente: ao deployar o refactor, os **9 workspaces TRIALING** param de
> servir até assinar (efeito esperado do gate). Ver [[TASK-0008-deploy-prod-billing]].

> Sem valor de credencial aqui. Só a ação e o consentimento necessários.
