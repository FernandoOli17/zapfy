# Bloqueios — credenciais e ações manuais do usuário

Tudo aqui está implementado com **mock/stub**. Quando o usuário fornecer a credencial,
remova o TODO no código e teste.

Ordem por prioridade (crítico → quando puder).

---

## 🔴 CRÍTICO — bloqueiam features grandes

### [DB] Aplicar schema novo no Neon
**O que precisa:** rodar `pnpm db:generate && pnpm db:push` numa janela limpa (sem outros processos com `.prisma` aberto, ex: Cursor, VSCode com Prisma extension)
**Por que:** schema novo tem `Workspace.developerModeEnabled`, `AgentVersion.flowGraph`, `AgentVersion.customToolNames`, modelo `CustomTool`, **e novos modelos da Fase 7** (`Product`, `Quote`, `Appointment`, `MenuItem`, etc.)
**Status:** schema completo. Sem `db:push`, app dá 500 em `/developer`, `/knowledge`, e todas as features que usam novos modelos.

### [GIT] Repositório remoto
**O que precisa:** criar repo no GitHub (público ou privado) e me dar a URL
**Por que:** projeto inteiro tá local. Sem push, perde-se tudo se HD morre. Bloqueia também Obsidian Git plugin de sincronizar notas.
**Status:** repo local pronto com 5 commits + ~50 mods uncommitted. Vou commitar tudo nesta sessão. Falta `git remote add origin <url>` + `git push -u origin master`.

### [STRIPE] Credenciais
**O que precisa:**
- `STRIPE_SECRET_KEY=sk_test_...` ou `sk_live_...`
- `STRIPE_WEBHOOK_SECRET=whsec_...`
- 3 Price IDs: `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_PREMIUM` (criar produtos em dashboard.stripe.com)
**Por que:** Fase 8 (Billing) — checkout, customer portal, sync de subscription, cobrança recorrente
**Status:** código implementado com `STRIPE_MOCK=true` que bypassa toda a chamada real e retorna URLs fake. Funciona pra dev/testing UI. Pra prod precisa das keys.

### [META WhatsApp] Credenciais do app
**O que precisa:** Meta App ID + App Secret + 1 número WhatsApp Business + Phone Number ID + WABA ID + Access Token de longa duração
**Por que:** sem isso, webhooks não chegam, agente não responde no Zap real
**Status:** modelo BYO (cada workspace cola suas próprias credenciais via UI) — código completo. Pra testar localmente, usuário precisa de uma conta Meta Business + ngrok pra webhook URL pública.

---

## 🟡 IMPORTANTE — features funcionam parcialmente sem isso

### [OPENAI] Whisper para áudio do Forge
**O que precisa:** `OPENAI_API_KEY=sk-...`
**Por que:** transcrição de áudio (admin descreve negócio falando em vez de digitar)
**Status:** endpoint `/api/forge/transcribe` implementado. Sem a key, retorna 503 educado. UI mostra erro. Sem essa key, áudio ainda pode ser usado se `MOCK_AI=true` (retorna texto canned).

### [VOYAGE] Embeddings para RAG real
**O que precisa:** `VOYAGE_API_KEY=...`
**Por que:** indexação semântica dos documentos de conhecimento. Sem isso, RAG cai pra FTS only (busca textual Portuguese).
**Status:** código tem fallback FTS-only. Funcional, mas relevância pior.

### [ANTHROPIC] Agente principal
**O que precisa:** `ANTHROPIC_API_KEY=sk-ant-...`
**Por que:** rodar agente IA de produção (Sonnet 4.5 + Haiku 4.5 classifier)
**Status:** usuário já adicionou $5 numa key. Tudo funciona com `MOCK_AI=true` pra testes sem custo.

### [GOOGLE CALENDAR] OAuth pro vertical Clínica
**O que precisa:** Google Cloud Project com OAuth client + scopes `calendar.events`
**Por que:** vertical CLINIC tem tool `book_appointment` que cria evento no Calendar do profissional
**Status:** modelo `Appointment` no DB já existe. Tool implementada com mock — cria registro local, mas não sincroniza com Calendar real até OAuth ficar pronto.

---

## 🟢 QUANDO PUDER — nice to have

### [GOOGLE OAUTH] Login com Google
**O que precisa:** `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`
**Status:** Better Auth já configurado. Sem keys, botão "Continuar com Google" sumido automaticamente.

### [RESEND] E-mails transacionais
**O que precisa:** `RESEND_API_KEY=re_...` + verificar domínio `trato.dev`
**Por que:** magic link, reset senha, convites de time, notificações
**Status:** sem key, app loga magic link no console (modo dev). Funciona pra QA local.

### [UPSTASH] Rate limit em produção
**O que precisa:** `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
**Status:** sem isso, rate limit é no-op (sempre permite). Já permite spam — proteja antes de ir público.

### [PUSHER] Real-time no Inbox
**O que precisa:** `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`, `NEXT_PUBLIC_PUSHER_KEY`
**Status:** sem isso, inbox funciona mas precisa F5 pra ver msg nova.

### [SENTRY] Crash reporting
**O que precisa:** `SENTRY_DSN`
**Status:** `captureException` calls são no-op sem DSN. Erros vão pro console.

### [POSTHOG] Product analytics
**O que precisa:** `NEXT_PUBLIC_POSTHOG_KEY`
**Status:** eventos não rastreados. Sem analytics de uso.

### [HEALTH] Token detalhado do health check
**O que precisa:** `HEALTH_DETAIL_TOKEN=<random 32 chars>`
**Status:** `/api/health` responde só `{status, timestamp}` sem token. Modo detalhado restrito.

### [UPLOADTHING] Upload de arquivos
**O que precisa:** `UPLOADTHING_TOKEN`
**Por que:** PDFs/imagens em Knowledge, propostas em Service vertical
**Status:** UI pronta, upload mockado pra string vazia.

### [DOMÍNIO] trato.dev
**O que precisa:** registrar `trato.dev` (ou `.com.br` / `.app`)
**Status:** marca exibida em landing, e-mails, JSON-LD apontam pra `trato.dev`. Quando registrar, atualizar DNS + Vercel/Railway.

---

## ✅ JÁ DESBLOQUEADOS (não precisa fazer nada)

- Neon Postgres: configurado e online
- Upstash Redis URL: configurado em `.env`
- Encryption key (AES-256-GCM): gerada
- Better Auth secret: gerado

---

## 📋 Como resolver tudo de uma vez

Sequência sugerida:

1. **GitHub** → criar repo `trato` privado → me passe a URL pra eu rodar `git remote add origin ...` e push
2. **Stripe** → criar conta sandbox → criar 3 produtos com prices → copiar keys
3. **Meta** → criar app Business → ativar WhatsApp Cloud API → criar número de teste → copiar credentials
4. **OpenAI** → gerar key → adicionar no `.env` como `OPENAI_API_KEY`
5. **Voyage AI** → free tier 50M tokens/mês → key no `.env`
6. **Domínio** → registrar `trato.dev`
7. **Demais** quando o produto estiver pronto pra ir público

Cada item resolvido, eu uso na próxima sessão.
