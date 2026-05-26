import { tool, type Tool } from 'ai';
import { z } from 'zod';
import type { VerticalId } from '../../forge/types';

/** Callbacks que o worker implementa para cada vertical. */
export interface VerticalToolDeps {
  workspaceId: string;
  contactId: string;
  // E-commerce
  listProducts?: (query?: string) => Promise<Array<{ name: string; priceCents: number; sku?: string; checkoutUrl?: string }>>;
  getProduct?: (sku: string) => Promise<{ name: string; priceCents: number; stock?: number; checkoutUrl?: string } | null>;
  // Clinic
  listSlots?: (date: string) => Promise<Array<{ time: string; available: boolean }>>;
  createAppointment?: (date: string, time: string, notes?: string) => Promise<{ id: string }>;
  cancelAppointment?: (id: string) => Promise<void>;
  // Restaurant
  getMenu?: () => Promise<Array<{ category: string; items: Array<{ name: string; priceCents: number }> }>>;
  submitOrder?: (items: Array<{ name: string; qty: number }>, address?: string) => Promise<{ orderId: string; estimatedMinutes: number }>;
  // Infoproduct
  qualifyLead?: (budget: string, timeline: string, goals: string) => Promise<void>;
  scheduleCall?: (datetime: string) => Promise<{ meetUrl?: string }>;
  // Service
  requestQuote?: (serviceType: string, description: string) => Promise<{ estimateDays: number }>;
  bookService?: (datetime: string, description: string) => Promise<{ bookingId: string }>;
}

function ecommerceTools(deps: VerticalToolDeps): Record<string, Tool> {
  return {
    list_products: tool({
      description: 'Lista produtos disponíveis no catálogo. Pode filtrar por nome ou categoria.',
      inputSchema: z.object({
        query: z.string().optional().describe('Termo de busca opcional.'),
      }),
      execute: async ({ query }) => {
        if (!deps.listProducts) return { products: [], note: 'catálogo não configurado' };
        const products = await deps.listProducts(query);
        return { products };
      },
    }),

    get_product: tool({
      description: 'Busca detalhes de um produto específico pelo SKU ou nome.',
      inputSchema: z.object({
        sku: z.string().describe('SKU ou código do produto.'),
      }),
      execute: async ({ sku }) => {
        if (!deps.getProduct) return { found: false };
        const product = await deps.getProduct(sku);
        return product ? { found: true, product } : { found: false };
      },
    }),

    send_checkout_link: tool({
      description: 'Envia link de checkout/pagamento para o cliente finalizar a compra.',
      inputSchema: z.object({
        productSku: z.string().describe('SKU do produto.'),
      }),
      execute: async ({ productSku }) => {
        if (!deps.getProduct) return { sent: false };
        const product = await deps.getProduct(productSku);
        return product?.checkoutUrl ? { sent: true, url: product.checkoutUrl } : { sent: false };
      },
    }),
  };
}

function clinicTools(deps: VerticalToolDeps): Record<string, Tool> {
  return {
    list_available_slots: tool({
      description: 'Lista horários disponíveis para agendamento em uma data.',
      inputSchema: z.object({
        date: z.string().describe('Data no formato YYYY-MM-DD.'),
      }),
      execute: async ({ date }) => {
        if (!deps.listSlots) return { slots: [], note: 'agenda não configurada' };
        const slots = await deps.listSlots(date);
        return { slots: slots.filter((s) => s.available) };
      },
    }),

    book_appointment: tool({
      description: 'Agenda uma consulta para o cliente.',
      inputSchema: z.object({
        date: z.string().describe('Data YYYY-MM-DD.'),
        time: z.string().describe('Horário HH:MM.'),
        notes: z.string().optional().describe('Observações (motivo, plano de saúde, etc).'),
      }),
      execute: async ({ date, time, notes }) => {
        if (!deps.createAppointment) return { booked: false };
        const appt = await deps.createAppointment(date, time, notes);
        return { booked: true, appointmentId: appt.id };
      },
    }),

    cancel_appointment: tool({
      description: 'Cancela um agendamento existente.',
      inputSchema: z.object({
        appointmentId: z.string().describe('ID do agendamento a cancelar.'),
      }),
      execute: async ({ appointmentId }) => {
        if (!deps.cancelAppointment) return { cancelled: false };
        await deps.cancelAppointment(appointmentId);
        return { cancelled: true };
      },
    }),
  };
}

