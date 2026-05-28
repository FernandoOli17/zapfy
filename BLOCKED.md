# Bloqueios — credenciais e ações manuais do usuário

Atualizado: 2026-05-28 (sessão 4 — retomada pós-credenciais)

> **Aviso desta sessão:** o usuário disse que tinha adicionado Pusher Channels,
> mas auditoria do `.env` mostrou que **só o cluster** (`PUSHER_CLUSTER=us2`)
> está setado. `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET` e
> `NEXT_PUBLIC_PUSHER_KEY` continuam vazios. O código já trata isso com no-op
> silencioso em `pusher-server.ts` e `pusher-client.ts` — sem credencial,
> real-time é desativado mas nada quebra (inbox usa router.refresh manual).

---

## 🔴 CRÍTICO — bloqueiam features grandes

### [GIT] Repositório remoto
**Status:** ainda local, sem `git remote`. ~38 commits acumulados.
**Pra resolver:** criar repo no GitHub e rodar `git remote add origin <url> && git push -u origin master`.

### [META WhatsApp] Credenciais do app
**Status:** modelo BYO funcional — cada workspace cadastra suas próprias credenciais Meta na UI `/whatsapp`.
- Webhook de teste em `/whatsapp` (botão "Mensagem de teste") **funciona sem credenciais Meta**, simulando webhook completo. Perfeito pra demo.
- Pra prod com cliente real: o cliente cadastra phoneNumberId / businessAccountId / accessToken / appSecret no formulário.

### [STRIPE] Credenciais reais
**Status:** `STRIPE_MOCK=true` ativado nesta sessão (`.env`). `getStripeClient()` retorna null e UI mostra modo demo. `syncStripeSubscription` é no-op em mock.
**Pra prod:** preencher `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER/PRO/PREMIUM` e remover `STRIPE_MOCK=true` (ou deixar em staging).

---

## 🟡 IMPORTANTE — features funcionam parcialmente sem isso

### [ANTHROPIC] IA do agente e Forge
**Status:** `MOCK_AI=true` ativado nesta sessão (`.env`). Agente e classifier retornam respostas canned determinísticas. Forge funciona, publica AgentVersion, mas o conteúdo do system prompt é mockado.
**Pra prod:** preencher `ANTHROPIC_API_KEY` e remover `MOCK_AI=true`.

### [VOYAGE AI] Embeddings RAG
**Status:** sem `VOYAGE_API_KEY`, `processKnowledge` falha silenciosamente. Documentos uploadados ficam com status ERROR. RAG fica desabilitado — agente responde sem buscar conhecimento.
**Pra prod:** preencher `VOYAGE_API_KEY`.

### [RESEND] E-mails transacionais
**Status:** sem `RESEND_API_KEY`, `sendEmail()` cai em modo dev (log no console). Worker `email-sequences.ts` AINDA persiste em `EmailSent` pra idempotência.
**Pra prod:** preencher `RESEND_API_KEY` + `RESEND_FROM_EMAIL` (já tem placeholder `noreply@zapai.dev` — trocar pra `ola@trato.dev` quando registrar domínio).

