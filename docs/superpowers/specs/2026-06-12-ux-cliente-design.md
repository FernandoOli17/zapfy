# UX do Cliente — Design (jornada de onboarding + quick wins)

- **Data:** 2026-06-12
- **Status:** aprovado (design); spec para revisão do usuário antes do plano
- **Autor:** Fernando + Claude
- **Escopo:** segundo de 4 sub-projetos do pedido "otimizar e transformar o projeto"
  (1 Zerar erros ✅ → **2 UX do cliente** → 3 Redesign dashboard → 4 Redesign landing).
  Insumo direto: anotações de UX da auditoria
  (`docs/superpowers/audits/2026-06-10-zerar-erros/relatorio.md`).

## Problema

O cliente (dono do negócio) chega no app e não existe caminho guiado do signup até
o valor real — a primeira conversa respondida pela IA no WhatsApp. Os passos existem
(Forge, simulador, billing, conexão Meta, mensagem de teste) mas estão espalhados,
sem ordem visível, e o mais difícil (credenciais da Meta) não tem guia nenhum. Além
disso a auditoria catalogou ~13 promessas falsas e inconsistências de UI que corroem
confiança (botão que não existe, branding trocado, badges mentindo estado).

## Objetivos

1. Jornada visível e retomável: o dono sempre sabe qual é o próximo passo até a IA
   atender de verdade, mesmo que o processo leve dias (aprovação da Meta).
