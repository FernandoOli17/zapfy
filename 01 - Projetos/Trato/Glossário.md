---
tipo: glossário
projeto: "[[index|Trato]]"
tags: [trato, glossario]
atualizado: 2026-05-26
---

# Glossário

> Termos do projeto — pra Claude (eu) e o usuário falarem a mesma língua. Em **bold** os nomes que aparecem no código exatamente assim.

## Conceitos centrais

**Trato** — nome da plataforma. Antes era ZapAI, antes disso Orbe. Marca visível; pacotes ainda `@zapai/*` internamente (ver [[Decisões#Rename]]).

**Forge** — builder conversacional que entrevista o cliente e monta o agente IA. Diferencial central. Ver [[Forge]].

**Agent / AgentVersion** — entidade no DB. 1 agente por workspace (MVP). Cada save publica nova `AgentVersion` versionada (rollback disponível).

**Modo Desenvolvedor / Dev Mode** — toggle opt-in que libera `/developer` com flow editor + custom tools + raw prompt. Ver [[Modo Desenvolvedor]].

**Workspace** — tenant. Tudo é escopado por `workspaceId`. Membros têm role `OWNER | ADMIN | AGENT`.

**Vertical** — tipo de negócio. 6 valores: `ECOMMERCE | CLINIC | RESTAURANT | INFOPRODUCT | SERVICE | OTHER`. Cada vertical tem [[Habilidades#Templates por vertical|template pronto]] + tools sugeridas.

**Template** — preset de agente por vertical: objetivos + tom + tools + handoff + system prompt skeleton. Atalho no Forge.

## Pipeline runtime

**Webhook (Meta)** — `/api/webhooks/whatsapp/[phoneNumberId]` recebe inbound. HMAC SHA-256 validado contra `app_secret` cifrado.

**process-message** — job BullMQ que pega mensagem inbound, classifica, faz RAG, roda agente e responde via Cloud API.

**Classifier** — Haiku 4.5 classifica intent/sentiment/needs_handoff em <1s. Decide se handoff antes de gastar Sonnet.

**Runner** — `runAgent()` em `packages/ai/src/agent/runner.ts`. Sonnet 4.5 com tools + RAG + caching.

**Executor** — `executeFlow()` em `packages/ai/src/flow/executor.ts`. Alternativa ao Runner quando `AgentVersion.flowGraph` está preenchido (modo desenvolvedor). Fallback gracioso pro Runner se executor lançar.

**Handoff** — agente sinaliza "preciso de humano". Marca `Conversation.status = HUMAN_HANDLING`, dispara evento `conversation.assumed`, atendente humano vê no inbox.

**24h window** — Meta exige que toda mensagem livre seja resposta a uma inbound recente (<24h). Fora disso, só template HSM. Worker bloqueia mensagem livre fora da janela.

## RAG

**Knowledge / Document / Chunk** — usuário sobe URL/texto → `KnowledgeDocument` (status PROCESSING → READY/ERROR) → split em `KnowledgeChunk` (~800 chars com overlap 100) → embedding via Voyage AI armazenado em pgvector.

**RAG híbrido** — busca combina vector cosine (pgvector `<=>`) + FTS Portuguese (`to_tsvector`) com Reciprocal Rank Fusion. Top-K retorna pro agent.

**Voyage AI** — `voyage-3` modelo de embedding, 1024 dimensões, suporta pt-BR bem.

## Tools

**Tool** — função invocável pelo agente IA. Schema Zod → JSON Schema. Tipos:
- **Global tools** — sempre ativas: `search_knowledge`, `transfer_to_human`, `set_contact_field`, `send_template`
- **Vertical tools** — sugeridas pelo vertical: `get_menu`, `track_order`, `book_appointment`, etc.
- **Custom tools** — criadas pelo dev em `/developer/tools-custom`, endpoint HTTPS próprio com HMAC

**Tool node (BRANCH)** — nó visual no flow editor que invoca uma tool. Atualmente placeholder (`'skipped'`) — implementação real é o bug O do [[Roadmap]].

## Crypto / segurança

**HMAC SHA-256** — usado em todos webhooks (Meta inbound, outgoing customer, custom tool). `createHmac('sha256', secret).update(body)`. **Não** plain SHA — vulnerável a length-extension.

**timingSafeEqual** — comparação resistente a timing attack. Usa `Buffer.from(...)` em bytes (não chars).

**AES-256-GCM** — usado pra cifrar tokens Meta (access_token, app_secret) em repouso. IV único por registro (`randomBytes(12)`). Auth tag verificada no decrypt. Helper em `packages/shared/src/crypto.ts`.

**SSRF guard** — `assertSafeUrl()` em `packages/shared/src/ssrf.ts`. Bloqueia file:/gopher:/data:, IPs privados, IPv6 loopback/ULA. Resolve DNS antes do fetch.

**Prompt caching** — Anthropic cobra menos em prompts cacheados (>1024 tokens). Helper `systemMessage()` injeta `providerOptions.anthropic.cacheControl: { type: 'ephemeral' }`. CLAUDE.md obriga em qualquer prompt grande.

**Prompt injection** — detector em `packages/ai/src/guards.ts`. Regex pt-BR + en pra "ignore previous instructions", DAN, role override. Disparo → handoff automático.

## Estados Prisma

**Conversation.status** — `AI_HANDLING | HUMAN_HANDLING | CLOSED`.
**Message.status** — `PENDING | SENT | DELIVERED | READ | FAILED`. Sincronizado pelos status updates da Meta.
**MessageDirection** — `INBOUND` (do cliente final) ou `OUTBOUND` (do nosso lado).
**KnowledgeDocStatus** — `PROCESSING | READY | ERROR`.
**ForgePhase** — 10 fases (ver [[Forge#State machine]]).
**ForgeStatus** — `IN_PROGRESS | PUBLISHED | ABANDONED`.
**SubscriptionStatus** — `TRIALING | ACTIVE | PAST_DUE | CANCELED | UNPAID | INCOMPLETE`.
**WhatsAppStatus** — `PENDING | CONNECTED | ERROR | DISCONNECTED`.

## Operacional

**Trial** — 7 dias sem cartão. `Subscription.trialEndsAt`.

**MOCK_AI=true** — env var que mocka todas as chamadas de IA (Anthropic, OpenAI Whisper). Forge e agente retornam canned responses determinísticas. Não custa nada. Ver `packages/ai/src/provider.ts`.

**LGPD endpoints** — `/api/lgpd/{export,delete,opt-out}` autenticados por API key com scopes específicos. Hard-delete agendado em 30 dias via BullMQ job.

## Arquivos

**CLAUDE.md** — convenções do projeto, em `C:/Users/ferna/zapai/CLAUDE.md`. Lê isso antes de codar.

**PLAN.md** — estado de execução do projeto. Atualizado no fim de cada fase.
