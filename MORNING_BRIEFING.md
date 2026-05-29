# ☀️ Morning Briefing — 2026-05-28 (refactor de billing + protocolo)

**Avançou:** refactor de billing inteiro no código (modelo de planos novo
STARTER/PRO/BUSINESS, R$97/247/597, cobrança por conversas de IA, sem trial, gate
de assinatura no worker, créditos de broadcast). Landing + preços + FAQ reescritos
com a copy nova. Bug do login (Resend) corrigido no código. `OPERATING_PROTOCOL.md`
adotado + vault Obsidian montado (`vault/`).

**Travou (aguarda você):**
1. **Migração de produção** do enum/colunas billing — banco é prod, precisa do seu
   OK (`vault/Blockers/BLK-db-migration-enum.md`).
2. **Login de produção** — autorizar Vercel pra eu setar `RESEND_FROM_EMAIL` e
   redeployar (`BLK-vercel-resend-env`).
3. **Stripe** — criar Price objects R$247/R$597 (ação sua, `BLK-stripe-prices`).

**Próximos 3 passos:** OK migração → fix login Vercel → testes de billing
(`TASK-0007`) e depois deploy (`TASK-0008`).

**Estado dos verdes:** lint ✅ · typecheck ✅ (7/7) · test ✅ (7/7) · build ⏳ (não
re-rodado nesta sessão).
