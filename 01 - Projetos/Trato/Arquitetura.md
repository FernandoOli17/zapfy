---
tipo: arquitetura
projeto: "[[index|Trato]]"
tags: [trato, arquitetura, infra]
atualizado: 2026-05-26
---

# Arquitetura — Trato

> Como as peças conversam.

## Visão alto-nível

```
┌──────────────┐   POST       ┌──────────────────┐
│ WhatsApp     │ ───────────▶ │ /api/webhooks/   │ ──── enqueue ──▶ Redis
│ Cloud API    │  HMAC SHA256 │ whatsapp/[id]    │                  │
└──────────────┘              └──────────────────┘                  │
       ▲                                                            ▼
       │ sendText                                          ┌──────────────────┐
       │                                                   │  Worker BullMQ   │
       │                                                   │  process-message │
       │                                                   └──────────────────┘
       │                                                            │
       │                       ┌────────────────────────────────────┤
       │                       ▼                                    │
┌──────────────┐       ┌──────────────┐       ┌──────────────┐      │
│  Cloud API   │◀───── │ runAgent OU  │◀──────│  classifier  │      │
│   reply      │       │ executeFlow  │       │   (Haiku)    │      │
└──────────────┘       └──────────────┘       └──────────────┘      │
                              │ RAG                                 │
                              ▼                                     │
                       ┌──────────────┐                             │
                       │  pgvector    │                             │
                       │  + FTS pt-BR │◀────────────────────────────┘
                       └──────────────┘
```

## Componentes

### apps/web (Next.js 15)

- **Marketing** (`(marketing)`): landing, /precos, /casos/[vertical], /blog, /sobre, /termos, /privacidade, /lgpd, /contato
- **Auth** (`(auth)`): login, signup, forgot-password, reset-password
- **App** (`(app)`): dashboard, inbox, [[Forge]], [[Modo Desenvolvedor|/developer]], /agent, /knowledge, /whatsapp, /contacts, /automations, /analytics, /team, /settings, /billing, /integrations
- **APIs**: `/api/auth/[...all]`, `/api/webhooks/whatsapp/[phoneNumberId]`, `/api/webhooks/stripe`, `/api/lgpd/{export,delete,opt-out}`, `/api/realtime/auth`, `/api/health`, `/api/forge/transcribe`

### apps/worker (BullMQ consumer)

Filas:
- **process-message** — agente IA responde mensagem inbound (concurrency 5)
- **process-knowledge** — chunk + embed via Voyage AI (concurrency 2)
- **outgoing-webhook** — dispatch HMAC-signed pra cliente (concurrency 10)
- **send-broadcast** — broadcast HSM (concurrency 3 pra não estourar Meta)
- **lgpd-hard-delete** — purge agendada (sweep horário)

### packages/

- `@zapai/db` — Prisma schema (32 modelos) + cliente
- `@zapai/ai` — agente runner, [[Forge]], [[Habilidades|templates]], guards, [[Modo Desenvolvedor|flow]] executor, RAG, embeddings, knowledge processing, prompt caching
- `@zapai/wa` — cliente WhatsApp Cloud API tipado, webhook validation HMAC
- `@zapai/shared` — crypto AES-256-GCM, SSRF guard, logger Pino, schemas Zod compartilhados
- `@zapai/ui` — shadcn/ui components

## Pipelines

### Pipeline padrão (Forge → publish → atender)

1. `/forge` — usuário conversa com o builder (texto ou áudio Whisper)
2. Forge classifica vertical → oferece [[Habilidades|template]] → aplica → REVIEW
3. PUBLISH cria `AgentVersion` no DB (versionado)
4. `/whatsapp` — usuário conecta Cloud API (credenciais cifradas AES-256-GCM)
5. Cliente final manda mensagem → webhook → enqueue `process-message`
6. Worker carrega `AgentVersion`, roda classifier (Haiku) → handoff? → RAG search → `runAgent` (Sonnet) → sendText
7. UsageRecord criado pra billing

### Pipeline custom (modo desenvolvedor)

Mesmo até passo 6, mas:
6. Worker detecta `agentVersion.flowGraph !== null` → roda `executeFlow()` em vez de `runAgent()`
6.1. Walk no grafo: TRIGGER → CLASSIFY → RAG_SEARCH → BRANCH → AGENT_RESPONSE → END
6.2. Fallback gracioso: se executor lançar, cai pra `runAgent()` default

Ver [[Modo Desenvolvedor]] pra detalhes.

## Segurança

- **HMAC** SHA-256 com `timingSafeEqual` em todo webhook (Meta + outgoing customer)
- **AES-256-GCM** em tokens Meta (per-record IV)
- **SSRF guard** (`packages/shared/src/ssrf.ts`) em qualquer fetch de URL externa
- **HTTP security headers** em `next.config.ts` (CSP, HSTS, X-Frame-Options DENY, etc)
- **Rate limit** Upstash em todas rotas sensíveis + middleware Edge pra auth
- **RBAC** por role (OWNER > ADMIN > AGENT) em billing, whatsapp, team, /developer

Ver [[Segurança]] pra detalhe.

## Decisões de design importantes

- **Multi-tenant**: `workspaceId` FK em TUDO, scopedDb helper
- **Versionamento**: AgentVersion preserva flowGraph do dev mode no re-publish do Forge
- **Mock-friendly**: `MOCK_AI=true` desliga API calls pra dev sem custo
- **Prompt caching** obrigatório >1024 tokens (CLAUDE.md) — `providerOptions.anthropic.cacheControl` em todo `generateText`

Ver [[Decisões]] pra contexto histórico.

## Próximos passos

→ [[Roadmap]]
