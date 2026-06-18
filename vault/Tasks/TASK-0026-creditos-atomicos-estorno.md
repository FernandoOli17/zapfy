---
id: TASK-0026
type: task
status: todo
phase: Sub-1-Zerar-Erros
priority: P2
area: billing
created: 2026-06-12
updated: 2026-06-12
related: [ADR-0001]
tags: [task, area/billing, audit-2026-06-10, dinheiro]
---
# Créditos de marketing: débito atômico + estorno — BI-A5/A6, WA-B2

## Objetivo
- **BI-A5:** check de saldo e `decrement` em queries separadas — dois launches
  concorrentes deixam saldo negativo ou debitam 2x o mesmo broadcast.
- **BI-A6/WA-B2:** débito integral no launch e NENHUM estorno existe no código:
  recipients FAILED/SKIPPED (conta WA desconectada, template reprovado,
  opt-out) e cancelamento consomem crédito sem entregar nada. Redis fora no
  launch = créditos debitados + broadcast RUNNING eterno.

## Plano
- Débito condicional atômico: `updateMany({ where: { workspaceId,
  marketingCredits: { gte: needed } }, data: { decrement } })` checando count;
  transição DRAFT→RUNNING idem (where por status).
- Estorno no fechamento (COMPLETED/CANCELED): increment = count de
  FAILED+SKIPPED. Alternativa: debitar por envio confirmado.
- Zona vermelha: é o dinheiro do cliente — OK antes.

## Critério de pronto
- [ ] dois launches concorrentes nunca deixam saldo negativo (teste)
- [ ] broadcast 100% falho devolve 100% dos créditos
- [ ] gate verde
