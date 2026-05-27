# Bloqueios — credenciais e ações manuais do usuário

Atualizado: 2026-05-27 (sessão 3 — demo prep)

Tudo aqui está implementado com **mock/stub**. Quando o usuário fornecer a credencial,
remova o TODO no código e teste.

---

## 🔴 CRÍTICO — bloqueiam features grandes

### [GIT] Repositório remoto
**O que precisa:** criar repo no GitHub (público ou privado) e me dar a URL
**Por que:** projeto inteiro tá local. Sem push, perde-se tudo se HD morre.
**Status:** repo local com ~35 commits. Falta `git remote add origin <url>` + `git push -u origin master`.

### [STRIPE] Credenciais reais
**Status:** código com `STRIPE_MOCK=true` que bypassa Stripe inteiro. `syncStripeSubscription` no-op em mock. Pra prod precisa das keys.

### [META WhatsApp] Credenciais do app
**Status:** modelo BYO + template submission + status polling implementado.
**Novidade desta sessão**: botão "Enviar mensagem de teste" em `/whatsapp` simula webhook Meta sem precisar de número real — perfeito pra demos com cliente.

---

## 🟡 IMPORTANTE — features funcionam parcialmente sem isso

### [RESEND] E-mails transacionais
- Welcome continua direto no signup (instantâneo).
- **Novidade desta sessão**: worker `email-sequences.ts` envia day3_forge_nudge + day6_trial_ending + activation a cada 30min (idempotente via tabela `EmailSent`).
- Sem `RESEND_API_KEY`: roda em modo dev (log no console), AINDA persiste em `EmailSent` pra não duplicar tentativas.

### [LOOM/VIMEO] Vídeo demo
- **Novidade desta sessão**: section "Demo · 90s" na landing com thumbnail clicável + play button + duração 1:30.
- Aponta pra `https://www.loom.com/share/placeholder-trato-demo` — substituir quando gravar o vídeo real.

### [OPENAI / VOYAGE / ANTHROPIC] (sem mudança nesta sessão)
Veja seção anterior.

### [GOOGLE CALENDAR] OAuth Clínica
Sem mudança nesta sessão.

---

## 🟢 QUANDO PUDER

### [DOMÍNIO] trato.dev
**Novidade desta sessão**: página `/status` pública aponta pra `status.trato.dev` (CNAME). Quando registrar, adicione subdomain.

### [GOOGLE OAUTH] · [UPSTASH] · [PUSHER] · [SENTRY] · [POSTHOG] · [UPLOADTHING]
Sem mudança nesta sessão.

---

## ✅ Já desbloqueados

- Neon Postgres: configurado + schema atualizado (novos modelos: `StatusIncident`, `EmailSent`)
- Upstash Redis URL: configurado em `.env`
- Encryption key (AES-256-GCM): gerada
- Better Auth secret: gerado
- **Seed Granvilla Pet Shop** disponível via `pnpm db:seed:granvilla`

---

## 🟡 Débitos técnicos (carry-over da rodada 2)

Sem mudanças nesta sessão. Listados:
- 9 actions ainda usam helper local em vez de `requireWorkspace` central
- TOCTOU em `Broadcast.launch`
- Stripe sync ao force-downgrade não avisa cobrança pendente
- Audit dedup em retry
- Onboarding step "team invited" não detecta convite pending

---

## 📋 Como resolver tudo de uma vez

Veja `DEPLOY.md` pra checklist completa de credenciais + ordem de deploy.

Demo com cliente AGORA: nenhuma credencial nova bloqueia.
- Login: `claudio@granvilla.pet` / `Granvilla2026!` (workspace `granvilla-pet-shop`)
- Use `/whatsapp` → "Mensagem de teste" pra mostrar agente respondendo
- `/status` mostra uptime em tempo real (até pra cliente)
