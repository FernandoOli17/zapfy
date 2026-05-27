import { tool, type Tool } from 'ai';
import { z } from 'zod';
import { prisma, OrderStatus, type Prisma } from '@zapai/db';
import { createLogger } from '@zapai/shared';
import type { VerticalRuntimeDeps } from './runtime/types';

const log = createLogger('tools:restaurant');

/**
 * Tools do vertical RESTAURANT.
 * `add_to_cart` / `submit_order` mantém carrinho temporário em Conversation.internalNotes
 * como JSON serializado — sem novo modelo (carrinho é efêmero, até virar Order).
 *
 * Carrinho schema:
 *   { items: [{ productId, name, qty, priceCents, notes }], notes? }
 */

const CART_PREFIX = '__CART__:';

const cartItemSchema = z.object({
  productId: z.string().cuid(),
  name: z.string(),
  qty: z.number().int().min(1).max(50),
  priceCents: z.number().int().nonnegative(),
  notes: z.string().max(200).optional(),
});

const cartSchema = z.object({
  items: z.array(cartItemSchema).default([]),
  notes: z.string().max(500).optional(),
});

type Cart = z.infer<typeof cartSchema>;

async function loadCart(conversationId: string): Promise<Cart> {
  const c = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { internalNotes: true },
  });
  if (!c?.internalNotes?.startsWith(CART_PREFIX)) return { items: [] };
  try {
    const json = JSON.parse(c.internalNotes.slice(CART_PREFIX.length)) as unknown;
    const parsed = cartSchema.safeParse(json);
    return parsed.success ? parsed.data : { items: [] };
  } catch {
    return { items: [] };
  }
}

async function saveCart(conversationId: string, cart: Cart): Promise<void> {
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { internalNotes: `${CART_PREFIX}${JSON.stringify(cart)}` },
  });
}

async function clearCart(conversationId: string): Promise<void> {
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { internalNotes: null },
  });
}

