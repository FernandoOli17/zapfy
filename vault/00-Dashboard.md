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
- **Bloqueios (owner: você):** [[BLK-stripe-prices]] (preços novos no Stripe, só trava cobrança real). ✅ Resolvidos: [[BLK-vercel-resend-env]] (login) · [[BLK-db-migration-enum]] (migração prod, sem perda de dados).
- **Erros:** [[ERR-0001-resend-from-dominio]] — **fixed** (código + produção).
- **Fase atual:** [[Fase-5-Verde-e-Plan]]. Fases 1–4 ✅, migração prod ✅. **Falta:** commit + deploy do refactor ([[TASK-0008-deploy-prod-billing]]) e testes de billing ([[TASK-0007-testes-billing]]).
- **Atenção:** prod roda **código antigo sobre schema novo** (seguro: 0 linhas BUSINESS). Ao deployar o refactor, 9 workspaces TRIALING param de servir até assinar.
- **Verdes:** lint ✅ · typecheck ✅ (7/7) · test ✅ (7/7).
