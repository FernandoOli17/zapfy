---
id: TASK-0037
type: task
status: todo
phase: Sub-1-Zerar-Erros
priority: P3
area: db
created: 2026-06-12
updated: 2026-06-12
related: []
tags: [task, area/db, audit-2026-06-10, convencao]
---
# scopedDb é código morto — adotar ou remover — WE-A3

## Objetivo
CLAUDE.md declara `scopedDb(workspaceId)` obrigatório em toda query de
workspace, mas NENHUM arquivo o importa — todo o app usa scoping manual
`where: { workspaceId }`. O auditor não achou vazamento ativo (~168 queries
auditadas consistentes), mas a proteção sistêmica prometida não existe: cada
query nova depende de memória do dev.

## Plano
Decisão do usuário entre:
- (a) **Adotar:** exportar de `@zapfy/db`, migrar queries gradualmente,
  lint custom que acusa `prisma.<entidadeTenant>` fora do helper; ou
- (b) **Remover:** deletar `scoped.ts`, atualizar CLAUDE.md pro padrão real
  (scoping manual) + teste/lint que falhe query de entidade tenant sem
  `workspaceId` no where.
Qualquer uma fecha o gap entre convenção escrita e prática.

## Critério de pronto
- [ ] decisão registrada no PLAN.md + CLAUDE.md atualizado
- [ ] guard automatizado (lint/teste) contra query sem escopo
- [ ] gate verde
