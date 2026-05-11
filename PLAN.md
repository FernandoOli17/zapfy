# ZapAI — Plano de Execução

> Atualize este arquivo ao final de cada fase. Marque o que ficou feito, anote desvios,
> registre decisões novas. Ele é a memória viva entre sessões.

## Resumo
SaaS multi-tenant de agente IA pra WhatsApp Business (Cloud API oficial da Meta), com
**Forge** — um builder conversacional que entrevista o cliente e gera todo o agente
automaticamente (system prompt, tom, tools, fluxos), com versionamento e refinamento
contínuo em linguagem natural.

**Diferencial central:** o moat não é a IA que atende, é a IA que constrói a IA que atende.

## Estado atual
- **Fase atual:** 1 — Fundação (concluída — pendente validação E2E com Docker)
- **Próxima ação:** instalar Docker Desktop + `docker compose up -d` + `pnpm db:migrate` + `pnpm dev` pra validar signup → onboarding → dashboard. Depois OK pra Fase 2.

---

## Fases

### Fase 0 — Plano (concluída em 2026-05-10)
- [x] Receber spec completa
- [x] Criar PLAN.md
- [x] Criar CLAUDE.md
- [x] Resolver perguntas-bloqueio
- [x] OK do usuário pra iniciar Fase 1

### Fase 1 — Fundação ✅ (validação E2E pendente de Docker)
Monorepo pnpm + Turborepo. Apps `web` e `worker`. Packages `db`, `ai`, `wa`, `shared`, `ui`.
Prisma schema completo (todas as entidades da spec). Seed (user demo + workspace + plano dev).
docker-compose com Postgres 16 + pgvector + Redis. Better Auth (email/senha + Google + magic link).
Tailwind v4 + componentes UI base. Layout base do dashboard. Páginas signup/login/onboarding/dashboard.

**Estado:** `pnpm lint && pnpm typecheck && pnpm test` ✅ verde. Migration inicial NÃO executada
(precisa Docker rodando). Build do Next NÃO executado.

**Pra validar manualmente quando Docker estiver instalado:**
```
docker compose up -d
cp .env.example .env  # preencher BETTER_AUTH_SECRET (openssl rand -hex 32),
                       # ENCRYPTION_KEY (openssl rand -hex 32),
                       # LOG_PII_SALT (openssl rand -hex 16)
pnpm db:migrate
pnpm db:seed
pnpm dev
# abrir http://localhost:3000, signup, onboarding, dashboard
```

**Depende de:** —

