# Morning Briefing — Sessão 5 (Rebrand + Landing polish · 2026-05-28)

Bom dia, Fernando. Sessão grande: rebrand ZapAI→Zapfy completo + Pusher
fallback + logo novo + landing rebuild + deploy prep. **Tudo verde.**
typecheck ✓, lint ✓, build ✓ (1m26s). **6 commits.**

---

## ⚠️ AINDA BLOQUEADO — push pro GitHub

Tentei `git push origin master`:
```
fatal: 'origin' does not appear to be a git repository
```
**Não tem remote.** Os 6 commits desta sessão (e os 38 anteriores) seguem
só locais. Passos exatos pra resolver no `BLOCKED.md` topo da seção GIT.

---

## 🎯 Resumo executivo

| # | Tarefa                                            | Status |
|---|---------------------------------------------------|--------|
| 1 | Commit fixes anteriores + tentar push             | ✅ commit / ❌ push (sem remote) |
| 2 | Pusher fallback polling 5s + doc keys             | ✅     |
| 3 | Rebrand ZapAI → Zapfy (195 arquivos)              | ✅     |
| 4 | Logo Zapfy (SVGs + componente)                    | ✅     |
| 5 | Landing: ForgeDemo + UrgencyBanner + animações + depoimentos | ✅ |
| 6 | Deploy prep: vercel.json + .env.staging.example   | ✅     |

---

## ✅ #1 — Pusher fallback polling

Antes: sem `PUSHER_KEY`, `InboxRealtime` era no-op silencioso — inbox
nunca atualizava sem F5.

Agora: novo helper `isPusherConfigured()` no `pusher-client.ts`.
`InboxRealtime` detecta Pusher off e seta `setInterval(router.refresh, 5_000)`.
Com Pusher real: sub-segundo (sem mudança). Sem: 5s. **Funciona em qualquer ambiente.**

Pusher real continua bloqueado por credenciais — instruções passo a passo no `BLOCKED.md`.

---

## ✅ #2 — Rebrand ZapAI → Zapfy

195 arquivos atualizados via `sed`:
- `zapai` → `zapfy` (package names, slug)
- `ZapAI` → `Zapfy` (UI strings)
- `@zapai/*` → `@zapfy/*` (imports + workspace)
- `zapai.com` → `zapfy.com.br` (domínio placeholder)
- `Trato` → `Zapfy` em **todo o (marketing)** (variáveis `trato` lowercase preservadas)

`pnpm install` atualizou symlinks. typecheck + lint verdes.

`apps/web/src/app/layout.tsx` metadata:
- title: `Zapfy — Agente IA para WhatsApp`
- description: `Crie seu agente de WhatsApp com IA em minutos. O Forge entrevista seu negócio e monta tudo automaticamente.`
- openGraph: `/brand/logo-primary.svg`, locale pt_BR

> **Decisão:** mantido "Trato" intocado em rotas/components não-marketing
> (workspace forms, etc.) — eram strings de UI antigas, troca-se manual depois
> se quiser. Sed rebrand pegou tudo do marketing público.

---

## ✅ #3 — Logo Zapfy

**Identidade:** balão verde elétrico (`#00E676`) com raio preto preenchido,
fonte Geist bold com tagline cinza.

**Arquivos novos:**
- `apps/web/public/favicon.svg`
- `apps/web/public/brand/favicon.svg`
- `apps/web/public/brand/logo-primary.svg` (fundo claro)
- `apps/web/public/brand/logo-white.svg` (fundo escuro)
- `packages/ui/src/components/logo.tsx` — componente `<ZapfyLogo variant="primary|white|icon" />`

**Substituído em:**
- `components/marketing/header.tsx`: removido "O Trato" → `<ZapfyLogo variant="white" />`
- `app/(app)/layout.tsx` sidebar: idem
- `app/(auth)/login/page.tsx`: heading "Entrar no Zapfy"

---

## ✅ #4 — Landing redesign

**ForgeDemo** (`components/marketing/forge-demo.tsx`, client):
- Substitui o placeholder Loom quebrado
- Chat animado: 5 mensagens com delays sequenciais (600/1200/1200/1500/1200 ms)
- Typing dots entre cada
- Banner emerald `forge.zapfy.com.br · live`
- CTA "Experimentar de graça →" aparece quando termina
- **Sem dependência de video/autoplay** (que travava iOS)

