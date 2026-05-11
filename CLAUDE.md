# ZapAI — Convenções do Projeto

Este arquivo é a referência viva. Leia antes de começar qualquer fase. Atualize quando
uma convenção mudar.

## Stack
- **Monorepo:** pnpm workspaces + Turborepo
- **Frontend:** Next.js 15 (App Router), TypeScript strict, Tailwind v4, shadcn/ui + Radix,
  Framer Motion, next-intl (pt-BR ativo)
- **Backend:** Next.js Route Handlers + tRPC v11 (interno) + REST (webhooks)
- **DB:** Postgres 16 + Prisma 6 + extensão pgvector
- **Auth:** Better Auth (email/senha + Google OAuth + magic link)
- **Filas:** BullMQ + Redis (Upstash prod / container dev)
- **Real-time:** Pusher Channels
- **IA:** Anthropic SDK — `claude-sonnet-4-5` (agente principal), `claude-haiku-4-5` (classifier)
- **Embeddings:** Voyage AI `voyage-3` (1024 dims)
- **WhatsApp:** Meta Cloud API v21+ (sem libs não-oficiais)
- **Pagamentos:** Stripe Subscriptions
- **Storage:** UploadThing
- **Observabilidade:** Sentry + PostHog + Pino (logs estruturados)
- **Email transacional:** Resend
- **Deploy:** Vercel (web) + Railway (worker + Postgres + Redis dev/staging)

## Estrutura
```
zapai/
├── apps/
│   ├── web/         # Next.js (marketing + dashboard + admin + APIs)
│   └── worker/      # processa BullMQ (mensagens, embeddings, broadcasts)
├── packages/
│   ├── db/          # Prisma schema + cliente
│   ├── ai/          # agente, Forge, RAG, tools, playbooks
│   │   └── src/
│   │       ├── forge/      # state machine + meta-prompt
│   │       ├── tools/      # uma função por arquivo, Zod schema exportado
│   │       └── playbooks/  # templates por vertical
│   ├── wa/          # cliente Cloud API tipado
│   ├── shared/      # zod schemas, tipos, crypto, constants
│   └── ui/          # componentes shadcn compartilhados
├── docker-compose.yml
├── turbo.json
├── PLAN.md          # estado de execução
├── CLAUDE.md        # este arquivo
└── README.md
```

## TypeScript
- `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`
- Proibido `any` — use `unknown` + narrow
- Proibido `// @ts-ignore` / `// @ts-expect-error` sem comentário explicando + link/ticket

## Validação (Zod em toda boundary externa)
- Env vars: `@t3-oss/env-nextjs` (`apps/web/src/env.ts`, `apps/worker/src/env.ts`)
- tRPC inputs
- Server actions
- Route handler bodies (webhooks Meta + Stripe)
- Argumentos de tool de IA (cada tool exporta seu schema)
- Schemas compartilhados em `packages/shared/src/schemas/`

## Erros
- Classe base `AppError extends Error` com `code: string`, `httpStatus: number`, `userMessage: string`
- Subclasses por domínio: `AuthError`, `WorkspaceError`, `WhatsAppError`, etc.
- **Proibido `catch {}` (swallow).** Sempre logue ou propague.
- Captura no boundary (route handler / tRPC procedure / worker job) mapeia pra HTTP/retry.

## React / Next
- **Server Components por default.** `"use client"` só com motivo (interatividade, hooks de browser).
- `next/image`, `next/font` (Geist), `next/dynamic` quando fizer sentido
- Acessibilidade AA: labels, aria-*, foco visível, contraste verificado
- Não usar `<a>` cross-route — use `<Link>`

## Estilo / Design
- **Tipografia:** Geist (sans + mono) via `next/font`. Instrument Serif italic em moments editoriais.
  **Não usar Inter.**
