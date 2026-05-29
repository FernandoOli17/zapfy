---
id: TASK-0011
type: task
status: done
phase: Fase-6-Motor-IA
priority: P0
area: ai
created: 2026-05-29
updated: 2026-05-29
related: [TASK-0010]
tags: [task, area/ai, phase/6]
---
# Detector de alucinação de fato de negócio (guardrail nº1)

## Objetivo
Flagar quando a resposta AFIRMA preço/estoque/prazo/horário/política com número
concreto SEM fonte (tool de dados usada OU número ancorado no RAG). É o assert
mais importante do eval (AI_ENGINE_PROMPT §5/§10).

## Critério de pronto
- [x] `packages/ai/src/eval/hallucination.ts` — `detectHallucination()` puro
- [x] 7 testes (`tests/hallucination.test.ts`): flagra preço/prazo/horário sem
  fonte; NÃO flagra com tool, com número no RAG, ou linguagem de verificação
- [x] integrado ao eval harness (assert por turn) [[TASK-0010]]

## Notas de execução
- Heurístico e conservador: só dispara com número concreto. Falso negativo é pior
  que falso positivo aqui, mas linguagem "vou verificar" é segura.
- Falha grave: `scripts/eval-ai.ts` sai com código 2 se `hallucinationRate > 0`.
- Limite conhecido: resultado de tool não é re-checado contra o texto (confia que
  tool usada = fato sourced). Evoluir depois com checagem do conteúdo da tool.
