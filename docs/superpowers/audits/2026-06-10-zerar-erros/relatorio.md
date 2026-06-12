# Relatório — Zerar Erros (concluído em 2026-06-12)

## Gate baseline
- typecheck: 7/7 ✅ | lint: 7/7 ✅ | test: 2/2 tasks (41 testes @zapfy/ai + billing @zapfy/shared) ✅ | build: 2/2 (web + worker) ✅
- Build passou sem precisar de skip de env. Falhas corrigidas no baseline: nenhuma.
- Greps limpos: zero `catch` vazio, zero `@ts-ignore`, zero `any`, `console.*` só em scripts CLI.

## Números finais
- **69 achados CONFIRMADOS** pela verificação adversarial (0 refutados, 0 incertos):
  15 auth · 17 Forge · 19 WhatsApp/worker · 11 billing · 7 web.
  (Contagem corrige o "68" anotado em `achados-verificados.md` — WA tem 19 itens, não 18.)
- **36 corrigidos** em 7 commits (abaixo) · **33 triados** em 19 TASKs (TASK-0020..0038) · **0 descartados**.

## Corrigidos (36)
| Commit | Achados | Resumo |
|---|---|---|
| `204f8e0` | WA-A2 | Cooldown que descartava 2ª mensagem legítima removido (dedup fica no jobId) |
| `f91ed3c` | WA-A1, A3, A4, H2 | Idempotência de retry; chunk falho = FAILED real; texto vazio → handoff; RAG logado |
| `de58940` | WA-B1, B3, C1, D1, G1, E2 | Broadcast idempotente + completion em falha; logs de template/email; LGPD sem PII; SSRF em outgoing webhooks |
| `3c2aff2` | WA-F1, H1 | splitText ≤1024 sempre; janela 24h tolera clock skew — **com testes de regressão (Vitest novo em packages/wa)** |
| `36445da` | FO-A2, A5, A6, A7, A8, A9, A11, A12, A13, A14, A17 | Cross-tenant do `__default_team__`; lock otimista do Forge; toolsEnabled aplicado; catálogo sem tools fantasmas (**+ teste catálogo⊆runtime**); overlap/timezone de agenda; dispatch pós-commit; timeouts de LLM; Zod/erro genérico |
| `6c14e17` | AU-A4, A7, A8, A11, A12, A13, A15 | Primeiro-device real; convite via signup; probe re-POST removido; e-mail de ticket visível; banners de revoke; PII fora do log |
| `4673322` | WE-A1, A4, A5, A6, BI-A10 | Copy honesta de orçamento; catches de suporte logados; workspace consistente; enqueue checado; sparkline em BRT |

## Triados (33 achados → 19 TASKs, aguardando seu OK)
| TASK | Achados | Tema | Por que não corrigi direto |
|---|---|---|---|
| TASK-0020 (P1) | AU-A1,A2,A3,A5,A6,A14 | Device verification fail-closed | Redesign de segurança com risco de lockout — exige reenvio+gate central juntos |
| TASK-0021 (P2) | AU-A9 | Convite com estado/revogação | Tabela nova (schema) |
| TASK-0022 (P2) | AU-A10 | E-mails prometem trial inexistente | Decisão de produto (copy vs implementar trial) |
| TASK-0023 (P1) | BI-A1 | Upgrade cria 2ª subscription (dupla cobrança) | Dinheiro + Stripe live |
| TASK-0024 (P1) | BI-A2 | Limite de conversas nunca aplicado | Dinheiro + decisão de comportamento no corte |
| TASK-0025 (P1) | BI-A3,A4,A7,A8 | Webhook Stripe robusto | Webhook de produção + dinheiro |
| TASK-0026 (P2) | BI-A5,A6,WA-B2 | Créditos atômicos + estorno | Dinheiro do cliente |
| TASK-0027 (P2) | BI-A9 | Áudio com fromAi:true infla cobrança | Mexe na contagem cobrável |
| TASK-0028 (P2) | BI-A11 | Testes de integração de billing | Rede de regressão das TASKs acima |
| TASK-0029 (P1) | WA-A5,A6,A7,F2 | Webhook Meta enfileira-e-devolve <1s | Coração do fluxo de produção |
| TASK-0030 (P2) | WA-E1 | HMAC com secret cifrado | Schema + migração de secrets |
| TASK-0031 (P1) | FO-A3 | REFINEMENT real pós-publicação | Feature faltante (é o moat) — desenhar direito |
| TASK-0032 (P2) | FO-A1,A10,A16 | Tools com link morto/alucinado | Muda comportamento do agente em produção |
| TASK-0033 (P2) | FO-A4 | genPublicNumber com retry | Marcado vermelho (pedidos = receita do cliente) |
| TASK-0034 (P3) | FO-A15 | Validação de transição da state machine | Semântica — junto da TASK-0031 |
| TASK-0035 (P3) | residual FO-A5/A2 | @@unique Agent + limpeza __default_team__ | Migração + dado de produção |
| TASK-0036 (P2) | WE-A2,A7 | Estado real do RAG na UI | Schema; casa com sub-projeto 2 |
| TASK-0037 (P3) | WE-A3 | scopedDb: adotar ou remover | Decisão de convenção |
| TASK-0038 (P2) | residual WA-C1 | Status de template visível na UI | Schema; casa com sub-projeto 2 |

## Descartados (falso positivo)
Nenhum — todos os achados sobreviveram à verificação adversarial.

## Anotações p/ sub-projetos 2–4 (UX/design — não corrigido aqui)
- **Onboarding/UX:** /verify-device promete botão "reenviar" que não existe; branding
  inconsistente "Trato" vs "Zapfy" (onboarding, invite vs auth/e-mails); /verify-device
  com dark hardcoded ignorando tema claro; wizard do Forge sem limite de 80 chars no
  client; preview pós-publicação não linka /whatsapp; EmptyState morto no chat do Forge.
- **Inbox:** resposta da IA não atualiza `conversation.lastMessageAt` (ordenação/preview
  defasados); botões/listas interativas do WhatsApp são ignorados sem resposta;
  mensagem-ponte de handoff não persiste como Message (atendente não vê).
- **Dashboard:** card "Base de conhecimento" com `ready: false` ("em breve") mas a
  feature está no ar — corrigir no redesign (sub-projeto 3).
- **Billing UX:** INCOMPLETE mostra "Plano atual: Starter" com limites cheios; checkout
  só cartão (sem Pix/boleto — decisão de negócio); /analytics promete "em breve" no
  rodapé e "tempo real" no header.
- **Quotes:** transição manual pra EXPIRED sem guarda de estado.

## Gate final
<preenchido na Task 7>
