# Morning Briefing — Sessão 8 (Design fixes · 2026-05-28)

Bom dia, Fernando. Sessão focada nos **7 problemas visuais que você listou**
na landing. **Todos corrigidos**, typecheck/lint/build verdes, push pro
GitHub: `e976145 fix(design): FAQ dark, cards depth, animations, spacing`.

---

## ⚠️ Vercel staging ainda bloqueado em Root Directory
Continua o mesmo bloqueio da sessão 7 — você ainda não setou
**Root Directory = `apps/web`** no dashboard. Sem isso o deploy não passa.
Push automático do GitHub vai tentar build novo agora e vai falhar igual.
Instruções continuam em `BLOCKED.md`.

---

## ✅ P1 — FAQ em dark theme (CRÍTICO)
**Antes:** `bg-white py-24` — quebrava o tema escuro inteiro.
**Depois:** `bg-[#0a0a0a] py-32`, items em `bg-[#111] border-[#1a1a1a]`,
texto branco/[#888], ícone +/− em `text-[#00E676]`. Item aberto ganha
`border-[#00E676]/30`. Headline com "dúvida?" em Instrument Serif italic.

## ✅ P2 — Steps refinados
Watermark `text-[120px]` já existia. Ajustado ícone de 24px→28px (`h-7 w-7`)
conforme briefing. Hover `border-[#00E676]/30` mantido.

## ✅ P3 — Features com pill + ícone em container
- Card: `bg-[#0d0d0d]` (era `#111` flat) → contraste com surface principal
- Pill de categoria no topo: **CORE · BUILDER · IA · INBOX · ANALYTICS · INFRA**
  Cada uma em `bg-[#00E676]/10 text-[#00E676] text-[10px]`
- Ícone movido pra container `w-10 h-10 rounded-xl bg-[#00E676]/10` com
  ícone 20px dentro (era 32px solto)
- Hover: `bg-[#111] + border-[#00E676]/25 + scale(1.01) transition-all`

## ✅ P4 — Depoimentos com credibilidade
- Aspas `&ldquo;` gigantes (`text-[80px] leading-[0.8] text-[#00E676]/20`)
  como marca d'água no canto superior direito
- Métrica numérica em destaque **acima** do nome, em `text-[#00E676] font-medium`:
  - "+340% de agendamentos no fim de semana" — Ana Lima
  - "Setup completo em 1 manhã" — Dr. Carlos Mendes
  - "70% das dúvidas resolvidas pela IA" — Loja Moda Clara
- Card: `bg-[#0d0d0d]` (era `#111`)

## ✅ P5 — Hero com animações escalonadas
Já existia `animate-fade-up`. Trocados delays de `animate-delay-N` pra
`delay-N` (alias do briefing). Sequência:
- Badge: `delay-1` (100ms)
- H1: `delay-2` (200ms)
- Subtítulo: `delay-3` (300ms)
- CTAs: `delay-4` (400ms)
- "7 dias grátis · sem cartão": inline `animationDelay:500ms`

## ✅ P6 — ComparisonTable visualmente decisivo
- Coluna **Zapfy**: header `bg-[#00E676] text-[#0a0a0a] font-bold` (era
  texto branco em fundo escuro)
- Badge **"Recomendado"** com `animate-pulse-green` (novo keyframe verde
  pulsando, já existia no globals.css desde sessão 6)
- Coluna **BotConversa**: header `bg-[#1a1a1a] text-[#666]` deprimido
- Linha "Preço inicial": `R$ 97/mês` em verde bold, `R$ 197/mês` em #666
- Linha "Trial grátis": Zapfy "7 dias · sem cartão" em verde, BotConversa
  agora mostra "Não" em `text-[#ef4444]` com ícone X (não mais bolha vermelha)

## ✅ P7 — Spacing consistente
Substituído `py-[120px]` por `py-32` (≈128px conforme briefing) em
**TODAS** as sections de marketing via sed. Confirmado 0 ocorrências
de `py-[120px]` em `apps/web/src/`.

---

## 📊 Métricas

```
4 arquivos modificados, +120/-57 linhas líquidas
typecheck:  ✅ exit 0
lint:       ✅ exit 0
build:      ✅ exit 0 (warnings esperados de OpenTelemetry/Sentry/BullMQ)
push:       ✅ a547fcc..e976145 → master
```

---

## 🎯 Próximos passos

1. **Vercel staging** — setar Root Directory = `apps/web` no dashboard
   (60s, instruções no `BLOCKED.md`). Auto-deploy do push acima ainda
   vai falhar até esse setting ser ajustado.
2. **Pusher real-time** — keys ainda faltam (`BLOCKED.md`)
3. **Smoke tests** assim que staging passar

---

## 🔑 Como ver localmente

```bash
pnpm dev
# http://localhost:3000
# Scroll de cima a baixo: nenhuma seção branca, tudo dark + verde
# Hero: entrada escalonada em ~600ms
# FAQ: clique nos accordions — bordas verdes ao abrir
# Comparativo: coluna Zapfy verde sólido com badge pulsando
```

Bom dia! ☕
