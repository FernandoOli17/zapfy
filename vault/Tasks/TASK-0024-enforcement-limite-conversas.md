---
id: TASK-0024
type: task
status: todo
phase: Sub-1-Zerar-Erros
priority: P1
area: billing
created: 2026-06-12
updated: 2026-06-12
related: [ERR-0002, ADR-0002]
tags: [task, area/billing, audit-2026-06-10, dinheiro]
---
# Limite de conversas de IA nunca é aplicado — BI-A2

## Objetivo
A unidade de cobrança do produto (1.500/6.000 conversas) não tem enforcement:
o gate do worker só checa status da assinatura. STARTER pode consumir conversas
ilimitadas ao custo de tokens da casa — agrava diretamente o ERR-0002 (margem).
A UI de /billing inclusive promete pausa ("considere upgrade pra não pausar").
CONFIRMADO: `assertPlanLimit(..., 'aiConversations')` existe e nunca é chamado.

## Plano
- No worker, antes da classificação: contar conversas distintas com `fromAi`
  no ciclo (lógica de `countAiConversationsThisCycle`, hoje server-only no web
  — mover pra `@zapfy/shared` ou `@zapfy/db`).
- Se estourou e a Conversation atual ainda não conta: não responder com IA
  (fallback educado + handoff) + notificar o owner (e-mail/banner).
- Decidir comportamento exato no limite (corte seco vs. tolerância) — decisão
  de produto, zona vermelha.
- Cache do contador (Redis) pra não pesar cada mensagem.

## Critério de pronto
- [ ] workspace no limite não consome IA nova (teste de integração)
- [ ] owner é notificado ao atingir 80%/100%
- [ ] gate verde
