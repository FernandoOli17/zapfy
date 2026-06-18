# Achados brutos — Billing/Stripe (agente 4)

## Achados

### A1: Upgrade com assinatura ativa cria segunda subscription no Stripe (dupla cobrança)
- **Arquivo:** apps/web/src/app/(app)/billing/actions.ts:117
- **Severidade:** critico
- **Bug:** Cliente STARTER ACTIVE clica "Mudar pra esse plano" (PRO) → `createCheckoutSession` sempre cria um **novo** Checkout `mode: 'subscription'` com `customer: sub.stripeCustomerId`. O Stripe cria uma segunda subscription; nada cancela a antiga (nenhum `subscriptions.cancel`/`update` no fluxo — grep confirma que `subscriptions.update` só existe no `stripe-sync.ts` do admin). Cliente paga R$97 + R$247 todo mês. Pior: eventos `customer.subscription.updated` das **duas** subscriptions continuam chegando e fazem upsert no mesmo row (resolvido por `workspaceId`/customer), flip-flopando `plan`/`status` no DB.
- **Evidência:** `billing-buttons.tsx` chama `createCheckoutSession` pra qualquer plano não-atual; a action não tem branch "já tem subscription ativa → update/portal". O webhook `upsertFromStripeSubscription` só sobrescreve `stripeSubscriptionId` — a sub antiga segue viva no Stripe.
- **Fix proposto:** Se `sub?.stripeSubscriptionId` existe e status é ACTIVE/PAST_DUE, fazer `stripe.subscriptions.update` do item pro novo price (com proração) em vez de novo checkout; ou no `handleCheckoutCompleted` cancelar a subscription anterior quando o id muda.
- **Zona:** vermelha

### A2: Limite de conversas de IA (1.500/6.000) nunca é aplicado — STARTER consome ilimitado
- **Arquivo:** apps/worker/src/jobs/process-message.ts:90-97
- **Severidade:** critico
- **Bug:** O gate do worker só checa `status` (ACTIVE/PAST_DUE). Nenhum ponto do pipeline de atendimento conta conversas do ciclo nem bloqueia ao estourar o limite do plano — grep no worker inteiro não acha `assertPlanLimit`/`countAiConversations`/qualquer quota. Um STARTER pode consumir 50.000 conversas/mês ao custo de tokens da casa (agrava diretamente o ERR-0002 de margem). A UI inclusive promete pausa ("considere upgrade pra não pausar", page.tsx:394).
- **Evidência:** `assertPlanLimit(..., 'aiConversations', ...)` existe em `apps/web/src/lib/plans.ts:172` mas **nunca** é chamado com `aiConversations` (só `whatsappNumbers` e `knowledgeDocs`); `countAiConversationsThisCycle` é usado apenas pra exibição na `/billing`. Teste em `billing.test.ts` cobre só `planLimitState` puro — não prova enforcement.
- **Fix proposto:** No worker, antes do passo 5 (classificação), contar conversas distintas com `fromAi` no ciclo (replicar `countAiConversationsThisCycle`, que hoje é `server-only` no web) e, se `planLimitState(...).over` e a Conversation atual não estiver já contada, não responder com IA (handoff/aviso) + notificar owner.
- **Zona:** vermelha

### A3: Webhook Stripe devolve 200 em erro de handler — evento perdido pra sempre, Subscription dessincroniza
- **Arquivo:** apps/web/src/app/api/webhooks/stripe/route.ts:67-73
- **Severidade:** critico
- **Bug:** Cenário: cliente paga, chega `checkout.session.completed`, o Postgres dá um blip transitório, `upsertFromStripeSubscription` lança → catch loga e devolve **200**. O Stripe marca como entregue e nunca re-tenta; o workspace fica INCOMPLETE pra sempre (agente mudo pra cliente pagante) até intervenção manual. O comentário "Stripe Dashboard mostra a falha" é falso — com 200 o Stripe registra sucesso.
- **Evidência:** Linhas 67-73: `catch` → `log.error` + `captureException` + `return 200`. Não há nenhum mecanismo de replay/reconciliação compensando.
- **Fix proposto:** Devolver 500 no catch pra acionar o retry nativo do Stripe (os handlers são upserts, re-processar é seguro), mantendo 200 só pra eventos ignorados/payload inválido não-recuperável.
- **Zona:** vermelha

