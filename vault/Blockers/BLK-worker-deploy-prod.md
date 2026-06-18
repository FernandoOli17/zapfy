---
id: BLK-worker-deploy-prod
type: blocker
status: resolved
resolved: 2026-06-03
severity: high
owner: user
requires: Railway worker + Meta number
created: 2026-05-29
related: [BLK-voyage-api-key]
tags: [blocker, area/infra, phase/6]
---
# WhatsApp não responde em prod — worker não está deployado

## O que está bloqueado
Testar o **agente respondendo no WhatsApp** em produção (zapfy.store). O webhook
(Vercel) recebe e enfileira em BullMQ/Upstash, mas **nenhum processo consome a
fila** → a IA nunca responde, mesmo com `ANTHROPIC_API_KEY` setada.

## Diagnóstico (2026-05-29)
- Não há config de deploy do worker no repo (sem `railway.json`/`Procfile`).
- `DEPLOY.md` lista Railway como passo pendente ("Configurar Railway worker:
  source `apps/worker`, start `pnpm --filter=@zapfy/worker start`").
- `BLOCKED.md`: "falta criar projetos Vercel + Railway". Só o web (Vercel) no ar.
- `apps/worker` tem `start`/`build` ok; é um consumidor BullMQ (ioredis→Upstash).

## Config de deploy criada (2026-06-03)
`railway.json` no root do repo já define build + start + restart policy:
- Build: `pnpm install --frozen-lockfile && pnpm --filter @zapfy/db db:generate`
  (gera o Prisma client; o worker roda via `tsx`, não precisa de `tsc build`).
- Start: `pnpm --filter @zapfy/worker start` (`node --import tsx src/index.ts`).
**Falta só** o usuário criar o serviço no Railway apontando pro repo + setar env.

## Como resolver (ação do usuário + eu)
1. Criar serviço no **Railway** conectado ao repo GitHub (root dir = `.`).
   O `railway.json` já cuida de build/start. **Pinar Node ≥20.6** (o `node --import`
   exige): setar env `NIXPACKS_NODE_VERSION=20` no Railway (default do Nixpacks pode ser 18).
2. Setar env no Railway (mesmo conjunto crítico do web + IA):
   `DATABASE_URL`, `REDIS_URL`, `ENCRYPTION_KEY`, `LOG_PII_SALT`,
   `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY` ([[BLK-voyage-api-key]]), `MOCK_AI` off,
   `NIXPACKS_NODE_VERSION=20`.
3. Conectar um **número Meta real** num workspace ACTIVE (BYO em /whatsapp) e
   apontar o webhook Meta pra `https://www.zapfy.store/api/webhooks/whatsapp/...`.
4. Smoke: "Worker rodando" nos logs do Railway + mandar msg de teste real.

## Nota
O **Forge** (escrever prompts) NÃO depende disto — roda no web (Vercel). Só o
agente em runtime no WhatsApp depende do worker.
