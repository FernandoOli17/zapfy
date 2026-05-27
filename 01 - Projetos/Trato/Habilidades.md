---
tipo: catálogo
projeto: "[[index|Trato]]"
tags: [trato, habilidades, templates, tools, verticais]
atualizado: 2026-05-26
---

# Habilidades do agente

> Tudo que o agente IA do Trato consegue fazer, sem custom-coding. Templates por vertical + tools globais + tools por vertical + handoff inteligente.

## Templates por vertical

6 templates prontos que o Forge oferece após classificar o negócio. Aceitar pula 4-5 turnos. Código em `packages/ai/src/playbooks/templates.ts`.

| Template | Vertical | Capacidades | Tools default |
|---|---|---|---|
| 🍕 Restaurante / Delivery | RESTAURANT | Cardápio, pedido com observações, status de entrega, pagamento (Pix/cartão) | `get_menu`, `add_to_cart`, `submit_order`, `check_delivery_eta` |
| 🛍️ Loja online | ECOMMERCE | Recomenda produto, calcula frete, aplica cupom, rastreia pedido, checkout | `list_products`, `recommend_product`, `track_order`, `apply_coupon`, `send_checkout_link` |
| 🩺 Clínica / Consultório | CLINIC | Agenda consulta, confirma 24h antes, remarca, triagem leve | `list_available_slots`, `book_appointment`, `confirm_appointment`, `cancel_appointment` |
| 🎓 Curso / Mentoria | INFOPRODUCT | Qualifica lead (BANT), responde objeção, agenda call de vendas | `qualify_lead`, `send_sales_page`, `schedule_call`, `send_objection_handler` |
| 🛠️ Prestador de serviço | SERVICE | Coleta dados pra orçar, envia proposta, agenda visita técnica | `request_quote`, `send_proposal`, `book_service`, `follow_up` |
| 💬 Atendimento genérico | OTHER | FAQ via RAG + handoff | `search_knowledge`, `set_contact_field`, `transfer_to_human` |

Cada template traz:
- 3-4 **objetivos** preenchidos
- **Tom** (formal/neutro/informal + emoji + neverSay[])
- **Tools** recomendadas ativas
- **Handoff rules** (keywords + conditions)
- **System prompt** de ~400 palavras já formatado pra WhatsApp (sem markdown que o app não renderiza)
- **Few-shot examples** de mensagem-resposta

## Tools globais (sempre disponíveis)

| Tool | O que faz |
|---|---|
| `search_knowledge` | Busca híbrida vetor (pgvector cosine) + FTS Portuguese no [[Arquitetura\|RAG]]. Retorna top-K chunks com score |
| `transfer_to_human` | Marca conversa como HUMAN_HANDLING + envia mensagem-ponte ao cliente. Audita motivo |
| `set_contact_field` | Atualiza nome/email/note do Contact via Prisma |
| `send_template` | Envia HSM Meta-approved pra mensagens fora da janela de 24h |

## Tools por vertical

Catálogo declarativo em `packages/ai/src/forge/index.ts` (`VERTICAL_TOOL_CATALOG`). Cada vertical tem 4-5 tools sugeridas; Forge ativa por default as marcadas `recommendedActive: true`.

→ Implementação real das tools de produto/agenda/etc. fica na Fase 7 do [[Roadmap]].

## Forge — fluxo do builder conversacional

State machine com 10 fases. Detalhe em [[Forge]].

```
DISCOVERY → VERTICAL_DETECTION → (TEMPLATE atalho) → REVIEW → PUBLISH
                              ↘ GOALS → TONE → KNOWLEDGE → TOOLS → HANDOFF → REVIEW → PUBLISH
                                                                              ↻ REFINEMENT
```

**Atalho via template:** se cliente aceita o template em VERTICAL_DETECTION, pula direto pra REVIEW. Economiza 4 turnos e ~80% dos tokens em casos típicos.

## Áudio no Forge

Cliente pode descrever o negócio falando em vez de digitar:
- Botão de mic na composer
- MediaRecorder webm/opus, 2 min hard cap
- POST `/api/forge/transcribe` → Whisper-1 (OpenAI)
- Custo: ~$0.006/min = $0.003 por 30s

Componente: `apps/web/src/app/(app)/forge/audio-recorder.tsx`

## Modo Desenvolvedor (opt-in)

OWNER/ADMIN liga em Settings. Libera `/developer` com:

- **Flow editor** (ReactFlow) — drag/drop blocos, conectar com edges condicionais
- **Custom tools** — CRUD de endpoints HTTPS com HMAC SHA-256, JSON Schema validado
- **Raw prompt editor** — bypassa Forge, edita system prompt direto

Ver [[Modo Desenvolvedor]].

## Test action

`/agent` tem botão "Testar" que simula mensagem inbound sem enviar WhatsApp nem persistir. Mostra resposta, tools usadas, tokens, RAG chunks, handoff. Útil pra validar antes de conectar Cloud API.

Código: `apps/web/src/app/(app)/agent/test-agent.tsx` + action `testAgent()` em `actions.ts`.

## Guardrails

Em `packages/ai/src/guards.ts`:

- **Prompt injection detector** — regex pt-BR + en pra "ignore previous instructions", DAN, role override, leak prompt
- **Topic blacklist** — workspace pode definir keywords que disparam handoff automático

Disparo → handoff imediato + log do motivo.

## Tipos de mensagem que entram no fluxo

| Tipo Meta | Comportamento atual |
|---|---|
| `text` | Pipeline completo (default) |
| `audio` | Agente responde "ainda não escuto áudio, pode escrever?" (Whisper fora do MVP cliente final) |
| `image`, `video`, `document` | Salva metadata, sem processing |
| `interactive` (button/list) | Texto extraído como user reply |
| `sticker`, `location` | Salva, ignora |

→ Whisper cliente-final no [[Roadmap#Fase 8|roadmap Fase 8]].