### [PUSHER] Real-time inbox
**Status:** **somente cluster setado** (`PUSHER_CLUSTER=us2`). `APP_ID`, `KEY`, `SECRET` vazios. Inbox funciona via refresh manual; sem real-time push de novas mensagens.
**Pra resolver:** criar app no [dashboard.pusher.com](https://dashboard.pusher.com), copiar credenciais pra `.env`. Cluster `sa1` (São Paulo) é recomendado pra latência BR.

### [UPSTASH REST] Rate limit produção
**Status:** `REDIS_URL` (BullMQ via ioredis) funcionando. Mas `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` vazios — rate limit em `apps/web/src/lib/rate-limit.ts` cai em no-op silencioso (sempre permite). Aceitável em dev, **não pra prod**.
**Pra resolver:** copiar `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` do dashboard Upstash pra `.env`.

### [SENTRY] Crash reporting
**Status:** `SENTRY_DSN` vazio → `captureException()` no-op. Erros em prod ficam só nos logs do Vercel/Railway, sem agregação.
**Pra resolver:** criar 2 projetos no Sentry (`trato-web`, `trato-worker`), copiar DSNs.

### [POSTHOG] Product analytics
**Status:** `NEXT_PUBLIC_POSTHOG_KEY` vazio → client posthog não inicializa. Sem analytics de uso.
**Pra resolver:** criar projeto, copiar key. Host já configurado (`https://us.i.posthog.com`).

### [LOOM/VIMEO] Vídeo demo
**Status:** placeholder na landing aponta pra `https://www.loom.com/share/placeholder-trato-demo`. Não quebra UI mas link 404.
**Pra resolver:** gravar vídeo e substituir URL em `apps/web/src/app/(marketing)/page.tsx`.

### [GOOGLE OAUTH] Login com Google
**Status:** `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` vazios. Botão "Continuar com Google" no signup/login fica disabled.

### [GOOGLE CALENDAR] Tool de Clínica
**Status:** tool `book_appointment` opera só no DB local sem sincronizar com Google Calendar do profissional.

### [UPLOADTHING] Upload de mídia/imagens
**Status:** `UPLOADTHING_TOKEN` vazio → upload de imagens em produtos / knowledge falha. UI mostra erro.

### [HEALTH_DETAIL_TOKEN] já configurado nesta sessão
Token `local_dev_health_detail_token_change_me` setado em dev pra liberar `/api/health?token=...` detalhado. **Trocar antes de prod.**

---

## 🟢 QUANDO PUDER

### [DOMÍNIO] trato.dev
Registrar e apontar CNAME pra Vercel. Subdomínio `status.trato.dev` referenciado na página `/status`.

---

## ✅ Já desbloqueados (estado atual)

- **DATABASE_URL** (Neon Postgres) — funcional. Health ping 196ms.
- **REDIS_URL** (Upstash ioredis pra BullMQ) — funcional.
- **BETTER_AUTH_SECRET** + **BETTER_AUTH_URL** — auth funcional (signup/login validados E2E).
- **ENCRYPTION_KEY** + **LOG_PII_SALT** — criptografia tokens Meta funcional.
- **MOCK_AI=true** + **STRIPE_MOCK=true** — modos demo ativos, agente e billing rodam sem APIs externas.
- **HEALTH_DETAIL_TOKEN** — endpoint `/api/health?token=...` retorna check detalhado de todos os serviços.
- **Seed Granvilla Pet Shop** — `pnpm db:seed:granvilla` funcional após fix do Neon adapter no script.

---

## 🟡 Débitos técnicos (carry-over)

- 9 actions ainda usam helper local em vez de `requireWorkspace` central
- TOCTOU em `Broadcast.launch`
- Stripe sync ao force-downgrade não avisa cobrança pendente
- Audit dedup em retry
- Onboarding step "team invited" não detecta convite pending
- Warnings de build: OpenTelemetry/Sentry/BullMQ "Critical dependency: the request of a dependency is an expression" — esperado, não bloqueia. Edge runtime do better-auth tem warning de CompressionStream (não usado em runtime real).
- Warning `experimental.typedRoutes` movido pra `typedRoutes` — **fixed nesta sessão**.
- Warning ESLint plugin Next não detectado em `eslint.config.*` — cosmético, ignorável.

---

## 📋 Demo com cliente AGORA

Nenhuma credencial nova bloqueia a demo:
- Login: `claudio@granvilla.pet` / `Granvilla2026!` (workspace `granvilla-pet-shop`)
- `/whatsapp` → "Mensagem de teste" → agente responde no inbox
- `/status` mostra uptime em tempo real
- Todas as principais rotas funcionam: dashboard, inbox, products, orders, appointments, analytics, billing (modo demo), forge (mock IA).

Pra colocar staging no ar: ver `DEPLOY.md` — falta criar projetos Vercel + Railway + setar env vars no dashboard. Sem domínio próprio, Vercel dá URL `*.vercel.app`.