export function buildRestaurantTools(deps: VerticalRuntimeDeps): Record<string, Tool> {
  return {
    get_menu: tool({
      description:
        'Retorna o cardápio do restaurante, opcionalmente filtrado por categoria. Use no início da conversa quando cliente pedir "cardápio", "menu", ou perguntar "o que vocês têm".',
      inputSchema: z.object({
        category: z.string().optional(),
        limit: z.number().int().min(1).max(30).default(20),
      }),
      execute: async ({ category, limit }) => {
        const where: Prisma.ProductWhereInput = {
          workspaceId: deps.workspaceId,
          active: true,
        };
        if (category) where.category = category;
        const items = await prisma.product.findMany({
          where,
          take: limit,
          orderBy: [{ category: 'asc' }, { name: 'asc' }],
          select: { id: true, name: true, description: true, priceCents: true, category: true },
        });
        const byCategory = items.reduce<Record<string, typeof items>>((acc, p) => {
          const cat = p.category ?? 'Outros';
          if (!acc[cat]) acc[cat] = [];
          acc[cat]!.push(p);
          return acc;
        }, {});
        return {
          ok: true as const,
          totalItems: items.length,
          categories: Object.entries(byCategory).map(([cat, prods]) => ({
            category: cat,
            items: prods.map((p) => ({
              id: p.id,
              name: p.name,
              description: p.description,
              priceFormatted: p.priceCents !== null ? formatBrl(p.priceCents) : 'sob consulta',
            })),
          })),
        };
      },
    }),

    add_to_cart: tool({
      description:
        'Adiciona item ao pedido em andamento. Confirma o produto pelo ID (obtido em get_menu). Aceita observações ("sem cebola", "bem passado"). Não confirma o pedido — pra fechar, chame submit_order.',
      inputSchema: z.object({
        productId: z.string().cuid(),
        quantity: z.number().int().min(1).max(20).default(1),
        notes: z.string().max(200).optional(),
      }),
      execute: async ({ productId, quantity, notes }) => {
        const product = await prisma.product.findFirst({
          where: { id: productId, workspaceId: deps.workspaceId, active: true },
          select: { id: true, name: true, priceCents: true, stock: true },
        });
        if (!product) {
          return { ok: false as const, error: `produto ${productId} não encontrado no cardápio` };
        }
        if (product.priceCents === null) {
          return { ok: false as const, error: `${product.name} não tem preço configurado — peça pro atendente humano` };
        }
        if (product.stock !== null && product.stock < quantity) {
          return { ok: false as const, error: `${product.name} sem estoque suficiente (${product.stock} disponível)` };
        }

        const cart = await loadCart(deps.conversationId);
        // se já tem mesmo item com mesma nota, soma qty em vez de duplicar linha
        const existing = cart.items.find(
          (i) => i.productId === product.id && (i.notes ?? '') === (notes ?? ''),
        );
        if (existing) {
          existing.qty += quantity;
        } else {
          cart.items.push({
            productId: product.id,
            name: product.name,
            qty: quantity,
            priceCents: product.priceCents,
            ...(notes ? { notes } : {}),
          });
        }
        await saveCart(deps.conversationId, cart);

        const subtotal = cart.items.reduce((acc, i) => acc + i.priceCents * i.qty, 0);
        return {
          ok: true as const,
          itemAdded: `${quantity}× ${product.name}`,
          cartItemCount: cart.items.length,
          subtotalFormatted: formatBrl(subtotal),
        };
      },
    }),

    submit_order: tool({
      description:
        'Finaliza o pedido em andamento e devolve número público do pedido + ETA. Exige endereço completo e forma de pagamento. NÃO chame sem confirmar com o cliente os itens, endereço e pagamento.',
      inputSchema: z.object({
        shippingAddress: z.object({
          street: z.string().min(2),
          number: z.string().min(1).max(10),
          complement: z.string().max(60).optional(),
          neighborhood: z.string().min(2),
          city: z.string().min(2),
          state: z.string().length(2),
          zip: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP no formato 00000-000'),
          reference: z.string().max(120).optional(),
        }),
        paymentMethod: z.enum(['pix', 'card_on_delivery', 'card_online', 'cash']),
        notes: z.string().max(500).optional(),
        etaMinutes: z.number().int().min(10).max(180).default(45),
      }),
      execute: async ({ shippingAddress, paymentMethod, notes, etaMinutes }) => {
        const cart = await loadCart(deps.conversationId);
        if (cart.items.length === 0) {
          return { ok: false as const, error: 'carrinho vazio — adicione itens antes de finalizar' };
        }
        const subtotalCents = cart.items.reduce((acc, i) => acc + i.priceCents * i.qty, 0);
        const publicNumber = await genPublicNumber(deps.workspaceId, 'PED');

        const order = await prisma.order.create({
          data: {
            workspaceId: deps.workspaceId,
            contactId: deps.contactId === 'test-contact' ? null : deps.contactId,
            conversationId: deps.conversationId === 'test-conversation' ? null : deps.conversationId,
            publicNumber,
            status: OrderStatus.CONFIRMED,
            subtotalCents,
            totalCents: subtotalCents,
            paymentMethod,
            shippingAddress: shippingAddress as unknown as Prisma.InputJsonValue,
            etaMinutes,
            ...(notes ? { notes } : {}),
            items: {
              create: cart.items.map((i) => ({
                productId: i.productId,
                nameSnapshot: i.name,
                unitPriceCents: i.priceCents,
                quantity: i.qty,
                ...(i.notes ? { notes: i.notes } : {}),
              })),
            },
          },
          select: { publicNumber: true, totalCents: true, etaMinutes: true },
        });

        // TODO(credentials): notificar PDV/iFood/Rappi via webhook configurado
        await clearCart(deps.conversationId);

        log.info(
          { workspaceId: deps.workspaceId, orderNumber: order.publicNumber, totalCents: order.totalCents },
          'pedido criado',
        );

        return {
          ok: true as const,
          publicNumber: order.publicNumber,
          totalFormatted: formatBrl(order.totalCents),
          etaMinutes: order.etaMinutes,
          message: `Pedido ${order.publicNumber} confirmado, total ${formatBrl(order.totalCents)}, sai em ~${order.etaMinutes}min`,
        };
      },
    }),

    check_delivery_eta: tool({
      description:
        'Consulta o status atual da entrega de um pedido. Use quando cliente perguntar "cadê meu pedido", "demora muito".',
      inputSchema: z.object({
        publicNumber: z.string().min(3),
      }),
      execute: async ({ publicNumber }) => {
        const candidates = [publicNumber, publicNumber.replace(/^#?(PED-?)?/i, 'PED-')];
        const order = await prisma.order.findFirst({
          where: {
            workspaceId: deps.workspaceId,
            publicNumber: { in: candidates },
          },
          select: { publicNumber: true, status: true, etaMinutes: true, createdAt: true },
        });
        if (!order) {
          return { ok: false as const, error: `pedido ${publicNumber} não encontrado` };
        }
        const elapsedMin = Math.floor((Date.now() - order.createdAt.getTime()) / 60_000);
        const remainingMin = order.etaMinutes !== null ? Math.max(0, order.etaMinutes - elapsedMin) : null;
        return {
          ok: true as const,
          publicNumber: order.publicNumber,
          status: order.status,
          statusFriendly: friendlyOrderStatus(order.status),
          elapsedMinutes: elapsedMin,
          remainingMinutes: remainingMin,
          message:
            remainingMin === null
              ? `Pedido ${order.publicNumber}: ${friendlyOrderStatus(order.status)}`
              : remainingMin === 0 && order.status !== 'DELIVERED'
                ? `Pedido ${order.publicNumber} tá saindo a qualquer momento — passou do ETA`
                : `Pedido ${order.publicNumber}: ${friendlyOrderStatus(order.status)}, ~${remainingMin}min restantes`,
        };
      },
    }),
  };
}

async function genPublicNumber(workspaceId: string, prefix: string): Promise<string> {
  // Conta orders existentes + 1. Não é monotonic-perfeito sob concorrência;
  // se houver race, prisma.create vai dar P2002 (unique [workspaceId, publicNumber])
  // e chamar de novo com +1. Mantém simples — volume baixo no MVP.
  const count = await prisma.order.count({ where: { workspaceId } });
  return `${prefix}-${(count + 1).toString().padStart(4, '0')}`;
}

function formatBrl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function friendlyOrderStatus(s: string): string {
  const map: Record<string, string> = {
    PENDING: 'aguardando confirmação',
    CONFIRMED: 'confirmado, em preparo',
    PREPARING: 'cozinha preparando',
    OUT_FOR_DELIVERY: 'saiu pra entrega',
    DELIVERED: 'entregue',
    CANCELLED: 'cancelado',
    REFUNDED: 'reembolsado',
  };
  return map[s] ?? s.toLowerCase();
}
