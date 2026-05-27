# Morning Briefing — Sessão 3 (Demo Prep · 2026-05-27)

Bom dia, Fernando. Sessão focada em **prep pra demo com cliente**.
**Status: tudo verde.** Typecheck ✓, lint ✓, schema atualizado, 2 commits novos.

---

## 🎯 Resumo executivo (1 min de leitura)

| # | Prioridade                                | Status   |
|---|-------------------------------------------|----------|
| 1 | SEED Granvilla Pet Shop (demo data)        | ✅       |
| 2 | /status pública (uptime + incidentes)      | ✅       |
| 3 | Landing: como funciona + depoimentos + vs + urgência | ✅       |
| 4 | Email sequences (Resend, worker idempotente) | ✅       |
| 5 | Webhook de teste no /whatsapp              | ✅       |

**Total novas linhas:** ~2.000. **Novos arquivos:** 7. **Pacotes instalados:** 1 (resend no worker).

---

## ✅ #1 — SEED Granvilla Pet Shop

`pnpm db:seed:granvilla` cria um workspace de demonstração verossímil:

- **Login**: `claudio@granvilla.pet` / `Granvilla2026!`
- **Workspace**: `/granvilla-pet-shop` (plano PRO ativo, não trial — pra mostrar features unlocked)
- **Agente IA**: system prompt customizado pra pet shop, vertical=ECOMMERCE, tools de RAG/handoff/products/appointments
- **WhatsApp account**: status CONNECTED (mock, displayPhone +55 21 99876-5432)
- **50 contatos** com nomes/tags brasileiros realistas (Mariana Silva, João Oliveira...) + customFields com pet (nome/raça/idade)
- **200 mensagens** distribuídas em **30 conversas** variando entre AI_HANDLING / HUMAN_HANDLING / CLOSED. Mensagens em pt-BR realistas ("Bom dia! Quanto tá o banho do shih tzu?" / "Banho de shih tzu: R$ 80...")
- **12 produtos**: ração premium, banho/tosa por porte, vacina V10/antirrábica, coleira, brinquedos, areia, petisco, cama
- **3 pedidos**: 1 DELIVERED (PED-2401), 1 PREPARING (PED-2402), 1 PENDING (PED-2403) com endereço Jardim Botânico
- **5 agendamentos**: 1 COMPLETED, 1 NO_SHOW, 2 CONFIRMED futuros, 1 SCHEDULED
- **3 profissionais**: Dra. Carla (veterinária), Bruno (tosador), Patrícia (banhista)
- **2 cupons**: PETLOVER10 (10% off), PRIMEIRO20 (20% off, max 1 uso)
- **3 templates HSM aprovados**: `lembrete_banho`, `promo_racao_mensal`, `vacina_atrasada`

**Idempotente**: re-roda sem duplicar (deletes seletivos antes de upsert).

Pra demo: faça login com a conta acima e mostre cada feature.

---

## ✅ #2 — Página /status pública

`/status` — sem auth, cacheada 30s:

**Schema novo**: `StatusIncident` (component/severity/timeline/resolved). Sem workspaceId — status é global do produto.

**Componentes monitorados** (live a cada hit):
- **API (web)**: se chegou, tá vivo. Mostra região Vercel.
- **Banco de dados**: ping `SELECT 1` com timeout 3s. >1500ms = degradado.
- **Worker**: heurística — mensagens IA na última hora OU audit recente.
- **WhatsApp Cloud API**: % de WhatsAppAccount em status ERROR (>5% = degradado, >20% = down).

**Visual**:
- Banner verde/amarelo/vermelho conforme estado global
- Lista de componentes com status pill + detail
- Histórico 30d de incidentes (vazio mostra "Nenhum incidente. ✨")
- Footer com link pra RSS feed (placeholder em `/api/status/rss` — a implementar)

Compartilhe `https://trato.dev/status` com clientes pra build trust.

---

## ✅ #3 — Landing page polish

**5 melhorias** na home (`/`):

1. **UrgencyBanner top**: gradient violet com "Trial grátis por 7 dias — sem cartão" + link signup. Acima do hero.

2. **DemoVideo section**: card 16:9 com thumbnail composto (chat mockup + grid + glow). Botão de play central com ring + scale on hover. Duração "1:30" badge. Link pra Loom placeholder — substituir URL quando gravar.

3. **HowItWorks reescrito**: step-by-step com:
   - Linha conectora gradiente horizontal entre os 3 cards (desktop)
   - Círculo numerado em cima de cada card (cross-card visual)
   - Stagger animation (`animate-stagger` aplica delays 60ms incrementais)
   - Hover: lift up + scale ícone + rotate 6deg
   - Footer: "Tempo médio do beta: 8 minutos" badge

4. **Testimonials**: 3 quotes anônimas mas honestas — vertical (salão/pet shop/e-commerce), cidade (Curitiba/RJ/SP), métrica concreta ("3x mais agendamentos", "Setup em 8min", "67% resolvido pela IA"). Footer convida clientes beta a autorizar logo.

5. **VsCompetitorTable**: comparação **Trato vs BotConversa** linha-a-linha. 10 features com check/X/string. Highlight Trato em verde/violeta, BotConversa em zinc. Footer ressalta que comparativo é factual e convida correções.

