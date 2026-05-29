---
id: TASK-0010
type: task
status: done
phase: Fase-6-Motor-IA
priority: P1
area: ai
created: 2026-05-29
updated: 2026-05-29
related: [TASK-0011, TASK-0012, TASK-0017]
tags: [task, area/ai, phase/6]
---
# Eval harness por vertical

## Objetivo
Conversas douradas por vertical → métricas: resolução (tool certa), handoff,
ALUCINAÇÃO, aderência ao tom, custo. Rodável barato em MOCK (estrutura) e real
(qualidade com token).

## Critério de pronto
- [x] `packages/ai/src/eval/` — `golden.ts` (6 casos: ecommerce/clínica/restaurante
  + anti-alucinação + handoff), `metrics.ts`, `tone.ts`, `harness.ts`
- [x] `Responder` injetável → métricas 100% testáveis sem token
- [x] 6 testes (`tests/eval-harness.test.ts`): responder ideal=100%, responder que
  inventa→alucinação>0, cacheHitRatio, dataset bem-formado
- [x] script real `scripts/eval-ai.ts` (gated MOCK_AI≠true)
- [x] gate verde

## Notas de execução
- Harness desacopla métrica (pura, no gate) de medição real (script orçado).
- **Pendente rodar com token real** (#7 da sessão) — aguarda credenciais no .env.
- Cobre parcialmente [[TASK-0015]] (handoff: caso clínica) e [[TASK-0016]] (RAG
  fallback: caso anti-alucinação). Cobertura dedicada dessas fica como follow-up.
