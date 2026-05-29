---
id: BLK-voyage-api-key
type: blocker
status: open
severity: medium
owner: user
requires: VOYAGE_API_KEY
created: 2026-05-29
related: [TASK-0016]
tags: [blocker, area/ai, phase/6]
---
# RAG desabilitado — VOYAGE_API_KEY vazia

## O que está bloqueado
RAG / busca em conhecimento (#5 da sessão). Sem embeddings da Voyage,
`processKnowledge` marca documentos como ERROR e o agente responde **sem**
consultar a base. (Fallback gracioso: agente opera com tools+escopo e escala
dúvidas — nunca inventa, conforme guardrail.)

## Diagnóstico (2026-05-29)
A linha `VOYAGE_API_KEY` **existe** no `.env` do root mas o **valor está vazio**
(comprimento 0). O usuário achou que tinha colado, mas não há valor — mesmo
padrão do Pusher antes. (Conferido sem ler o segredo: só comprimento.)

## Como resolver (ação do usuário)
1. Pegar a chave em https://dashboard.voyageai.com (formato `pa-...`).
2. No `C:\Users\ferna\zapai\.env`, preencher o VALOR:
   ```
   VOYAGE_API_KEY=pa-...sua-chave...
   ```
3. Salvar e avisar — eu confirmo com `pnpm tsx scripts/check-env.ts` (só boolean)
   e rodo o teste de RAG (#5).

## Fora isso
Nada mais depende da Voyage; agente, eval, custo e roteamento já rodam sem ela.
