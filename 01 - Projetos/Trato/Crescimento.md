---
tipo: estratégia
projeto: "[[index|Trato]]"
tags: [trato, growth, marketing, vendas]
atualizado: 2026-05-27
---

# Crescimento — playbook

> Como sair de 0 → primeiros 100 clientes pagantes. Funil, métricas, canais.

## North Star Metric

**Conversas-IA respondidas por mês** (cross-workspace).

Por quê:
- Reflete VALOR REAL entregue (não só vaidade tipo "users signed up")
- Move junto com retenção (cliente que usa MAIS, fica MAIS)
- Move junto com receita (planos sobem com conversas)
- Acionável: cada feature pode mover essa métrica (RAG melhor → menos handoff → mais conversas auto-resolvidas)

**Meta 6 meses:** 100k conversas/mês.
**Meta 12 meses:** 1M conversas/mês.

## Supporting metrics

| Métrica | Track porque | Alvo m6 | Alvo m12 |
|---|---|---|---|
| Trial → Paid conversion | mede se MVP entrega valor | 25% | 35% |
| Time-to-first-message (TTFM) | UX do onboarding | < 15min | < 8min |
| Forge completion rate | % que termina o builder | > 70% | > 85% |
| Handoff rate | qualidade da IA | < 25% | < 15% |
| MRR | receita | R$15k | R$100k |
| Churn mensal | retenção | < 8% | < 4% |
| Net Revenue Retention | expansão | > 100% | > 115% |
| CSAT (resposta IA) | qualidade percebida | > 4.0/5 | > 4.4/5 |

## Funil

```
Visita landing → Trial → Forge completion → WA conectado → 1ª msg respondida → Paid
   ↓ 5%          ↓ 70%      ↓ 60%             ↓ 50%             ↓ 25%
  1000          50         35                 21                 10                 ~3 conversões
```

**Cada degrau onde otimizar:**

1. **Landing → Trial (target 5%+)**
   - Headline forte com Forge demo embutida
   - Vídeo loom de 90 seg
   - Social proof (logos, depoimentos quando tiver)
   - CTA único e óbvio

2. **Trial → Forge completion (70%+)**
   - Empty state com sugestão clara
   - Tom super leigo nos prompts
   - Áudio se cliente não quer digitar
   - Templates por vertical (já temos!)

3. **Forge → WA conectado (60%+)**
   - Guia visual passo-a-passo (já temos)
   - Modo MOCK pra cliente testar sem Meta app
   - 1-clique "convidar técnico" pra outra pessoa configurar

4. **WA conectado → 1ª msg respondida (50%+)**
   - Botão "enviar mensagem-teste pro meu próprio número"
   - Verificação automática que webhook tá funcionando

5. **1ª msg → Paid (25%+)**
   - Limite de 7 dias claro (não passa percebido)
   - Email no dia 5: "Sua IA já respondeu X mensagens — assina por R$97?"
   - Trial ending nudge no dashboard

## Canais de aquisição priorizados

### Pré-lançamento (mês -1)
- **Lista de espera** — landing com formulário, capturar 500 emails
- **Conteúdo orgânico** — 3 posts por semana sobre WhatsApp Business + IA
- **Comunidades** — Discord/Telegram de empreendedores BR (responder + agregar)

### Lançamento (mês 0-1)
- **Product Hunt BR** — preparar 2 semanas antes (assets, hunter, 100 friends pra upvote)
- **Twitter (X) BR tech** — thread de 20 tweets contando a história + screencast
- **Reddit r/empreendedorismo** — post genuíno com link, não promo
- **Indie Hackers** — milestone post quando passar de R$1k MRR

### Crescimento (mês 2-6)
- **SEO**: posts comparativos ("Trato vs BotConversa", "como integrar WhatsApp Cloud API", LGPD)
- **Influencer marketing micro**: Joel Jota, Conrado Adolpho, Caio Carneiro — newsletter ou stories
- **Webinars**: "Como atender 1000 clientes no WhatsApp sem contratar ninguém"
- **Affiliate program** (20% recorrente vitalício) — agências digitais e gestores comunitários

### Escala (mês 7+)
- **Paid ads** (Google + Meta + LinkedIn) com KPI claro: CAC < 6 meses LTV
- **Press**: pitch pra Olhar Digital, TechCrunch BR, StartSe
- **Eventos**: RD Summit, Web Summit Rio, Brain BR

