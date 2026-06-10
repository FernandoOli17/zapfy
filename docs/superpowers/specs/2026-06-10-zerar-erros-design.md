# Zerar Erros — Design (auditoria + correção)

- **Data:** 2026-06-10
- **Status:** aprovado (design); spec para revisão do usuário antes do plano
- **Autor:** Fernando + Claude
- **Escopo:** primeiro de 4 sub-projetos pedidos ("otimizar e transformar o projeto").
  Ordem aprovada: **1) Zerar erros → 2) UX do cliente → 3) Redesign do dashboard →
  4) Redesign da landing.** Os sub-projetos 2–4 terão specs próprias depois deste.

## Problema

O pedido é "deixar o projeto com nenhum erro" antes de melhorar UX e design. O gate
estava verde em 2026-06-03 (typecheck 7/7, lint 7/7, test 41/41), mas gate verde não
significa ausência de bugs de runtime: o PLAN registra débitos conhecidos (TASK-0007
testes de billing, TASK-0009 falha de e-mail engolida) e os fluxos críticos nunca
passaram por uma auditoria dedicada pós-deploy de produção. Redesenhar telas em cima
de fluxos com bugs desperdiça trabalho — por isso esta frente vem primeiro.

## Objetivos

1. Gate 100% verde de ponta a ponta: `typecheck`, `lint`, `test` **e `build`** nos 7
   pacotes (build entra porque pega erros de Next.js — boundaries de RSC, imports
   server/client — que o typecheck não vê).
2. Fluxos críticos auditados por leitura de código: auth/onboarding, Forge,
   WhatsApp/worker, billing/Stripe, app web geral.
3. Bugs claros e seguros corrigidos, com teste de regressão quando couber.
4. Achados ambíguos ou de zona vermelha triados em lista para OK do usuário,
   registrados como TASKs no vault (numeração contínua, TASK-0020+).

## Não-objetivos (fora de escopo deste spec)

- Verificar erros em **produção** (Sentry, logs do Railway, www.zapfy.store) — decisão
  explícita do usuário de ficar fora; pode virar frente futura.
- Melhorias de UX, fluxo ou design — sub-projetos 2–4. Achados dessas frentes são
  **anotados** para alimentar as specs seguintes, não corrigidos aqui.
- Push/deploy — commits ficam locais; push (dispara deploy na Vercel) só com OK.
- Migrações de banco, mudanças de preço/plano, qualquer mexida em produção.

## Decisões aprovadas

1. **Profundidade: gate + auditoria de código** (sem produção). Auditoria por leitura
   dos fluxos críticos procurando bugs reais: erros engolidos, edge cases, estados
   quebrados, validação faltando, race conditions, links mortos.
2. **Política de correção: corrigir claros, triar o resto.** Bug claro e seguro →
   correção direta. Ambíguo ou zona vermelha (caminhos de dinheiro no billing,
   schema/migrações, webhooks de produção) → lista triada para OK antes de mexer.
3. **Abordagem: auditoria paralela com subagentes.** Sinais baratos primeiro, depois
   agentes especialistas em paralelo (um por domínio), com verificação adversarial de
   cada achado antes de entrar na lista (elimina falso positivo).

## Processo (5 etapas)

### Etapa 1 — Gate completo
`pnpm typecheck && pnpm lint && pnpm test && pnpm build` do root (Turbo, 7 pacotes).
Falhas aqui são corrigidas antes da auditoria (base limpa para os agentes).

### Etapa 2 — Coleta de sinais
Fontes baratas que direcionam os agentes:
- `vault/Errors/` (ERR-0001, ERR-0002), `vault/Blockers/`, débitos do PLAN
  (TASK-0007, TASK-0009).
- Greps: `catch` vazio/swallow, `@ts-expect-error`/`@ts-ignore`, `TODO`/`FIXME`,
  `any`, `console.log` esquecido.
- `ERRORS_LOG.md` da raiz.

### Etapa 3 — Auditoria paralela (5 agentes especialistas)
Um agente por domínio, cada um recebendo os sinais da Etapa 2 relevantes ao seu
escopo. Cada achado retorna com `arquivo:linha`, descrição, severidade
(crítico/médio/menor) e proposta de fix.

| Agente | Escopo |
|---|---|
| Auth/Onboarding | Better Auth, signup/login, invites, verify-device, onboarding |
| Forge | wizard 4 passos, state machine, engine `runForgeStep`, tools, snapshot de prompt |
| WhatsApp/Worker | webhook Meta (assinatura, <1s), process-message, fila BullMQ, janela 24h, split >1024 chars |
| Billing/Stripe | assinatura, gates de plano (INCOMPLETE/ACTIVE/PAST_DUE), contagem de conversas de IA, créditos de marketing, webhook Stripe |
| App web geral | inbox, knowledge/RAG UI, rotas do dashboard, tRPC procedures, scopedDb (isolamento multi-tenant) |

### Etapa 4 — Verificação + correção
- Cada achado passa por verificação adversarial (agente independente tenta refutar).
- Confirmado **e** seguro → correção direta seguindo CLAUDE.md (AppError, Zod em
  boundary, sem swallow), com teste de regressão quando couber.
- Confirmado **mas** zona vermelha ou ambíguo → entra na lista de triagem como
  TASK no vault, aguarda OK.
- Refutado → registrado como descartado no relatório (com motivo).

### Etapa 5 — Gate final + relatório
Gate completo de novo (Etapa 1 repetida). Relatório final com três listas:
**corrigidos** (com commit), **triados** (TASKs criadas, aguardando OK) e
**descartados** (falsos positivos, com motivo). PLAN.md atualizado.

## Critério de sucesso

- Gate verde de ponta a ponta (typecheck, lint, test, build — 7/7 cada).
- Zero achado crítico sem tratamento: ou corrigido, ou triado com TASK no vault.
- Relatório final entregue; PLAN.md atualizado; commits locais convencionais
  (`fix(...)`) aguardando OK para push.

## Riscos e mitigação

- **Falso positivo de agente** → verificação adversarial obrigatória antes de
  qualquer correção (Etapa 4).
- **Correção "segura" que quebra outra coisa** → gate completo na Etapa 5 + teste
  de regressão por fix; commits pequenos e isolados por bug (revert barato).
- **Escopo crescer para UX/design** → achados dessas frentes só são anotados
  (alimentam specs dos sub-projetos 2–4).
