---
id: TASK-0016
type: task
status: todo
phase: Fase-6-Motor-IA
priority: P1
area: ai
created: 2026-05-29
updated: 2026-05-29
related: [TASK-0010, TASK-0011]
tags: [task, area/ai, phase/6]
---
# Fallback RAG/Voyage off sem alucinar

## Objetivo
Com `VOYAGE_API_KEY` ausente (RAG degradado pra FTS-only ou vazio), o agente NÃO
pode inventar — deve escalar/verificar dúvidas que dependiam de conhecimento.

## Status
**Parcial.** O detector de alucinação ([[TASK-0011]]) já cobre "afirmou sem
fonte" e o caso dourado `ecom-anti-alucinacao-sem-fonte` exercita isso sem RAG.
Falta: teste de integração com RAG real ligado/desligado (Postgres) provando o
fallback FTS-only e o comportamento sem nenhum chunk. Follow-up da Fase 6
(integração, não mockar DB).