### A4: Webhook sem idempotência/ordenação — evento atrasado reverte status (ex.: reativa workspace cancelado)
- **Arquivo:** apps/web/src/app/api/webhooks/stripe/route.ts:92-102
- **Severidade:** medio
- **Bug:** Stripe não garante ordem de entrega. `handleSubscriptionEvent` aplica o **payload do evento** direto no DB sem comparar `event.created` nem registrar `event.id` processados. Cenário concreto: `customer.subscription.deleted` (CANCELED) processado, depois chega um `customer.subscription.updated` atrasado/retried com `status: active` → DB volta pra ACTIVE e o agente atende sem assinatura. O inverso também dessincroniza upgrade rápido PRO→BUSINESS.
- **Evidência:** Não existe tabela/registro de eventos processados em lugar nenhum (grep por `event.id`/dedup vazio); o handler usa `event.data.object` cru, diferente de `handleCheckoutCompleted` que re-busca via API.
- **Fix proposto:** Re-buscar a subscription via `stripe.subscriptions.retrieve` no handler (estado mais recente sempre vence) e/ou persistir `event.created` do último evento aplicado por subscription, descartando eventos mais antigos; unique em `event.id` processado cobre duplicatas.
- **Zona:** vermelha

### A5: Débito de marketingCredits não-atômico — race permite saldo negativo e débito duplo
- **Arquivo:** apps/web/src/app/(app)/automations/broadcasts/actions.ts:167-186
- **Severidade:** medio
- **Bug:** `launchBroadcast` faz check (`creditsSufficient`) e depois `decrement` em queries separadas, sem transação nem condição. Dois launches concorrentes (double-click no mesmo broadcast, ou dois broadcasts com saldo pra só um) passam ambos no check → `marketingCredits` fica negativo. No caso do mesmo broadcast, o check de status (DRAFT) também não é atômico: debita 2× os créditos (o `jobId` determinístico evita envio duplo, mas o dinheiro já foi).
- **Evidência:** Linhas 168-182: `findUnique` → `if (!creditsSufficient(...))` → `update { decrement }` incondicional. Transição de status na linha 184 também é `update` simples sem `where: { status: ... }`.
- **Fix proposto:** Débito condicional atômico: `updateMany({ where: { workspaceId, marketingCredits: { gte: needed } }, data: { marketingCredits: { decrement: needed } } })` checando `count === 1`; idem transição de status com `updateMany where status in (DRAFT, SCHEDULED)` antes de debitar.
- **Zona:** vermelha

### A6: Créditos debitados integralmente no launch e nunca reembolsados em FAILED/SKIPPED/cancelamento
- **Arquivo:** apps/worker/src/jobs/send-broadcast.ts:42-62
- **Severidade:** medio
- **Bug:** `launchBroadcast` debita 1 crédito por destinatário **antes** de qualquer envio. No worker, recipients terminam SKIPPED (opt-out/deletado/broadcast cancelado) ou FAILED (sem conta WA conectada, template reprovado, erro Meta após 3 retries) sem nenhum estorno — e `cancelBroadcast` também não devolve nada. Cenário concreto: conta WA desconectada após o launch → 100% dos envios falham, cliente perde todos os créditos sem nenhuma mensagem entregue.
- **Evidência:** Único write em `marketingCredits` no código todo é o `decrement` do launch (grep por `marketingCredits` confirma); `markRecipient(FAILED/SKIPPED)` e `cancelBroadcast` não tocam em Subscription.
- **Fix proposto:** Ao finalizar o broadcast (COMPLETED/CANCELED), `increment` de créditos igual ao count de recipients FAILED+SKIPPED; ou mover o débito pra confirmação de envio por recipient.
- **Zona:** vermelha

### A7: Price ID desconhecido no webhook degrada plano pra STARTER silenciosamente
- **Arquivo:** apps/web/src/app/api/webhooks/stripe/route.ts:190-196
- **Severidade:** medio
- **Bug:** `mapPriceToDbPlan` retorna `PlanId.STARTER` quando o price não bate com nenhum `STRIPE_PRICE_*` — e essas envs são **opcionais** (`env.ts:29-31`). Cenário: env `STRIPE_PRICE_BUSINESS` faltando/typo em prod → todo evento de subscription de um cliente BUSINESS (pagando R$597) grava `plan: STARTER` no DB e ele opera com limites de STARTER. O mesmo fallback na linha 135 quando `items.data[0]` vem vazio.
- **Evidência:** `planIdFromStripePrice` compara com env possivelmente `undefined` → `null` → fallback `STARTER` sem nem um `log.warn`.
- **Fix proposto:** Quando `planIdFromStripePrice` retorna `null`, não sobrescrever o plano existente (omitir `plan` do update), logar `error` e capturar no Sentry; nunca degradar pra STARTER por default.
- **Zona:** vermelha

