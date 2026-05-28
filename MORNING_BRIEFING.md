# Morning Briefing — Sessão 10 (Paleta global + vídeos menores · 2026-05-28)

Bom dia, Fernando. Sessão focada nos 3 pedidos:
1. **Vídeos menores** ✓
2. **Paleta brand no auth + dashboard** ✓ (via tokens — propagou em todas as 20+ rotas)
3. **Deploy Vercel** ⚠️ — você prefere setar Root Directory no dashboard
   (60s), aí eu redeployo

Tudo verde: typecheck ✓, lint ✓. Push: `599d89c..466e0a8`.

---

## 🎬 Vídeos menores
Reduzi pra mascarar artefatos visuais da IA Veo3:

| Vídeo | Antes | Depois |
|-------|-------|--------|
| Hero film (prompt1) | `max-w-2xl` (672px) | `max-w-md` (448px) |
| ForgeDemo (prompt2) | `max-w-4xl` (896px) | `max-w-2xl` (672px) |
| BrandFilm (prompt3) | `max-w-4xl` (896px) | `max-w-2xl` (672px) |

Comentários inline explicando o porquê do tamanho intencional.

---

## 🎨 Paleta brand em **TODO** o app (auth + dashboard)

Em vez de editar 20+ arquivos do dashboard um por um, troquei os
**design tokens** em `packages/ui/src/styles.css`. Como o dashboard
inteiro usa `bg-primary`, `text-primary`, `border-primary`, etc.,
a mudança propagou automaticamente:

| Token | Antes | Depois |
|-------|-------|--------|
| `--color-primary` | hsl(213 93% 68%) sky blue | **hsl(151 100% 45%)** = `#00E676` verde Zapfy |
| `--color-background` | hsl(225 50% 4%) cosmic | hsl(0 0% 4%) = `#0a0a0a` |
| `--color-card` | hsl(225 30% 7%) | hsl(0 0% 7%) = `#111` |
| `--color-popover` | hsl(225 35% 6%) | hsl(0 0% 5%) = `#0d0d0d` |
| `--color-muted-foreground` | hsl(220 8% 65%) | hsl(0 0% 53%) = `#888` |
| `--color-accent` | tinted blue | tinted verde |
| `--color-destructive` | hsl(0 72% 55%) | hsl(0 84% 60%) = `#ef4444` |
| `--color-ring` | sky blue | verde |

Modo light: primary verde mais escuro (35% L) pra contraste em fundo branco.

### (auth) layout reescrito
- `BrandPanel` agora usa `ZapfyLogo` (era "O Trato" violet)
- Glow radial verde (era azul), top accent line verde
- Heading "Por que Zapfy" label, italic "É um funcionário..." em #00E676
- 4 métricas (24/7, <2s, Cloud API, LGPD) em cards `bg-[#111] border-[#1a1a1a]` com valor em verde
- Footer "Zapfy © 2026 · Termos · Privacidade"

### (app) dashboard layout
- Workspace card: `zapfy.com.br/<slug>` (era `Trato.dev/...`)
- Mobile topbar: `ZapfyLogo` (era "O Trato")
- Todo o resto: `bg-card`/`border-border`/`text-primary` pegou paleta nova
  sem precisar de edit individual

### Refs textuais "Trato" → "Zapfy"
Sed em 10 arquivos restantes: admin, automations, integrations, settings,
whatsapp + lib/email (client + templates).

---

## ⚠️ Vercel staging — pendente do dashboard
Você escolheu setar Root Directory pelo dashboard (mais limpo).
**Passos exatos:**
1. https://vercel.com/fernandodeoliveirarena0-2349s-projects/zapfy/settings
2. **General → Root Directory → Edit → `apps/web`**
3. Marca **"Include source files outside of the Root Directory in the Build Step"**
   (Vercel precisa subir pra resolver packages/* do workspace)
4. **Save**
5. Me avisa que rolou — eu rodo `pnpm dlx vercel --prod --yes`
   e faço smoke tests

URL prevista: `https://zapfy.vercel.app` (já setei `BETTER_AUTH_URL` e
`NEXT_PUBLIC_APP_URL` no project Vercel apontando pra esse domínio).

---

## 📊 Métricas

```
1 commit pushed:    466e0a8 feat(brand): paleta verde + vídeos menores
17 arquivos modificados
+127 / -116 linhas líquidas

typecheck:  ✅ exit 0
lint:       ✅ exit 0
```

---

## 🎯 Próximos passos

1. **Setar Root Directory no dashboard** (60s) → me avisa → eu deployo
2. Smoke tests no staging assim que subir
3. Pusher keys (opcional, real-time inbox)

Bom dia! ☕
