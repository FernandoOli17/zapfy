# 🗂️ Trato — Dashboard

> Painel principal. Requer plugin **Dataview**. Estado em texto vive nas notas.

## 🔴 Bloqueios que dependem de você
```dataview
TABLE severity, requires, created
FROM "Blockers"
WHERE status = "open" AND owner = "user"
SORT severity DESC
```

## 🐛 Erros abertos
```dataview
TABLE severity, area, created
FROM "Errors"
WHERE status != "fixed" AND status != "wontfix"
SORT severity DESC
```

## 🔧 Em andamento
```dataview
TABLE phase, priority, area
FROM "Tasks"
WHERE status = "doing" OR status = "review"
SORT priority
```

## 📋 Backlog por fase
```dataview
TABLE status, priority, area
FROM "Tasks"
WHERE status = "todo"
SORT phase ASC, priority ASC
```

## 🧭 Decisões recentes
```dataview
TABLE status, date
FROM "Decisions"
SORT date DESC
LIMIT 5
```

---

## Resumo em texto (fallback sem Dataview) — 2026-05-29
- **Bloqueios:** nenhum aberto. ✅ Resolvidos: [[BLK-vercel-resend-env]] (login) · [[BLK-db-migration-enum]] (migração prod) · [[BLK-stripe-prices]] (Stripe live).
- **Erros:** [[ERR-0001-resend-from-dominio]] — **fixed** (código + produção).
- **Estado:** refactor de billing **DEPLOYADO em produção** (www.zapfy.store), Stripe live. Fases 1–5 ✅. **[[Fase-6-Motor-IA]] EM ANDAMENTO** — fundação construída (custo, anti-alucinação, tool loop, eval harness, roteamento) verde sem token; medição real aguarda credenciais.
- **Atenção:** gate ativo → 9 workspaces TRIALING não atendem até assinarem (cobrança real). 1 PRO ACTIVE segue.
- **Em review/decisão:** [[TASK-0017-roteamento-modelo]] + [[ADR-0004-roteamento-haiku-sonnet]] (proposto — ligar AI_ROUTING é decisão do usuário após eval real).
- **Débitos abertos:** [[TASK-0009-resend-erro-visivel]] (P2) · follow-ups Fase 6: [[TASK-0014-snapshot-prompt-forge]] · [[TASK-0015-politica-handoff]] · [[TASK-0016-fallback-rag-off]].
- **Verdes:** lint ✅ · typecheck ✅ (7/7) · test ✅ (53: 19 shared + 34 ai).
