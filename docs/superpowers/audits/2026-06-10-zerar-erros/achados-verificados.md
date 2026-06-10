# Achados verificados — Zerar Erros (2026-06-10)

Verificação adversarial: 5 verificadores independentes (um por domínio) tentaram refutar
cada achado lendo o código + chamadores. **Resultado: 68/68 CONFIRMADOS, 0 refutados,
0 incertos.** Detalhes de prova nos retornos dos verificadores (resumidos na coluna).

Destino: **FIX** = corrigir agora (seguro + claro + local, sem schema). **TRIAGEM** =
TASK no vault aguardando OK (zona vermelha, exige migração de schema, decisão de
produto, ou redesign com trade-offs).

| ID | Domínio | Título curto | Sev | Zona | Destino |
|---|---|---|---|---|---|
| AU-A1 | auth | Verificação de device expira → acesso liberado (fail-open) | critico | segura | TRIAGEM (redesign fail-closed junto com AU-A2/A3/A5/A6) |
| AU-A2 | auth | Falha de e-mail verify-device 100% invisível (TASK-0009) | critico | segura | TRIAGEM (mesmo cluster) |
| AU-A3 | auth | Gate de device só no layout — APIs/actions não bloqueiam | critico | segura | TRIAGEM (mesmo cluster) |
| AU-A4 | auth | "Primeira sessão" ≠ signup — bypass de verificação | medio | segura | FIX |
| AU-A5 | auth | "Não fui eu" expirado não revoga sessão do atacante | medio | segura | TRIAGEM (mesmo cluster) |
| AU-A6 | auth | Erro ao criar verificação → login segue sem gate | medio | segura | TRIAGEM (mesmo cluster) |
| AU-A7 | auth | Signup ignora ?next= e ?email= — convite quebra | medio | segura | FIX |
| AU-A8 | auth | probeAuthSignup re-POSTa signup (efeito real) | medio | segura | FIX |
| AU-A9 | auth | Convite HMAC reutilizável por 7 dias (sem revogação) | medio | segura | TRIAGEM (exige tabela/nonce — schema) |
| AU-A10 | auth | Welcome email promete trial que não existe | medio | vermelha | TRIAGEM (decisão de produto) |
| AU-A11 | auth | Resposta de ticket: falha de e-mail invisível | medio | segura | FIX (log/ok-check; UX completa → sub-projeto 2) |
| AU-A12 | auth | Revoke-device redireciona pra params que ninguém lê | menor | segura | FIX |
| AU-A13 | auth | `{' '}` literal no HTML do e-mail | menor | segura | FIX |
| AU-A14 | auth | getClientIp/Location mortos — local sempre null | menor | segura | TRIAGEM (depende de headers no hook; meia-feature) |
| AU-A15 | auth | Magic link loga e-mail+token antes do throw | menor | segura | FIX |
| FO-A1 | forge | send_checkout_link manda checkout.example.com | critico | vermelha | TRIAGEM |
| FO-A2 | forge | __default_team__ compartilhado entre tenants | critico | segura | FIX |
| FO-A3 | forge | REFINEMENT inalcançável + Forge "mente" versão publicada | critico | segura | TRIAGEM (feature faltante, design) |
| FO-A4 | forge | genPublicNumber sem retry (P2002) | medio | vermelha | TRIAGEM |
| FO-A5 | forge | sendForgeMessage sem lock (lost update / publish 2x) | medio | segura | FIX (lock otimista; @@unique → triagem schema) |
| FO-A6 | forge | saveForgeBasics rebobina sessão em andamento | medio | segura | FIX |
| FO-A7 | forge | hydrateState engole falha de parse | medio | segura | FIX |
| FO-A8 | forge | toolsEnabled nunca aplicado no runtime | medio | segura | FIX |
| FO-A9 | forge | Catálogo oferece 5 tools fantasmas | medio | segura | FIX |
| FO-A10 | forge | send_proposal manda link /q/ que é 404 | medio | vermelha | TRIAGEM |
| FO-A11 | forge | Overlap de agendamento ignora duração dos existentes | medio | segura | FIX |
| FO-A12 | forge | Slots no fuso do servidor (UTC = 3h errado) | medio | segura | FIX |
| FO-A13 | forge | dispatchOutgoingEvent dentro da transação | medio | segura | FIX |
| FO-A14 | forge | generateText do Forge sem timeout | menor | segura | FIX |
| FO-A15 | forge | advance_phase sem validação de transição | menor | segura | TRIAGEM (semântica da state machine) |
| FO-A16 | forge | URL de vendas/Calendly vinda do LLM (alucinável) | medio | segura | TRIAGEM (onde mora a config — decisão) |
| FO-A17 | forge | resetForgeSession sem Zod + erro culpa API key | menor | segura | FIX |
| WA-A1 | whatsapp | Retry do BullMQ reenvia resposta da IA | critico | segura | FIX (guard de idempotência) |
| WA-A2 | whatsapp | Cooldown 2s descarta 2ª mensagem legítima | critico | segura | FIX (remover cooldown) |
| WA-A3 | whatsapp | Chunk não enviado persistido como SENT | medio | segura | FIX |
| WA-A4 | whatsapp | Texto vazio da IA → contato no vácuo | medio | segura | FIX |
| WA-A5 | whatsapp | Webhook Meta síncrono antes do 200 | medio | vermelha | TRIAGEM |
| WA-A6 | whatsapp | Status regride READ→DELIVERED (fora de ordem) | medio | vermelha | TRIAGEM |
| WA-A7 | whatsapp | Falha de enqueue ignorada — msg nunca processada | medio | vermelha | TRIAGEM |
| WA-B1 | whatsapp | Retry de broadcast reenvia template | critico | segura | FIX |
| WA-B2 | whatsapp | Créditos sem atomicidade/estorno | medio | vermelha | TRIAGEM (= BI-A5/A6) |
| WA-B3 | whatsapp | Broadcast nunca COMPLETED se último falha | menor | segura | FIX |
| WA-C1 | whatsapp | Template preso em SUBMITTED, skip silencioso | medio | segura | FIX (logs; status visível exige schema → triagem) |
| WA-D1 | whatsapp | email-sequences: falha conta como enviado | medio | segura | FIX |
| WA-E1 | whatsapp | HMAC assinado com hash do secret | medio | segura | TRIAGEM (exige cifrar secret — schema) |
| WA-E2 | whatsapp | Outgoing webhooks sem guard SSRF | medio | segura | FIX |
| WA-G1 | whatsapp | LGPD hard-delete grava telefone em claro no AuditLog | medio | segura | FIX |
| WA-F1 | whatsapp | splitText gera chunk de 1025 chars | menor | segura | FIX |
| WA-F2 | whatsapp | Zod do webhook rejeita payload com field extra | menor | vermelha | TRIAGEM |
| WA-H1 | whatsapp | Janela 24h fecha com clock skew | menor | segura | FIX |
| WA-H2 | whatsapp | Falha do RAG engolida sem log | menor | segura | FIX |
| BI-A1 | billing | Upgrade cria 2ª subscription (dupla cobrança) | critico | vermelha | TRIAGEM |
| BI-A2 | billing | Limite de conversas nunca aplicado | critico | vermelha | TRIAGEM |
| BI-A3 | billing | Webhook Stripe devolve 200 em erro | critico | vermelha | TRIAGEM |
| BI-A4 | billing | Webhook sem idempotência/ordem | medio | vermelha | TRIAGEM |
| BI-A5 | billing | Débito de créditos não-atômico | medio | vermelha | TRIAGEM |
| BI-A6 | billing | Créditos nunca estornados | medio | vermelha | TRIAGEM |
| BI-A7 | billing | Price desconhecido degrada pra STARTER | medio | vermelha | TRIAGEM |
| BI-A8 | billing | paused → PAST_DUE atende de graça | medio | vermelha | TRIAGEM |
| BI-A9 | billing | Resposta de áudio com fromAi:true infla cobrança | medio | vermelha | TRIAGEM |
| BI-A10 | billing | Sparkline bucketiza UTC vs label local | menor | segura | FIX |
| BI-A11 | billing | Testes de billing não cobrem caminhos reais | menor | segura | TRIAGEM (vira parte das TASKs de billing) |
| WE-A1 | web | Quote "enviado" nunca chega ao cliente | medio | segura | FIX (copy honesta; envio real → sub-projeto 2) |
| WE-A2 | web | RAG degradado invisível na UI | medio | segura | TRIAGEM (exige campo no schema) |
| WE-A3 | web | scopedDb é código morto (convenção não aplicada) | medio | segura | TRIAGEM (decisão: adotar ou remover) |
| WE-A4 | web | Catches silenciosos no suporte | menor | segura | FIX |
| WE-A5 | web | /whatsapp resolve workspace sem orderBy | menor | segura | FIX |
| WE-A6 | web | Teste inbound ignora falha de enqueue | menor | segura | FIX |
| WE-A7 | web | Truncamento de doc grande invisível | menor | segura | TRIAGEM (exige campo no schema) |

## Contagem
- CONFIRMADOS: 68 · REFUTADOS: 0 · INCERTOS: 0
- FIX direto: 33 · TRIAGEM: 35 (18 zona vermelha + 17 seguros-mas-ambíguos/schema/design)

## Descartados
Nenhum — todos os achados sobreviveram à verificação adversarial.
