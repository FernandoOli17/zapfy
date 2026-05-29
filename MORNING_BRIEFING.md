# ☀️ Morning Briefing — 2026-05-29 (refactor de billing NO AR 🚀)

**Avançou (deploy concluído):**
- Refactor de billing **deployado em produção** (www.zapfy.store): planos
  STARTER/PRO/BUSINESS (R$97/247/597) + Enterprise, conversas de IA, sem trial,
  gate de assinatura, créditos de broadcast. Copy nova (landing/preços/FAQ) no ar.
- **Stripe live** ativo: Price IDs + `STRIPE_SECRET_KEY` (sk_live) +
  `STRIPE_WEBHOOK_SECRET` na Vercel, `STRIPE_MOCK` removido. Checkout real.
- **Migração de produção** aplicada (enum, marketingCredits, default INCOMPLETE).
- **Login** resolvido (Resend). Smoke test pós-deploy: 200 em home/preços/login/signup/health.
- Verde: lint ✅ · typecheck 7/7 ✅ · test 19 ✅.

**Atenção operacional:**
- Gate ativo → **9 workspaces TRIALING não atendem** até assinarem (cobrança real
  agora). 1 PRO ACTIVE segue normal. (Suas contas de teste: assine via /billing
  ou ative o plano pra reativar o agente delas.)

**Débitos / próximos:**
1. `TASK-0009` — falha de envio de e-mail não pode ser engolida (P2).
2. `Fase-6-Motor-IA` (backlog) — eval harness, anti-alucinação, tool loop, etc.
   Ver `AI_ENGINE_PROMPT.md`.
3. Rotina diária de revisão às 9h (SP) já criada — agora com o vault no GitHub.

**Bloqueios abertos que dependem de você:** nenhum. 🎉
