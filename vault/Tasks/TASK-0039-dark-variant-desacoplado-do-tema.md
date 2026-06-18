---
id: TASK-0039
type: task
status: todo
phase: Sub-3-Redesign-Dashboard
priority: P2
area: web
created: 2026-06-18
updated: 2026-06-18
related: []
tags: [task, area/web, audit-design, acessibilidade]
---
# Variantes `dark:` do Tailwind desacopladas do toggle de tema do app

## Objetivo
Descoberto na revisão de design do redesign do dashboard (2026-06-18): o app faz
tema por **classe `.light`** (dark é o default no `@theme`; `packages/ui/src/styles.css:62`
override no `.light`), mas **não existe `@custom-variant dark`** definido. Em Tailwind
v4 isso faz toda variante `dark:` resolver por `@media (prefers-color-scheme: dark)` —
ou seja, segue o **SO do usuário, não o toggle do app**.

Consequência: quem usa tema **claro no app** mas tem o **SO em modo escuro** recebe os
estilos `dark:` (cores claras) sobre superfícies claras → contraste baixo, falha AA. O
inverso (tema escuro no app, SO claro) mostra o shade de modo claro sobre fundo escuro.

O dashboard foi corrigido (não usa mais `dark:` — tokenizado via `--color-warning`/
`text-primary`). Mas o padrão `dark:` está espalhado pelo app **fora do escopo do
redesign** e continua quebrado.

## Onde aparece (amostra — fazer varredura completa)
- `apps/web/src/app/(app)/dashboard/onboarding-checklist.tsx` (sub-projeto 2:
  `dark:text-emerald-400`).
- `apps/web/src/app/(app)/billing/page.tsx` (vários `dark:text-amber-400`/`emerald-400`).
- `apps/web/src/app/status/page.tsx` (`dark:text-amber-400` etc.).
- `rg "dark:" apps/web/src` pega o resto.

## Plano (decisão de abordagem + QA)
Duas saídas possíveis, decidir uma:
- (a) **Casar o `dark:` ao modelo do app:** adicionar um `@custom-variant dark` que
  signifique "quando NÃO está em `.light`" (o app é dark-first). Faz todo `dark:`
  existente passar a seguir o toggle de uma vez — mas é mudança global que muda
  muitas cores; exige QA visual em dark E light em todas as telas.
- (b) **Tokenizar:** trocar `amber-*`/`emerald-*` + `dark:` por tokens semânticos
  (`--color-warning` já existe; criar `--color-success` se preciso) que já trocam pelo
  `.light`. Mais trabalho mecânico, sem risco global.
- Em ambos: varredura `rg "dark:" apps/web/src`, e checar contraste AA nos pares
  cor/fundo afetados.

## Critério de pronto
- [ ] nenhum estilo de cor de tema depende de `prefers-color-scheme` desacoplado do toggle
- [ ] contraste AA verificado em dark e light nas telas afetadas
- [ ] gate verde
