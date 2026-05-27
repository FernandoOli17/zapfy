---
tipo: log
projeto: "[[index|Trato]]"
tags: [trato, decisoes, adr]
atualizado: 2026-05-26
---

# Decisões

> Registro histórico do **porquê**, não do **o quê** (esse fica no código). Tudo aqui é decisão difícil de reverter ou que tem trade-off real.

---

## 2026-05-26 — Rename ZapAI → Trato

**Contexto:** Marca anterior "ZapAI" tinha "zap" (gíria de WhatsApp) + "AI" (assustava leigo). "Trato" foi escolhido por (a) ser brasileiro, (b) evocar acordo/relação humana, (c) sem nada de "tech" no nome.

**Decisão:** Renomeia marca visível em UI/marketing/emails/JSON-LD/headers webhook. Pacotes técnicos (`@zapai/*`) preservados — renomear quebra ~140 imports sem benefício externo.

**Trade-off:** Tem que padronizar URL/domínio: `trato.dev` planejado. `@zapai/*` é uma divergência interna aceitável até abrir código.

---

## 2026-05-26 — Modo Desenvolvedor opt-in lado a lado com Forge

**Contexto:** Usuário pediu sistema "de blocos" pra quem entende código mexer em tudo, sem destruir a experiência guiada do Forge.

**Decisão:** Toggle `Workspace.developerModeEnabled` (default false). Quando ON, libera `/developer` com flow visual ReactFlow + custom tools HTTP + raw prompt. **Preservação:** Forge re-publish mantém `flowGraph` + `customToolNames` da versão anterior.

**Alternativa rejeitada:** "Hybrid" (custom só adiciona hooks/tools, não substitui pipeline) — frustra power-user. Override completo é mais previsível.

→ [[Modo Desenvolvedor]]

---

## 2026-05-26 — Templates por vertical pré-construídos

**Contexto:** Forge gastava 4-5 LLM calls + ~3000 tokens pra cada agente novo. Custo proibitivo + onboarding lento.

**Decisão:** 6 templates prontos em `packages/ai/src/playbooks/templates.ts` (RESTAURANT, ECOMMERCE, CLINIC, INFOPRODUCT, SERVICE, OTHER). Forge detecta vertical → oferece template → `apply_template` preenche tudo + gera prompt skeleton **sem LLM call**.

**Trade-off:** Templates são opinionados; usuários com caso atípico ainda têm caminho longo.

