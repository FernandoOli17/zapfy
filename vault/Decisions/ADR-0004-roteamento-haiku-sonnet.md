---
id: ADR-0004
type: adr
status: proposed
date: 2026-05-29
supersedes:
related: [TASK-0017, TASK-0010]
tags: [adr, area/ai, phase/6]
---
# ADR-0004 — Roteamento de modelo Haiku→Sonnet (PROPOSTO)

> Status `proposed` — **não ligar em produção sem o número do eval real + OK do
> usuário.** Este ADR fica em aberto até a comparação com token rodar.

## Contexto
Toda resposta do agente usa Sonnet hoje. Parte do tráfego é trivial (saudação,
"obrigado", pergunta curta) e o Haiku resolveria com qualidade equivalente a
~1/3 do custo. A regra do motor: "esperteza que custa confiança (alucinação) ou
dinheiro não vale" — mas economia que NÃO custa confiança vale.

## Decisão proposta
Roteador heurístico (`routeModel`) escolhe Haiku para casos triviais e Sonnet
para o resto. Conservador: na dúvida, Sonnet. Atrás da flag `AI_ROUTING`
(desligada por default). Classifier (Haiku) já roda em toda msg e dá os sinais
(intent/sentiment) pro roteador.

## Pendente pra aceitar (ou rejeitar)
Rodar `pnpm tsx scripts/eval-routing.ts` com token real e preencher abaixo:

| métrica           | OFF (Sonnet) | ON (roteado) |
|-------------------|--------------|--------------|
| tool accuracy     | _a medir_    | _a medir_    |
| handoff accuracy  | _a medir_    | _a medir_    |
| ALUCINAÇÃO        | _a medir_    | _a medir_    |
| aderência ao tom  | _a medir_    | _a medir_    |
| custo/caso (USD)  | _a medir_    | _a medir_    |

**Critério de aceite:** ligar SÓ se qualidade (tool/handoff/alucinação/tom) NÃO
piora e o custo cai de forma material. Caso contrário, rejeitar ou refinar a
heurística. Decisão final é do usuário.

## Consequências (se aceito)
- Setar `AI_ROUTING=true` (Vercel + Railway) liga sem deploy de código.
- Custo por conversa cai nos casos triviais; qualidade preservada nos complexos.

## Alternativas
- Sempre Sonnet (status quo) — simples, mais caro.
- Sempre Haiku — descartado: perde em raciocínio/tool calling rico.
- Roteador via LLM dedicado — caro demais pro ganho; heurística + classifier basta.
