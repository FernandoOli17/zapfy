# ZapAI

SaaS multi-tenant de agente IA pra WhatsApp Business, com **Forge** — builder
conversacional que entrevista o cliente e gera todo o agente automaticamente
(system prompt, tom, tools, fluxos), com versionamento e rollback.

## Stack
Next.js 15 · TypeScript strict · Tailwind v4 · shadcn/ui · Prisma 6 · Postgres 16 +
pgvector · Better Auth · BullMQ + Redis · Pusher Channels · Anthropic SDK
(Sonnet 4.5 + Haiku 4.5) · Voyage AI · Stripe · Vercel + Railway.

## Pré-requisitos
- Node.js 20+ (testado em 24)
- pnpm 10 (`corepack enable && corepack prepare pnpm@10.4.1 --activate`)
- Docker Desktop (pra Postgres + Redis locais)

## Setup

```bash
# 1. Variáveis
cp .env.example .env

# 2. Infra local
docker compose up -d

# 3. Dependências
pnpm install

# 4. DB
pnpm db:migrate
pnpm db:seed

# 5. Dev
pnpm dev
```

Web em `http://localhost:3000`. Worker roda em paralelo.

## Estrutura

```
zapai/
├── apps/
│   ├── web/             # Next.js (marketing + dashboard + APIs)
│   └── worker/          # BullMQ workers
├── packages/
│   ├── db/              # Prisma schema + cliente
│   ├── ai/              # agente, Forge, tools, RAG
│   ├── wa/              # Meta Cloud API client
│   ├── shared/          # zod schemas, crypto, errors, constants
│   └── ui/              # shadcn compartilhado
├── PLAN.md              # plano de execução (vivo)
├── CLAUDE.md            # convenções
└── docker-compose.yml
```

## Comandos

| Comando | O que faz |
|---|---|
| `pnpm dev` | sobe web + worker |
| `pnpm lint` | lint em todos os pacotes |
| `pnpm typecheck` | TS check |
| `pnpm test` | testes (Vitest) |
| `pnpm db:migrate` | nova migration Prisma |
| `pnpm db:generate` | regenera client Prisma |
| `pnpm db:seed` | popula dev data |
| `pnpm db:studio` | abre Prisma Studio |

## Roadmap
Ver [PLAN.md](./PLAN.md).

## Convenções
Ver [CLAUDE.md](./CLAUDE.md).
