---
id: TASK-0018
type: task
status: todo
phase: Fase-6-Motor-IA
priority: P1
area: ai
created: 2026-05-29
related: [TASK-0010, TASK-0015]
tags: [task, area/ai, phase/6]
---
# Classifier escala consulta de agendamento à toa (falso handoff)

## Sintoma
No eval real, `clinic-agenda-usa-tool` ("queria marcar uma consulta") → o
classifier (Haiku) retornou `needs_handoff=true` → pipeline transferiu pra humano
ANTES do agente → a tool `list_available_slots` nunca foi chamada (tool✗). É a
causa do tool accuracy ficar em 80% (não foi o agente que errou).

## Causa provável
Prompt do classifier não distingue "pedido que o agente RESOLVE via tool"
(agendar) de "pedido que precisa de humano". Agendamento é justamente o que o
agente deveria fazer sozinho.

## Plano
- Ajustar prompt do `classifyMessage` pra só marcar `needs_handoff` em sinais
  reais (pediu humano, irritação, fora de escopo, ação sensível) — NÃO em tarefas
  que têm tool.
- Caso dourado de "não escalar à toa" no eval ([[TASK-0015]]).
- Rodar eval antes/depois (regressão).

## Notas
Trade-off do AI_ENGINE_PROMPT: "handoff certo e não à toa". Hoje peca pelo
excesso. Não é bug de exceção (sem erro lançado) — é qualidade do classifier.