2. Mostrar o valor ANTES de pedir cartão: o simulador vira vitrine ("é assim que
   seus clientes serão atendidos").
3. Destravar o passo Meta: leigo consegue achar token/IDs sozinho com o guia.
4. Zerar as promessas falsas de UI catalogadas no audit (quick wins).

## Não-objetivos (fora de escopo)

- Redesign visual do dashboard e da landing → sub-projetos 3 e 4.
- Cardápio + fotos multimodal e paywall → backlog (decisão futura).
- TASKs de zona vermelha do audit (TASK-0020..0038) — só entram se o usuário der OK
  em separado; nenhuma é pré-requisito deste design.
- Migração de schema — o design foi escolhido justamente pra não precisar.
- Tour overlay/coachmarks (formato C) — descartado: não sobrevive a processo de dias.

## Decisões aprovadas

1. **Formato: card de progresso no dashboard** (opção A). Persistente até completar,
   minimizável, some sozinho no fim. Página dedicada e tour foram descartados.
2. **Passos "valor antes de pagar":**
   1. Montar agente no Forge → 2. Ver a IA funcionando (simulador) → 3. Ativar
   plano → 4. Conectar WhatsApp → 5. Primeira conversa real.
3. **Guia da Meta: embutido + validação** na própria página /whatsapp (acordeão com
   prints, pré-requisitos, validação de formato, erros traduzidos). Wizard dedicado
   descartado (caro; reavaliar no sub-projeto 3).
4. **Estado 100% derivado** dos dados existentes — zero schema. Minimizado em
   `localStorage`. Sempre verdadeiro e auto-corrigível (passos fora de ordem ok).

## Componente 1 — Card "Coloque sua IA pra atender" (dashboard)

Server Component renderizado no topo de `(app)/dashboard`, alimentado por
`getOnboardingProgress(workspaceId)` — helper novo em `apps/web/src/lib/onboarding.ts`.

| # | Passo | Detecção (derivada) | CTA |
|---|-------|---------------------|-----|
| 1 | Montar agente no Forge | `Agent` do workspace com `currentVersionId != null` | `/forge` |
| 2 | Ver a IA funcionando | `AuditLog` com `action: 'agent.test'` no workspace | `/agent` |
| 3 | Ativar plano | `Subscription.status` ∈ {ACTIVE, PAST_DUE} | `/billing` |
| 4 | Conectar WhatsApp | `WhatsAppAccount` com `status: CONNECTED` | `/whatsapp` |
| 5 | Primeira conversa real | `Message` OUTBOUND `fromAi: true` com `whatsappMessageId != null` | seção de teste em `/whatsapp` |

Comportamento:
- Barra de progresso + lista; concluídos riscados; o PRÓXIMO passo destacado com
  botão direto. Título: "Coloque sua IA pra atender — N de 5".
- Completo (5/5) → card não renderiza (sem cerimônia de dismissal).
- Minimizar (ícone) → vira linha fina "Continuar configuração (N/5)" persistida em
  `localStorage` (`zapfy.onboarding.minimized`); clicar expande de volta.
- Erro no cálculo → card não renderiza e `log.error` — nunca quebra o dashboard.
- O helper expõe a lógica de derivação como função pura
  (`deriveOnboardingSteps(inputs) → steps`) separada das queries, pra teste isolado.

## Componente 2 — Simulador como vitrine (passo 2)

O `TestAgent` de `/agent` já roda `runAgent` real (sem worker/WhatsApp/assinatura).
Melhorias:
- **Chat multi-turno:** estado client com histórico; a action `testAgent` passa
  `messageHistory` pro `runAgent` (que já aceita). Layout de bolhas simples.
- **Marca o passo:** primeira chamada de `testAgent` no workspace grava
  `AuditLog { action: 'agent.test' }` (modelo já existe — sem schema).
- **Copy de vitrine:** "É assim que seus clientes serão atendidos" + CTA pro próximo
  passo do checklist quando a conversa flui.

## Componente 3 — Guia embutido "Conectar WhatsApp" (/whatsapp)

- Bloco "Antes de começar": pré-requisitos (conta Meta Business, app criado no
  developers.facebook.com, número de telefone dedicado).
- Acordeão passo a passo com **prints estáticos** do painel da Meta
  (`apps/web/public/guias/meta/*.png`) mostrando onde achar: Phone Number ID,
  WABA ID, token permanente (system user), App Secret.
- **Validação client de formato** antes do submit: token (prefixo `EAA`/comprimento),
  IDs numéricos — erro inline imediato.
- **Erros da Meta traduzidos:** mapa código→mensagem acionável em pt-BR no caminho
  do "testar conexão" existente (ex.: token expirado → "Gere um token permanente:
  passo 3 do guia acima"; 131030 número não registrado → ação correspondente).
  Erros não mapeados caem em mensagem genérica + código bruto pequeno.

## Componente 4 — Quick wins do audit (13 itens)

1. `/verify-device`: action de **reenvio de código** (a tela promete botão que não
   existe). Independente do redesign de segurança da TASK-0020 — não conflita.
2. **Branding unificado "Zapfy"**: onboarding e invite ainda dizem "Trato"/"Trato.dev"
   (`onboarding/page.tsx:35`, `onboarding-form.tsx:55`, `invite/[token]/page.tsx:46`).
3. `/verify-device` respeita tema claro/escuro (hoje dark hardcoded `#0a0a0a`).
4. Wizard do Forge: `maxLength={80}` no input do passo 1 (hoje só erro Zod no fim).
5. Preview pós-publicação do Forge linka `/whatsapp` (`forge-workspace.tsx:577`).
6. `EmptyState` morto do chat do Forge removido (`forge-workspace.tsx:333`).
7. Worker: resposta da IA atualiza `conversation.lastMessageAt` (ordenação/preview
   do inbox defasados).
8. Worker: **botões/listas interativas** do WhatsApp viram texto processável (extrair
   o title/payload da resposta interativa em vez de ignorar sem resposta).
9. Worker: mensagem-ponte de handoff ("Vou transferir você...") persiste como
   `Message` `fromAi: false` (atendente passa a ver o que o cliente recebeu).
10. Dashboard: card "Base de conhecimento" com `ready: true` (`dashboard/page.tsx:62`).
11. `/billing` com INCOMPLETE: não exibir "Plano atual: Starter" — mostrar estado
    real "Nenhum plano ativo" + CTA de assinatura.
12. `/analytics`: alinhar copy do rodapé ("em breve…") com o header ("tempo real").
13. Quotes: guarda de transição manual pra `EXPIRED` (só de SENT, igual às demais).

## Erros e testes

- Derivador puro (`deriveOnboardingSteps`) com testes unitários dos estados
  (0/5..5/5, fora de ordem). Onde morar: a função é pura e usa só tipos — pode viver
  em `apps/web/src/lib/onboarding.ts`; teste via harness E2E se unit não couber.
- E2E Playwright (harness já existe): signup → dashboard mostra card no passo 1 →
  publica agente (fixture) → card avança.
- Quick wins do worker (7-9): sem harness de unit no worker — verificação por
  typecheck/lint + revisão; mesmos critérios do audit.
- Gate completo verde ao final; commits locais em master, push/PR só com OK.

## Critério de sucesso

- Workspace novo vê o card no passo 1; cada ação real avança o passo sem reload
  manual enganar (estado derivado).
- Um leigo consegue preencher as credenciais da Meta usando só o guia da página.
- As 13 promessas falsas catalogadas não existem mais.
- Gate verde de ponta a ponta.

## Riscos e mitigação

- **Custo de 5 queries por load do dashboard** → todas são `findFirst`/`count`
  indexados por workspaceId; aceitável. Se pesar, cachear por request.
- **Prints da Meta desatualizam** (painel muda) → prints versionados em /public com
  data no rodapé do guia; texto não depende do pixel exato.
- **Passo 2 sem AuditLog antigo**: workspaces que já testaram antes do release não
  têm o registro → o passo aparece pendente uma vez; um clique no simulador resolve.
  Aceitável (auto-corrigível).
- **Conflito com TASK-0020** (redesign do verify-device) → o reenvio de código aqui
  é aditivo e vira parte do pacote da TASK quando ela rodar.
