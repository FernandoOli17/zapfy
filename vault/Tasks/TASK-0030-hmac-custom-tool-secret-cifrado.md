---
id: TASK-0030
type: task
status: todo
phase: Sub-1-Zerar-Erros
priority: P2
area: worker
created: 2026-06-12
updated: 2026-06-12
related: []
tags: [task, area/worker, audit-2026-06-10, security]
---
# HMAC de custom tool assinado com hash do secret — WA-E1

## Objetivo
`createHmac('sha256', tool.secretHash)` usa o sha256 do secret (persistido em
claro no DB) como chave: (1) quem lê o DB forja requests "autênticos" contra o
endpoint do cliente; (2) o cliente recebeu o secret CRU e valida com ele —
toda assinatura falha pra quem seguir o óbvio. TODO(arch) confesso no código.

## Plano
- Cifrar o secret cru com AES-256-GCM (mesmo helper dos tokens Meta,
  `ENCRYPTION_KEY`) em coluna nova `secretEncrypted`; assinar com o secret cru.
- Migração de schema + janela de compatibilidade pra tools existentes
  (re-gerar secret ou backfill impossível — hash não reverte; comunicar).
- Zona vermelha: schema/migração — OK antes.

## Critério de pronto
- [ ] assinatura validável pelo cliente com o secret que ele recebeu
- [ ] secret nunca em claro nem hasheado-como-chave no DB
- [ ] gate verde
