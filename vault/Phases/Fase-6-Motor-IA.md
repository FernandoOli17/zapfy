---
id: Fase-6-Motor-IA
type: phase
status: planned
started:
completed:
tags: [phase, phase/6, area/ai]
---
# Fase 6 — Motor de IA (Forge + agente) · BACKLOG

## Escopo
Fazer o motor de IA funcionar bem: Forge (entrevista → gera agente) e runtime
(responde no WhatsApp). Referência completa: `AI_ENGINE_PROMPT.md` (raiz).
Prioridade ao evoluir: **anti-alucinação > handoff correto > tom > esperteza**.
Dev sempre em `MOCK_AI`; eval real só com OK de orçamento. Mudança de
meta-prompt/modelo/pipeline = ADR + eval antes/depois + rebaseline de snapshot.

> Status `planned` — **não iniciar sem o usuário liberar.** Hoje o foco é fechar o
> refactor de billing (deploy) + débitos ([[TASK-0007-testes-billing]]).

## Tarefas-semente (criar nota TASK quando a fase começar)
- **TASK-0011 — Métrica/detector de alucinação (P0):** flagar "afirmou fato de
  negócio (preço/prazo/estoque) sem tool/RAG". Falha grave no eval.
- **TASK-0013 — Tool loop seguro (P0):** garantir max iterations + timeout, com
  teste que prova que não há loop infinito.
- **TASK-0010 — Eval harness por vertical (P1):** conversas douradas
  (ecommerce/clínica/restaurante/infoproduto/serviço) → asserts de tool/tom/escala.
- **TASK-0012 — Prompt caching (P1):** confirmar cache em system + RAG (>1024
  tokens) e medir cache hit.
- **TASK-0014 — Snapshot do prompt do Forge (P1):** por vertical + teste de
  regressão; rebaseline via ADR.
- **TASK-0015 — Política de handoff (P1):** cobrir gatilhos (confiança baixa,
  pediu humano, irritação, fora de escopo, ação sensível) com teste.
- **TASK-0016 — Fallback RAG/Voyage off (P1):** agente não alucina, escala dúvidas
  que dependiam de conhecimento.

## Checkpoint verde
- [ ] eval harness rodando · [ ] métricas (resolução/handoff/alucinação/tom) reportadas
- [ ] lint · [ ] typecheck · [ ] test
