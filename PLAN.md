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
- **Endurecimento da zona vermelha — 11 TASKs code-only CONCLUÍDAS (2026-06-18, branch `hardening`).**
  Todos os achados de zona vermelha que NÃO precisam de migração/decisão foram
  corrigidos, cada um com revisão adversarial multi-agente que pegou e fez corrigir
  bugs reais nos próprios fixes:
  - **Dinheiro:** 0023 (upgrade usa `subscriptions.update` — sem dupla cobrança),
    0025 (webhook Stripe 500→retry, estado vivo, sem degradar plano, `paused`→bloqueia),
    0026 (créditos atômicos + settle idempotente via `finishedAt` — review pegou
    over-refund no cancel e perda com Redis-fora, corrigidos), 0027 (áudio `fromAi:false`),
    0024 (enforcement do limite de conversas no worker, fail-closed, plano ∞ não bloqueia),
    0022 (copy sem trial + preços reais).
  - **Forge/tools:** 0032 (degradação honesta — sem link sintético/alucinado),
    0033 (`max+1` + retry P2002; review pegou bug de largura >9999, corrigido),
    0034 (validação de transição da state machine + pré-req de PUBLISH).
  - **Segurança/confiabilidade:** 0020 (device verification fail-closed: gate central em
    todas as server actions/APIs + `createWorkspaceAction`/`acceptInviteAction` gateados
    no review, revoke-expired destrói sessão, fail-closed na criação), 0029 (webhook Meta:
    status monotônico, parse tolerante a field extra — review pegou poison-pill + perda
    de msg no dup-guard, corrigidos).
  - Gate verde de ponta a ponta. Commits locais na branch `hardening`, **sem push**.
  - **AGUARDAM SEU OK (não feitos):** migração de schema (0021 nonce de convite, 0030
    secret cifrado, 0035 `@@unique`+limpeza, 0036 estado RAG, 0038 status template —
    a `.env` aponta pro Neon de prod); decisão de produto (0031 REFINEMENT do Forge,
    0032-followup onde mora config de URL, 0037 scopedDb adotar/remover); QA visual
    (0039 `dark:` app-wide).

- **Sub-projeto 4/4 "Redesign da landing" CONCLUÍDO (2026-06-18). 4/4 frentes do
  pedido original prontas.** Home de marketing reconstruída (nível máximo): hero lidera
  pelo moat ("a IA que monta a IA", Instrument Serif italic verde); seções extraídas em
  `components/marketing/sections/` (problem, how-it-works, capabilities bento, segments,
  product-proof, pricing-teaser, final-cta) com `page.tsx` como composição — monólito de
  582 linhas desmontado. Honestidade: removidos os 3 depoimentos fabricados (+340%, Ana
  Lima, Dr. Carlos), capabilities sem claims falsas (áudio/mídia, "aprende"), ForgeDemo
  sem "tempo médio do beta: 8min", JSON-LD com preços reais (PRO 247, BUSINESS 597);
  prova nova = produto real (Cloud API oficial, LGPD, garantia 7d, Forge grátis). 53
  hardcodes → tokens (verde); dark-first preservado via `.theme-dark`. Gate verde
  (typecheck/lint/build 43 páginas); E2E da landing escrito. **Pendência de ambiente:**
  `next start` local falha por `.next` poluído (turbopack×webpack) — não é o código;
  resolve com `rm -rf apps/web/.next && pnpm --filter @zapfy/web dev`. Commits locais,
  sem push até OK de deploy.
- **Sub-projeto 3/4 "Redesign do dashboard" CONCLUÍDO (2026-06-18).** Home reimaginada como
  central de ação: strip de 3 métricas (conversas hoje, resolvidas pela IA, aguardando
  você), fila de handoff dominante (HUMAN_HANDLING, mais antigo primeiro) com
  empty-states, atividade 14d + uso do plano, faixa de ações rápidas. Verde elétrico
  consistente; gradiente azul do CTA removido; manifest theme_color alinhado. Estado
  derivado de `lib/dashboard-stats.ts` (nunca quebra). Blocos mortos removidos
  (StatusRow, grid de ações, hero gradiente). Gate verde; E2E do dashboard. Commits
  locais, sem push. Próximo: sub-projeto 4 (redesign da landing).
