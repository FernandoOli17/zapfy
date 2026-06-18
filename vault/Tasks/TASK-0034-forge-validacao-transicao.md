---
id: TASK-0034
type: task
status: todo
phase: Sub-1-Zerar-Erros
priority: P3
area: ai
created: 2026-06-12
updated: 2026-06-12
related: [TASK-0031]
tags: [task, area/ai, audit-2026-06-10, forge]
---
# advance_phase aceita qualquer transição — FO-A15

## Objetivo
A state machine do Forge não valida transição: o LLM pode pular DISCOVERY→
PUBLISH e publicar agente com answers vazios (o publish auto-gera prompt de
answers vazios). `nextPhaseDefault` existe e não é usado pra validar nada.

## Plano
- Whitelist de transições legais por fase (incluindo o atalho
  VERTICAL_DETECTION→REVIEW do template) validada no engine.
- PUBLISH só alcançável com answers mínimos (systemPromptDraft/REVIEW feito).
- Desenhar junto da TASK-0031 (REFINEMENT) — mexem na mesma máquina.

## Critério de pronto
- [ ] transição ilegal é rejeitada com mensagem ao LLM (teste)
- [ ] publish sem answers mínimos bloqueado
- [ ] gate verde
