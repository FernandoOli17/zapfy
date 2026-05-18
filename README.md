# ZapAI

> SaaS multi-tenant de agente IA pra WhatsApp Business, com **Forge** — builder
> conversacional que entrevista o cliente e gera todo o agente automaticamente
> (system prompt, tom, tools, fluxos), com versionamento e rollback.

## Stack

Next.js 15 · TypeScript strict · Tailwind v4 · Prisma 6 · Postgres 16 + pgvector ·
Better Auth · BullMQ + Redis · Pusher Channels · Anthropic SDK / OpenAI (via Vercel AI
SDK) · Voyage AI · Stripe Subscriptions · Resend · UploadThing · Sentry · PostHog ·
Vercel (web) + Railway (worker).

## Funcionalidades implementadas

### Marketing público
- Landing editorial (Geist + Instrument Serif, paleta zinc + verde elétrico)
- `/precos` com 3 planos + tabela comparativa + FAQ
- `/casos/[vertical]` × 5 (ecommerce, clínica, restaurante, infoproduto, serviço)
- `/blog` MDX com 3 posts seed + OG image dinâmica por post
- `/sobre`, `/contato` (Resend), `/termos`, `/privacidade`, `/lgpd`
- `/api/health` + `robots.txt` + `sitemap.xml` + PWA manifest + OG image dinâmica

### Auth
- Better Auth: email/senha + Google OAuth + magic link via Resend
- Rate limiting Upstash em signup e contato

### Dashboard
- `/dashboard` bento com stats reais + CTA Forge
- `/forge` — state machine de 10 fases, meta-prompt, tools com Zod, preview ao vivo
- `/inbox` — chat 3 colunas com Pusher real-time (graceful fallback) + send via Cloud API
- `/contacts` — lista + busca + filtro por tag + **import CSV**
- `/agent` — histórico de AgentVersion + rollback (Owner/Admin)
- `/knowledge` — adicionar URL (scrape) ou texto manual
- `/whatsapp` — conectar número Meta (tokens AES-256-GCM) + webhook receiver
- `/automations/templates` — HSM templates CRUD
- `/analytics` — Recharts (mensagens/dia, status, top tags, handoff rate)
- `/team` — membros + papéis
- `/integrations` — API keys scoped + **outgoing webhooks** (HMAC-SHA256)
- `/billing` — Stripe checkout + customer portal + usage bars + plan limits
- `/settings` — workspace + audit log + danger zone (delete cascateado)

### APIs públicas
- `POST /api/lgpd/{export,delete,opt-out}` — autenticadas via API key + scopes,
  rate-limited
- `POST /api/webhooks/whatsapp/[phoneNumberId]` — receiver com HMAC validation
- `POST /api/webhooks/stripe` — sincroniza Subscription
- `GET /api/health` — readiness probe (DB + integrações opcionais)

### Worker (apps/worker)
- BullMQ com 4 filas: `process-message`, `send-broadcast`, `outgoing-webhook`,
  `lgpd-hard-delete`
- Repeatable sweep de LGPD hard delete (1h)
- Retry exponencial em webhooks (4xx ≠ 429 não retry, 5xx + 429 retry)

## Pré-requisitos

