# Trato — Plano de Execução

> Atualize este arquivo ao final de cada fase. Marque o que ficou feito, anote desvios,
> registre decisões novas. Ele é a memória viva entre sessões.

## Resumo
SaaS multi-tenant de agente IA pra WhatsApp Business (Cloud API oficial da Meta), com
**Forge** — um builder conversacional que entrevista o cliente e gera todo o agente
automaticamente (system prompt, tom, tools, fluxos), com versionamento e refinamento
contínuo em linguagem natural.

**Diferencial central:** o moat não é a IA que atende, é a IA que constrói a IA que atende.

## Estado atual
- **Fase atual:** Refactor de billing (sessão 2026-05-28) — código verde, **2 checkpoints aguardando OK do usuário**.
- **Próxima ação:** (1) OK pra migração de produção do enum/colunas billing; (2) autorizar Vercel pro fix do login (Resend); (3) criar Price objects no Stripe. Ver `OPERATING_PROTOCOL.md` + `vault/00-Dashboard.md`.
- **Anterior:** 5.5 ✅ — Hardening pós-auditoria (prompt caching, guardrails, RAG real, fila de webhooks, atalhos inbox).

### Refactor de billing — 2026-05-28 (modelo de planos novo)
Decisão do usuário: **alinhamento total** com a copy de marketing nova como fonte da verdade.
ADRs no vault: `ADR-0001` (modelo), `ADR-0002` (conversa de IA), `ADR-0003` (rename enum).
- **Planos:** STARTER / PRO / **BUSINESS** (enum). Enterprise = só marketing (→ /contato).
- **Preços:** R$97 / R$247 / R$597 (`priceBRLCents` 9700/24700/59700).
- **Unidade de cobrança:** **conversas de IA** (1.500 / 6.000 / ∞). 1 conversa = `Conversation` distinta com ≥1 msg `fromAi=true` no ciclo. Substituiu `activeContacts`.
- **Sem trial:** workspace nasce `INCOMPLETE`; agente só atende com assinatura `ACTIVE`/`PAST_DUE`. Garantia 7d = reembolso. Gate em `worker/jobs/process-message.ts`.
- **Broadcasts:** créditos de marketing (`Subscription.marketingCredits`), bloqueio por saldo no launch; fluxo de compra é fase futura.
- **Código verde** (lint/typecheck 7/7/test 7/7). **Pendente:** migração de prod (zona vermelha, OK necessário), Price objects Stripe, deploy. Em dev: `STRIPE_MOCK=true`.
- **Débitos:** testes unitários de billing (`TASK-0007`), falha de e-mail não engolida (`TASK-0009`).

### Auditoria de 2026-05-26 (fixes aplicados)
- ✅ **RAG real:** chunker com overlap + embedding batch via Voyage AI + RRF híbrido. Job `process-knowledge` em BullMQ, fallback inline se Redis down. UI de reprocessar erros.
- ✅ **Prompt caching:** system + RAG cacheáveis via `providerOptions.anthropic.cacheControl` em todo `generateText` do agente e Forge.
- ✅ **Guardrails:** `detectPromptInjection` + `detectBlockedTopics` rodam antes do agente; handoff automático se disparar. Timeout de 30s por turno via AbortController.
- ✅ **Bugs críticos:** catch swallow removido em handoff; classifier loga em vez de silenciar; `sendFallbackMessage` recebe contact tipado (sem string vazia); 24h-window deixa de aceitar `lastIncomingMessageAt: null`.
- ✅ **Outgoing webhooks:** `dispatchOutgoingEvent` enfileira em BullMQ `outgoingWebhook` (não bloqueia request); fallback inline em background.
- ✅ **Inbox UX:** atalhos `J`/`K` navegam conversas, `/` foca busca, `Esc` blur, `R` foca resposta, `A` assume, `E` encerra. Bubble de mensagem mostra tools usadas pela IA.
- ✅ **Rate limit:** `RL_INBOX_SEND` (60/min/user) aplicado em `sendInboxMessage`. Presets novos: `RL_WHATSAPP_CONNECT`.
- ✅ **Mobile menu:** drawer no `MarketingHeader` com `aria-controls`/scroll-lock/Esc-to-close.
- ✅ **SEO:** JSON-LD (Organization + SoftwareApplication) em `(marketing)/layout.tsx`.
- ✅ **Limpeza:** `/contato` removeu telefone fake, blog vazio agora explica próximos passos.

---

## Fases

### Fase 0 — Plano (concluída em 2026-05-10)
- [x] Receber spec completa
- [x] Criar PLAN.md
- [x] Criar CLAUDE.md
- [x] Resolver perguntas-bloqueio
- [x] OK do usuário pra iniciar Fase 1

### Fase 1 — Fundação ✅ CONCLUÍDA E VALIDADA E2E
Monorepo pnpm + Turborepo. Apps `web` e `worker`. Packages `db`, `ai`, `wa`, `shared`, `ui`.
Prisma schema completo (32 modelos cobrindo toda a spec). Seed dev. docker-compose com
Postgres 16 + pgvector + Redis. Better Auth (email/senha + Google + magic link). Tailwind v4
+ componentes UI base com tokens editoriais (Geist + Instrument Serif italic + verde elétrico).
Páginas redesignadas: landing editorial, signup/login com split brand panel, onboarding,
dashboard com sidebar + bento.

