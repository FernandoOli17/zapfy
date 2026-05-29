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
- **Estado:** refactor de billing **DEPLOYADO em produção** (www.zapfy.store), Stripe live, copy nova no ar. Fases 1–5 ✅.
- **Atenção:** gate ativo → 9 workspaces TRIALING não atendem até assinarem (cobrança real). 1 PRO ACTIVE segue.
- **Débitos abertos:** [[TASK-0009-resend-erro-visivel]] (P2) · [[Fase-6-Motor-IA]] (backlog: eval, anti-alucinação, tool loop, etc.).
- **Verdes:** lint ✅ · typecheck ✅ (7/7) · test ✅ (19).
