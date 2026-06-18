---
id: TASK-0036
type: task
status: todo
phase: Sub-1-Zerar-Erros
priority: P2
area: web
created: 2026-06-12
updated: 2026-06-12
related: []
tags: [task, area/web, audit-2026-06-10, knowledge]
---
# UI de knowledge mente o estado do RAG — WE-A2/A7

## Objetivo
- **WE-A2:** Voyage ausente/falho → doc marcado READY sem nenhum embedding e a
  UI mostra badge fixo "Indexação RAG ativa (vetor + busca textual)" — busca
  semântica desligada sem o dono saber.
- **WE-A7:** doc >200k chars é truncado (e chunks >400 cortados) só com
  log.warn — UI mostra READY como se 100% indexado.

## Plano
- Schema: `KnowledgeDocument` ganha `embeddedChunks Int` (ou status
  `READY_FTS_ONLY`) e `truncated Boolean` — zona vermelha (migração).
- `process.ts` persiste os dois; `DocumentRow` exibe aviso ("busca semântica
  indisponível — reprocessar" / "documento grande — parte não indexada").
- Casa com o sub-projeto 2 (UX do cliente) — pode ser absorvida lá.

## Critério de pronto
- [ ] doc sem embeddings não exibe "RAG ativo" (e oferece reprocessar)
- [ ] doc truncado avisa o dono
- [ ] gate verde
