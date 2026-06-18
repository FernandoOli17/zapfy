# Redesign do Dashboard — Design (central de ação operacional)

- **Data:** 2026-06-18
- **Status:** aprovado (design); spec para revisão do usuário antes do plano
- **Autor:** Fernando + Claude
- **Escopo:** terceiro de 4 sub-projetos do pedido "otimizar e transformar o projeto"
  (1 Zerar erros ✅ → 2 UX do cliente ✅ → **3 Redesign do dashboard** → 4 Redesign da
  landing). Cobre só a home do app autenticado: `apps/web/src/app/(app)/dashboard`.

## Problema

O dashboard atual é um mosaico de blocos genéricos que não responde à pergunta diária
do dono do negócio — "minha IA está trabalhando e tem alguém me esperando?". Problemas
concretos:
- **Viola as próprias convenções:** usa gradiente azul hardcoded (`hsl(213 93% 60%)`)
  no CTA do Forge, enquanto o CLAUDE.md proíbe gradiente genérico e define verde
  elétrico `#00E676` como accent. (O token `--color-primary` já é verde — `hsl(151
  100% 45%)`; o azul é só hardcode pontual.)
- **Redundância:** o card de onboarding (novo, sub-projeto 2) e o bloco "Status do
  workspace" cobrem quase a mesma informação.
- **Placeholders sem valor:** "Atividade recente" é uma caixa vazia "conecte o
  WhatsApp" mesmo para quem já está operando; o grid "Próximos passos" é navegação
  estática.
- **Sem pulso operacional:** nada mostra conversas de hoje, quanto a IA resolveu
  sozinha, ou — o mais importante — quais conversas precisam do humano agora.

## Objetivos

1. Transformar a home numa **central de ação**: o cliente operando vê o pulso do dia
   e, em destaque, o que exige a atenção dele (handoffs pendentes).
2. Alinhar 100% às convenções de design (verde elétrico, sem gradiente genérico,
   superfícies flat, base zinc, dark+light, mobile-first, números grandes).
3. Remover redundância e placeholders; cada bloco mostra dado real ou um empty-state
   calmo e acionável.
4. Manter o cliente ainda configurando bem servido (o card de onboarding continua no
   topo até completar).

## Não-objetivos (fora de escopo)

- Redesign da landing/marketing → sub-projeto 4 (cosmic-bg, black-hole, OG do blog,
  páginas `(marketing)` ficam lá).
- Qualquer mudança de schema/migração.
- TASKs de zona vermelha do audit (billing/Stripe/webhooks) — não são pré-requisito.
- Métricas que o schema não suporta hoje (sem inventar dado).
- Trocar o token global `--color-primary` (já é verde; nada a fazer).

## Decisões aprovadas

1. **Ambição: reimaginar a home** (layout, hierarquia e conteúdo do zero), não só polir.
2. **Paleta: verde elétrico `#00E676`** como fonte da verdade (CLAUDE.md). Remover o
   azul hardcoded do dashboard; manter `--color-primary` verde.
3. **Função (cliente operando): pulso operacional / central de ação** — responde
   "a IA está trabalhando e tem alguém me esperando?".
4. **Layout: Direção 1 (strip de ação)** — 3 métricas grandes no topo → fila de
   handoff dominante em largura total → atividade + plano embaixo → ações rápidas.

## Arquitetura e fluxo de dados

- **`apps/web/src/lib/dashboard-stats.ts`** (novo): `getDashboardStats(workspaceId)`
  retorna `DashboardStats | null`:
  ```ts
  interface HandoffItem {
    conversationId: string;
    contactName: string;       // contact.name ?? telefone mascarado
    preview: string;           // texto da última mensagem (truncado)
    waitingSince: string;      // ISO de lastMessageAt
  }
  interface DashboardStats {
    conversasHoje: number;          // Conversation com createdAt >= início do dia BRT
    resolvidasIaCount: number;      // conversas de hoje SEM handoff (status != HUMAN_HANDLING)
    resolvidasIaPct: number;        // 0–100 (0 quando conversasHoje === 0)
    aguardando: HandoffItem[];      // status HUMAN_HANDLING, ordenado por lastMessageAt asc, top 5
    aguardandoTotal: number;        // contagem total (pode passar de 5)
    atividade14d: Array<{ label: string; value: number }>; // reusa dailyAiConversationsLastDays
    planoUso: { usado: number; limite: number | null };     // reusa countAiConversationsThisCycle + features
    contatos: number;
    whatsappConnected: boolean;     // pra decidir empty-state
  }
  ```
  Todas as queries indexadas por `workspaceId`; em falha retorna `null` + `log.error`
  (o dashboard renderiza sem os blocos operacionais e **nunca quebra**), espelhando
  `getOnboardingProgress`. Reusa helpers de `lib/plans.ts` (`dailyAiConversationsLastDays`,
  `countAiConversationsThisCycle`, `planFeatures`).
- **Derivação pura:** a parte sem DB (cálculo de `resolvidasIaPct`, montagem dos
  `HandoffItem`, ordenação) fica numa função pura `deriveDashboardStats(inputs)`
  separada das queries, testável isoladamente.
- **`dashboard/page.tsx`** vira composição enxuta: busca `getOnboardingProgress` (já
  existe) + `getDashboardStats` e renderiza os componentes. Remove os counts órfãos e
  os blocos mortos.

## Dois estados (resolvidos por dado, não por rota)

