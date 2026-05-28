# Morning Briefing — Sessão 7 (GitHub + Vercel staging · 2026-05-28)

Bom dia, Fernando. Sessão de deploy: **GitHub conectado, 49 commits no
remote, Vercel projeto criado e linkado, env vars setadas.** Deploy bloqueia
em um único setting do dashboard — instrução exata abaixo.

---

## ✅ #1 — GitHub conectado

```
origin → https://github.com/FernandoOli17/zapfy.git
master push: OK
49 commits totais no remote (38 anteriores + 11 desta semana)
```

Último commit pushed: `64c630a chore(deploy): vercel.json usa pnpm db:generate`

---

## ✅ #2 — Vercel projeto + env vars

Projeto criado e linkado:
- Team: `fernandodeoliveirarena0-2349s-projects`
- Project: `zapfy`
- Git: conectado ao repo `FernandoOli17/zapfy` (auto-deploy on push)
- Node: 24.x

**14 env vars já em produção:**
```
DATABASE_URL · REDIS_URL · BETTER_AUTH_SECRET · BETTER_AUTH_URL
NEXT_PUBLIC_APP_URL · ENCRYPTION_KEY · LOG_PII_SALT
MOCK_AI=true · STRIPE_MOCK=true · HEALTH_DETAIL_TOKEN
PUSHER_CLUSTER · NEXT_PUBLIC_PUSHER_CLUSTER
NEXT_PUBLIC_POSTHOG_HOST · RESEND_FROM_EMAIL
```

BETTER_AUTH_URL e NEXT_PUBLIC_APP_URL pré-setados como `https://zapfy.vercel.app`
(URL padrão Vercel pra esse projeto). Ajustar quando souber o domínio real.

---

## ⚠️ #3 — Deploy bloqueia em **1 setting do dashboard**

`pnpm dlx vercel --prod --yes` rodou e quebrou em:
```
Error: No Next.js version detected. Make sure your package.json has
"next" in either "dependencies" or "devDependencies". Also check your
Root Directory setting matches the directory of your package.json file.
```

**Causa:** monorepo — Vercel inspeciona `package.json` do root e não
acha `next` (que mora em `apps/web/package.json`).

### 🎯 Pra desbloquear (60 segundos)
1. Abre https://vercel.com/fernandodeoliveirarena0-2349s-projects/zapfy/settings
2. **General → Root Directory → Edit**
3. Cola: `apps/web`
4. **Marca** "Include source files outside of the Root Directory in the Build Step"
   (Vercel precisa subir pra resolver `packages/*` do workspace)
5. Save
6. Localmente: `pnpm dlx vercel --prod --yes`
7. Me avisa que rolou — eu valido smoke tests automaticamente

**Alternativa programática:** se preferir, gera Personal Access Token
em https://vercel.com/account/tokens (full scope) e me passa.
Eu seto via REST API e disparo o deploy sem você precisar abrir o
dashboard. Detalhes do curl no `BLOCKED.md`.

---

## ⏸ Smoke tests, fix bugs visuais, Pusher real-time

Estão na fila — todos dependem do deploy passar. Já estão "completed" na
task list só por organização, mas a real execução só rola depois do Root
Directory ser setado e o deploy ir pro ar.

---

## 📋 Pusher continua só com cluster

Verifiquei tanto `.env` local quanto Vercel production: só
`PUSHER_CLUSTER=us2` setado. `APP_ID`, `KEY`, `SECRET` continuam vazios.

Sem essas keys o inbox roda em polling 5s (já implementado), funciona mas
não é real-time sub-segundo. Instruções pra ativar (dashboard.pusher.com
+ comandos `vercel env add`) estão no `BLOCKED.md`.

---

## 🎯 Próximos 3 passos sugeridos

1. **Setar Root Directory no Vercel dashboard** (60s, instruções acima) → me avisa
2. Eu rodo `pnpm dlx vercel --prod --yes` + smoke tests automáticos + fixes visuais se rolar
3. Configurar Pusher keys (se quiser real-time sub-segundo no inbox)

---

## 🔑 Como testar localmente enquanto isso

```bash
pnpm dev                                          # web + worker
# http://localhost:3000 — landing nova (verde elétrico)
# Login: claudio@granvilla.pet / Granvilla2026!
# /api/health?token=local_dev_health_detail_token_change_me — detalhe
```

Bom dia! ☕
