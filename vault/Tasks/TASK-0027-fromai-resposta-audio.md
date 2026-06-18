---
id: TASK-0027
type: task
status: todo
phase: Sub-1-Zerar-Erros
priority: P2
area: billing
created: 2026-06-12
updated: 2026-06-12
related: [ADR-0002]
tags: [task, area/billing, audit-2026-06-10, dinheiro]
---
# Resposta enlatada de áudio conta como conversa de IA — BI-A9

## Objetivo
Contato manda só um áudio → worker responde texto FIXO ("não consigo escutar
áudios") via helper `sendText` que persiste `fromAi: true` → a conversa conta
no limite cobrável (1 das 1.500 do STARTER) com zero IA. Off-by-one econômico
CONTRA o cliente, repetível em escala.

## Plano
- Trocar `fromAi: true` → `false` no helper `sendText` de
  `apps/worker/src/jobs/process-message.ts` (único call site é a resposta de
  áudio; `sendFallbackMessage` já usa `false` corretamente).
- Fix de 1 linha, mas mexe na CONTAGEM COBRÁVEL → zona vermelha, OK antes.
- Avaliar reparação: conversas já infladas no ciclo corrente.

## Critério de pronto
- [ ] resposta de áudio não incrementa contagem (teste de integração)
- [ ] gate verde
