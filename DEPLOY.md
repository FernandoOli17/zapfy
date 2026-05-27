# DEPLOY — Trato em produção

Guia operacional pra colocar o Trato em produção. Cobre: providers usados, env vars
obrigatórias, sequência de deploy, runbook de incidentes, smoke tests pós-deploy.

## Stack de produção

| Camada       | Provider                           | Custo aprox./mês  |
|--------------|------------------------------------|-------------------|
| Web app      | **Vercel**                         | $20 (Pro)         |
| Worker       | **Railway** (worker process)       | $5–10             |
| Postgres     | **Neon** (com pgvector)            | $19 (Launch)      |
| Redis        | **Upstash** (BullMQ + rate limit)  | $10 (Pay-as-you-go) |
| Storage      | **UploadThing**                    | $10 (Pro)         |
| Pagamentos   | **Stripe**                         | % por transação   |
| WhatsApp     | **Meta Cloud API**                 | $0,005 / msg HSM  |
| IA principal | **Anthropic Claude**               | uso               |
| Embeddings   | **Voyage AI**                      | $0.18 / 1M tokens |
| Email        | **Resend**                         | $20 (Pro)         |
| Crash report | **Sentry**                         | $26 (Team)        |
| Analytics    | **PostHog**                        | $0 (free 1M evts) |
| Real-time    | **Pusher Channels**                | $49 (Startup)     |

**Total fixo ~$170/mês** + usage Anthropic + Meta + Stripe.

---

## Pré-deploy checklist

Antes de fazer deploy pra produção pela primeira vez:

- [ ] **DNS**: domínio `trato.dev` registrado, CNAME apontando pra Vercel
- [ ] **Neon**: instância criada, `pgvector` extension habilitada, branch `production` configurado
- [ ] **Upstash**: Redis criado em região US-East-1 (próximo da Vercel default)
- [ ] **Vercel**: projeto vinculado ao repo, build command `pnpm build --filter=@zapai/web`
- [ ] **Railway**: serviço worker apontando pra `apps/worker`, start command `pnpm start`
- [ ] **Stripe**: 3 produtos criados (STARTER R$97, PRO R$297, PREMIUM R$697), prices coletados
- [ ] **Meta**: App Business criado, WhatsApp Cloud API habilitada, webhook URL configurada
- [ ] **Sentry**: 2 projetos criados (`trato-web`, `trato-worker`), DSNs coletados
- [ ] **PostHog**: projeto criado, key coletada
- [ ] **Resend**: domínio `trato.dev` verificado (SPF + DKIM + DMARC)
- [ ] **UploadThing**: app criado, token coletado
- [ ] **Pusher**: cluster `sa1` (São Paulo), credentials coletadas
- [ ] **Anthropic / Voyage**: keys de produção com billing ativo

---

## Env vars (production)

Coloque na Vercel UI (ou via `vercel env`) E no Railway worker:

### Obrigatórias

```bash
# DB + Redis
DATABASE_URL="postgresql://...neon.tech/trato?sslmode=require"
REDIS_URL="rediss://...upstash.io:6379"
UPSTASH_REDIS_REST_URL="https://...upstash.io"
UPSTASH_REDIS_REST_TOKEN="..."

# Auth
BETTER_AUTH_SECRET="$(openssl rand -base64 48)"      # ≥32 chars
BETTER_AUTH_URL="https://trato.dev"
ENCRYPTION_KEY="$(openssl rand -hex 32)"             # 64 hex chars

# Meta WhatsApp
META_APP_SECRET="..."                                # opcional — workspaces trazem o seu
META_VERIFY_TOKEN="$(openssl rand -hex 16)"          # webhook verify

# Stripe
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_STARTER="price_..."
STRIPE_PRICE_PRO="price_..."
STRIPE_PRICE_PREMIUM="price_..."

# IA
ANTHROPIC_API_KEY="sk-ant-..."
VOYAGE_API_KEY="..."
OPENAI_API_KEY="sk-..."                              # whisper p/ audio do forge

# Email
RESEND_API_KEY="re_..."
EMAIL_FROM="Trato <ola@trato.dev>"

# Storage
UPLOADTHING_TOKEN="..."

# Real-time
PUSHER_APP_ID="..."
PUSHER_KEY="..."
PUSHER_SECRET="..."
PUSHER_CLUSTER="sa1"
NEXT_PUBLIC_PUSHER_KEY="..."
NEXT_PUBLIC_PUSHER_CLUSTER="sa1"

# Observability
SENTRY_DSN="https://...@sentry.io/..."               # web
NEXT_PUBLIC_SENTRY_DSN="https://...@sentry.io/..."   # client
NEXT_PUBLIC_POSTHOG_KEY="phc_..."
NEXT_PUBLIC_POSTHOG_HOST="https://us.i.posthog.com"

# App
NEXT_PUBLIC_APP_URL="https://trato.dev"
NODE_ENV="production"
HEALTH_DETAIL_TOKEN="$(openssl rand -hex 16)"        # /api/health?detail=<token>
```

### Opcionais (fallback se ausentes)

- `STRIPE_MOCK=true` — bypassa Stripe inteiro, deploy demo sem cobrar
- `MOCK_AI=true` — IA retorna respostas canned (testes / dev)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — OAuth Google (botão some sem)

---

## Sequência de deploy

### Primeira vez

1. **Aplicar schema no Neon**
   ```bash
   export $(grep -E "^DATABASE_URL=" .env | xargs)
   cd packages/db && npx prisma db push
   ```
