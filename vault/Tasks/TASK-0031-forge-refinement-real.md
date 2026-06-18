---
id: TASK-0031
type: task
status: todo
phase: Sub-1-Zerar-Erros
priority: P1
area: ai
created: 2026-06-12
updated: 2026-06-12
related: [TASK-0019]
tags: [task, area/ai, audit-2026-06-10, forge]
---
# REFINEMENT pós-publicação inalcançável (Forge "mente" versão nova) — FO-A3

## Objetivo
Crítico de produto: depois de publicar, NÃO existe caminho pro refinement —
sessão vira PUBLISHED (rejeita mensagens), `loadCurrentForgeSession` cria
sessão nova em DISCOVERY (wizard do zero). E se chegasse em REFINEMENT, a única
tool (`refine_system_prompt`) edita só o draft da sessão enquanto o prompt da
fase manda confirmar "Ajustado. Versão N publicada." — o dono acha que o agente
em produção mudou e NADA mudou. A spec do Forge promete esse loop; é o coração
do moat ("refinamento contínuo em linguagem natural").

## Plano
- `loadCurrentForgeSession`: workspace com agente publicado → reabrir/criar
  sessão em REFINEMENT com answers da última AgentVersion.
- `PHASE_TOOLS.REFINEMENT` ganha `publish_agent_version` (ou refine publica
  nova versão automaticamente após confirmação do dono).
- Aceitar mensagens em sessão PUBLISHED nessa fase; ajustar copy da UI
  ("use /forge pra refinar" passa a ser verdade).
- Snapshot de prompt versionado (convenção de testes do CLAUDE.md).
- É feature com decisões de UX — melhor desenhar junto do sub-projeto 2.

## Critério de pronto
- [ ] dono publica → volta no /forge → refina → AgentVersion N+1 criada e ativa
- [ ] E2E cobrindo o loop publicar→refinar→publicar
- [ ] gate verde
