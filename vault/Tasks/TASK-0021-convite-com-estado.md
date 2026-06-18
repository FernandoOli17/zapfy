---
id: TASK-0021
type: task
status: todo
phase: Sub-1-Zerar-Erros
priority: P2
area: web
created: 2026-06-12
updated: 2026-06-12
related: []
tags: [task, area/web, audit-2026-06-10, security]
---
# Convite de time com estado (nonce/revogação) — AU-A9

## Objetivo
Token HMAC de convite é stateless: membro removido do time reusa o link do
e-mail original (válido 7 dias) e se re-adiciona sozinho; owner não consegue
revogar convite enviado por engano. Exige tabela nova (zona vermelha: schema).

## Plano
- Persistir `jti`/nonce do convite (tabela `WorkspaceInvite` ou registro em
  AuditLog consultável); marcar consumido no aceite e rejeitar reuso.
- UI de revogação de convite pendente no /team.
- Migração de schema → precisa OK explícito.

## Critério de pronto
- [ ] link aceito 1x não funciona de novo
- [ ] owner revoga convite pendente
- [ ] gate verde
