---
id: TASK-0033
type: task
status: todo
phase: Sub-1-Zerar-Erros
priority: P2
area: ai
created: 2026-06-12
updated: 2026-06-12
related: []
tags: [task, area/ai, audit-2026-06-10]
---
# genPublicNumber sem retry — pedido/orçamento falha com P2002 — FO-A4

## Objetivo
Numeração por `count + 1` com `@@unique([workspaceId, publicNumber])`: dois
pedidos simultâneos no mesmo workspace colidem e `submit_order` falha pro
cliente. Pior: Order deletado faz `count+1` colidir DETERMINISTICAMENTE — todo
pedido novo falha até o count alcançar. O comentário no código promete retry
que não existe (restaurant.ts:267, service.ts:190).

## Plano
- `max(publicNumber)+1` em vez de `count+1` e retry de 2-3 tentativas
  capturando P2002 no create de Order/Quote.
- Marcado zona vermelha pelo auditor (pedidos = receita do cliente do cliente);
  o fix em si é local e testável.

## Critério de pronto
- [ ] dois submits concorrentes geram números distintos sem erro (teste)
- [ ] workspace com Order deletado continua criando pedidos
- [ ] gate verde