- **Sub-projeto 2/4 "UX do cliente" CONCLUÍDO (2026-06-17).** Card de onboarding com 5
  passos derivados (valor antes de pagar), simulador multi-turno marca o passo 2,
  guia embutido da Meta com validação + erros acionáveis, reenvio de código no
  verify-device, 13 quick wins do audit aplicados. E2E do card
  (`apps/web/e2e/onboarding-card.spec.ts`) passou contra o DB real (Neon); gate
  completo do root verde (typecheck 7/7, lint 7/7, test 3 pacotes, build 2/2).
  Débito: capturar prints reais do painel da Meta pra
  `apps/web/public/guias/meta/{passo-1-app,passo-2-ids,passo-3-token,passo-4-secret}.png`
  (nomes exatos que o `StepImage` de `meta-guide.tsx` procura; slots já renderizam
  quando os arquivos existirem). Desvio anotado: o segundo cenário E2E previsto ("após
  publicar agente, CTA aponta pra /agent") não é determinístico — publicar exige o
  loop de tool calls da IA (mockada em E2E), então o avanço de passo fica coberto
  pelo derivador puro (Task 1), não por E2E. Commits locais, sem push. Próximo:
  sub-projeto 3 (redesign do dashboard).
- **Sub-projeto 1/4 "Zerar erros" CONCLUÍDO (2026-06-12).** Auditoria paralela
  (5 agentes + verificação adversarial) achou **69 bugs confirmados** nos fluxos
  críticos. **36 corrigidos** em 7 commits locais (`204f8e0`..`4673322` —
  idempotência de retry no WhatsApp, cross-tenant no book_service, lock do Forge,
  toolsEnabled aplicado, SSRF em webhooks, LGPD sem PII, +testes novos em
  packages/wa e forge-catalog). **33 triados** em TASK-0020..0038 (**aguardam OK**
  — destaque P1: TASK-0023 dupla cobrança no upgrade, TASK-0024 limite de
  conversas sem enforcement, TASK-0025 webhook Stripe perde evento, TASK-0029
  webhook Meta síncrono, TASK-0020 device verification contornável, TASK-0031
  REFINEMENT do Forge inexistente). Gate final verde. Relatório completo:
  `docs/superpowers/audits/2026-06-10-zerar-erros/relatorio.md`. **Commits locais,
  sem push** (push dispara deploy Vercel — precisa de OK). Pedido original do
  usuário tem 4 frentes; próximas: **sub-projeto 2 (UX do cliente) → 3 (redesign
  dashboard) → 4 (redesign landing)**, cada uma com spec própria.
- **🟢 PRODUÇÃO NO AR DE PONTA A PONTA (2026-06-03).** Web na Vercel (www.zapfy.store, `/api/health` 200, Forge guiada deployada), **worker no Railway rodando** (consome a fila BullMQ → IA responde no WhatsApp), Anthropic + Voyage **validadas ao vivo** (`scripts/validate-key.ts` + ping Voyage 1024 dims), DB/Redis/Stripe/Pusher/Resend conectados. Bloqueios resolvidos: BLK-push-rede, BLK-worker-deploy-prod. Gate verde (typecheck 7/7, lint 7/7, test 41/41). **Falta só:** smoke test E2E com número Meta real (signup → Forge → conectar WhatsApp → msg real → IA responde).
- **Fase atual:** **Fase 6 — Motor de IA.** Fundação construída e verde (medidor de custo, detector de alucinação, tool loop testado, eval harness, roteamento Haiku→Sonnet atrás de flag). Credenciais reais validadas; rodar scripts de eval/custo/roteamento com token real é o próximo passo de medição. ADR-0004 (roteamento) proposto, decisão do usuário pendente.
- **Próxima ação:** **Forge guiada DEPLOYADA** — push de 21 commits feito em 2026-06-03 (`c267ca9`), Vercel redeploya o web. `railway.json` criado (destrava worker). **Gargalo restante pro fluxo WhatsApp do cliente:** criar o serviço worker no Railway ([[BLK-worker-deploy-prod]]) + chaves (Voyage, Meta number). Depois: sub-projetos (cardápio+fotos multimodal / tutorial onboarding / paywall).
- **Anterior:** Refactor de billing DEPLOYADO em produção (www.zapfy.store), Stripe live, migração de prod aplicada, login resolvido. Fases 1–5 ✅.

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
- **TASK-0022 (2026-06-18):** e-mails de onboarding prometiam trial inexistente. Decisão: opção (a) — alinhar copy ao modelo sem trial + garantia 7d (não implementar trial). `welcomeEmail` e os templates `day6` (web + worker) reescritos pra "monte de graça → assine pra ir ao ar → garantia 7d", preços corrigidos (Pro R$247, Business R$597, conversas 1.500/6.000/∞). Sweep `day6` agora mira workspaces `INCOMPLETE` em ~D+6 do signup (era query `TRIALING`+`trialEndsAt` que nunca casava). `templateKey` `day6_trial_ending` mantido pra preservar idempotência de `EmailSent`. Sem schema.
- **TASK-0032 (2026-06-18) — decisão pendente:** as tools `send_sales_page`/`schedule_call`/`send_checkout_link`/`send_proposal` agora degradam honesto (`ok:false` + handoff) quando falta a URL/integração real, em vez de mandar link sintético/alucinado pro cliente. **Onde mora a config dessas URLs por workspace é decisão de produto pendente** (ex.: campo em `WorkspaceSettings`, ou config por `AgentVersion`, ou rota pública `/q/[numero]` pra propostas). Até decidir, a degradação honesta é o comportamento.

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
- **2026-06-01** — **Fix de tempo real do chat da Forge** (debugging sistemático): 3 bugs
  client-side — mensagem do user sumia até a IA terminar (sem eco otimista); `startTransition`
  async sem try/catch travava a UI até reload quando a action rejeitava (timeout/rede);
  `revalidatePath('/forge')` redundante causava lag. Corrigido em `forge-workspace.tsx` +
  `actions.ts`. **Teste E2E Playwright** de regressão adicionado (intercepta a server action,
  testa eco otimista + destrava em falha) — passou em navegador real. Gate verde (typecheck
  7/7, lint, 53 testes). Streaming token-a-token (escolha do usuário) ficou pra depois.
  **Iniciado o redesign "Forge guiada"** (híbrido: passos com botões → chat), design aprovado;
  spec a escrever.
- **2026-06-01 (cont.)** — **Forge guiada implementada** ([[TASK-0019]], subagent-driven, 8 tasks).
  Wizard determinístico de 4 passos (nome → tipo → estilo humano/bot → objetivo) que grava sem
  IA (`saveForgeBasics`, phase→KNOWLEDGE + msg semeada) e cai no chat existente. Campo `persona`
  (humano honesto vs assistente) no schema + meta-prompt. 8 commits locais (sem push). **Gate
  verde incl. build**; 2 E2E Playwright passaram. Build pegou bug real: client component puxava
  `engine.ts` (node:crypto) via barrel → corrigido com entry dedicado `@zapfy/ai/forge/verticals`.
  Checkpoint: aguarda OK pra deploy.
