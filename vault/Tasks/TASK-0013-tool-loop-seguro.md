---
id: TASK-0013
type: task
status: done
phase: Fase-6-Motor-IA
priority: P0
area: ai
created: 2026-05-29
updated: 2026-05-29
related: []
tags: [task, area/ai, phase/6]
---
# Tool loop seguro — max iterations + timeout testados

## Objetivo
Provar que o tool loop do `runAgent` não roda pra sempre: respeita `maxSteps` e
aborta no timeout. Loop infinito = bug crítico.

## Critério de pronto
- [x] `runAgent` aceita `model?` injetável (DI pra teste + roteamento)
- [x] `tests/tool-loop.test.ts` com `MockLanguageModelV3`:
  - modelo que SEMPRE pede tool → modelo chamado exatamente `maxSteps` (3) vezes
  - modelo que pendura → aborta no `timeoutMs` e devolve mensagem de timeout
- [x] gate verde

## Notas de execução
- O guard já existia em produção (`stopWhen: stepCountIs` + AbortController); faltava
  o TESTE que prova. Agora provado com mock (zero token, determinístico).
- Cobre também o caminho default; o flow executor tem seu próprio limite
  (`MAX_NODES_VISITED=30`) — teste dele fica pra quando o flow custom for exercitado.
