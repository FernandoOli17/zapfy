# Work Log — Sessão noturna 2026-05-26

Diário de bordo em tempo real. Última entrada no topo.

---

## 00:00 — Setup do modo autônomo
**Arquivos:** `WORK_LOG.md`, `ERRORS_LOG.md`, `BLOCKED.md`, `MORNING_BRIEFING.md` (stub)
**Decisão:** Marca Trato (não Zapfy) — usuário aprovou rename há algumas mensagens. Mandato menciona Zapfy por ser pré-rename; ignoro essa parte e mantenho Trato.
**Decisão:** Trabalhar com mocks/stubs quando faltar credencial. Tudo registrado em BLOCKED.md.
**Decisão:** Nenhuma chamada à API Anthropic durante a noite — budget $5 do usuário fica preservado.

## 00:01 — Git status
**Arquivos:** N/A
**Estado:** repo local sem remote (`git remote -v` vazio). 5 commits locais. Working tree com mods grandes (~50 arquivos) das últimas sessões — vou commitá-los antes de seguir.

---

## Sessão 4 — Retomada 2026-05-28 manhã/tarde

### Diagnóstico inicial
- `.env`: 12 vars presentes. Crítico — usuário pensou que adicionou Pusher mas só o cluster (`PUSHER_CLUSTER=us2`) está setado. APP_ID/KEY/SECRET vazios.
- Typecheck quebrou: `seed-granvilla.ts:503` `etaMinutes: undefined` incompatível com `exactOptionalPropertyTypes: true` (Prisma esperava `null`). **Fixed.**
- Lint verde.

### Ativações de mock no .env
Adicionado: `MOCK_AI=true`, `STRIPE_MOCK=true`, `HEALTH_DETAIL_TOKEN=local_dev_health_detail_token_change_me`. Sem isso, sem `ANTHROPIC_API_KEY`/`STRIPE_SECRET_KEY` o pipeline quebrava silenciosamente.

### Validação live com /api/health detalhado
- DB: ok 196ms (Neon HTTP via porta 443 — escapa do firewall Cisco)
- Pusher: disabled (esperado, sem credenciais)
- Upstash REST: disabled (rate-limit cai em no-op silencioso, ok pra dev)
- Resend/Sentry/Anthropic: disabled (todos com graceful fallback)
- Stripe: ok (mock mode)

### Build de produção
`pnpm build` verde em 4m52s. 41 páginas geradas. Warnings esperados (OpenTelemetry/jose/BullMQ/Sentry) — Critical dep expression e Edge runtime compression. Nada bloqueia deploy. Fix lateral: `experimental.typedRoutes` → top-level `typedRoutes`.

### Seed Granvilla — fix do Neon adapter
`pnpm db:seed:granvilla` falhava: `Can't reach database server at ...:5432`. Causa: o script standalone usava `new PrismaClient()` direto (TCP 5432), enquanto o app usa `PrismaNeon` adapter (HTTPS 443). Replicado o setup do adapter no topo do seed. Seed roda em ~10s populando 50 contatos / 200 msgs / 30 conversas / 12 produtos / 3 pedidos / 5 appts / 2 cupons / 3 templates HSM.

### E2E Playwright — 8/8 verde após 4 fixes
Suite: signup x3, billing x2, forge x1, inbox x2. Run inicial: 5/8 falhou.

Fixes aplicados em arquivos de teste (NÃO em código de produção):
1. `playwright.config.ts`: timeout 30s→90s, expect 5s→10s (cobre cold start turbopack ~25s + warm signup ~3s).
2. `e2e/helpers.ts`: `signupNewUser` agora completa onboarding (cria workspace com nome único) se cair em `/onboarding`. Sem isso, middleware bounceava todas as rotas internas.
3. `e2e/helpers.ts`: `loginExisting` timeout 15s→60s.
4. `e2e/forge.spec.ts`: locator `'h1, [data-page="forge"]'` (que não existe) → `'h1, h2'` first (ForgeWorkspace usa h2).

Total final: **8 passed (2.4m)**.

### Estado pra deploy
- Typecheck/lint/build verdes.
- E2E verdes em dev local.
- 13 credenciais reais ainda pendentes — todas com graceful fallback no código (resumido em `BLOCKED.md` desta sessão).
- Pode ir pro Vercel staging agora com modo demo (`MOCK_AI`, `STRIPE_MOCK`). Real-time inbox sem Pusher = sem push automático, mas refresh manual funciona.

---

(novas entradas serão adicionadas acima ↑)
