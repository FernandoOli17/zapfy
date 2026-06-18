---
id: TASK-0029
type: task
status: todo
phase: Sub-1-Zerar-Erros
priority: P1
area: wa
created: 2026-06-12
updated: 2026-06-12
related: []
tags: [task, area/wa, audit-2026-06-10, webhook]
---
# Webhook Meta: enfileira-e-devolve de verdade — WA-A5/A6/A7/F2

## Objetivo
Quatro bugs CONFIRMADOS no caminho do webhook do WhatsApp (zona vermelha:
comportamento de webhook de produção):
- **WA-A5:** handler processa TUDO síncrono antes do 200 (transação por
  mensagem + `await` do Pusher no caminho do ack) — viola a regra inviolável
  "<1s, enfileira e devolve"; Meta degrada webhooks lentos.
- **WA-A7:** `void enqueue(...)` ignora falha do Redis — mensagem persistida,
  Meta recebe 200, agente NUNCA processa, sem retry nem sweep.
- **WA-A6:** status fora de ordem regride READ→DELIVERED (update incondicional,
  sem rank de monotonicidade).
- **WA-F2:** Zod com `field: z.literal('messages')` rejeita o payload INTEIRO
  se vier change de outro field — mensagens válidas do mesmo POST descartadas.

## Plano
- Mover Pusher/persistência pesada pro worker; webhook persiste o mínimo e
  enfileira; medir p95 do ack.
- `await enqueue` + falha → 500 (Meta re-tenta) ou marker de reprocessamento +
  sweep no worker.
- Guarda de monotonicidade: `updateMany` com `where status in (ranks
  inferiores)`; FAILED tratado à parte.
- Schema tolerante: union/passthrough pra fields desconhecidos; processar só
  `field === 'messages'`.
- Zona vermelha: é o coração do fluxo de produção — OK + teste com fixture.

## Critério de pronto
- [ ] ack p95 < 1s com payload multi-mensagem (teste local com fixture)
- [ ] Redis fora → mensagem reprocessada depois (sem perda)
- [ ] read nunca regride — teste
- [ ] payload com field extra não derruba mensagens válidas — teste
- [ ] gate verde
