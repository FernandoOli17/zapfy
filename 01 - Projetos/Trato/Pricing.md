---
tipo: análise
projeto: "[[index|Trato]]"
tags: [trato, pricing, monetizacao]
atualizado: 2026-05-27
---

# Pricing — análise

> Preço atual, benchmarks, hipóteses, próximos testes.

## Preço atual

| Plano | Mensal | Anual (com 2 meses grátis) | Conversas IA/mês | Números | Membros |
|---|---|---|---|---|---|
| **STARTER** | R$ 97 | R$ 970 | 500 | 1 | 2 |
| **PRO** | R$ 297 | R$ 2.970 | 2.000 | 3 | 10 |
| **PREMIUM** | R$ 697 | R$ 6.970 | ilimitadas | ilimitados | ilimitados |

Trial: 7 dias sem cartão, nível STARTER.

## Benchmark com concorrência

| Plataforma | Entry | Médio | Top | Cobra por contato? |
|---|---|---|---|---|
| **Trato** | R$97 | R$297 | R$697 | ❌ não, conversas fixas |
| BotConversa | R$197 (até 500 contatos) | R$397 | R$897+ | ✅ sim (por contato ativo) |
| Huggy | R$700+ | R$1.400+ | enterprise | ❌ por usuário |
| Octadesk | R$199 | R$499 | enterprise | ❌ por usuário |
| Wati | $39 (R$200) | $99 (R$500) | $199 (R$1k) | ❌ por usuário |
| Take Blip | enterprise | enterprise | enterprise | ✅ por sessão |

**Observações:**
- Trato entrega 2x menos no entry vs BotConversa (500 vs 1000 conversas) mas a R$100 menos. Trade-off: público PME pequena.
- Trato PRO (R$297, 2k conversas, 3 números) bate diretamente o BotConversa MID (R$397, 2k contatos, 2 números).
- Trato PREMIUM (R$697, ilimitado) é UNDERPRICED vs Huggy entry (R$700+).

## Hipóteses do pricing atual

### Por que R$97 entry?

- **Psicologia:** abaixo de R$100 (barreira mental BR)
- **CAC payback:** se CAC ≤ R$300, paga em 3 meses
- **Filtro de qualificação:** quem não paga R$100/mês não vai usar SaaS B2B de jeito nenhum
- **Vs concorrência:** R$100 abaixo de BotConversa entry — atrai o switchers

### Por que R$697 top?

- **Sweet spot psicológico:** abaixo de R$1000 (segunda barreira)
- **Headroom vs concorrência:** Huggy começa em R$700, Trato Premium dá MAIS
- **Margem alta:** com ilimitado, cliente que extrapola sozinho serve de fountain pra próximos features

## Análise de valor por feature por plano

| Feature | STARTER | PRO | PREMIUM |
|---|---|---|---|
| Forge | ✅ | ✅ | ✅ |
| WhatsApp connect | ✅ 1 | ✅ 3 | ✅ ilim |
| Inbox | ✅ | ✅ | ✅ |
| Agente IA Sonnet | ✅ | ✅ | ✅ |
| Templates por vertical | ✅ | ✅ | ✅ |
| RAG (knowledge) | 10 docs | 50 docs | ilim |
| Conversas IA/mês | 500 | 2.000 | ilim |
| Modo desenvolvedor | ❌ | ❌ | ✅ |
| Custom Tools HTTP | ❌ | ❌ | ✅ |
| API pública | ❌ | ❌ | ✅ |
| Outgoing webhooks | ❌ | ✅ | ✅ |
| Audit log retention | 30d | 90d | 365d |
| Suporte | email | chat | dedicado WhatsApp |
| SLA | best-effort | 99.5% | 99.9% |

## Recomendações

### ✅ Mantém como tá
- Estrutura 3 níveis (psicologia clássica: Goldilocks → maioria escolhe PRO)
- Preço STARTER R$97 (entry psicológico)
- Cobrança por conversa (não por contato) — diferencial competitivo claro

