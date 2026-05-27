---
tipo: cheatsheet
projeto: "[[index|Trato]]"
tags: [trato, operacoes, comandos]
atualizado: 2026-05-26
---

# Operações — Trato

> Comandos do dia a dia. Roda do root (`C:/Users/ferna/zapai`).

## Dev

```bash
pnpm install             # instala tudo
pnpm dev                 # turbo dev (web + worker)
pnpm lint                # turbo lint
pnpm typecheck           # turbo typecheck
pnpm test                # turbo test
```

## DB (Prisma)

```bash
pnpm db:generate         # regenera cliente Prisma
pnpm db:push             # sincroniza schema sem migration (dev)
pnpm db:migrate          # migration formal (com history)
pnpm db:seed             # roda packages/db/prisma/seed.ts
pnpm db:studio           # GUI do Prisma
pnpm db:reset            # ⚠️ apaga tudo
```

**⚠️ Lock conhecido (Windows):** se `db:generate` falhar com `EPERM ... query_engine-windows.dll.node`, fechar IDEs/dev servers e tentar novamente. Workaround temporário: `npx prisma generate --no-engine` gera só os tipos (mas quebra runtime que usa adapter Neon).

## Infra local (opcional, hoje usamos Neon + Upstash)

```bash
docker compose up -d     # postgres + redis local
docker compose down      # derruba
```

## Workers (BullMQ)

```bash
cd apps/worker && pnpm dev
```

Filas registradas:
- `process-message` (concurrency 5)
- `process-knowledge` (concurrency 2)
- `outgoing-webhook` (concurrency 10)
- `send-broadcast` (concurrency 3)
- `lgpd-hard-delete` (sweep horário)

## Smoke tests (custo zero, offline)

```bash
pnpm tsx scripts/smoke-expression.ts    # parser BRANCH (7 casos)
pnpm tsx scripts/smoke-templates.ts     # 6 templates + merge + render (51 casos)
pnpm tsx scripts/smoke-ai.ts            # 1 chamada Haiku real (~$0.0005)
```

## Build de produção

```bash
cd apps/web && pnpm next build
```

Gera 38 páginas (estático + dinâmico). ⚠️ Depende de `db:generate` ter rodado com engine completo (não só `--no-engine`).

## ENV vars críticas

Em `C:/Users/ferna/zapai/.env`:

| Var | Pra quê |
|---|---|
| `DATABASE_URL` | Neon Postgres (HTTP/WS via porta 443) |
| `REDIS_URL` | Upstash Redis (rediss://) |
| `BETTER_AUTH_SECRET` | 32 chars hex pra cookies de sessão |
| `BETTER_AUTH_URL` | URL base da app (localhost ou domínio) |
| `ENCRYPTION_KEY` | 64 chars hex pra AES-256-GCM de tokens Meta |
| `LOG_PII_SALT` | 16+ chars hex pra hashing de telefone em logs |
| `ANTHROPIC_API_KEY` | Sonnet 4.5 + Haiku 4.5 (caro — usar `MOCK_AI=true` em dev) |
| `VOYAGE_API_KEY` | Embeddings RAG |
| `OPENAI_API_KEY` | Whisper-1 pra áudio do [[Forge]] (opcional) |
| `STRIPE_SECRET_KEY` | Billing (opcional MVP) |
| `MOCK_AI=true` | Desliga IA real, retorna canned (custo zero) |
| `HEALTH_DETAIL_TOKEN` | Bearer pra `/api/health` modo detalhado (opcional) |

Ver `.env.example` pro template completo.

## Deploy

- **Web:** Vercel (Next.js 15 nativo)
- **Worker:** Railway (Node.js, sempre on, BullMQ consumer)
- **DB:** Neon (já configurado, free tier)
- **Redis:** Upstash (já configurado, free tier)
- **Storage:** UploadThing (configurado, sem uso ainda)

## Debugging

```bash
# Capturar logs do worker
cd apps/worker && pnpm dev | tee /tmp/worker.log

# Filtrar logs por job
grep "process-message" /tmp/worker.log

# Inspecionar fila BullMQ via Redis
redis-cli -u $REDIS_URL
> KEYS bull:process-message:*
> LRANGE bull:process-message:wait 0 -1
```

## Comandos `gh` / git úteis

```bash
git log --oneline -20                  # história curta
git diff HEAD --stat                   # mudanças não-commitadas
gh pr list                             # PRs abertos
gh pr create                           # criar PR
gh api repos/:owner/:repo/pulls/N/comments  # ler comments
```
