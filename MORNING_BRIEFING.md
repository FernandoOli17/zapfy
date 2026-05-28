# Morning Briefing — Sessão 6 (Landing redesign · 2026-05-28)

Bom dia, Fernando. Sessão focada: **redesign completo da landing pra
eliminar mistura de cores e impor identidade Zapfy verde elétrico.**
Tudo verde: typecheck ✓, lint ✓, build ✓. **1 commit grande.**

---

## ⚠️ AINDA BLOQUEADO — push pro GitHub
```
fatal: 'origin' does not appear to be a git repository
```
**46 commits** locais sem backup remoto. Passos no `BLOCKED.md` ↑.

---

## 🎯 Diagnóstico atendido

Os 4 problemas listados no briefing foram corrigidos:

| Problema | Antes | Depois |
|----------|-------|--------|
| Cores inconsistentes | Roxo (#7C3AED) + teal + azul (#67e8f9) + verde misturados | **#00E676 único acento** em toda landing. Roxo/teal/blue eliminados |
| Tipografia sem hierarquia | Headlines similares em peso/tamanho | Hero `clamp(3rem,9vw,5.5rem)` bold vs body 18px regular. Instrument Serif italic em momentos editoriais |
| Seções sem respiro | Padding 24-48px aleatório | **`py-[120px]` em TODA seção**. Gap cards 24px (`gap-6`) ou 32px (`gap-8`) |
| Falta de identidade | Logo placeholder "O" violet | **ZapfyLogo** (balão + raio verde) no header e footer. Destaque "com inteligência real" em #00E676 |

---

## 📐 Layout antes/depois — seção por seção

### Hero
**Antes:**
```
[badge violet] Agente IA · WhatsApp...
                                              
"Seu WhatsApp, com inteligência real."
                  ^^^^^^^^^^^^^^^^^^^^^
                  gradient violet→azul→ciano
                                              
[CTA violet]  [secondary]
```

**Depois:**
```
[badge verde·25% bg] Agente IA · Cloud API
                                              
"Seu WhatsApp, com inteligência real."
                  ^^^^^^^^^^^^^^^^^^^^^
                       #00E676 sólido
                                              
[CTA verde sólido]  [secondary border]
```

### Como funciona
**Antes:** 3 cards simples com ícones violet.

**Depois:** 3 cards com **número GIGANTE de marca d'água** (`120px` font-weight bold, opacity 5%, posicionado top-right) virando 10% no hover. Ícone outline verde 24px. fadeInUp escalonado (delay-1/2/3).

### Features
**Antes:** mistura de cards + "FeatureBento" extra confuso (2 seções diferentes pra mesma coisa).

**Depois:** **uma única grid 2×3** com 6 features. Hover border vai pra `#00E676/30`. Card: `bg-[#111] border-[#1a1a1a] rounded-2xl p-8`. Ícone 32px verde no topo.

### ForgeDemo
**Antes:** chat com bolhas em emerald-500/15 + violet residual no header.

**Depois:** **100% paleta brand**: bolhas em `#00E676/12 ring-[#00E676]/25`, typing dots com nova `@keyframes cursor-blink`, CTA com `@keyframes pulse-green` (anel verde expandindo).

### ComparisonTable (componente novo)
**Antes:** tabela grande no meio da página com 10 features, cores violet pra Zapfy / zinc pra BotConversa.

**Depois:** **componente isolado** `comparison-table.tsx`. Header com badge verde "Recomendado" sobre Zapfy. Linhas alternadas (`#0d0d0d` / `#111`). ✓ verde para Zapfy (`bg-[#00E676]/15`), ✗ vermelho (`bg-red-500/10`), texto neutro #888 para empate. CTA "Ver todos os detalhes →" em verde no footer.

### Depoimentos
**Antes:** quotes em texto regular, badge violet pra métrica.

**Depois:** **5 estrelas verdes** no topo. Quote em `font-serif italic 18px`. Avatar inicial em `bg-[#00E676]/15 text-[#00E676]`. Border separa quote de nome/cidade.

### FinalCta
**Antes:** dois CTAs no fim, fundo zinc-950 padrão.

**Depois:** **única seção com fundo #00E676 sólido**. Headline 5xl/6xl com "seu atendimento?" em Instrument Serif italic. CTA inverso preto com texto verde. Forte contraste como remate visual.

### Header
**Antes:** sempre opaco com bg-zinc-950/80. Botão "Criar conta" violet.

**Depois:** **transparente no topo, blur ao scrollar** (Y>12). Border #1a1a1a/08 só aparece com scroll. CTA "Criar agente grátis" verde sólido + scale hover.

### Footer
**Antes:** 3 colunas (Produto/Empresa/Legal), logo placeholder violet "O Trato".

**Depois:** **4 colunas** (+Redes sociais com Instagram/Twitter/LinkedIn/GitHub placeholders). Bg `#080808` mais escuro que landing pra separar. Texto `#444` discreto. Hover dos links em `#00E676`.

---

## 🔧 Mudanças técnicas

### globals.css
```css
:root {
  --green: #00E676;
  --black: #0a0a0a;
  --surface: #111111;
  --border: #1a1a1a;
  --text-muted: #888888;
}

@keyframes cursor-blink { /* typing dots */ }
@keyframes pulse-green   { /* CTA ring */ }

.animate-cursor      { animation: cursor-blink 1s ... infinite; }
.animate-pulse-green { animation: pulse-green  2s ... infinite; }
.delay-{1,2,3,4}     /* aliases sem prefixo "animate-" */
```

### Estatísticas
```
page.tsx:        1.177 → 343 linhas (-71%)
                 Eliminadas: TechStrip, FeatureBento, Comparison,
                 Pricing, Principles (cabiam na FAQ ou eram redundantes)

8 arquivos modificados, 1 criado (comparison-table.tsx)
+549 / -1004 linhas líquidas

typecheck: ✅ exit 0
lint:      ✅ exit 0 (após remover import Sparkles unused)
build:     ✅ 2 successful tasks
```

### Arquivos auditados — paleta limpa
Marketing files com violet/indigo/purple/teal/sky/cyan: **0**.
Pages dashboard (`(app)/`) ainda têm — fora do escopo desta sessão.

---

## ⚠️ Carry-overs

- **Push pro GitHub** — bloqueador #1, 46 commits sem backup
- **Pusher real** — só cluster setado, real-time ainda via polling 5s
- **Logos da faixa "Infraestrutura"** — atualmente são wordmarks em texto, sem SVG real (sem dependência de assets externos, mas pode trocar quando tiver os logos)
- **9 actions** ainda sem `requireWorkspace` central (carry-over antigo)

---

## 🎯 Próximos 3 passos sugeridos

1. **Subir o repo no GitHub** e dar push (46 commits)
2. **Deploy Vercel staging** — `.env.staging.example` pronto, cole no dashboard
3. **Gravar vídeo demo curto** (se quiser substituir o ForgeDemo animado pelo video real depois)

---

## 🔑 Como ver localmente

```bash
pnpm dev
# http://localhost:3000 — landing nova
# Scroll: header ganha blur + border após Y>12
# ForgeDemo: chat animado 5 msgs, CTA pulse verde no fim
# FinalCta: bloco verde grandalhão no rodapé
```

Bom dia! ☕
