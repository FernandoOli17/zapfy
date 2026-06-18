---
id: TASK-0038
type: task
status: todo
phase: Sub-1-Zerar-Erros
priority: P2
area: worker
created: 2026-06-12
updated: 2026-06-12
related: []
tags: [task, area/worker, audit-2026-06-10]
---
# Template preso em SUBMITTED com erro visível na UI — WA-C1 residual

## Objetivo
O audit já fez os skips do poll logarem (warn/error), mas o DONO continua sem
ver nada: template com decrypt quebrado ou sem conta WA fica SUBMITTED pra
sempre na UI e bloqueia broadcasts, sem nenhum sinal além do log do worker.

## Plano
- Schema: `MessageTemplate.lastPollError String?` (+ `lastPolledAt`) — zona
  vermelha (migração).
- Poll grava o erro após N falhas consecutivas; UI de templates mostra badge
  de problema com ação ("reconectar WhatsApp" / "recriar template").
- Casa com o sub-projeto 2 (UX do cliente).

## Critério de pronto
- [ ] template não-consultável exibe erro acionável na UI
- [ ] gate verde