### Fase 2 — Site público + auth
Landing `/`, `/precos`, `/casos/[vertical]`, `/blog/[slug]` (MDX), `/sobre`, `/contato`,
`/termos`, `/privacidade`, `/lgpd`. Hero forte + demo embutida do Forge (modo limitado,
guardrails da pergunta #2). Tipografia Geist, paleta zinc + verde elétrico, dark/light.
Mobile-first.

**Depende de:** Fase 1.

### Fase 3 — Forge (builder conversacional) — CRÍTICA
State machine (xstate ou discriminated union em TS) com fases:
DISCOVERY → VERTICAL_DETECTION → GOALS → TONE → KNOWLEDGE → TOOLS → HANDOFF → REVIEW → PUBLISH.

Tools do Forge: `classify_business_vertical`, `scrape_url`, `suggest_tools_for_vertical`,
`generate_system_prompt` (meta-prompt — a estrela), `generate_personality_profile`,
`save_agent_version`.

UI: chat full-screen à esquerda, preview ao vivo à direita (system prompt sendo escrito,
tools ativadas, exemplos de resposta). Modo refinamento contínuo diff-style (pergunta #3).

**Saída:** cliente novo consegue criar conta → conversar com o Forge → publicar primeira
versão do agente. Agente fica armazenado em `AgentVersion` com rollback funcional.

**Depende de:** Fases 1 e 2.

### Fase 4 — Integração WhatsApp Cloud API
Tela de conexão (cliente cola credenciais Meta — modelo BYO confirmado na pergunta #1).
Webhook GET/POST em `/api/webhooks/whatsapp` com validação HMAC (`x-hub-signature-256`).
Cliente WA tipado em `packages/wa` (sendText, sendImage, sendDocument, sendAudio,
sendTemplate, sendInteractiveButtons/List, markAsRead, uploadMedia, downloadMedia).
Criptografia AES-256-GCM dos tokens (helper em `packages/shared/crypto.ts`).
Janela de 24h: bloqueia mensagem livre, força template HSM.

**Depende de:** Fase 1. Bloqueada por decisão pergunta #1 (BYO vs Tech Provider).

### Fase 5 — Agente de produção + RAG
Worker BullMQ processa `process-message` jobs. Pipeline:
webhook → enfileira → resolve `Conversation` (ou cria) → se `HUMAN_HANDLING` só salva →
senão classifier Haiku (intent/sentiment/needs_handoff/language) → se handoff, mensagem-ponte
+ notifica time → senão agente Sonnet com tools globais + tools do workspace + RAG híbrido
(pgvector semantic + Postgres FTS keyword) → loop de tool calls (max 5) → resposta via
Cloud API (divide em chunks de 1024 chars) → `UsageRecord` pra billing.

Tools globais: `search_knowledge`, `transfer_to_human`, `set_contact_field`, `send_template`.

Guardrails: detector de prompt injection, blacklist de tópicos por workspace, política
de não-invenção (admite + handoff), rate limit por contato.

**Depende de:** Fases 1, 3, 4.

### Fase 6 — Inbox real-time
3 colunas (lista | chat | painel contato). Filtros, busca, atalhos J/K/R/A.
Pusher Channels pra real-time. Botões: Assumir (pausa IA), Devolver pra IA, Encerrar,
Tags, Notas internas. Mostra tools usadas pela IA em cada resposta (debug).

**Depende de:** Fase 5.

### Fase 7 — Playbooks por vertical
Tools por vertical (em `packages/ai/src/tools/`):
- **E-commerce:** list/recommend products, track_order, apply_coupon, send_checkout_link
- **Clínica:** list_available_slots, book/confirm/cancel_appointment (+ Google Calendar)
- **Restaurante:** get_menu, add_to_cart, submit_order, check_delivery_eta
- **Infoproduto:** qualify_lead, send_sales_page, schedule_call, apply_discount
- **Serviço:** request_quote, book_service, send_proposal

Importação CSV de produtos pra e-com. OAuth Google Calendar (a definir: por workspace
ou por usuário — provavelmente por workspace).

**Depende de:** Fase 5.

### Fase 8 — Billing
Stripe Subscriptions. Trial 7 dias sem cartão. Planos STARTER (R$97), PRO (R$297),
PREMIUM (R$697). Webhook `stripe` sincroniza Subscription. Counter de conversas reseta
no aniversário. Middleware `requirePlan(feature)`. Customer portal. Pix — depende de
pergunta #5.

**Depende de:** Fase 1.

### Fase 9 — Polimento
Analytics (Recharts) com métricas-chave. Painel admin (super-admin). Templates HSM
(criar, submeter, listar status). Broadcasts. Endpoints LGPD (`/api/lgpd/export|delete|opt-out`).
DPA / política de privacidade real (com placeholder do DPO). Sentry + PostHog instrumentados.
Testes E2E Playwright (fluxo completo signup → Forge → webhook → resposta IA).
README + deploy guide (Vercel + Railway).

**Depende de:** todas as anteriores.

---

## Decisões tomadas (não revisitar sem motivo forte)
- Monorepo pnpm workspaces + Turborepo
- Next.js 15 App Router, TS strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, sem `any`)
- Prisma 6 + Postgres 16 + pgvector
- Better Auth (email/senha + Google + magic link)
- BullMQ + Redis (Upstash prod, container dev)
- Pusher Channels pra real-time
- Anthropic SDK — `claude-sonnet-4-5` (agente principal) + `claude-haiku-4-5` (classifier/sumarização)
- Voyage AI `voyage-3` (embeddings, 1024 dims, `vector(1024)` em pgvector)
- WhatsApp Cloud API v21+, sem libs não-oficiais
- Stripe Subscriptions
- UploadThing (storage), Resend (email), Sentry + PostHog (observabilidade), Pino (logs)
- Vercel (web) + Railway (worker + Postgres + Redis dev/staging)
- Tipografia Geist (sans + mono); Instrument Serif italic em moments editoriais
- Paleta: zinc/neutro escuro + accent verde elétrico (#00E676 ou aproximado)
- Estado do Forge: state machine (xstate ou discriminated union em TS — escolher na Fase 3)
- Tools de IA: uma função TS por arquivo, schema Zod exportado, em `packages/ai/src/tools/`

## Suposições (validar se virar bloqueio)
- Stripe Brasil disponível e suficiente; Pix decidido em pergunta #5
- pgvector vector(1024) compatível com voyage-3 (confirmado, voyage-3 retorna 1024 dims)
- TDE do Railway atende LGPD pra dados sensíveis no Postgres
- Mensagens no DB ficam em texto plano (precisa busca/RAG); cifradas só os tokens Meta
- Whisper/ASR fora do MVP (pergunta #4)
- Vercel serverless atende o webhook WA (precisa retornar 200 em <1s — enfileira e devolve)
- next-intl com pt-BR único; estrutura preparada pra outros locales mas só pt-BR carregado

## Perguntas resolvidas (2026-05-10)
1. **Onboarding WhatsApp:** ✅ **BYO no MVP** (cliente cola credenciais Meta cifradas por workspace). Migração pra Embedded Signup fica pra depois do lançamento.
2. **Demo do Forge no landing:** ✅ **Sem teto mensal / sem rate limit no MVP.** Avisar o usuário quando estivermos chegando na Fase 2 pra definir teto antes do landing ir ao ar público.
3. **Refinamento contínuo do Forge:** ✅ **diff-style** (Sonnet recebe system prompt atual + instrução natural, devolve patch a aplicar).
4. **Whisper/ASR:** ✅ **Fora do MVP.** Quando contato manda áudio, agente responde "ainda não escuto áudio, pode escrever?".
5. **Pagamento BR:** ✅ **Cartão-only via Stripe no MVP.** Pix entra depois (provavelmente via Stripe Pix ou Pagar.me, decisão pra Fase 8+).

## Lembretes pra acionar mais tarde
- **Antes da Fase 2:** perguntar ao usuário o teto mensal de gasto em demo do Forge no landing público.
- **Antes da Fase 8:** decidir provedor de Pix.

---

## Histórico
- **2026-05-10** — Spec recebida. Fase 0 iniciada. PLAN.md e CLAUDE.md criados.
- **2026-05-10** — Fase 1 implementada: monorepo + 5 packages + 2 apps + Prisma schema completo
  + Better Auth + Tailwind v4 + páginas auth/onboarding/dashboard. Lint/typecheck/test ✅ verde.
  Decisões técnicas: zod 4 (Better Auth pediu), Anthropic SDK 0.95.1 (era 0.34 inexistente),
  @t3-oss/env 0.13.11 (suporta zod 4), pnpm 10.4.1 via npm global (corepack falhou por permissão
  em Program Files). Pendente: rodar Docker → migrate → dev pra E2E.
