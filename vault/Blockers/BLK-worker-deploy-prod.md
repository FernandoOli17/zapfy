---
id: BLK-worker-deploy-prod
type: blocker
status: open
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

## Como resolver (ação do usuário + eu)
1. Criar serviço no **Railway** apontando pra `apps/worker`:
   - Build: `pnpm install && pnpm --filter=@zapfy/worker build`
   - Start: `pnpm --filter=@zapfy/worker start`
2. Setar env no Railway (mesmo conjunto crítico do web + IA):
   `DATABASE_URL`, `REDIS_URL`, `ENCRYPTION_KEY`, `LOG_PII_SALT`,
   `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY` ([[BLK-voyage-api-key]]), `MOCK_AI` off.
3. Conectar um **número Meta real** num workspace ACTIVE (BYO em /whatsapp) e
   apontar o webhook Meta pra `https://www.zapfy.store/api/webhooks/whatsapp/...`.
4. Smoke: "Worker rodando" nos logs do Railway + mandar msg de teste real.

## Nota
O **Forge** (escrever prompts) NÃO depende disto — roda no web (Vercel). Só o
agente em runtime no WhatsApp depende do worker.