## Primeiros 100 clientes — playbook concreto

### Os primeiros 10 (mês -1 → mês 1)
- **Fonte:** rede pessoal do fundador. 100% manual.
- Lista todos donos de PME que você conhece. Liga, pede 15 min. Mostra. Convida pro beta GRATIS por 3 meses em troca de feedback.
- Meta: 10 ativos usando de verdade até fim do mês 1.

### Os próximos 20 (mês 2)
- **Fonte:** indicação dos primeiros 10 + comunidades online.
- Programa de indicação: "Indica um amigo, ganha 1 mês grátis cada um".
- Postar nos grupos de WhatsApp de empreendedores (com permissão).

### Próximos 30 (mês 3-4)
- **Fonte:** SEO + Product Hunt + content marketing.
- 1 post forte por semana no blog: "Como [vertical X] usa o Trato pra [Y]".
- Lançar no Product Hunt — preparar 2 semanas antes.

### Próximos 40 (mês 5-6)
- **Fonte:** anúncios pagos pequenos (R$50/dia) + cases.
- Google Ads: termo "alternativa BotConversa", "atendimento WhatsApp IA"
- Meta Ads: vídeo Forge de 90s pra donos de PME
- 5 case studies em vídeo (1 por vertical)

## Pricing tests

Atualmente: STARTER R$97 / PRO R$297 / PREMIUM R$697.

Experimentos planejados:
1. **Anchor**: adicionar plano ENTERPRISE R$1997 (mesmo que ninguém compre, deixa Premium parecer barato)
2. **Annual discount**: pagar 12m de uma vez = 2 meses grátis (cash flow + reduz churn)
3. **Add-ons**: WhatsApp number extra (+R$50/mês), Voz/Whisper (+R$100/mês), suporte prioritário (+R$200/mês)
4. **Plano FREE limitado**: 50 conversas/mês, 1 número, com marca d'água — pra empresas testarem antes de pagar (TANTRO de viral)

## Conteúdo planejado (1º trimestre)

Posts no blog (1 por semana mínimo):
- Como funciona o WhatsApp Cloud API (técnico, SEO)
- "LGPD na prática pra SaaS WhatsApp" (já tem!)
- "Forge vs Fluxograma: por que entrevistar é melhor que arrastar"
- "Como uma pizzaria atende 200 pedidos/dia no Zap" (case)
- "Por que sua IA precisa parar de inventar resposta"
- "Modo desenvolvedor: customizando seu agente sem perder a magia do Forge"
- "Anatomia de um system prompt que vende"
- "10 erros que arruinam um chatbot de WhatsApp"
- "Quando contratar atendente vs IA"
- "Como medir CSAT em atendimento via WhatsApp"

## Onboarding — fluxo ideal

```
1. Landing → CTA "Criar conta grátis"
2. Signup (e-mail + senha, sem cartão)
3. Onboarding: nome do workspace + qual é o negócio
4. Forge: 5-10 min de conversa
5. Mostra preview do agente
6. "Pronto! Agora cola suas credenciais Meta" (ou "pular, testar com mock")
7. Manda mensagem-teste pro próprio número
8. "🎉 Funcionou! Seu trial vai até [data]"
9. (dia 5) Email: "Sua IA já respondeu X. Assina?"
10. (dia 7) Trial ends → vira plano gratuito limitado (50 conv/mês) ou upgrade
```

## Métricas de leading vs lagging

**Leading** (mover ANTES da receita):
- Signups/dia
- Forge completion rate
- Tempo médio até 1ª mensagem
- Net Promoter Score em 14d

**Lagging** (consequência):
- MRR
- Churn
- LTV
- CAC payback

Acompanhar leading diariamente, lagging mensalmente.

## TODO: experimentos prioritários

- [ ] Lançar lista de espera com landing simples (4 semanas antes de soft launch)
- [ ] Loom de 90s do Forge → embed na landing
- [ ] Calculadora "quantas msgs você responde por mês" → CTA personalizado
- [ ] Programa de indicação (Rewardful ou homemade)
- [ ] 10 entrevistas de cliente nos primeiros 30 dias pós-launch
