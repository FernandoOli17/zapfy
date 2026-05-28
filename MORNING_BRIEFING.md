# Morning Briefing — Sessão 4 (Retomada · 2026-05-28)

Bom dia, Fernando. Sessão focada em **diagnosticar credenciais novas + validar pipeline end-to-end**.
**Status: tudo verde.** Typecheck ✓, lint ✓, build ✓, seed ✓, 8/8 E2E ✓.

---

## ⚠️ DISCOVERY IMPORTANTE — Pusher não está realmente configurado

Você me disse que tinha adicionado as credenciais Pusher. Mas o `.env` mostra:

```
NEXT_PUBLIC_PUSHER_CLUSTER=us2
PUSHER_CLUSTER=us2
PUSHER_APP_ID=        # vazio
PUSHER_KEY=           # vazio
PUSHER_SECRET=        # vazio
NEXT_PUBLIC_PUSHER_KEY= # vazio
```

Só o **cluster** (que é apenas a região) está setado. Sem APP_ID/KEY/SECRET o
Pusher não inicializa — código cai em no-op silencioso (em `pusher-server.ts`
e `pusher-client.ts`). Inbox funciona sem real-time push (precisa refresh manual).

**Pra realmente ativar:** dashboard.pusher.com → criar app (recomendo cluster `sa1` São Paulo) → copiar **App ID**, **Key** e **Secret** pra `.env`. `NEXT_PUBLIC_PUSHER_KEY` recebe o mesmo valor de `PUSHER_KEY`.

---

## 🎯 Resumo executivo (1 min de leitura)

| # | Tarefa                                    | Status   |
|---|-------------------------------------------|----------|
| 1 | Diagnóstico do .env e dos mocks ativos    | ✅       |
| 2 | Fix typecheck (seed-granvilla etaMinutes) | ✅       |
| 3 | Ativação MOCK_AI/STRIPE_MOCK/HEALTH_TOKEN | ✅       |
| 4 | Build de produção (4m52s, 41 páginas)     | ✅       |
| 5 | Fix seed Granvilla (Neon adapter)         | ✅       |
| 6 | Suite E2E Playwright (8/8)                | ✅       |

**Total novas linhas de mudança:** ~120 (helpers de teste + adapter no seed + .env + next.config + locators). **Nenhum bug de produção encontrado** — todos os fixes foram em testes ou config dev.

---

## ✅ #1 — Diagnóstico do .env

12 vars setadas. Auditadas uma a uma contra o código:

| Categoria | Status | Detalhes |
|-----------|--------|----------|
| DB (Neon) | ✅ funcional | health ping 196ms via HTTP 443 |
| Redis (Upstash ioredis) | ✅ funcional | BullMQ conecta |
| Better Auth | ✅ funcional | signup/login validados E2E |
| Crypto (ENCRYPTION_KEY + LOG_PII_SALT) | ✅ funcional | |
| Anthropic | ⚠️ MOCK_AI=true | agente roda com respostas canned |
| Stripe | ⚠️ STRIPE_MOCK=true | billing modo demo |
| Pusher | ⚠️ só cluster setado | no-op real-time |
| Upstash REST | ⚠️ vazio | rate-limit no-op (ok dev) |
| Resend | ⚠️ vazio | email → log no console |
| Sentry/PostHog/UploadThing/Voyage/Meta/Google* | ⚠️ vazio | todos com graceful fallback |

Detalhes completos em `BLOCKED.md`.

---

## ✅ #2 — Fix typecheck

`packages/db/prisma/seed-granvilla.ts:503` — `etaMinutes: ... ? 45 : undefined` quebrava `exactOptionalPropertyTypes`. Trocado por `null`. Documentado em `ERRORS_LOG.md`.

---

## ✅ #3 — Mocks ativados no .env

Adicionado pra desbloquear pipeline sem credenciais externas:
- `MOCK_AI=true` — `isMockMode()` retorna true, agente devolve respostas canned
- `STRIPE_MOCK=true` — `getStripeClient()` retorna null, UI mostra "modo demo"
- `HEALTH_DETAIL_TOKEN=local_dev_health_detail_token_change_me` — libera `/api/health?token=...` detalhado

⚠️ **Trocar `HEALTH_DETAIL_TOKEN` antes de subir pra prod** (token de dev exposto neste arquivo).

---

## ✅ #4 — Build de produção verde

`pnpm build` em 4m52s. 41 páginas geradas. Warnings esperados (OpenTelemetry/Sentry critical-dep, jose Edge runtime, BullMQ child-processor) — **nenhum bloqueia deploy**.

Lateral fix: `experimental.typedRoutes` → top-level `typedRoutes` (movido em Next 15.5+).

---

## ✅ #5 — Seed Granvilla desbloqueado

`pnpm db:seed:granvilla` falhava com `Can't reach database at ...:5432` (firewall Cisco bloqueia 5432). Web app funciona via `PrismaNeon` adapter (HTTPS 443). Replicado o setup do adapter no script standalone. Roda em ~10s.

