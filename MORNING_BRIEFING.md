# Morning Briefing — Sessão 11 (Deploy Vercel + Pricing Meta jul/2025 · 2026-05-28)

Bom dia, Fernando. **Deploy Vercel no ar ✅** + **modelo de pricing
atualizado pra refletir mudança Meta jul/2025**. 6 commits pushed nesta sessão.

---

## 🚀 Vercel staging NO AR

URL: **https://zapfy-bv54kub6t-fernandodeoliveirarena0-2349s-projects.vercel.app**

Build verde após 3 ajustes:
1. `vercel.json` movido de root pra `apps/web/` (root directory agora é apps/web)
2. `buildCommand` ajustado pra `pnpm --filter @zapfy/db db:generate && next build`
3. `outputDirectory: .next` (relativo a apps/web, não absoluto)

41 páginas geradas, Compile 83s, deploy success.

### ⚠️ Smoke tests bloqueados por Deployment Protection
Todas rotas retornam **401 Authentication Required** porque a Vercel
ativou Deployment Protection no projeto. Pra acessar publicamente:

**Settings → Deployment Protection → Off** (ou Bypass via header)

Link direto:
**https://vercel.com/fernandodeoliveirarena0-2349s-projects/zapfy/settings/deployment-protection**

### Domínio `zapfy.store`
Você comprou o domínio (apareceu em `vercel domains ls`). Não está apontado
pro projeto ainda — quando apontar, atualizar `BETTER_AUTH_URL` e
`NEXT_PUBLIC_APP_URL` nas env vars (atualmente `https://zapfy.vercel.app`).

---

## 💸 Refactor de pricing — Meta jul/2025

**Contexto:** Meta mudou cobrança WhatsApp Cloud API em julho/2025:
- Service messages (resposta do agente IA dentro da janela 24h) ficaram **GRATUITAS**
- Custo só em broadcasts/templates de marketing proativos

**Métrica de plano antiga → nova:**

| Plano | activeContacts/mês | broadcasts/mês | numbers | seats |
|-------|-------------------:|---------------:|--------:|------:|
| Starter | **500** | **2** | 1 | 2 |
| Pro     | **3.000** | **ilimitado** | 3 | 10 |
| Premium | **ilimitado** | ilimitado | ilim | ilim |

### O que mudou no código

| Arquivo | Mudança |
|---------|---------|
| `packages/shared/src/constants.ts` | `PlanFeature.aiConversations` → `activeContacts` + novo `broadcasts`. PLANS atualizado. Const `ACTIVE_CONTACT_WINDOW_DAYS=30` |
| `apps/web/src/lib/plans.ts` | `countAiConversationsThisCycle` → `countActiveContactsThisCycle` (distinct contactId em Message últimos 30d) + `countBroadcastsThisCycle` (Broadcast count desde currentPeriodStart). `dailyActiveContactsLastDays` pra sparkline. `assertPlanLimit` aceita novos campos |
| `apps/web/src/app/(marketing)/precos/page.tsx` | PLANS_DATA + matriz comparativa + FAQ atualizados. Box verde explicativo: **"💡 Como a cobrança funciona — Respostas do agente IA são gratuitas..."** |
| `apps/web/src/app/(app)/billing/page.tsx` | 2 UsageBars (contatos ativos + broadcasts) em vez de 1 só. KeyValue extra "Respostas do agente: Gratuitas (Meta)". Sparkline mostra contatos ativos por dia. Bullet de transparência atualizado |
| `PLAN.md` | Fase 8 menciona mudança Meta. Decisão tomada explícita |

### Decisão arquitetural
Contadores são **calculados dinamicamente via queries** (Message/Broadcast),
não campos cache no Workspace. Razão: evita drift, sempre acurado, sem
worker de reset. `currentPeriodStart` vem do Stripe webhook como sempre.

---

## 📊 Commits desta sessão

```
9725d36 refactor(billing): pricing por contato ativo + broadcasts (Meta jul/2025)
c984f66 fix(deploy): outputDirectory relativo a apps/web (era .next absoluto)
abf4e8d fix(deploy): mover vercel.json pra apps/web (Root Directory setado)
3196d85 docs(briefing): sessão 10 — paleta global + vídeos menores
466e0a8 feat(brand): paleta verde elétrico no auth + dashboard, vídeos menores
```

typecheck ✅ · lint ✅ · build ✅ · push ✅

---

## 🎯 Próximos 2 passos seus

### 1. Desabilitar Deployment Protection (60s)
**https://vercel.com/fernandodeoliveirarena0-2349s-projects/zapfy/settings/deployment-protection**

→ **Deployment Protection: Off** (ou "Standard Protection" se quiser
manter previews privados mas Production público). Me avisa, eu rodo
smoke tests automaticamente.

### 2. Apontar zapfy.store pro projeto (opcional)
Você comprou. Pra usar como domínio principal:
- Settings → Domains → Add `zapfy.store`
- Vercel te dá DNS records pra configurar no registrar
- Quando ativar, me avisa pra eu atualizar env vars

---

## ⚠️ Pusher ainda sem keys
Mesma situação das sessões anteriores. Inbox roda em polling 5s
(implementado), funciona mas não real-time sub-segundo. Instruções
em `BLOCKED.md`.

Bom dia! ☕
