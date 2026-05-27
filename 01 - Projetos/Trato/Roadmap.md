---
tipo: roadmap
projeto: "[[index|Trato]]"
tags: [trato, roadmap, fases, pendencias]
atualizado: 2026-05-26
---

# Roadmap

> O que está feito, o que falta, e o porquê da ordem.

## Status geral

```
Fase 1 ✅ Fundação
Fase 2 ✅ Site + auth
Fase 3 ✅ Forge
Fase 4 ✅ WhatsApp Cloud API
Fase 5 ✅ Agente IA + RAG
Fase 5.5 ✅ Hardening + modo desenvolvedor + templates + áudio
Fase 6 ✅ Inbox real-time
Fase 7 ⏳ Playbooks por vertical (tools reais)
Fase 8 ⏳ Billing
Fase 9 ⏳ Polimento
```

## Frentes ativas — atacar agora

### 🟢 Pendente do usuário (não-código)

- [ ] **`pnpm db:push`** numa janela limpa pra aplicar schema novo no Neon (devMode + flowGraph + CustomTool). Bloqueador: DLL Prisma locked pelo antivírus Windows.
- [ ] **`pnpm db:generate`** depois pra regenerar client com engine completo.
- [ ] Registrar domínio `trato.dev` (ou alternativo)
- [ ] Preencher placeholders legais: CNPJ, DPO real em `(marketing)/privacidade`, `/termos`, `/lgpd`

### 🟡 Próxima sessão de código

- [ ] **Bug O** — TOOL_CALL handler real no executor (`packages/ai/src/flow/executor.ts:179`). Hoje retorna `'skipped(tool=...)'`. Precisa:
  - Carregar `CustomTool` por nome do workspace
  - Re-rodar `assertSafeUrl(endpoint)` no momento da invocação (defense vs DNS rebinding)
  - POST com `x-trato-signature` HMAC, respeitar `timeoutMs`
  - Retornar `response.json()` como tool result pro agente
- [ ] **Vertical tools reais** ([[Habilidades]]): hoje só os nomes existem no catálogo. Implementar `get_menu`, `track_order`, `book_appointment` etc. Cada um precisa modelo Prisma + UI de configuração + handler na tools bag.
- [ ] **Code-review** da feature nova (templates + áudio + test action + handoff Forge/dev) — ~1300 linhas adicionadas, ainda não auditadas.

## Fases pendentes — detalhe

### Fase 7 — Playbooks por vertical (tools reais)

Hoje o catálogo `VERTICAL_TOOL_CATALOG` lista tools sugeridas, mas só as 4 globais (`search_knowledge`, `transfer_to_human`, etc.) estão implementadas. Pra cada vertical, precisamos:

**E-commerce:**
- `list_products({query, category?, max_price?})` — busca em `Product` table
- `recommend_product({needs})` — RAG nos produtos + scoring
- `track_order({order_id})` — integra Shopify/WooCommerce/CSV
- `apply_coupon({code, cart_total})` — regras configuráveis por workspace
- `send_checkout_link({sku_ids, contact_id})` — UTM auto-gerado
- **Importação CSV** de produtos via UI

**Clínica:**
- `list_available_slots({specialty, date_range})` — Google Calendar API
- `book/confirm/cancel_appointment(...)` — cria/atualiza evento
- OAuth Google Calendar (por workspace, owner autentica uma vez)

**Restaurante:**
- `get_menu({category?})` — `Product` com type=menu
- `add_to_cart/submit_order` — estado de carrinho temporário em Redis
- `check_delivery_eta` — integra iFood/Rappi opcional, ou manual

**Infoproduto:**
- `qualify_lead({...})` — schema BANT, persiste em Contact.customFields
- `send_sales_page({utm})` — URL builder
- `schedule_call({datetime})` — Calendly API

**Serviço:**
- `request_quote({service, location, scope})` — formulário estruturado
- `send_proposal({contact_id, items})` — gerar PDF? ou link?
- `book_service({datetime, address})`

→ Estimativa: 2-3 semanas. Cada vertical é "outro projeto pequeno".

### Fase 8 — Billing

- ✅ Schema `Subscription`, `UsageRecord` prontos
- ✅ Stripe webhook handler sincroniza
- ⏳ UI de upgrade/downgrade
- ⏳ Customer portal Stripe (uso Stripe Billing Portal hosted)
- ⏳ Counter de conversas reseta no aniversário
- ⏳ Middleware `requirePlan(feature)` em rotas premium
- ⏳ **Pix** — decisão pendente: Stripe Pix BR (quando GA) vs Pagar.me. Ver [[Decisões#Cartão-only Stripe no MVP]]
- ⏳ **Whisper cliente final** — re-avaliar custo em volume

### Fase 9 — Polimento

- ⏳ Analytics (Recharts) com filtros temporais + comparação período-anterior
- ⏳ Painel admin (super-admin) — métricas cross-workspace
- ⏳ Templates HSM (criar, submeter à Meta, listar status)
- ⏳ Broadcasts (UI completa, hoje stub)
- ⏳ Endpoints LGPD com auth e idempotency keys
- ⏳ Sentry + PostHog instrumentados em paths críticos
- ⏳ **E2E Playwright** completo (signup → Forge → conectar WA mock → simular webhook → ver resposta IA)
- ⏳ README + deploy guide (Vercel web + Railway worker + Neon + Upstash)

## Quick wins identificados em audits anteriores

### Code-review #1 (rodada de hardening) — todos resolvidos ✅
- ✅ HMAC plain SHA → createHmac real
- ✅ jobId Date.now collision → randomUUID
- ✅ branchOutcome module-level race → per-execution scope
- ✅ Headers padronizados x-trato-*
- ✅ SSRF guard global
- ✅ Security headers HTTP
- ✅ Open redirect login
- ✅ RBAC billing/whatsapp/team

### Code-review #2 (dev mode) — todos resolvidos ✅
- ✅ HMAC real, TRIGGER re-add, branchOutcome scope-local, fallback text vazio, transferToHuman wrap, parseNumber multi-dot, parseString escapes, edge ID UUID, showFull dead state, toggle race, depth limit, $ref circular check, Buffer length

### Pendentes (não-bugs, design gaps)
- [ ] Pagination cursor-based em contacts/inbox/messages (hoje limite 100-200)
- [ ] Confirmação tipo "digite o nome do workspace" no Danger Zone
- [ ] API key scopes whitelist (hoje aceita arbitrário)
- [ ] 2FA opcional pra OWNER
- [ ] Audit log de mudanças de role/billing

## Lembretes pra acionar mais tarde

- **Pré-lançamento público:** definir teto de gasto demo Forge no landing (rate limit por IP)
- **Pré-Fase 8:** decidir provedor Pix
- **Volume >1000 msg/dia:** re-avaliar custo Voyage (free tier 50M tokens/mês)
- **Embedded Signup:** depois de validar mercado, virar Meta Tech Provider

## O que decidi NÃO fazer (anti-roadmap)

- ❌ Sistema próprio de bot (não-Meta) — fica fora, só Cloud API oficial
- ❌ Mockar DB em testes integração — usa Postgres real
- ❌ Hooks de cliente em Server Component
- ❌ Abstração antes de 3 usos concretos
- ❌ Multi-LLM client-side (cliente final só vê uma resposta)

---

Atualizar este arquivo no fim de cada sessão grande.
