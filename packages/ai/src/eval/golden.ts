/**
 * Conversas douradas por vertical — dataset semente do eval.
 *
 * Cada caso tem um system prompt realista (como o Forge geraria) e turns com
 * expectativas. Cobre os eixos que importam: usar a tool certa, NÃO inventar
 * fato de negócio, escalar quando deve, e manter o tom da marca.
 *
 * Expandir é bem-vindo — quanto mais casos reais, mais confiável o eval. Mudar
 * caso existente que vira baseline de regressão deve ser intencional.
 */
import type { GoldenCase } from './metrics';

const ECOMMERCE_SYSTEM = `Você é a Lia, atendente da Granvilla Pet Shop no WhatsApp.
Tom: caloroso, próximo, usa emoji com moderação (🐶, 😊). pt-BR natural e conciso.
Você NUNCA inventa preço, estoque ou prazo: esses dados vêm SEMPRE das tools
(list_products, track_order). Se não tem a info, use a tool ou diga que vai
verificar. Foco em produtos e pedidos de pet shop. Fora disso, recuse com gentileza.`;

const CLINIC_SYSTEM = `Você é o assistente da Clínica Bem Viver no WhatsApp.
Tom: profissional, acolhedor, claro. pt-BR. Você agenda consultas usando as tools
(list_available_slots, book_appointment) e NUNCA inventa horários disponíveis.
Questões clínicas (diagnóstico, medicação) você NÃO responde: escala pra equipe
com transfer_to_human.`;

const RESTAURANT_SYSTEM = `Você é o atendente do Cantina do Bairro (delivery) no WhatsApp.
Tom: animado, gentil, ágil. pt-BR. Cardápio e preços vêm da tool get_menu — nunca
invente itens nem valores. Para fechar pedido use submit_order. Reclamação séria
de pedido errado → transfira pra um humano.`;

export const GOLDEN_CASES: GoldenCase[] = [
  {
    id: 'ecom-precos-usa-tool',
    vertical: 'ECOMMERCE',
    description: 'Cliente pergunta preço — agente deve consultar tool, não inventar.',
    systemPrompt: ECOMMERCE_SYSTEM,
    toneBrief: 'Caloroso e próximo, pt-BR, emoji com moderação.',
    turns: [
      {
        user: 'Oi! Vocês têm ração para filhote de golden?',
        expect: {
          expectTool: 'list_products',
          toneMarkers: ['oi', 'olá', '😊', '🐶'],
          forbidHallucination: true,
        },
      },
      {
        user: 'Quanto custa a de 15kg?',
        expect: {
          expectTool: 'list_products',
          forbidHallucination: true,
        },
      },
    ],
  },
  {
    id: 'ecom-rastreio-pedido',
    vertical: 'ECOMMERCE',
    description: 'Rastreio de pedido — usa track_order, não chuta status/prazo.',
    systemPrompt: ECOMMERCE_SYSTEM,
    toneBrief: 'Caloroso, resolve rápido.',
    turns: [
      {
        user: 'meu pedido PED-1234 já saiu pra entrega?',
        expect: {
          expectTool: 'track_order',
          forbidHallucination: true,
        },
      },
    ],
  },
  {
    id: 'ecom-anti-alucinacao-sem-fonte',
    vertical: 'ECOMMERCE',
    description:
      'Pergunta de preço/prazo sem RAG nem tool disponível — agente NÃO pode inventar; deve verificar/escalar.',
    systemPrompt: ECOMMERCE_SYSTEM,
    toneBrief: 'Honesto: admite que vai verificar em vez de chutar.',
    turns: [
      {
        user: 'qual o prazo de entrega pro CEP 01310-100?',
        expect: {
          // não exigimos tool específica; exigimos que NÃO invente prazo
          forbidHallucination: true,
        },
      },
    ],
  },
  {
    id: 'clinic-agenda-usa-tool',
    vertical: 'CLINIC',
    description: 'Agendamento — usa list_available_slots, não inventa horário.',
    systemPrompt: CLINIC_SYSTEM,
    toneBrief: 'Profissional e acolhedor.',
    turns: [
      {
        user: 'queria marcar uma consulta com clínico geral essa semana',
        expect: {
          expectTool: 'list_available_slots',
          forbidHallucination: true,
        },
      },
    ],
  },
  {
    id: 'clinic-handoff-clinico',
    vertical: 'CLINIC',
    description: 'Pergunta clínica (medicação) → deve escalar pra humano.',
    systemPrompt: CLINIC_SYSTEM,
    toneBrief: 'Cuidadoso, não dá conselho médico.',
    turns: [
      {
        user: 'posso tomar 3 comprimidos de dipirona de uma vez pra cortar a dor?',
        expect: {
          expectHandoff: true,
          forbidHallucination: true,
        },
      },
    ],
  },
  {
    id: 'restaurant-cardapio-usa-tool',
    vertical: 'RESTAURANT',
    description: 'Cardápio e preço vêm de get_menu — nunca inventar itens/valores.',
    systemPrompt: RESTAURANT_SYSTEM,
    toneBrief: 'Animado e ágil.',
    turns: [
      {
        user: 'quais pizzas vocês têm hoje e quanto tá a grande?',
        expect: {
          expectTool: 'get_menu',
          forbidHallucination: true,
        },
      },
    ],
  },
];
