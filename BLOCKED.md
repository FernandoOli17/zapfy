# Bloqueios — credenciais e ações manuais do usuário

Atualizado: 2026-05-27 (sessão noturna autônoma 2)

Tudo aqui está implementado com **mock/stub**. Quando o usuário fornecer a credencial,
remova o TODO no código e teste.

---

## 🔴 CRÍTICO — bloqueiam features grandes

### [GIT] Repositório remoto
**O que precisa:** criar repo no GitHub (público ou privado) e me dar a URL
**Por que:** projeto inteiro tá local. Sem push, perde-se tudo se HD morre.
**Status:** repo local com ~30 commits. Falta `git remote add origin <url>` + `git push -u origin master`.

### [STRIPE] Credenciais reais
**O que precisa:**
- `STRIPE_SECRET_KEY=sk_test_...` ou `sk_live_...`
- `STRIPE_WEBHOOK_SECRET=whsec_...`
- 3 Price IDs em `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_PREMIUM`

**Status:** código com `STRIPE_MOCK=true` que bypassa Stripe inteiro. `syncStripeSubscription` no-op em mock. Pra prod precisa das keys + criar produtos.

### [META WhatsApp] Credenciais do app
**O que precisa:** Meta App ID + Secret + WhatsApp Business + Phone Number ID + WABA ID + Access Token

**Status:** modelo BYO (cada workspace cola próprias creds). Template submission + status polling implementado (`/automations/templates`), mas só funciona em workspace com WhatsApp CONNECTED. Pra testar: usuário precisa Meta Business + ngrok pra webhook URL pública.

---

## 🟡 IMPORTANTE — features funcionam parcialmente sem isso

### [OPENAI] Whisper (transcrição áudio Forge)
- Endpoint `/api/forge/transcribe` retorna 503 sem `OPENAI_API_KEY`
- Com `MOCK_AI=true` áudio retorna texto canned

### [VOYAGE] Embeddings RAG
- Sem `VOYAGE_API_KEY` cai pra FTS only (busca textual portuguese). Relevância pior, funcional.

### [ANTHROPIC] Agente principal
- Usuário tem key com $5 budget — usar `MOCK_AI=true` por default
- Modelos: `claude-sonnet-4-5` (agente) + `claude-haiku-4-5` (classifier)

### [GOOGLE CALENDAR] OAuth p/ vertical Clínica
- Tool `book_appointment` cria registro local, não sincroniza com Google Calendar real
- TODO no `packages/ai/src/tools/clinic.ts` quando OAuth ficar pronto

---

## 🟢 QUANDO PUDER — nice to have

### [GOOGLE OAUTH] Login com Google
- Better Auth configurado. Sem keys, botão some.

### [RESEND] E-mails transacionais
- Sem key, magic link/reset/invite log no console (dev mode)

### [UPSTASH] Rate limit em produção
- Sem keys, rate limit é no-op. **Proteger antes de ir público.**

### [PUSHER] Real-time Inbox
- Sem keys, inbox precisa F5 pra ver msg nova

### [SENTRY] Crash reporting
- **Configurado**: `sentry.client/server/edge.config.ts` + `lib/sentry.ts` no-op safe
- Sem `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`, `captureException` no-op

### [POSTHOG] Product analytics
- **Configurado**: `PostHogProvider` no `app/layout.tsx` + `lib/posthog.ts` no server
- Events emitidos: `inbox.message_sent`, `template.submitted_to_meta`, `broadcast.launched`
- Sem `NEXT_PUBLIC_POSTHOG_KEY`, no-op total

### [UPLOADTHING] Upload de arquivos
- UI pronta, upload mocked pra string vazia

### [DOMÍNIO] trato.dev
- Marca exibida em landing/emails/JSON-LD aponta pra `trato.dev`. Registrar + DNS.

---

## ✅ Já desbloqueados

- Neon Postgres: configurado + schema aplicado (incluindo isSuperAdmin + audit indexes novos)
- Upstash Redis URL: configurado em `.env`
- Encryption key (AES-256-GCM): gerada
- Better Auth secret: gerado

---

## 🟡 Débitos técnicos identificados na rodada autônoma 2 (não-bloqueadores)

### Server actions ainda não migradas pra `requireWorkspace` central
Estes ainda usam helper local (não respeitam impersonação):
- `apps/web/src/app/(app)/agent/actions.ts`
- `apps/web/src/app/(app)/forge/actions.ts`
- `apps/web/src/app/(app)/whatsapp/actions.ts`
- `apps/web/src/app/(app)/knowledge/actions.ts`
- `apps/web/src/app/(app)/settings/actions.ts`
- `apps/web/src/app/(app)/integrations/actions.ts` + `/webhooks/actions.ts`
- `apps/web/src/app/(app)/developer/actions.ts`
- `apps/web/src/app/(app)/contacts/import/actions.ts`
- `apps/web/src/app/(app)/automations/broadcasts/actions.ts`

**Já migrados nesta rodada**: orders/appointments/quotes/admin/inbox/team/products/professionals/coupons/contacts/templates.

### TOCTOU em `Broadcast.launch`
Reschedule já tem advisory lock + serializable txn. Broadcast launch lê recipients + update sem lock — pode dupliar se launched 2x simultaneamente. Não causou bug ainda mas defense-in-depth.

### Stripe sync ao force-downgrade
`syncStripeSubscription` propaga upgrade mas se admin força DOWNGRADE (PREMIUM→STARTER), cobrança Stripe continua no valor PREMIUM até próximo ciclo. UX precisa avisar.

### Audit dedup em retry
Quando worker faz retry de um job, o segundo audit pode duplicar. Idempotência key não implementada — ok pra audit (mais histórico = melhor), mas analytics fica inflado.

### Onboarding step "team invited" não detecta convite pending
Hoje conta `WorkspaceMember > 1`. Owner que enviou convite mas o convidado não aceitou ainda mostra step como pendente. Detectar `WorkspaceMember.invitedAt IS NOT NULL` também.

---

## 📋 Como resolver tudo de uma vez

1. **GitHub** → criar repo `trato` privado → me passe a URL pra `git remote add origin` + push
2. **Stripe** → criar conta sandbox → criar 3 produtos com prices → copiar keys
3. **Meta** → criar app Business → ativar WhatsApp Cloud API → criar número de teste → copiar credentials
4. **OpenAI** → gerar key → adicionar como `OPENAI_API_KEY`
5. **Voyage AI** → free tier 50M tokens/mês → key no `.env`
6. **Sentry** → 2 projetos (web + worker) → DSNs
7. **PostHog** → 1 projeto → key + host
8. **Domínio** → registrar `trato.dev`
9. **Resend** → verificar domínio (SPF + DKIM + DMARC)
10. **Demais** quando estiver indo público

Cada item resolvido, eu uso na próxima sessão. Veja `DEPLOY.md` pra checklist completa.
