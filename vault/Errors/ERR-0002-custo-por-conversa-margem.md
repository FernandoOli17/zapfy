---
id: ERR-0002
type: error
severity: high
status: open
area: ai
created: 2026-05-29
related: [TASK-0012, TASK-0017, ADR-0004]
tags: [error, area/ai, phase/6]
---
# Custo por conversa pode estourar a margem do plano STARTER

## Sintoma
No eval real (2026-05-29, token de verdade), o caso `ecom-precos-usa-tool`
(2 turns, tool loop de 4–5 steps) custou **$0.086 ≈ R$0,45**. O caso médio:
~R$0,13. STARTER vende 1.500 conversas por R$97 → **receita ~R$0,065/conversa**.
Ou seja: 1 conversa com tool loop pesado pode custar **5–7× a receita** dela.

## Causa raiz
1. **Tool loop re-envia o contexto inteiro a cada step.** O agente fez 4–5 steps
   (`list_products` repetido) e cada step reenvia system + histórico + resultados
   → `tokensIn` cresceu pra ~13.5k num turn só.
2. **Cache hit = 0%** no eval: os system prompts dourados são curtos
   (< `MIN_CACHE_CHARS` 4096) então o cache marker nem entra. Em produção o
   system da AgentVersion é maior (entra cache), MAS o contexto que CRESCE no tool
   loop não é cacheado entre steps.
3. Sonnet a $3/$15 por MTok amplifica tudo.

## Correção (candidatas — priorizar)
- **Roteamento Haiku→Sonnet** ([[TASK-0017]]/[[ADR-0004]]): −20% já medido.
- **Reduzir steps do tool loop** quando a tool repete (o agente chamou
  `list_products` 4×). Investigar por que repete — prompt/tool design.
- **Confirmar caching em produção** com system real (>4096 chars) e medir cache
  hit de verdade (no eval foi 0 por prompt curto).
- Reavaliar limite de 1.500 conversas / preço do STARTER se o custo real por
  conversa longa se confirmar alto.

## Prevenção
- `scripts/eval-ai.ts` já reporta custo/caso; rodar em mudança de pipeline.
- Acompanhar `UsageRecord.costCents` (agora populado pelo worker, [[TASK-0012]])
  em produção pra ver custo real por workspace.
