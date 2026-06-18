# Sinais — Zerar Erros (2026-06-10)

## Auth/Onboarding
- `apps/web/src/lib/device-verification.ts:211-212` — **TASK-0009 aberto**: falha de
  envio do e-mail de verify-device rebaixada a `log.warn` (mesmo padrão do ERR-0001:
  app finge que enviou). Há também um `catch {` na linha 74 — verificar o que engole.
- ERR-0001 (corrigido em 2026-05-28): Resend rejeitava envio e erro era engolido.
  Procurar o MESMO padrão em todos os pontos de envio de e-mail do app web.

## Forge
- Sem sinais diretos de erro registrado. TODOs `(credentials)` nas tools
  (`packages/ai/src/tools/*.ts`) são limitações MVP confessas — verificar que a tool
  degrada com mensagem honesta ao cliente, não silêncio.

## WhatsApp/Worker
- `apps/worker/src/jobs/process-message.ts:334` — 'agente retornou texto vazio'
  (warn): verificar o que o contato recebe nesse caso (fica sem resposta?).
- `apps/worker/src/jobs/process-message.ts:73,101,108,291,438` — warns variados;
  conferir se algum esconde falha que deveria virar erro/notificação.
- `apps/worker/src/jobs/email-sequences.ts:101` — 'resend error' como `log.warn`
  (**padrão ERR-0001 de novo**).
- `apps/worker/src/jobs/send-broadcast.ts:38,54,60` — broadcast que falha só warna;
  o dono do workspace fica sabendo?
- `apps/worker/src/jobs/poll-template-status.ts:43` — token decrypt falhou → pula
  template silenciosamente (template fica preso em status antigo pra sempre?).
- `apps/worker/src/custom-tool-dispatcher.ts:28,57` — TODO(arch): HMAC com hash do
  secret (limitação MVP confessa, avaliar risco real).

## Billing/Stripe
- TASK-0007 (testes de billing) está `done` — testes em
  `packages/shared/tests/billing.test.ts`. Auditar cobertura dos caminhos de gate
  (INCOMPLETE/ACTIVE/PAST_DUE) e contagem de conversas de IA mesmo assim.
- ERR-0002 (aberto, econômico): custo por conversa pode estourar margem do STARTER.
  Decisão ADR-0004 pendente do usuário — NÃO é bug de código pra este audit; só
  reportar se acharem contador de custo errado.

## App web geral
- Pusher sem credenciais → no-op silencioso em `pusher-server.ts`/`pusher-client.ts`
  (BLOCKED.md): comportamento conhecido e intencional; inbox usa refresh manual.
- `packages/ai/src/knowledge/embeddings.ts:20,72,78` — VOYAGE_API_KEY ausente ou
  falha → fallback FTS silencioso. RAG degradado sem o dono do workspace saber?
- `packages/ai/src/knowledge/process.ts:93` — doc grande é truncado com warn; a UI
  de knowledge mostra isso pro usuário?

## Fontes registradas (vault/logs)
- ERR-0001 (fixed): e-mail engolido — padrão a caçar em todo envio.
- ERR-0002 (open): margem de custo — econômico, fora deste audit.
- TASK-0009 (todo): falha de e-mail visível — candidato a fix direto neste audit.
- BLK-* relevantes: todos resolved; BLOCKED.md menciona Pusher vazio (no-op
  conhecido) e Root Directory da Vercel (resolvido — prod no ar).
- Greps: zero catch vazio, zero ts-ignore, zero `any`, console.* só em scripts CLI.
