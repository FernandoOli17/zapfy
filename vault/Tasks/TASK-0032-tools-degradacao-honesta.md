---
id: TASK-0032
type: task
status: todo
phase: Sub-1-Zerar-Erros
priority: P2
area: ai
created: 2026-06-12
updated: 2026-06-12
related: []
tags: [task, area/ai, audit-2026-06-10, forge]
---
# Tools com TODO(credentials) degradam com promessa falsa — FO-A1/A10/A16

## Objetivo
Três tools mandam link morto/alucinado pro CLIENTE FINAL com `ok: true`:
- **FO-A1 (crítico):** `send_checkout_link` sem `checkoutUrl` configurado monta
  `https://checkout.example.com/cart?...` — cliente pronto pra COMPRAR recebe
  link fake apresentado como checkout real.
- **FO-A10:** `send_proposal` manda `Link: ${baseUrl}/q/${numero}` e a rota
  `/q/` NÃO existe — proposta com 404.
- **FO-A16:** `send_sales_page`/`schedule_call` aceitam URL vinda do PRÓPRIO
  LLM ("URL configurada no workspace" que não existe) — domínio alucinado vai
  pro lead em fluxo de venda.

## Plano
- Regra geral: integração ausente → `ok: false` com instrução pro agente
  oferecer alternativa honesta (handoff/combinar por mensagem) — NUNCA URL
  sintética.
- FO-A16: URL mora em config do workspace (decidir onde: WorkspaceSettings?
  campo no AgentVersion?) e a tool LÊ de lá, ignorando o valor do modelo.
- FO-A10: ou criar a rota pública `/q/[numero]` (proposta visível) ou enviar a
  proposta como texto puro sem link. Decisão de produto.
- Marcadas zona vermelha pelo auditor por encostarem em fluxo de venda — OK
  antes de mudar comportamento do agente em produção.

## Critério de pronto
- [ ] nenhuma tool retorna ok:true com URL inexistente/sintética (teste)
- [ ] decisão de onde mora a config de URLs registrada no PLAN.md
- [ ] gate verde