**Infra final adotada:** Postgres = **Neon** (free tier, com pgvector); Redis = **Upstash**
(free tier). Driver Prisma com adapter **Neon HTTP/WS** pra runtime via porta 443 (escapa
de firewall corporativo Cisco que bloqueia 5432). `prisma db push` continua via TCP 5432
(precisa de rede sem filtro — hotspot 4G na primeira vez).

**Validação E2E:** signup → workspace ("Granvilla") → dashboard ✅. `pnpm lint && pnpm
typecheck && pnpm test` verde.

**Depende de:** —

### Fase 2 — Site público + auth
Landing `/`, `/precos`, `/casos/[vertical]`, `/blog/[slug]` (MDX), `/sobre`, `/contato`,
`/termos`, `/privacidade`, `/lgpd`. Hero forte + demo embutida do Forge (modo limitado,
guardrails da pergunta #2). Tipografia Geist, paleta zinc + verde elétrico, dark/light.
Mobile-first.

**Depende de:** Fase 1.

### Fase 3 — Forge (builder conversacional) ✅ IMPLEMENTADA
State machine declarativa com 10 fases (DISCOVERY, VERTICAL_DETECTION, GOALS, TONE,
KNOWLEDGE, TOOLS, HANDOFF, REVIEW, PUBLISH, REFINEMENT). Cada fase tem system prompt
próprio com identidade base herdada + instruções específicas + digest dos answers já
coletados.

**Tools** (Vercel AI SDK v6 com Zod): `set_business_info`, `classify_business_vertical`,
`set_goals`, `set_tone`, `scrape_url`, `add_knowledge_item`, `suggest_tools_for_vertical`,
`set_tools`, `set_handoff_rules`, `generate_system_prompt`, `refine_system_prompt`,
`publish_agent_version`, `advance_phase`. Filtro por fase via `PHASE_TOOLS`.

**Meta-prompt** em `packages/ai/src/forge/prompts/meta-prompt.ts` — recebe ForgeAnswers
tipado, devolve system prompt de produção em pt-BR com seções obrigatórias (Identidade,
Tom, Comportamento, Conhecimento, Tools, Handoff, Restrições, Estilo, Few-shot).

**Provider abstraction** (`packages/ai/src/provider.ts`): aceita `AI_PROVIDER=openai`
ou `anthropic` via env. Auto-detect pela presença de `OPENAI_API_KEY` ou
`ANTHROPIC_API_KEY`. Default: Anthropic.

**Engine** `runForgeStep`: closure-based — callbacks mutam ref viva de answers entre
tool calls. Max 6 iterações de tool calling por turn. Persistência em `ForgeSession`
(transcript + collectedAnswers JSONB + currentPhase enum). Quando publica, marca
status=PUBLISHED.

**UI** `/forge`: split 2 cols (chat + preview). Empty state com sugestões. Mensagens
com avatar role-based, badges de tool calls, typing indicator. Preview painel mostra
progresso de fases em ordem, answers coletados em tempo real, system prompt draft em
`<pre>` quando gerado. Botão Resetar.

**Persistência publish:** `publishAgentVersionIo` em `prisma.$transaction` — cria
Agent (ou atualiza vertical), incrementa versionNumber, salva AgentVersion +
atualiza currentVersionId do Agent.

**Saída:** signup → onboarding → /forge → conversa → publica AgentVersion v1 com
rollback. ✅ `lint + typecheck` verde em 7 packages.

**Pendente E2E:** validar com chave de IA real (OPENAI_API_KEY ou ANTHROPIC_API_KEY).

**Depende de:** Fases 1 e 2.

### Fase 4 — Integração WhatsApp Cloud API ✅ IMPLEMENTADA

**Cliente Cloud API tipado** (`packages/wa`):
- `createWaClient({ phoneNumberId, accessToken, version, timeoutMs, onRequest })`
- `sendText` (com previewUrl), `sendImage`, `sendAudio`, `sendVideo`, `sendDocument`,
  `sendSticker`, `sendTemplate` (HSM com components), `sendInteractiveButtons` (até 3),
  `sendInteractiveList` (sections), `markAsRead`, `uploadMedia`, `getMediaUrl`,
  `downloadMedia`, `testConnection`.
- Erros tipados: `WaApiError` (com metaCode/subcode/type/traceId), `WaWebhookSignatureError`,
  `WaWindowExpiredError`.
- Schemas Zod completos do payload de webhook v21: `WaWebhookPayload`, `WaIncomingMessage`,
  `WaStatusUpdate`, contatos, errors.
- Utils: `splitText` (chunks respeitando quebra de palavra/parágrafo + counter opcional
  "1/3"), `isWithin24hWindow`, `hoursSince`, `normalizePhone`, `parseMetaTimestamp`.
- Helpers webhook: `verifyWebhookSignature` (HMAC SHA-256 com `timingSafeEqual`),
  `parseWebhookPayload`, `handleWebhookVerification` (hub.challenge GET),
  `flattenWebhookEvents` (agrupa events por phoneNumberId).

**UI conectar** (`/whatsapp`):
- Lista contas existentes com status (CONNECTED/PENDING/ERROR), display_phone, IDs,
  copy buttons pra Webhook URL + Verify Token. Botões Testar/Desconectar.
- Form de novo número (phone_number_id, business_account_id, access_token, app_secret).
- Server action `connectWhatsAppAction`: testa credenciais com `client.testConnection()`,
  cifra tokens AES-256-GCM, gera `webhookVerifyToken` aleatório (16 bytes hex), upsert
  com guard de "número já em outro workspace", audit log.
- `testWhatsAppConnectionAction`: re-valida + atualiza status.
- `disconnectWhatsAppAction`: marca DISCONNECTED.
- Tela mostra 6 passos guiados de como pegar credenciais na Meta (App, API Setup,
  WABA id, App Secret, Webhook config, número de teste).

**Webhook receiver** (`/api/webhooks/whatsapp/[phoneNumberId]/route.ts`):
- `GET`: valida `hub.mode=subscribe` + `hub.verify_token` contra o que tá no DB do
  workspace. Retorna `hub.challenge` ou 403.
- `POST`: lê raw body, decifra `appSecret` cifrado, valida HMAC `x-hub-signature-256`,
  parseia payload com Zod, agrupa por `phoneNumberId`. Pra cada mensagem inbound:
  upsert Contact + Conversation (1 ativa por contato) + Message com guard de dedup pelo
  whatsappMessageId. Pra cada status: `updateMany` na Message correspondente. Sempre
  retorna 200 (mesmo em falha) pra não trigger retry agressivo. Logs estruturados sem PII.

**Middleware:** /whatsapp + outras rotas (app) adicionadas ao matcher pra auth gate.

**Saída:** signup → onboarding → /whatsapp → conecta número Meta → webhook recebe
mensagens reais e persiste em Contact/Conversation/Message. Sem agente IA respondendo
ainda — isso é Fase 5.

**Pendente E2E:** rodar localmente com ngrok ou deploy + Meta App de teste pra ver
fluxo completo de mensagem chegando.

**Depende de:** Fase 1.

### Fase 5 — Agente de produção + RAG ✅ IMPLEMENTADA
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

### Fase 6 — Inbox real-time ✅ IMPLEMENTADA
3 colunas (lista | chat | painel contato). Filtros, busca, atalhos `J`/`K` (navegar),
`/` (buscar), `R` (responder), `A` (assumir), `E` (encerrar), `Esc` (blur).
Pusher Channels pra real-time. Botões: Assumir (pausa IA), Devolver pra IA, Encerrar,
Tags, Notas internas. Bubble mostra `toolsUsed[]` da IA por mensagem.

**Pendente:** paginação cursor-based (lista limita em 100), histórico de status por
mensagem (timeline de SENT→DELIVERED→READ).

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
PREMIUM (R$697). Webhook `stripe` sincroniza Subscription. **Métricas de plano
atualizadas em 2026-05 pra refletir mudança Meta jul/2025**: contatos ativos no mês
+ broadcasts proativos (era contagem de conversas IA — Meta hoje não cobra mais
service messages dentro da janela 24h, então cobrar por conversa virou anacronismo).
Contadores são calculados dinamicamente via queries (Message + Broadcast), não
campos cache no DB. Middleware `requirePlan(feature)`. Customer portal. Pix —
depende de pergunta #5.

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
- **WhatsApp pricing (Meta jul/2025):** modelo passou de "por conversa" pra "por mensagem de template". **Service messages (respostas do agente dentro da janela 24h) são gratuitas.** Métrica de plano Zapfy: contatos ativos no mês (≠ contatos cadastrados) + broadcasts proativos. Contadores calculados dinamicamente via queries (Message/Broadcast) — sem campo cache no Workspace, evita drift.

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
- **2026-05-11** — Redesign editorial de todas as páginas (landing + auth split + onboarding
  + dashboard com sidebar/bento). Infra ajustada pra cloud (Neon + Upstash) pq Docker local
  esbarrou em virtualização. Plugado Neon HTTP driver pra runtime via porta 443. Plugado
  dotenv no next.config.ts pra ler `.env` do monorepo root. **Validação E2E completa:**
  signup → workspace "Granvilla" → dashboard. Fase 1 ✅ fechada.
- **2026-05-26** — Auditoria profunda + hardening: novo módulo `@zapfy/ai/knowledge`
  (chunker + embeddings batch + processador idempotente), job BullMQ `process-knowledge`,
  prompt caching cross-provider em agente e Forge, guardrails de prompt injection,
  webhooks outgoing migrados pra fila BullMQ, atalhos J/K/R/A/E no inbox, mobile menu no
  marketing, JSON-LD pra SEO, fix de bugs (catch swallow, classifier silencioso, 24h null,
  contactId vazio em fallback). Lint/typecheck/test verdes em 7 packages. Fase 6 fechada.
