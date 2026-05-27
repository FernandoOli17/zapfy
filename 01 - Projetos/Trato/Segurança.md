---
tipo: spec
projeto: "[[index|Trato]]"
tags: [trato, seguranca, lgpd, hardening]
atualizado: 2026-05-26
---

# Segurança — Trato

> Controles aplicados + dívidas conhecidas. Atualizar quando muda algo.

## Auth / sessão

- **Better Auth** com email/senha (min 8 chars) + Google OAuth + magic link (7d expiração)
- **Cookies:** `httpOnly`, `sameSite: 'lax'` (default Better Auth), `secure` em prod
- **Reset token:** 1h expiração
- **Magic link:** 5 min expiração

## RBAC

`Workspace.role`: OWNER > ADMIN > AGENT

| Ação | OWNER | ADMIN | AGENT |
|---|---|---|---|
| Convidar membro | ✅ qualquer | ✅ só AGENT | ❌ |
| Mudar billing | ✅ | ✅ | ❌ |
| Conectar/desconectar WhatsApp | ✅ | ✅ | ❌ |
| Toggle Modo Dev | ✅ | ❌ | ❌ |
| `/developer` (qualquer ação) | ✅ | ✅ | ❌ |
| Rename / Delete workspace | ✅ | ❌ | ❌ |
| Inbox (responder/assumir/etc) | ✅ | ✅ | ✅ |

## Rate limit (Upstash)

| Endpoint | Limite |
|---|---|
| `/api/auth/sign-in\|sign-up\|forget-password\|reset-password\|magic-link` | 20/min/IP (middleware in-memory) |
| Inbox send | 60/min/user |
| WhatsApp connect | 10/5min/user |
| LGPD endpoints | 30/min/key |
| Forge messages | 30/min/user |
| Agent test | 20/min/user |
| Forge transcribe | 20/min/user |
| Signup | 10/hour/IP |
| Contato (public) | 5/min/IP |

## Multi-tenant

- `workspaceId` FK em TODOS os modelos tenant-scoped
- `scopedDb(workspaceId)` helper em `packages/db/src/scoped.ts` — todo acesso passa por aqui
- Server actions: `requireWorkspace()` injeta `workspace.id` antes de cada operação
- Audit obrigatório em PR review: query sem `where: { workspaceId }` é red flag

## HMAC

### Webhook Meta (inbound)
- `verifyWebhookSignature()` em `packages/wa/src/webhook.ts`
- HMAC SHA-256 com `appSecret` cifrado (AES-256-GCM)
- `timingSafeEqual` em Buffer (bytes)
- Header `x-hub-signature-256`

### Outgoing webhooks (customer)
- `signWebhookBody(body, secret)` em `apps/web/src/lib/webhooks-outgoing.ts`
- `createHmac('sha256', secret).update(body)`
- Headers: `x-trato-signature`, `x-trato-event`, `x-trato-attempt`
- User-Agent: `Trato-Webhook/1.0`

### Custom tools (modo dev)
- `apps/web/src/lib/custom-tool-hmac.ts`
- **HMAC real** (não plain SHA — antigo bug crítico, ver [[Decisões#HMAC]])
- `timingSafeEqual` em Buffer (bytes, não chars)
- Header default: `x-trato-signature`
- Secret de 192 bits (`randomBytes(24).toString('base64url')`)

### Stripe
- `stripe.webhooks.constructEvent()` — biblioteca oficial valida

## SSRF guard

`packages/shared/src/ssrf.ts`:

- Bloqueia schemes não-HTTP: `file:`, `gopher:`, `data:`, `javascript:`, etc
- Bloqueia IPs privados: 10/8, 172.16/12, 192.168/16, 127/8, 0/8, 100.64/10
- Bloqueia metadata cloud: 169.254/16 (AWS/GCP/Azure)
- Bloqueia IPv6: ::1, fe80::/10, fc00::/7, ::ffff: mapped, ff00::/8
- Resolve DNS antes do fetch (mitigação básica de DNS rebinding)
- Whitelist de portas: 80, 443, 8080, 8443

Aplicado em:
- `packages/ai/src/knowledge/process.ts:fetchUrlText` (RAG ingest)
- `apps/web/src/lib/forge/io.ts:scrapeUrlForForge` (Forge URL scrape)
- `apps/web/src/app/(app)/developer/actions.ts:createCustomTool` (endpoint validation)

## HTTP security headers

`apps/web/next.config.ts:headers()`:

- `Content-Security-Policy` — script-src 'self' 'unsafe-inline' js.pusher.com posthog.com; frame-ancestors 'none'; img-src 'self' data: https:
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (só em prod)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` (exceto onde precisa: `/forge` libera microphone)
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-origin` (cross-origin pra `/api/webhooks/*`)

## Crypto at-rest

`packages/shared/src/crypto.ts`:

- **AES-256-GCM**
- IV único por record (`randomBytes(12)`)
- Auth tag verificada no decrypt
- Format: `v1:iv:authTag:ciphertext`
- Chave: `ENCRYPTION_KEY` env (64 chars hex = 32 bytes)

Usado em:
- `WhatsAppAccount.accessTokenEncrypted`
- `WhatsAppAccount.appSecretEncrypted`

## Prompt guardrails

`packages/ai/src/guards.ts`:

### detectPromptInjection
Regex pt-BR + en pra:
- "ignore previous instructions" / "ignore instruções anteriores"
- "forget your system prompt" / "esqueça suas instruções"
- "you are now X" / "você agora é X"
- "reveal your prompt" / "mostre suas instruções"
- DAN, jailbreak, developer mode
- "I am admin/owner" / "sou seu admin/dono"
- Flood: >70% repetição de tri-gramas

### detectBlockedTopics
Lê `agentVersion.handoffRules.keywords` como blacklist. Match → handoff automático.

Aplicado em `runAgent()` antes da chamada Sonnet. Dispara handoff via `globalDeps.transferToHuman()`.

## LGPD

`/api/lgpd/{export,delete,opt-out}`:
- Auth via API key (Bearer token, SHA-256 hash em DB, scopes `lgpd:*`)
- Rate limit 30/min/key
- `delete` agenda hard-delete em 30 dias via BullMQ job
- Soft delete (`deletedAt`) em Contact/Conversation/Message imediato
- Sweep horário no worker recupera jobs perdidos

DPO pendente preencher: ver [[Roadmap#Pendente do usuário]].

## PII em logs

- Logger Pino com redact paths em `packages/shared/src/logger.ts`
- Telefones hasheados via `hashPii(phone, LOG_PII_SALT)` antes de logar
- Salt diferente entre dev/prod
- Mensagens em texto plano no DB (precisa RAG/busca) — documentado em `/privacidade`

## Pendências (técnicas, não-bloqueantes)

- [ ] **2FA opcional** pra OWNER (TOTP)
- [ ] **API key scopes whitelist** (hoje aceita arbitrário)
- [ ] **Audit log** em mudanças de role / billing / API key delete
- [ ] **TDE** no Postgres (já vem com Neon, mas validar)
- [ ] **DPO formal** em /privacidade e /termos
- [ ] **CNPJ** preencher em Termos / LGPD
- [ ] **Penetration test** antes do GA
- [ ] **Dependabot/Renovate** wired

## Pendências (críticas pré-prod)

- [ ] Bug O — TOOL_CALL no executor não invoca de verdade ([[Modo Desenvolvedor#Pendências]])
- [ ] Pagination cursor (hoje limite 100-200 — possível DoS leve)
- [ ] Confirmação extra em Danger Zone (digite o nome workspace)

→ [[Roadmap#Pendentes]]
