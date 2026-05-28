# Morning Briefing — Sessão 9 (Vídeos Veo3 + fixes design · 2026-05-28)

Bom dia, Fernando. Sessão grande: **3 vídeos Veo3 integrados na landing
+ nova seção BrandFilm**. typecheck/lint/build verdes, 2 commits pushed.

---

## 🎬 Os 3 vídeos integrados

Os arquivos estavam em `/videos/` (root, fora do tree do Next, com nome
`promt N.mp4` com typo e espaço). Movidos pra `apps/web/public/videos/`
e renomeados pra `promptN.mp4`:

```
apps/web/public/videos/prompt1.mp4   2.9 MB  hero cinematográfico
apps/web/public/videos/prompt2.mp4   1.4 MB  Forge split-screen demo
apps/web/public/videos/prompt3.mp4   2.5 MB  Ana Lima · pet shop SP
                                     ─────
                                     6.8 MB  total
```

Todos com `autoPlay muted loop playsInline poster=/brand/logo-primary.svg`
pra rodar inline em iOS sem fricção.

### Vídeo 1 — Hero
Inserido no fim do `<Hero>`, abaixo do "7 dias grátis". 16:9, `max-w-2xl`,
bordas `#1a1a1a`, overlay gradiente `from-[#0a0a0a]/60` no topo pra fundir
com o fundo dark. Entra com `animate-fade-up` delay 700ms (depois das
animações dos textos).

### Vídeo 2 — ForgeDemo (substituiu o chat animado)
A seção "Você conversa. O Zapfy monta." era um chat fake animado de ~140
linhas. Trocado por `<video src=prompt2.mp4>` (60 linhas), com badge
**"AO VIVO"** verde pulsando no canto superior direito. CTA
"Experimentar de graça" mantido logo abaixo com `animate-pulse-green`.

### Vídeo 3 — BrandFilmSection (NOVA)
Arquivo novo: `apps/web/src/components/marketing/brand-film.tsx`.
Posicionado entre `<Testimonials>` e `<MarketingFaq>`.
- Headline: **"Pequenos negócios. _Grandes resultados._"** (italic Instrument Serif na 2ª parte)
- Vídeo com overlay gradiente inferior carregando quote:
  > "Meu negócio nunca mais perdeu um cliente por falta de resposta."
  > Ana Lima · Pet Shop Granvilla · São Paulo
- Tagline embaixo: "Seu negócio nunca dorme. **O Zapfy cuida.**"

---

## 📐 Ordem final das seções

```
1.  <UrgencyBanner />           verde, 7 dias grátis
2.  <Hero />                    headline + Hero film (prompt1)
3.  <LogosStrip />              wordmarks parceiros
4.  <HowItWorks />              3 steps (01/02/03)
5.  <Features />                grid 2×3 com pills
6.  <ForgeDemo />               Forge film (prompt2)
7.  <ComparisonTable />         Zapfy vs BotConversa
8.  <Testimonials />            3 quotes Ana / Carlos / Loja
9.  <BrandFilmSection /> ⭐     Brand film (prompt3) — NOVO
10. <MarketingFaq />            FAQ dark
11. <FinalCta />                bloco verde sólido
```

---

## ✅ Fixes da Parte 2 (já aplicados na sessão anterior — confirmados ainda no ar)

| Fix | Estado |
|-----|--------|
| FAQ em dark theme | ✅ aplicado no commit `e976145` |
| Steps com watermark 96-120px | ✅ aplicado |
| Features com pill + ícone container | ✅ aplicado (categorias CORE/BUILDER/IA/INBOX/ANALYTICS/INFRA) |
| Depoimentos com aspas + métrica | ✅ aplicado |
| Hero animações escalonadas | ✅ aplicado |

Tudo no commit `e976145 fix(design): FAQ dark, cards depth, animations, spacing`.

---

## 📊 Métricas

```
Commits novos:        2 (e40e03f vídeos + 4c1d65d briefing anterior)
Arquivos novos:       4 (3 vídeos + brand-film.tsx)
Arquivos modificados: 2 (page.tsx + forge-demo.tsx)
+103 / -111 linhas líquidas (ForgeDemo encolheu)

typecheck:  ✅ exit 0
lint:       ✅ exit 0
build:      ✅ exit 0 (warnings esperados OpenTelemetry/Sentry/BullMQ)
push:       ✅ master → origin (e40e03f)
```

---

## ⚠️ Vercel staging ainda bloqueado em Root Directory

Continua o mesmo bloqueio das sessões 7-8 — você ainda não setou
**Root Directory = `apps/web`** no Vercel dashboard. Sem isso, o
auto-deploy do push acima vai falhar igual ao último.

Instruções exatas em `BLOCKED.md`. **Esse setting é o último passo
pra colocar tudo no ar com vídeo e tudo.**

---

## 🎯 Próximos 3 passos

1. **Vercel Root Directory = apps/web** (60s no dashboard) → me avisa
2. Confirmar vídeos carregando no staging (smoke test visual)
3. Pusher real-time keys (opcional, instruções em `BLOCKED.md`)

---

## 🔑 Como ver localmente

```bash
pnpm dev
# http://localhost:3000
# Hero: vídeo aparece após CTA com fade-up
# Forge section: vídeo com badge AO VIVO pulsando
# Brand film: nova seção entre depoimentos e FAQ
# Todos rodam autoplay/muted/loop, OK no iOS
```

Bom dia! ☕
