---
id: Fase-6-Motor-IA
type: phase
status: doing
started: 2026-05-29
completed:
tags: [phase, phase/6, area/ai]
---
# Fase 6 — Motor de IA (Forge + agente) · EM ANDAMENTO

> **Liberada pelo usuário em 2026-05-29** ("abrir Fase 6 e construir tudo").
> Fundação construída sem token (verde); medição com token real aguarda
> credenciais no `.env` + roda os scripts de eval/custo.

## Progresso 2026-05-29 (sem token, gate verde — 53 testes)
- [x] [[TASK-0012-medidor-custo-token]] — medidor de custo + cache hit, wirado no worker
- [x] [[TASK-0011-detector-alucinacao]] — detector de alucinação (P0)
- [x] [[TASK-0013-tool-loop-seguro]] — tool loop max iter + timeout testados (P0)
- [x] [[TASK-0010-eval-harness]] — eval harness + 6 casos dourados + scripts reais
- [~] [[TASK-0017-roteamento-modelo]] — roteamento Haiku→Sonnet (código pronto,
  `review`; aguarda eval real → [[ADR-0004-roteamento-haiku-sonnet]] + OK)
- [ ] [[TASK-0014-snapshot-prompt-forge]] · [ ] [[TASK-0015-politica-handoff]] (parcial)
  · [ ] [[TASK-0016-fallback-rag-off]] (parcial) — follow-ups

## Aguardando token real (credenciais no .env)
- eval real (#7): `pnpm tsx scripts/eval-ai.ts` → métricas resolução/handoff/ALUCINAÇÃO/tom
- roteamento (#8): `pnpm tsx scripts/eval-routing.ts` → preenche [[ADR-0004-roteamento-haiku-sonnet]]
- custo real (#6): `pnpm tsx scripts/cost-report.ts` pós "Mensagem de teste"
- conversa E2E (#4) + RAG (#5) via /whatsapp + /knowledge

---
# Referência original (backlog)

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