2. **Build local pra validar**
   ```bash
   pnpm install
   pnpm typecheck
   pnpm lint
   pnpm build
   ```
3. **Push pra remote git**
   ```bash
   git push -u origin master
   ```
4. **Configurar Vercel project**
   - Root directory: `.` (monorepo, build filtra)
   - Build command: `pnpm build --filter=@zapai/web`
   - Install: `pnpm install`
   - Output: `apps/web/.next`
5. **Configurar Railway worker**
   - Source: `apps/worker`
   - Build: `pnpm install && pnpm --filter=@zapai/worker build`
   - Start: `pnpm --filter=@zapai/worker start`
6. **Wire webhooks**
   - **Stripe**: dashboard.stripe.com → webhooks → `https://trato.dev/api/webhooks/stripe` →
     events: `customer.subscription.*`, `invoice.payment_failed`, `checkout.session.completed`
   - **Meta**: developer.facebook.com → app → webhooks → `https://trato.dev/api/webhooks/meta` →
     subscribe: `messages`, `message_template_status_update`
7. **Smoke tests** (ver abaixo)

### Deploys subsequentes

```bash
# Local
git pull
pnpm install
pnpm typecheck && pnpm lint && pnpm test  # se houve mudança de schema:
cd packages/db && npx prisma db push      # se schema mudou

git add -A && git commit -m "..."
git push                                  # Vercel + Railway fazem auto-deploy
```

---

## Smoke tests pós-deploy

Em https://trato.dev:

1. **Landing carrega** → não retorna 500
2. **Signup → onboarding → dashboard** → cria user real, redireciona
3. **`/api/health`** → retorna `{ status: 'ok' }`
4. **Webhook Meta** (curl): `curl -X GET "https://trato.dev/api/webhooks/meta?hub.mode=subscribe&hub.verify_token=$META_VERIFY_TOKEN&hub.challenge=teste"` → retorna `teste`
5. **Stripe webhook**: `stripe trigger checkout.session.completed --account=acct_...`
6. **PostHog**: abrir landing → ver `$pageview` no dashboard PostHog dentro de 30s
7. **Sentry**: forçar erro intencional (rota /api/sentry-test?) → ver alert no Sentry
8. **Worker rodando**: Railway logs deve mostrar `Trato worker pronto`

Se algum falhar: **rollback** (Vercel UI → previous deployment → promote to prod).

---

## Runbook de incidentes

### Webhook Meta falha (>10% rejection rate)

1. Verificar `apps/web/src/app/api/webhooks/meta/route.ts:meta-incoming` no Sentry
2. Confirmar que webhook está retornando 200 em <1s (Meta exige). Se não, ver Vercel function timeout.
3. Mensagens enfileiradas pra processo lento? Ver BullMQ queue `process-message` no Upstash.

### Worker travado (mensagens não respondidas)

1. Railway → ver logs do worker
2. Se OOM: bump memória do plano Railway
3. Se Redis lento: verificar Upstash metrics
4. Restart manual: Railway → deploy → restart

### Stripe webhook retry storm

1. `stripe events resend evt_...` no dashboard
2. Verificar `STRIPE_WEBHOOK_SECRET` está em todos os deploys
3. Se assinatura inválida: regenerar via dashboard

### Banco lento / out of connections

1. Neon → metrics → connection count
2. Se `>90%`: aumentar pool no Prisma client OR upgrade Neon plan
3. Long-running queries: `pg_stat_activity` via Neon SQL editor

### Sentry recebendo spam de erros não-críticos

1. Adicionar pattern em `ignoreErrors` em `sentry.*.config.ts`
2. Redeployar
3. Resolver erro raiz se for legítimo

### Rollback

```bash
# Vercel
vercel rollback https://trato-<commit>.vercel.app --token=$VERCEL_TOKEN

# Railway: dashboard → deployments → previous → "Rollback"

# DB migration revert (raro — prisma db push é destrutivo se drop column):
# Não há mecanismo built-in. Faça backup ANTES.
cd packages/db && npx prisma migrate diff --from-schema-datasource ... --to-schema-datamodel ...
```

---

## Backups

- **Neon**: snapshots automáticos diários (incluídos no Launch plan). Restore via dashboard.
- **Stripe customer data**: mantido pela Stripe, ver `customer.id` em DB local.
- **Conversations / messages**: NÃO há backup externo automático. Considere job semanal pra exportar pra S3.

---

## Health check & monitoring

- `/api/health` retorna `{ status, timestamp }` por default
- `/api/health?detail=$HEALTH_DETAIL_TOKEN` retorna info detalhada (DB ping, Redis ping, etc.)
- Configurar **uptime monitor** (UptimeRobot, BetterStack, Pingdom) batendo `/api/health` a cada 5min
- Sentry deve receber alertas em error rate >1%
- PostHog dashboard de KPIs: signups/dia, broadcasts/semana, IA conversation count

---

## Custo escala

| Workspaces ativos | Custo aprox/mês |
|-------------------|-----------------|
| 1–50              | $170            |
| 50–200            | $250            |
| 200–500           | $400            |
| 500–1000          | $700            |
| 1000+             | revisar arquitetura (sharding DB?) |

Maior elasticidade: Anthropic uso, Meta HSM, Stripe %.

---

## Contato

Owner: Fernando (clara.maria280205@gmail.com)
Repo: github.com/.../trato (privado)
Issues: GitHub Issues
