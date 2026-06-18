---
id: TASK-0035
type: task
status: todo
phase: Sub-1-Zerar-Erros
priority: P3
area: db
created: 2026-06-12
updated: 2026-06-12
related: []
tags: [task, area/db, audit-2026-06-10, migracao]
---
# Migração: @@unique em Agent + limpeza do __default_team__ — FO-A5/A2 residual

## Objetivo
Dois residuais de schema dos fixes do audit (corrigidos em código, falta o
cinto de segurança no banco):
- `Agent` sem `@@unique([workspaceId, name])` — o lock otimista da ForgeSession
  já evita o publish duplo, mas o invariante "1 agente por nome por workspace"
  deveria ser do banco.
- Registro `Professional` com id `__default_team__` pode existir em PRODUÇÃO
  vinculado ao primeiro workspace que rodou `book_service` — appointments de
  outros tenants podem apontar pra ele (FO-A2). Precisa de inspeção + reparação
  de dados.

## Plano
- Migração: `@@unique([workspaceId, name])` em Agent (checar duplicatas antes).
- Script de inspeção em prod: appointments cujo professional pertence a OUTRO
  workspace; re-vincular ao 'Equipe' do workspace correto; remover/renomear o
  `__default_team__`.
- Zona vermelha: migração + dado de produção — OK explícito e backup antes.

## Critério de pronto
- [ ] migração aplicada sem perda (dev → prod com OK)
- [ ] zero appointments cross-tenant após reparação
- [ ] gate verde