- Node.js 20+ (testado em 24)
- pnpm 10 (`npm install -g pnpm@10.4.1`)
- Postgres 16 com pgvector — recomendado: [Neon](https://neon.tech) free tier
- Redis — recomendado: [Upstash](https://upstash.com) free tier
- Opcional: Docker Desktop pra Postgres + Redis locais

## Setup local (cloud)

```bash
# 1. Variáveis (preencha .env)
cp .env.example .env
# Obrigatórias: DATABASE_URL, REDIS_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL,
# ENCRYPTION_KEY, LOG_PII_SALT, NEXT_PUBLIC_APP_URL

# 2. Dependências
pnpm install

# 3. Schema do banco (uma vez)
pnpm db:push

# 4. Dev
pnpm dev          # sobe web + worker (Turborepo)
```

Web em `http://localhost:3000`. Worker conecta no Redis e processa filas.

## Setup local (Docker)

```bash
docker compose up -d
# Postgres em localhost:5432 com user/pwd/db = zapai
# Redis em localhost:6379

pnpm install
pnpm db:push
pnpm dev
```

## Estrutura

```
zapai/
├── apps/
│   ├── web/                 # Next.js (marketing + dashboard + APIs)
│   │   ├── content/blog/    # MDX dos posts
│   │   └── src/
│   │       ├── app/
│   │       │   ├── (marketing)/   # landing + casos + blog + legais
│   │       │   ├── (auth)/        # login / signup
│   │       │   ├── (app)/         # dashboard logado
│   │       │   ├── onboarding/    # criar workspace
│   │       │   └── api/           # webhooks, lgpd, health, auth
│   │       ├── lib/                # auth, plans, email, queues, rate-limit, etc.
│   │       └── components/
│   └── worker/              # BullMQ workers
│       └── src/jobs/        # lgpd-hard-delete, outgoing-webhook
├── packages/
│   ├── db/                  # Prisma schema + client + scopedDb helper
│   ├── ai/                  # Forge state machine + meta-prompt + tools
│   ├── wa/                  # Meta Cloud API client tipado
│   ├── shared/              # crypto, errors, constants, schemas, logger
│   └── ui/                  # Button/Input/Label/Card + tokens Tailwind v4
├── PLAN.md                  # estado de execução
├── CLAUDE.md                # convenções (TS strict, Zod, multi-tenant)
└── docker-compose.yml       # Postgres + Redis local
```

## Comandos

| Comando | O que faz |
|---|---|
| `pnpm dev` | Sobe web + worker (Turborepo) |
| `pnpm lint` | Lint em todos os packages |
| `pnpm typecheck` | TS check |
| `pnpm test` | Vitest |
| `pnpm db:push` | Aplica schema direto (dev) |
| `pnpm db:migrate` | Cria migration (prod) |
| `pnpm db:generate` | Regera Prisma client |
| `pnpm db:seed` | Popula dev data |
| `pnpm db:studio` | Prisma Studio (UI do banco) |

## Variáveis de ambiente

### Obrigatórias

| Variável | Como obter |
|---|---|
| `DATABASE_URL` | Postgres connection string. Neon: copia do dashboard com `?sslmode=require` |
| `REDIS_URL` | Redis URL. Upstash: `rediss://` (note `rediss` com 2 `s` pra TLS) |
| `BETTER_AUTH_SECRET` | `openssl rand -hex 32` |
| `BETTER_AUTH_URL` | URL pública (`http://localhost:3000` em dev) |
| `ENCRYPTION_KEY` | `openssl rand -hex 32` — cifra tokens da Meta |
| `LOG_PII_SALT` | `openssl rand -hex 16` — sal pra hash de PII em log |
| `NEXT_PUBLIC_APP_URL` | URL pública (mesmo que `BETTER_AUTH_URL`) |

### Opcionais (graceful fallback se não setadas)

| Integração | Variáveis |
|---|---|
| **Anthropic** (Forge + agente) | `ANTHROPIC_API_KEY` (+ opcional `AI_PROVIDER=anthropic`) |
| **OpenAI** (alternativo) | `OPENAI_API_KEY` (+ `AI_PROVIDER=openai`) |
| **Voyage AI** (embeddings RAG) | `VOYAGE_API_KEY` |
| **Stripe** (billing) | `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` + `STRIPE_PRICE_{STARTER,PRO,PREMIUM}` |
| **Pusher** (inbox real-time) | `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER` + `NEXT_PUBLIC_PUSHER_*` |
| **Upstash REST** (rate limit) | `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` |
| **Resend** (emails) | `RESEND_API_KEY` + `RESEND_FROM_EMAIL` |
| **UploadThing** (uploads) | `UPLOADTHING_TOKEN` |
| **Sentry** (error tracking) | `SENTRY_DSN` |
| **Google OAuth** | `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` |

## Deploy

### Web → Vercel

```bash
vercel login
vercel link        # raiz do monorepo, não apps/web
```

Adicione as envs no dashboard ou via CLI:
```bash
vercel env add DATABASE_URL production
vercel env add BETTER_AUTH_SECRET production
# ... resto das envs ...
vercel --prod
```

**Configurações importantes no dashboard Vercel:**
- Root Directory: raiz do repo (não `apps/web` — Turborepo precisa do root)
- Build Command: `pnpm db:generate && pnpm --filter @zapai/web build`
- Output Directory: `apps/web/.next`
- Install Command: `pnpm install`
- Node.js Version: 20+

### Worker → Railway

1. Crie service novo conectado ao repo
2. Settings → **Root Directory:** `apps/worker`
3. Settings → **Start Command:** `node --import tsx src/index.ts`
4. Variables: copie `DATABASE_URL`, `REDIS_URL`, `ENCRYPTION_KEY`, `LOG_PII_SALT`,
   `ANTHROPIC_API_KEY` (ou OpenAI). Restante opcional.

### Postgres → Neon

1. Crie projeto em [neon.tech](https://neon.tech)
2. SQL Editor: `CREATE EXTENSION IF NOT EXISTS vector;`
3. Copia connection string e use em `DATABASE_URL`
4. Localmente: `pnpm db:push` (uma vez, com rede liberada na porta 5432)

### Redis → Upstash

1. Crie banco em [upstash.com](https://upstash.com) tier free
2. Copia URL no formato `rediss://...` (TLS)
3. Use em `REDIS_URL`

### Stripe webhook

Endpoint:
```
https://seusite.com/api/webhooks/stripe
```

Eventos pra inscrever:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `checkout.session.completed`
- `invoice.paid`
- `invoice.payment_failed`

### Meta WhatsApp Cloud API

Cliente cola credenciais no `/whatsapp` no dashboard. Webhook callback URL:
```
https://seusite.com/api/webhooks/whatsapp/{phone_number_id}
```
Verify token é gerado pelo dashboard e exibido pra colar na Meta.

## Health check

```bash
curl https://seusite.com/api/health
# 200 com JSON descrevendo status de DB + integrações opcionais
```

Retorna 503 se DB cair.

## Roadmap

Ver [PLAN.md](./PLAN.md).

## Convenções

Ver [CLAUDE.md](./CLAUDE.md).
