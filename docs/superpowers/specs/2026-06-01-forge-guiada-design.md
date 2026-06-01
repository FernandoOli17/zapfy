# Forge Guiada — Design (redesign híbrido)

- **Data:** 2026-06-01
- **Status:** aprovado (design); spec para revisão do usuário antes do plano
- **Autor:** Fernando + Claude
- **Escopo:** primeiro de 4 sub-projetos pedidos. Os outros 3 (cardápio+fotos multimodal,
  tutorial de onboarding, paywall) ficam fora deste spec.

## Problema

A Forge atual é um chat conversacional 100% guiado por LLM (10 fases: DISCOVERY →
VERTICAL_DETECTION → GOALS → TONE → KNOWLEDGE → TOOLS → HANDOFF → REVIEW → PUBLISH →
REFINEMENT). Funciona, mas pro público leigo as primeiras perguntas — onde a pessoa mais
trava — são uma tela em branco pedindo pra "digitar do seu negócio". Falta sensação de
"passos", e não existe a pergunta explícita de **como o atendimento deve soar** (pessoa
real vs. bot), que o usuário considera central.

## Objetivos

1. As primeiras decisões viram **passos guiados com botões** (nome → tipo → estilo de
   atendimento → objetivo), reduzindo fricção pra leigo.
2. Adicionar a escolha **"como pessoa real" vs. "assistente assumido"** e refletir isso no
   agente gerado.
3. Manter a conversa adaptativa (LLM) onde ela agrega: conhecimento/cardápio, tom fino,
   handoff, revisão, refinamento.
4. Não jogar fora o motor `runForgeStep` nem as tools existentes.

## Não-objetivos (fora de escopo deste spec)

- Upload/extração de **foto do cardápio** (multimodal) → sub-projeto #2. Aqui só fica o
  **ponto de extensão** na fase de conhecimento.
- Tutorial de onboarding pós-cadastro → sub-projeto #3.
- Paywall (sem plano = sem acesso) → sub-projeto #4 (tem conflito com a decisão atual de
  "Forge grátis pra demonstrar", a resolver lá).
- Streaming token-a-token do chat → já decidido fazer depois (fix de tempo real do chat
  entregue em 2026-06-01 cobriu eco otimista + destrava em falha).

## Decisões aprovadas

1. **Layout híbrido.** Passos 1–4 = wizard determinístico (botões/campos). Passos 5–8 =
   chat conversacional existente. Uma tela só; o `forge-workspace.tsx` decide qual modo
   renderizar pelo `currentPhase`.
2. **"Humano vs bot" = honesto-mas-caloroso.** A opção "como pessoa real" dá ao agente um
   **nome** e tom caloroso, **mas** com regra explícita: *se o cliente perguntar direto se
   é robô/automático, admite com leveza*. A outra opção é "assistente virtual assumido"
   (se apresenta como assistente). Escolha segura com política da Meta e CDC.
3. **Arquitetura: wizard sem IA + chat com IA.** Os 4 passos gravam direto no DB via server
   action nova, sem chamar a IA (instantâneo, custo zero, previsível). O chat reaproveita
   `runForgeStep` sem mudança no loop.

## Fluxo (aprovado)

**Parte 1 — passos guiados (botões):**
1. Nome da loja/empresa (campo de texto).
2. Tipo de negócio (botões: Restaurante, Loja, Clínica, Curso, Serviço, Outro).
3. Como ela atende (botões: 🧑 como pessoa real / 🤖 assistente assumido).
4. O que ela resolve sozinha — **adaptativo ao tipo** (multi-escolha com sugestões do
   vertical; ex.: Restaurante → mostrar cardápio / anotar pedido / status entrega).

→ Atalho opcional do modelo pronto por vertical (oferecido na 1ª mensagem do chat).