### A8: Stripe `paused` mapeado pra PAST_DUE — agente atende de graça indefinidamente
- **Arquivo:** apps/web/src/app/api/webhooks/stripe/route.ts:20
- **Severidade:** medio
- **Bug:** `STATUS_MAP` traduz `paused` (cobrança suspensa no Stripe, sem faturamento) pra `PAST_DUE`, e `isAgentServingStatus('PAST_DUE') === true`. Uma subscription pausada nunca progride pra `canceled` sozinha → o workspace fica atendendo no WhatsApp pra sempre sem pagar, furando o gate do ADR ("só ACTIVE ou PAST_DUE com graça de retry").
- **Evidência:** `packages/shared/src/billing.ts:17-19` + mapa na linha 20 do webhook. PAST_DUE existe como "graça enquanto o Stripe re-tenta cobrar" — pausado não está em retry de cobrança.
- **Fix proposto:** Mapear `paused` → `UNPAID` (bloqueia atendimento, recuperável ao despausar) ou adicionar `PAUSED` ao enum com semântica própria.
- **Zona:** vermelha

### A9: Resposta enlatada de áudio gravada com `fromAi: true` — infla a contagem de conversas cobradas
- **Arquivo:** apps/worker/src/jobs/process-message.ts:489-500
- **Severidade:** medio
- **Bug:** Contato manda **só um áudio**; o worker responde o texto fixo "Ainda não consigo escutar áudios..." via `sendText`, que persiste a Message com `fromAi: true` (linha 498) — zero tokens, zero IA. Como `countAiConversationsThisCycle` conta qualquer Conversation com ≥1 msg `fromAi: true`, essa conversa consome 1 das 1.500 do STARTER. Off-by-one econômico contra o cliente, repetível em escala (campanhas geram muito áudio).
- **Evidência:** Contraste com `sendFallbackMessage` (linha 466) que corretamente usa `fromAi: false` pra resposta automática equivalente; a definição de cobrança (constants.ts:30-34) exige "mensagem **atendida pela IA**".
- **Fix proposto:** Trocar `fromAi: true` por `fromAi: false` no helper `sendText` (ou parametrizar), já que ele só é usado pra essa resposta automática fixa.
- **Zona:** vermelha

### A10: Sparkline diária bucketiza em UTC e rotula em horário local — off-by-one de dia no Brasil
- **Arquivo:** apps/web/src/lib/plans.ts:94-117
- **Severidade:** menor
- **Bug:** `dailyAiConversationsLastDays` calcula `since` com `setHours(0,0,0,0)` **local**, mas agrupa por `createdAt.toISOString().slice(0,10)` (**UTC**) e rotula com `toLocaleDateString('pt-BR')`. Em UTC-3, conversas entre 21:00 e 23:59 caem no bucket do dia seguinte — o gráfico de 14d mostra volumes no dia errado. Não afeta cobrança (o ciclo usa timestamps absolutos), só o gráfico.
- **Evidência:** Linha 103 (`toISOString` p/ chave) vs linha 114 (`toLocaleDateString` p/ label) — fusos diferentes na mesma série.
- **Fix proposto:** Gerar a chave do bucket com data local (ex.: `toLocaleDateString('en-CA')`) consistente com o label e com o `since`.
- **Zona:** segura

### A11: Cobertura de TASK-0007 não exercita contagem de conversas nem o gate real do worker
- **Arquivo:** packages/shared/tests/billing.test.ts:11-83
- **Severidade:** menor
- **Bug:** Os testes cobrem apenas helpers puros (`isAgentServingStatus`, `planLimitState`, `creditsSufficient`, constantes de preço). Zero cobertura de: `countAiConversationsThisCycle` (delimitação de ciclo, distinct, fallback 30d), do gate efetivo em `process-message.ts` (INCOMPLETE/CANCELED não atendendo de ponta a ponta) e do webhook Stripe (STATUS_MAP, fallback STARTER). Os bugs A2, A7, A8 e A9 passam com a suíte verde — a task "done" dá falsa confiança nos caminhos de dinheiro.
- **Evidência:** Convenção de testes do CLAUDE.md exige integração com Postgres real pra esses caminhos; não existe nenhum teste de integração de billing no repo (único arquivo é o de helpers puros).
- **Fix proposto:** Adicionar testes de integração (Postgres containerizado) pra `countAiConversationsThisCycle` (mensagens dentro/fora do ciclo, multi-conversa) e um teste do worker gate por status; teste unitário do `STATUS_MAP`/`mapPriceToDbPlan` do webhook.
- **Zona:** segura

## Anotações UX
- Checkout restrito a `payment_method_types: ['card']` (actions.ts:119) — SaaS BR sem Pix/boleto reduz conversão; decisão de negócio, não bug.
- Workspace INCOMPLETE exibe "Plano atual: Starter" com limites cheios na /billing — confunde quem ainda não assinou nada.
- Mensagem-ponte de handoff ("Vou transferir você...") é enviada ao contato mas nunca persistida como Message — atendente não vê no inbox o que o cliente recebeu (process-message.ts:429-435).