function restaurantTools(deps: VerticalToolDeps): Record<string, Tool> {
  return {
    get_menu: tool({
      description: 'Retorna o cardápio completo do restaurante com preços.',
      inputSchema: z.object({}),
      execute: async () => {
        if (!deps.getMenu) return { categories: [] };
        const menu = await deps.getMenu();
        return { categories: menu };
      },
    }),

    submit_order: tool({
      description: 'Finaliza o pedido do cliente e retorna o número do pedido e tempo estimado.',
      inputSchema: z.object({
        items: z
          .array(z.object({ name: z.string(), qty: z.number().int().positive() }))
          .describe('Itens do pedido.'),
        deliveryAddress: z.string().optional().describe('Endereço de entrega, se delivery.'),
      }),
      execute: async ({ items, deliveryAddress }) => {
        if (!deps.submitOrder) return { success: false };
        const order = await deps.submitOrder(items, deliveryAddress);
        return { success: true, orderId: order.orderId, estimatedMinutes: order.estimatedMinutes };
      },
    }),
  };
}

function infoproductTools(deps: VerticalToolDeps): Record<string, Tool> {
  return {
    qualify_lead: tool({
      description: 'Registra qualificação do lead (orçamento, prazo e objetivo) para o time de vendas.',
      inputSchema: z.object({
        budget: z.string().describe('Faixa de investimento informada pelo cliente.'),
        timeline: z.string().describe('Prazo/urgência para comprar.'),
        goals: z.string().describe('Principal objetivo ou dor do cliente.'),
      }),
      execute: async ({ budget, timeline, goals }) => {
        await deps.qualifyLead?.(budget, timeline, goals);
        return { registered: true };
      },
    }),

    schedule_call: tool({
      description: 'Agenda uma chamada de vendas/demonstração com o cliente.',
      inputSchema: z.object({
        datetime: z.string().describe('Data e hora no formato ISO 8601 ou descrição natural.'),
      }),
      execute: async ({ datetime }) => {
        if (!deps.scheduleCall) return { scheduled: false };
        const result = await deps.scheduleCall(datetime);
        return { scheduled: true, ...(result.meetUrl ? { meetUrl: result.meetUrl } : {}) };
      },
    }),
  };
}

function serviceTools(deps: VerticalToolDeps): Record<string, Tool> {
  return {
    request_quote: tool({
      description: 'Registra solicitação de orçamento e retorna prazo estimado de resposta.',
      inputSchema: z.object({
        serviceType: z.string().describe('Tipo de serviço (ex: "pintura residencial").'),
        description: z.string().describe('Detalhes do serviço solicitado.'),
      }),
      execute: async ({ serviceType, description }) => {
        if (!deps.requestQuote) return { registered: false };
        const result = await deps.requestQuote(serviceType, description);
        return { registered: true, estimateDays: result.estimateDays };
      },
    }),

    book_service: tool({
      description: 'Agenda execução de um serviço.',
      inputSchema: z.object({
        datetime: z.string().describe('Data e hora desejada.'),
        description: z.string().describe('Descrição do serviço.'),
      }),
      execute: async ({ datetime, description }) => {
        if (!deps.bookService) return { booked: false };
        const result = await deps.bookService(datetime, description);
        return { booked: true, bookingId: result.bookingId };
      },
    }),
  };
}

export function buildVerticalTools(
  vertical: VerticalId | string,
  deps: VerticalToolDeps,
): Record<string, Tool> {
  switch (vertical) {
    case 'ECOMMERCE':
      return ecommerceTools(deps);
    case 'CLINIC':
      return clinicTools(deps);
    case 'RESTAURANT':
      return restaurantTools(deps);
    case 'INFOPRODUCT':
      return infoproductTools(deps);
    case 'SERVICE':
      return serviceTools(deps);
    default:
      return {};
  }
}