**UrgencyBanner** (`components/marketing/urgency-banner.tsx`, client):
- Verde brand `#00E676`, texto preto
- "🎁 7 dias grátis · sem cartão de crédito"
- Botão "Começar agora →" preto à direita
- Botão X salva `zapfy-urgency-banner-closed-v1` no localStorage
- Esconde até hidratar pra evitar flash em quem já fechou

**Animations** (`globals.css`):
- Novo `@keyframes fade-in-up` (16px translateY → 0 + opacity)
- Classes `.animate-fade-up` + `.animate-delay-{1,2,3}` (100/200/300ms)
- Respeita `prefers-reduced-motion`

**Aplicado no Hero:**
- Badge: animate-fade-up
- Headline: animate-fade-up
- Subtitle: animate-fade-up animate-delay-2
- CTA cluster: animate-fade-up animate-delay-3

**Testimonials atualizados** (nomes reais do mandato):
- Ana Lima — pet shop, São Paulo — 3× mais agendamentos
- Dr. Carlos Mendes — dentista, Belo Horizonte — Setup em 1 manhã
- Loja Moda Clara — e-commerce moda, Fortaleza — 70% resolvido pela IA

Cores trocadas de violet pra emerald nos badges de métrica.

> "Como funciona" e "VsCompetitor" já existiam — não toquei (já estavam ok).

---

## ✅ #5 — Deploy prep

**Novos:**
- `vercel.json` no root: buildCommand inclui `prisma generate` antes de Next build
- `.env.staging.example`: doc completo em 3 tiers (obrigatórias / modo demo / opcionais)
  Com `MOCK_AI=true` + `STRIPE_MOCK=true` pré-setados, staging sobe sem cobrar APIs externas
- `.env.example` rebranded pra Zapfy + adicionadas vars que faltavam:
  `MOCK_AI`, `STRIPE_MOCK`, `HEALTH_DETAIL_TOKEN`, `UPSTASH_REDIS_REST_*`
  Cluster Pusher: `us2` → `sa1` (São Paulo) recomendado

**Build final**: `pnpm build` verde em **1m26s**, 41 páginas, 2 successful (web + worker).

---

## 📊 Métricas técnicas

```
Commits da sessão:       6
Arquivos modificados:    ~210 (a maioria do rebrand sed)
Arquivos novos:          7 (logo SVGs, componentes, env.staging, vercel.json)
Linhas adicionadas:    ~520 líquidas
typecheck/lint/build:   ✅ ✅ ✅ (1m26s)
```

---

## 🎯 Próximos 3 passos (ordem de prioridade)

### 1. **Push pro GitHub** ⭐ — 44 commits sem backup
- github.com → New repo "zapfy" (private)
- `git remote add origin git@github.com:<seu-user>/zapfy.git`
- `git push -u origin master`
- Se primeira vez no PC: SSH key ou Personal Access Token

### 2. **Configurar Pusher real** — desbloqueia real-time sub-segundo
- dashboard.pusher.com → seu app → App Keys
- Cole `app_id`, `key`, `secret`, cluster (recomendo `sa1` São Paulo) no `.env`
- Sem isso, polling de 5s funciona mas não é tão fluido

### 3. **Deploy staging na Vercel**
- Vercel → New Project → import do GitHub repo (depois do push)
- Settings → Environment Variables → cole de `.env.staging.example`
- Worker no Railway: similar, mesma var REDIS_URL + DATABASE_URL
- Smoke test: signup → onboarding → /forge → /whatsapp → "Mensagem de teste"

---

## 🔑 Como demo local agora

```bash
pnpm install                    # já instalado, refresh symlinks
pnpm db:seed:granvilla          # popula tudo (idempotente)
pnpm dev                        # web + worker

# Browser: http://localhost:3000
# Login demo: claudio@granvilla.pet / Granvilla2026!
# Trocou logo, marca, animações — tudo Zapfy
```

---

## ⚠️ Carry-overs ainda pendentes (sem mudanças)

- 9 actions ainda usam helper local em vez de `requireWorkspace` central
- TOCTOU em `Broadcast.launch`
- Stripe sync ao force-downgrade não avisa cobrança pendente
- Audit dedup em retry
- Onboarding step "team invited" não detecta convite pending
- Auto-detect de incidentes na status page

Bom dia! ☕