---

## ✅ #4 — Email sequences

**Welcome** continua no signup (já existia, instantâneo).

**3 templates novos** em `lib/email/templates.ts`:
- `day3ForgeNudgeEmail`: 3 dias após signup, se Forge não publicado → "Faltam 5min pro seu agente IA estar no ar 🤖"
- `day6TrialEndingEmail`: trial expira em <24h → mostra tabela dos 3 planos com PRO destacado
- `activationEmail`: agente publicado + primeira mensagem → "Seu agente Trato está no ar 🎉"

**Worker `email-sequences.ts`** roda sweep a cada **30min**:
- Query users por janela temporal (day3: 12h antes/depois, day6: 23-25h antes do `trialEndsAt`)
- Verifica condição (Forge publicado? Trial ativo? Agente + mensagem?)
- Sends via Resend client direto
- Persiste `EmailSent` (userId + templateKey unique) pra **idempotência**

**Schema novo**: `EmailSent` com index em `sentAt` pra debug.

Sem `RESEND_API_KEY`: roda em modo dev (log), AINDA persiste em EmailSent pra não spam-tentar.

---

## ✅ #5 — Webhook de teste em /whatsapp

`TestInboundCard` no `/whatsapp` (após o card de conta conectada):

**Action `sendTestInboundMessage`**:
- Cria/upsert `Contact` com tag `test_mode`
- Cria ou reusa `Conversation` aberta
- Cria `Message` INBOUND com `content._testMode: true` (sem coluna metadata)
- Enfileira `process-message` no worker (mesmo path do webhook real Meta)
- Audita ação como `whatsapp.test_inbound`
- Redireciona pro inbox da conversa

**UI**: campos número/nome/mensagem com defaults plausíveis ("5511987654321 / Cliente Demo / Oi! Quanto tá o banho..."). Validação RBAC OWNER/ADMIN. Footer indica se workspace tem WA conectado.

**Não chama Meta API real.** Demo em qualquer máquina sem ngrok. O agente responde no inbox exatamente como em produção.

---

## 📊 Métricas técnicas finais

```
Commits novos:          2 grandes (feat: demo-prep + feat: landing-polish)
Arquivos modificados:   20
Linhas adicionadas:    ~2.000
Arquivos novos:         7
Deps instaladas:        1 (resend no worker)
Schema migrations:      2 (StatusIncident, EmailSent)

Typecheck:             ✅ verde (web + worker)
Lint:                  ✅ verde
Seed Granvilla:        ✅ rodou e populou (50 contatos, 200 msgs, 3 pedidos, 5 appts)
```

---

## 🎯 Como usar pra demo agora

```bash
# 1. Garanta que dev tá rodando
pnpm dev

# 2. Abra http://localhost:3000 e mostre:
#    - Landing nova (urgency banner + demo placeholder + testimonials + vs BotConversa)

# 3. /signup OU /login direto com:
#    Email: claudio@granvilla.pet
#    Senha: Granvilla2026!

# 4. Mostre o dashboard com onboarding checklist auto-detectado
#    (provavelmente 4/5 ou 5/5 já completos — seed criou tudo)

# 5. /inbox → 30 conversas ativas com nomes BR realistas

# 6. /products → 12 produtos categorizados

# 7. /orders → 3 pedidos com endereços reais

# 8. /appointments → agenda passada + futura

# 9. /whatsapp → mostre o botão "Mensagem de teste"
#    - Digite uma pergunta tipo "Vocês fazem banho pra gato?"
#    - Submit → vai pro inbox → IA responde (mock se MOCK_AI=true)

# 10. /status (em outra aba, sem login) → uptime live

# 11. /analytics → métricas com dados reais

# 12. /billing → mostra plano PRO ativo com features unlocked
```

---

## 🚀 O que abordar na próxima sessão

**Prioridade 1**: gravar o vídeo demo real e substituir URL placeholder em `/(marketing)/page.tsx` linha do `<a href="https://www.loom.com/share/placeholder-trato-demo">`.

**Prioridade 2**: implementar `/api/status/rss` (linkado no footer da status page).

**Prioridade 3**: auto-detect de incidentes — worker que cria `StatusIncident` automaticamente quando DB timeout >3 vezes em 5min, ou worker fica sem processar mensagens por 30min.

**Prioridade 4**: API pra criar incidentes manualmente (admin via `/admin/incidents/new`).

**Prioridade 5**: continuar débito técnico das 9 actions sem `requireWorkspace` central.

---

## ⚠️ Notas de demo

- Agente do Granvilla tá em `MOCK_AI=true` por default — respostas canned. Pra demo "real" com Claude, troca `.env` pra `MOCK_AI=false` (usa o budget de $5 que você tem).
- Templates HSM aparecem como APPROVED no seed mas têm `metaTemplateId: 'mock-...'` — ao tentar enviar broadcast, vai falhar no worker (sem token Meta real). Demonstre só a UI.
- Webhook de teste funciona 100% sem Meta — perfeito pra mostrar fluxo end-to-end.

Bom dia! ☕
