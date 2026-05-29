---
id: TASK-0014
type: task
status: todo
phase: Fase-6-Motor-IA
priority: P1
area: ai
created: 2026-05-29
updated: 2026-05-29
related: [TASK-0010]
tags: [task, area/ai, phase/6]
---
# Snapshot do prompt do Forge + regressão

## Objetivo
Snapshot por vertical do system prompt gerado pelo Forge; mudança intencional
exige rebaseline via ADR (CLAUDE.md/AI_ENGINE_PROMPT §2/§9).

## Plano
- Snapshot determinístico da MONTAGEM do meta-prompt (system + user message dado
  ForgeAnswers fixo) — testável sem token.
- Snapshot do OUTPUT gerado por vertical — modo real (token), script orçado.

## Status
Não iniciado. A montagem do meta-prompt já existe (`forge/prompts/meta-prompt.ts`);
falta o teste de snapshot. Follow-up da Fase 6.