- **Configurando:** o card de onboarding (auto-esconde ao completar) fica no topo; os
  blocos operacionais aparecem em empty-state ("conecte o WhatsApp pra ver o pulso").
- **Operando:** card some; strip + fila + atividade mostram dado real.
- A regra é só a presença de dado — sem flag nem rota separada.

## Layout (Direção 1), topo → base

1. **Header:** "Olá, {primeiro nome}" + nome do workspace + `PlanBadge` verde (status
   real, sem trial fake — já corrigido no sub-projeto 2).
2. **Card de onboarding** (`OnboardingChecklist`, só enquanto incompleto).
3. **Strip de métricas** (`metric-strip.tsx`): 3 números grandes —
   Conversas hoje · Resolvidas pela IA (nº + %) · **Aguardando você** (cor âmbar/atenção
   quando >0). Mobile: vira coluna.
4. **Fila "Aguardando você"** (`handoff-queue.tsx`, largura total): lista dos
   `aguardando` (iniciais + nome + preview + "há Xmin"), CTA "abrir inbox →". Estados:
   - `aguardando.length === 0` e operando → "Tudo em dia ✓ — a IA está dando conta."
   - `!whatsappConnected` → empty-state apontando pro passo de conexão.
5. **Atividade + plano** (`activity-card.tsx`, 2 col → empilha no mobile): sparkline de
   14 dias (já em BRT, fix do sub-projeto 1) + barra de uso do plano no ciclo
   (`usado/limite`, ∞ quando `limite === null`).
6. **Ações rápidas** (`quick-actions.tsx`): faixa fina secundária (Forge, Inbox,
   Conhecimento, Broadcasts) com ícones — substitui o grid "Próximos passos" e o bloco
   "Status do workspace".

## Paleta / convenções aplicadas

- `text-primary`/`bg-primary` (já verde) usados consistentemente; remover o gradiente
  `hsl(213 93% 60%)` do CTA do Forge e alinhar `manifest.theme_color` (#60A5FA →
  verde `#00E676`).
- Sem gradiente genérico; superfícies flat com borda 0.5px; accent verde pontual sobre
  base zinc/neutra; dark+light via tokens (`bg-card`, `text-foreground`, `border-border`,
  `text-muted-foreground`).
- Micro-interações com as animações CSS já existentes (`animate-slide-up`,
  `animate-fade-in`, `animate-stagger`).
- Mobile-first: strip de 3 → coluna; atividade+plano → empilha; fila de handoff
  legível em telas estreitas (preview truncado).
- Acessibilidade AA: cada métrica com label, a fila com `role="list"`, foco visível,
  contraste do âmbar/verde verificado em ambos os modos.

## Componentes (arquivos focados, uma responsabilidade cada)

- `apps/web/src/lib/dashboard-stats.ts` — dados + derivação pura.
- `apps/web/src/app/(app)/dashboard/metric-strip.tsx` — 3 métricas grandes.
- `apps/web/src/app/(app)/dashboard/handoff-queue.tsx` — fila "aguardando você" + estados.
- `apps/web/src/app/(app)/dashboard/activity-card.tsx` — sparkline + uso do plano.
- `apps/web/src/app/(app)/dashboard/quick-actions.tsx` — faixa de ações.
- `apps/web/src/app/(app)/dashboard/page.tsx` — composição enxuta; remove
  `StatusRow`, grid `ACTIONS`, hero gradiente do Forge, `Stat` antigo e counts órfãos.

## Erros e testes

- `getDashboardStats` retorna `null` em qualquer falha → dashboard sem blocos
  operacionais, sem quebrar. Componentes tratam dado ausente com empty-state.
- Derivação pura (`deriveDashboardStats`) testável: %IA com `conversasHoje === 0`
  (sem divisão por zero), ordenação dos handoffs, truncamento de preview, plano ∞.
  Onde rodar: `apps/web` não tem harness Vitest — cobrir via E2E +, se viável,
  extrair a função pura pra um ponto testável; senão justificar no commit (padrão dos
  sub-projetos anteriores).
- E2E (Playwright, harness existente): dashboard de workspace novo mostra o card +
  empty-states; com dado semeado, strip e fila renderizam.
- Gate completo verde ao final; commits locais em master, push/PR só com OK.

## Critério de sucesso

- Cliente operando abre o dashboard e vê, sem rolar: quanto a IA resolveu hoje e
  quem está esperando por ele, com 1 clique pro inbox.
- Cliente configurando vê o card de onboarding + empty-states calmos.
- Zero gradiente azul/genérico no dashboard; verde consistente; funciona em
  dark e light; legível no mobile.
- Gate verde de ponta a ponta.

## Riscos e mitigação

- **Custo de queries por load** → todas `count`/`findMany` pequenas indexadas por
  `workspaceId`; a de handoff usa `take: 5`. Aceitável; cachear por request se pesar.
- **`countAiConversationsThisCycle` é `server-only`** → o dashboard é server
  component, então importa direto (sem mover pra shared).
- **Definição de "resolvidas pela IA hoje"** → proxy = conversas de hoje que não estão
  em `HUMAN_HANDLING`. É uma aproximação (uma conversa pode ter sido resolvida e
  reaberta); aceitável pro pulso diário, documentado no código.
- **Conflito com sub-projeto 2** → o card de onboarding e o `PlanBadge` já corrigidos
  são reusados como estão; o redesign compõe em volta deles, não os reescreve.