Login disponível:
- **Email:** `claudio@granvilla.pet`
- **Senha:** `Granvilla2026!`
- **Workspace:** `granvilla-pet-shop` (50 contatos, 200 msgs em 30 conversas, 12 produtos, 3 pedidos, 5 appts, 2 cupons, 3 templates HSM)

---

## ✅ #6 — E2E Playwright: 8/8 verde

Suite completa rodada em 2.4min. **Nenhum bug de produção encontrado.** Os 4 fixes foram em config/helpers de teste:

| Test | Status | Tempo |
|------|--------|-------|
| signup × cria conta e chega no app autenticado | ✅ | 12.5s |
| signup × bloqueia email duplicado | ✅ | 15.7s |
| signup × valida senha curta | ✅ | 3.1s |
| billing × abre /billing e mostra plano TRIAL | ✅ | 16.9s |
| billing × upgrade pra PRO via checkout mock | ✅ | 15.6s |
| forge × abre, envia mensagem mock, vê preview | ✅ | 56.3s |
| inbox × abre vazio sem crash | ✅ | 24.3s |
| inbox × navega entre tabs filtros | ✅ | 17.4s |

**Fixes aplicados em testes:**
1. `playwright.config.ts`: timeout global 30→90s, expect 5→10s. Primeira request em route dinâmica leva ~25s (turbopack compile + Neon cold connect).
2. `e2e/helpers.ts`: `signupNewUser` agora completa onboarding (cria workspace com nome único por test) se redirecionar pra `/onboarding`. Sem isso, middleware bounceava qualquer rota interna.
3. `e2e/forge.spec.ts`: locator `'h1, [data-page="forge"]'` (que não existe) → `'h1, h2'` first. ForgeWorkspace usa `<h2>` introdutório.

---

## 📊 Métricas técnicas

```
Commits da sessão:      0 ainda (todos os fixes não-commitados)
Arquivos modificados:   8 (seed, next.config, helpers, configs E2E, .env, ERRORS_LOG, WORK_LOG, BLOCKED, MORNING_BRIEFING)
Linhas mudadas:        ~120 (líquido)
Tests E2E:             8/8 ✓ (era 5/8 no início)
Typecheck:             ✅
Lint:                  ✅
Build prod:            ✅ (4m52s, 41 páginas)
Health detalhado:      ✅ (DB ping 196ms, todos demais "disabled" graceful)
Seed Granvilla:        ✅
```

---

## 🎯 Próximos passos sugeridos (em ordem)

### 1. **Configurar Pusher real** ⭐ — desbloqueia real-time inbox que o usuário queria
Dashboard.pusher.com → criar app → 4 valores pra `.env`. Custo: $0 free tier até 100 connections.

### 2. **git push pro GitHub** ⭐ — 38 commits locais sem backup
Criar repo (privado), `git remote add origin <url>`, `git push -u origin master`.

### 3. **Deploy staging no Vercel** — colocar URL pública no ar
Seguir `DEPLOY.md`. Mesmo sem domínio próprio, Vercel dá `*.vercel.app`. Worker no Railway.

### 4. **Adicionar credenciais reais conforme orçamento**
Ordem sugerida por valor/custo:
- Sentry (free tier) — visibilidade de erros em prod
- PostHog (free 1M evts) — analytics
- Resend ($20/mês) — emails transacionais bonitos
- Anthropic — agente real (varia, $5 já dá pra 1k turnos demo)
- Stripe — quando tiver primeiro cliente pagante
- Meta WhatsApp — cliente cadastra no UI (BYO model)

### 5. **Gravar vídeo demo Loom** e trocar URL placeholder na landing

### 6. **Implementar `/api/status/rss`** (linkado no footer da status page)

---

## ⚠️ Carry-overs de débito técnico (sem mudanças nesta sessão)

- 9 actions ainda usam helper local em vez de `requireWorkspace` central
- TOCTOU em `Broadcast.launch`
- Stripe sync ao force-downgrade não avisa cobrança pendente
- Audit dedup em retry
- Onboarding step "team invited" não detecta convite pending
- Auto-detect de incidentes (worker cria `StatusIncident` quando DB timeout > 3× em 5min)

---

## 🔑 Como demo agora

```bash
pnpm install        # já instalado
pnpm db:seed:granvilla  # idempotente, popula tudo
pnpm dev            # web + worker

# Browser: http://localhost:3000
# Login: claudio@granvilla.pet / Granvilla2026!
# Rotas chave:
#   /              landing nova (urgency banner + testimonials + vs BotConversa)
#   /inbox         30 conversas com nomes BR realistas
#   /whatsapp      → "Mensagem de teste" → IA responde no inbox
#   /forge         Forge em modo MOCK_AI (respostas canned)
#   /status        uptime live (sem auth)
#   /api/health?token=local_dev_health_detail_token_change_me  detail
```

Bom dia! ☕