→ [[Habilidades#Templates por vertical]]

---

## 2026-05-26 — Padronização x-trato-* em headers de webhook

**Contexto:** Antes do rename, headers divergiam (`x-zapai-*` no worker, `x-Orbe-*` no inline fallback do dispatch). Bug HIGH do code-review anterior.

**Decisão:** Tudo em `x-trato-event`, `x-trato-signature`, `x-trato-attempt`. User-Agent `Trato-Webhook/1.0`. Custom tools usam `x-trato-signature` (default configurável).

---

## 2026-05-26 — HMAC real em custom tools (não plain SHA)

**Contexto:** Implementação inicial usava `createHash('sha256').update(secret + body)` — vulnerável a length-extension attack.

**Decisão:** `createHmac('sha256', secret).update(body)` em `apps/web/src/lib/custom-tool-hmac.ts`. Comparação via `timingSafeEqual` em Buffer (bytes), não chars.

→ [[Segurança#HMAC custom tools]]

---

## 2026-05-26 — SSRF guard global

**Contexto:** `fetchUrlText` (knowledge) e `scrapeUrlForForge` faziam `fetch(userInput)` sem validação.

**Decisão:** `packages/shared/src/ssrf.ts` com `assertSafeUrl()` — bloqueia file:/gopher:/data:, IPs privados (10/8, 172.16/12, 192.168/16, 127/8, 169.254/16 metadata cloud), IPv6 loopback/ULA. Resolve DNS antes do fetch (mitigação básica de rebinding). `redirect: 'manual'` em todos os fetches. Cap de 2MB.

---

## 2026-05-11 — Anthropic Claude como provider primário

**Contexto:** Trade-off entre Claude (mais inteligente, prompt cache barato), OpenAI (mais maduro), modelo on-prem (caro).

**Decisão:** Sonnet 4.5 como agente principal + Haiku 4.5 como classifier. Provider abstraction (`packages/ai/src/provider.ts`) permite OpenAI via env var. **Prompt caching obrigatório >1024 tokens** (CLAUDE.md) — economia até 90%.

**Suposição:** Whisper-1 (OpenAI) pra transcrição do Forge — única dependência OpenAI direta no MVP. Anthropic não tem STT.

---

## 2026-05-11 — Better Auth em vez de NextAuth

**Contexto:** NextAuth tem fricção com Edge runtime, e magic link / passkey eram roadmap.

**Decisão:** Better Auth — email/senha + Google OAuth + magic link nativo, types-first, integra com Prisma adapter sem hack.

---

## 2026-05-10 — Embedded Signup adiado pro pós-MVP

**Contexto:** Onboarding ideal seria 1 clique via Meta Embedded Signup (sem cliente colar credenciais).

**Decisão:** **BYO no MVP** — cliente cola `phone_number_id`, `business_account_id`, `access_token`, `app_secret` via UI. Cifrados AES-256-GCM no DB. Embedded Signup quando virarmos Meta Tech Provider oficial (post-launch).

---

## 2026-05-10 — Cartão-only Stripe no MVP

**Contexto:** Mercado BR usa Pix pesadamente, mas Stripe Pix exige Stripe BR (em rollout) ou Pagar.me.

**Decisão:** Cartão via Stripe no MVP. **Pix entra na Fase 8** — escolha entre Stripe Pix nativo (quando GA) ou Pagar.me adapter.

---

## 2026-05-10 — Whisper / ASR cliente final fora do MVP

**Contexto:** Cliente final manda áudio no WhatsApp; transcrever via Whisper antes do agente seria UX ideal.

**Decisão:** **Fora do MVP**. Quando contato manda áudio, agente responde "ainda não escuto áudio, pode escrever?". Whisper só no **Forge** (admin transcrevendo a si mesmo, caso de uso de baixíssima latência tolerada).

→ rastreado em [[Roadmap#Fase 8]] pra rediscutir custo

---

## 2026-05-10 — Refinamento Forge: diff-style

**Contexto:** Pós-publish, cliente quer ajustar (ex: "deixa menos vendedora"). Refazer prompt inteiro seria caro e arriscado (perderia ajustes finos).

**Decisão:** `refine_system_prompt(instruction)` — Sonnet recebe prompt atual + instrução natural language e devolve patch cirúrgico. Cria nova AgentVersion versionada.

---

## 2026-05-10 — pgvector com voyage-3 (1024 dims)

**Contexto:** Embeddings precisam ser bons pt-BR, custar barato, e dimensão compatível com pgvector.

**Decisão:** Voyage AI `voyage-3` retorna 1024 dims. Schema usa `vector(1024)`. Busca híbrida RRF (vetor cosine + FTS Portuguese).

**Trade-off:** Voyage não tem free tier generoso; em volume vai escalar. Avaliação Cohere/Jina futura.

---

## 2026-05-10 — Multi-tenant via workspaceId FK em tudo

**Contexto:** Multi-tenant pode ser separar DB, schema por tenant, ou row-level (workspaceId FK).

**Decisão:** Row-level com `workspaceId` FK em TODOS os modelos tenant-scoped. Helper `scopedDb(workspaceId)` em `packages/db/src/scoped.ts` — toda query passa por aqui. Audit obrigatório em PR review.

**Risco:** Bug humano vaza cross-tenant. Mitigação: testes E2E com workspaces multiplos + tRPC middleware injeta workspaceId em ctx.

→ [[Segurança#Multi-tenant]]

---

## Decisões futuras (pendentes)

- **Provedor Pix** (Fase 8) — Stripe BR Pix vs Pagar.me
- **Embedded Signup** — virar Meta Tech Provider (LGPD + revisão Meta)
- **STT cliente final** (Whisper) — re-avaliar quando volume justificar
- **Open source** do `@zapai/ai`? — primeiro estabilizar API, depois decidir
- **Renomear pacotes** `@zapai/*` → `@trato/*` — só se for abrir código ou se cliente vir o package name
