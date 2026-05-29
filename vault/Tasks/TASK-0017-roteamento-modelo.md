---
id: TASK-0017
type: task
status: review
phase: Fase-6-Motor-IA
priority: P1
area: ai
created: 2026-05-29
updated: 2026-05-29
related: [ADR-0004, TASK-0010, TASK-0012]
tags: [task, area/ai, phase/6]
---
# Roteamento de modelo Haiku→Sonnet

## Objetivo
Mandar casos triviais (saudação/curto) pro Haiku e o resto pro Sonnet, reduzindo
custo sem perder qualidade. **Ligar é decisão do usuário** após eval comparativo.

## Critério de pronto
- [x] `packages/ai/src/agent/routing.ts` — `routeModel()` + `isRoutingEnabled()`
- [x] flag `AI_ROUTING` (DESLIGADA por default)
- [x] worker aplica roteamento e injeta o modelo escolhido no `runAgent`
- [x] 8 testes (`tests/routing.test.ts`)
- [x] `scripts/eval-routing.ts` — compara qualidade × custo (on/off)
- [ ] **rodar comparação com token real** (#8 da sessão) → preencher [[ADR-0004]]
- [ ] **OK do usuário** pra ligar em produção

## Notas de execução
- Heurística conservadora: na dúvida → Sonnet. Triggers de Sonnet: intent
  complexa (order/complaint/cancel/request), sentimento negativo, handoff,
  conversa longa (≥6 turns), mensagem longa.
- Status `review` porque o código está pronto e verde, mas a decisão de ligar
  depende do número do eval real (ADR-0004) — não ligar sozinho.