### 🟡 Ajustes pequenos
- **Sobe limite RAG no STARTER de 10 → 25 docs.** Custo marginal pequeno (Voyage é barato), conversion pelo "abundance feel".
- **Diminui conversa STARTER de 500 → 300 OU sobe pra 800.**
  - 500 é estranho (muitos atingem em 1 semana = churn precoce)
  - 300 força upgrade rápido = mais MRR mas pode dar zoneamento ruim
  - 800 é safer pra retenção
  - **Recomendado: 800** (alinha com bench BotConversa).

### 🔴 Mudanças propostas

#### 1. Adicionar plano ENTERPRISE âncora (R$ 1997)
- White-label, dedicated server, customer success manager, SSO/SAML, audit log custom retention
- Mesmo que ninguém compre: anchor faz Premium parecer barato
- Marketing impact: "We have enterprise plans" credencia

#### 2. Anual com 2 meses grátis (R$970 / R$2970 / R$6970)
- Cash upfront melhora burn
- Reduz churn anual (compromisso)
- Indicador de PMF (gente que paga anual confia mais)

#### 3. Add-ons opcionais
- Número extra WhatsApp: +R$50/mês (cap PRO)
- Whisper áudio cliente final: +R$100/mês (custo OpenAI ~$0.05/min, margem ok pra 50 áudios/dia)
- Suporte prioritário (resposta em 4h business): +R$200/mês
- White-label PRO: +R$300/mês (dashboard com logo cliente)

#### 4. Modelo freemium experimental (testar A/B)
- **FREE**: 50 conversas/mês, 1 número, marca d'água "Powered by Trato" no rodapé das mensagens IA
- Hipótese: viralidade (cliente final vê "Trato" → pode virar lead)
- Risco: free freeloaders sem upgrade, custo IA real
- Decisão: testar em metade do tráfego por 60 dias, medir conversion FREE → PAID

## Sensitivity / cenários

**Cenário base** (3 anos, conservador):
- m6: 50 clientes pagantes, mix 60% STARTER / 30% PRO / 10% PREMIUM → MRR R$15k
- m12: 300 clientes, mix 40/40/20 → MRR R$93k
- m24: 1500 clientes → MRR R$465k
- m36: 5000 clientes → MRR R$1.5M

**Cenário otimista** (PMF cedo, viral):
- m12: 1000 clientes → MRR R$310k
- m24: 8000 clientes → MRR R$2.5M

**Cenário ruim** (concorrência reage):
- m12: 100 clientes → MRR R$31k → precisa ajustar (cortar custos ou pivotar pricing)

## Custos unitários estimados

Por conversa IA (Claude Sonnet + Haiku classifier + Voyage embed + msgs):
- Classifier: $0.0005
- Agent turn médio (3 turns): $0.008
- Embeddings RAG (cache hit): $0.0001
- WhatsApp: $0.0058/mensagem (Meta cobra mensagem business-initiated; user-initiated grátis na janela 24h)
- **Custo total por conversa: ~R$ 0,07** (assumindo 5 user-initiated grátis + 0-1 business)

**Margens:**
- STARTER (R$97, 800 conversas → R$0,12/conversa) → margem ~42%
- PRO (R$297, 2000 → R$0,15/conversa) → margem ~54%
- PREMIUM (R$697, ilimitado uso médio 5000 → R$0,14/conversa) → margem ~50%

Healthy. Margens reais devem subir com cache + auto-resolve melhor.

## Próximos experimentos

- [ ] A/B test landing com pricing visível vs "fale com vendas"
- [ ] Annual discount: rodar 30 dias, medir % opt-in
- [ ] FREE tier por 60 dias com cap rigoroso
- [ ] Anchor ENTERPRISE: adicionar na /precos, medir if Premium upgrade rate sobe
- [ ] Calculadora de ROI na landing: "Você responde X msgs/dia. Com Trato, economiza Y horas/mês."

## TODO: validar pricing com clientes

- [ ] 10 entrevistas: "Pagaria quanto se atendesse 500 msgs/mês com IA?"
- [ ] Van Westendorp Price Sensitivity (4 perguntas) em 50 leads qualificados
- [ ] Watch G2 reviews de concorrentes pra reclamações sobre preço