- **Paleta:** zinc/neutro escuro + accent verde elétrico (#00E676 ou aproximado).
  Modo claro e escuro com toggle.
- **Proibido:** gradientes purple-pink genéricos, hero com mockup flutuante, "trusted by Google/Microsoft" falso.
- Animações Framer Motion sutis em entrada + hover micro-interactions.
- Mobile-first absoluto.
- Layouts ousados: assimetria, alternância texto-imagem, números grandes em métricas.

## Multi-tenant / segurança
- Middleware tRPC injeta `ctx.workspaceId` a partir da sessão.
- Helper Prisma `scopedDb(workspaceId)` adiciona `where: { workspaceId }` em toda query —
  auditar uso (todo acesso a entidade de workspace passa por aqui).
- **Cripto:** tokens Meta cifrados AES-256-GCM. Helper em `packages/shared/src/crypto.ts`.
  Chave em `ENCRYPTION_KEY` (64 hex chars). IV único por registro. Auth tag verificada.
- **Rate limit** com `@upstash/ratelimit`:
  - 100 req/min por IP em rotas públicas
  - 10 signup/IP/hora
  - Webhook WA sem rate limit (Meta faz retry agressivo)
- **CSRF:** automático via Better Auth + sameSite cookies
- **Soft delete** (`deletedAt`) em entidades sensíveis (Contact, Conversation, Message)

## Logs (Pino)
- Estruturado JSON, com `requestId`, `workspaceId`, `userId` quando disponíveis
- **Sem PII em texto plano.** Telefone hasheado (sha256 + salt do env) em log.
- Níveis: `fatal | error | warn | info | debug`. `debug` só em dev.

## LGPD
- `POST /api/lgpd/export` — exporta tudo do contato em JSON
- `POST /api/lgpd/delete` — soft delete + hard delete agendado em 30 dias (job BullMQ)
- `POST /api/lgpd/opt-out` — marca contato como "não contatar"
- Mensagens em texto plano no DB (precisa RAG/busca). TDE do Railway mitiga at-rest.
  **Mencionar isso na privacy policy.**

## WhatsApp Cloud API — regras invioláveis
- Webhook **deve retornar 200 em <1s sempre** — enfileira e devolve. Processamento pesado no worker.
- Validar `x-hub-signature-256` com HMAC SHA-256 usando o `appSecret` do workspace.
- Janela de 24h: se `lastIncomingMessageAt` > 24h, **bloqueia mensagem livre** e exige template HSM.
- Mensagens > 1024 chars: dividir em múltiplas mensagens (não cortar no meio de palavra).
- Status de mensagem (sent → delivered → read → failed) sincronizado em todo `Message`.

## Testes
- **Unitário:** Vitest pra packages puros (`packages/ai`, `packages/wa`, `packages/shared`)
- **Integração:** Postgres real (containerizado), **não mockar DB**
- **E2E:** Playwright — fluxo signup → Forge → publicar agente → simular webhook Meta →
  ver msg no inbox → IA responde (com Meta mockada via fixture HTTP em `test/`).
- Snapshot de prompt gerado pelo Forge versionado (mudança intencional precisa rebaselining explícito).

## Anthropic SDK
- Usar `@anthropic-ai/sdk` mais recente
- **Prompt caching obrigatório** em qualquer prompt > 1024 tokens (system prompt do agente,
  RAG context, exemplos few-shot). Anthropic 4.7 cobra desconto pesado em cache hit.
- Sempre tipar tool defs com Zod → JSON Schema
- Loop de tool calls com max iterations e timeout — nunca confiar que o modelo para sozinho

## Comandos (rodar do root)
```bash
pnpm install             # instala tudo
pnpm dev                 # turbo dev (web + worker)
pnpm lint                # turbo lint
pnpm typecheck           # turbo typecheck
pnpm test                # turbo test
pnpm db:migrate          # prisma migrate dev
pnpm db:seed             # tsx packages/db/prisma/seed.ts
pnpm db:studio           # prisma studio
docker compose up -d     # postgres + redis local
docker compose down      # derruba local
```

## Workflow por fase (regra de ouro)
1. **Mostre o que vai fazer** — lista clara antes de tocar em arquivo
2. **Faça** — implementação completa, sem deixar pela metade
3. **`pnpm lint && pnpm typecheck && pnpm test`** — só passa de fase com tudo verde
4. **Commit** com conventional commits (`feat(forge): ...`, `fix(wa): ...`, `chore(db): ...`)
5. **Atualize `PLAN.md`** marcando fase concluída + decisões novas + desvios
6. **Espere OK** do usuário pra próxima fase

## Anti-padrões (não faça)
- Bibliotecas WhatsApp não-oficiais (whatsapp-web.js, etc.) — só Cloud API oficial
- Mockar DB em testes de integração — use Postgres real
- Hooks de cliente em Server Component
- Criar abstrações antes de 3 usos concretos
- Comentários explicando o "o quê"; escreva só o "por quê" não-óbvio
- `// @ts-ignore` sem justificativa
- `catch {}` silencioso
- Funcionalidade pela metade — terminou ou não terminou
- Re-exportar tipos só pra "compatibilidade"
- Hardcode de string que vai virar conteúdo de UI — passe por next-intl desde o início

## Quando estiver em dúvida
**PERGUNTE.** Não invente decisão fora do escopo da fase atual. Decisões novas vão pro
`PLAN.md` na seção "Decisões tomadas" antes de codar.
