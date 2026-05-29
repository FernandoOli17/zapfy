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

## Resultado do eval real (2026-05-29, 6 casos / 7 turns)

| métrica           | OFF (Sonnet) | ON (roteado) |
|-------------------|--------------|--------------|
| tool accuracy     | 80%          | 80%          |
| handoff accuracy  | 100%         | 100%         |
| ALUCINAÇÃO        | 0%           | 0%           |
| aderência ao tom  | 0%*          | 100%*        |
| custo/caso (USD)  | $0.0243      | $0.0194      |
| custo total (USD) | $0.14584     | $0.11627     |

\* tom medido em **1 turn só** (único com marcadores) → diferença é RUÍDO, não
efeito do roteamento. Métrica de tom precisa de mais casos pra ter sinal.

**Economia: −20,3% de custo, sem regressão nas métricas duras** (tool/handoff/
alucinação idênticas).

## Recomendação
**Candidato a ligar, mas validar antes em escala maior.** A economia é real e a
qualidade dura não caiu. PORÉM o dataset é pequeno (6 casos) e os casos triviais
foram poucos. Sugiro: (1) expandir o golden set (esp. saudações/perguntas curtas
onde o Haiku entra); (2) ligar primeiro em **staging** com `AI_ROUTING=true` e
observar; (3) só então produção. **Decisão é do usuário** — não ligar sozinho.

**Critério mantido:** ligar SÓ se qualidade não piora e custo cai materialmente.

## Consequências (se aceito)
- Setar `AI_ROUTING=true` (Vercel + Railway) liga sem deploy de código.
- Custo por conversa cai nos casos triviais; qualidade preservada nos complexos.

## Alternativas
- Sempre Sonnet (status quo) — simples, mais caro.
- Sempre Haiku — descartado: perde em raciocínio/tool calling rico.
- Roteador via LLM dedicado — caro demais pro ganho; heurística + classifier basta.