**Parte 2 — chat adaptativo:**
5. Conhecimento/Cardápio (texto/URL hoje; **ponto de extensão** pra foto no #2).
6. Ajuste de tom (formal/informal, emoji, nunca-diga).
7. Quando chamar um humano (handoff).
8. Revisão → Publicar v1.

## Arquitetura e componentes

### `packages/ai` (lógica compartilhada, testável)

- **`forge/types.ts`** — adicionar ao `forgeAnswersSchema`:
  ```ts
  persona: z.object({
    style: z.enum(['human', 'assistant']).default('human'),
    displayName: z.string().optional(),
  }).optional(),
  ```
- **`forge/verticals.ts`** (novo) — fonte única `vertical → objetivos sugeridos`. Hoje
  esses exemplos estão soltos no texto do prompt da fase GOALS; extrair pra dado que
  alimenta tanto os botões do passo 4 quanto o prompt.
- **`forge/prompts/meta-prompt.ts`** — consumir `persona`. `style: 'human'` → identidade
  com nome + tom caloroso + **regra de disclosure honesto**. `style: 'assistant'` → se
  apresenta como assistente virtual. Sem persona definida → comportamento atual (default
  `human`).

### `apps/web` (UI + persistência)

- **`forge/forge-wizard.tsx`** (novo) — componente client dos 4 passos: barra de progresso,
  botões/campo, estado local, chama `saveForgeBasics` ao concluir.
- **`forge/actions.ts`** — nova server action `saveForgeBasics({ sessionId, brandName,
  vertical, personaStyle, goals })`: valida com Zod, grava `collectedAnswers`, seta
  `currentPhase = KNOWLEDGE` e **semeia a 1ª mensagem do assistente** (ex.: "Boa, {Nome}!
  Já anotei o básico. Pra ela responder bem, me manda seu cardápio/FAQ…"). **Sem IA.**
- **`forge/forge-workspace.tsx`** — orquestra: `currentPhase` em DISCOVERY/VERTICAL_DETECTION/
  GOALS (básico incompleto) → renderiza `ForgeWizard`; `KNOWLEDGE`+ → renderiza o chat
  atual. Preview (coluna direita) continua igual.

## Fluxo de dados

Wizard (client) → `saveForgeBasics` (server, sem IA) → `ForgeSession` atualizada (answers +
`currentPhase=KNOWLEDGE` + msg inicial semeada) → UI troca pro chat → `sendForgeMessage`
(existente) conduz 5–8 → publica v1. Tudo persiste em `ForgeSession` como hoje.

## Erros e retomada

- `saveForgeBasics` valida tudo com Zod; sem IA = sem falha de API nessa etapa. O chat
  mantém o tratamento de erro recém-endurecido (eco otimista + try/catch/finally).
- **Retomada:** `currentPhase` é a fonte da verdade. Básico incompleto → wizard com o que já
  foi preenchido (a partir de `collectedAnswers`); `KNOWLEDGE`+ → chat.

## Testes (gate verde obrigatório)

- **Unit (Vitest, `packages/ai`):** `persona: 'human'` produz a regra de disclosure no
  prompt; `persona: 'assistant'` não; mapa `vertical → goals`.
- **Rebaseline do snapshot** do prompt do Forge (CLAUDE.md exige quando o prompt muda de
  propósito).
- **`saveForgeBasics`:** teste do schema Zod + integração com Postgres real (sem mock de DB).
- **E2E (Playwright):** percorrer os 4 passos do wizard até cair no chat (sem tocar na IA —
  o wizard não chama LLM).

## Pendências / a confirmar na implementação

- Como o atalho de **template por vertical** convive com o wizard (provável: oferecido na
  1ª mensagem semeada do chat; aplica defaults de tom/tools/handoff).
- Texto exato dos botões e da mensagem semeada (passa por next-intl desde já).
- Débito conhecido (anotado, não bloqueia): a Forge **ignora `MOCK_AI`** — fazer ela
  respeitar habilitaria E2E determinístico do caminho de sucesso do chat.
