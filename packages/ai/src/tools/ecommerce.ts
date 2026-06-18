import { tool, type Tool } from 'ai';
import { z } from 'zod';
import { prisma, CouponDiscountType, type Prisma } from '@zapfy/db';
import { createLogger } from '@zapfy/shared';
import type { VerticalRuntimeDeps } from './runtime/types';

const log = createLogger('tools:ecommerce');

/**
 * Tools do vertical ECOMMERCE. Todas escopadas por `workspaceId`.
 * Tools que chamam Stripe / Shopify ficam stubbed até credenciais — ver BLOCKED.md.
 */
export function buildEcommerceTools(deps: VerticalRuntimeDeps): Record<string, Tool> {
  return {
    list_products: tool({
      description:
        'Lista produtos do catálogo do workspace, com filtros opcionais (texto livre + categoria + faixa de preço). Use quando o cliente perguntar "o que vocês vendem", "tem X?", ou pedir sugestão sem ter nome específico.',
      inputSchema: z.object({
        query: z.string().optional().describe('Termo de busca livre (nome ou descrição).'),
        category: z.string().optional(),
        maxPriceCents: z.number().int().positive().optional(),
        limit: z.number().int().min(1).max(20).default(8),
      }),
      execute: async ({ query, category, maxPriceCents, limit }) => {
        const where: Prisma.ProductWhereInput = {
          workspaceId: deps.workspaceId,
          active: true,
        };
        if (category) where.category = category;
        if (maxPriceCents !== undefined) where.priceCents = { lte: maxPriceCents };
        if (query) {
          where.OR = [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ];
        }
        const products = await prisma.product.findMany({
          where,
          take: limit,
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            description: true,
            priceCents: true,
            currency: true,
            imageUrl: true,
            stock: true,
            category: true,
          },
        });
        return {
          ok: true as const,
          count: products.length,
          products: products.map((p) => ({
            ...p,
            priceFormatted: p.priceCents !== null ? formatCurrency(p.priceCents, p.currency) : null,
          })),
        };
      },
    }),

    recommend_product: tool({
      description:
        'Recomenda 1-3 produtos baseado em uma necessidade descrita pelo cliente. Usa busca textual no catálogo — não usa ML ainda. Quando catálogo for grande (Fase 7+), trocaremos por embedding.',
      inputSchema: z.object({
        needs: z.string().min(3).describe('Em 1-2 frases: o que o cliente busca. Ex: "presente até R$100 pra esposa que gosta de skincare"'),
        budget: z.number().int().positive().optional(),
      }),
      execute: async ({ needs, budget }) => {
        // Estratégia simples: extrai tokens da necessidade e busca textual.
        // TODO(future): trocar por embedding + cosine quando catálogo > 100 SKUs.
        const tokens = needs
          .toLowerCase()
          .replace(/[^\p{L}\p{N}\s]/gu, ' ')
          .split(/\s+/)
          .filter((t) => t.length > 3)
          .slice(0, 5);

        if (tokens.length === 0) {
          return { ok: false as const, error: 'descrição muito curta — peça mais detalhes ao cliente' };
        }

        const where: Prisma.ProductWhereInput = {
          workspaceId: deps.workspaceId,
          active: true,
          OR: tokens.map((t) => ({
            name: { contains: t, mode: 'insensitive' as const },
          })),
        };
        if (budget !== undefined) {
          where.priceCents = { lte: budget };
        }

        const products = await prisma.product.findMany({
          where,
          take: 3,
          orderBy: { priceCents: 'asc' },
          select: { id: true, name: true, description: true, priceCents: true, currency: true, imageUrl: true },
        });

        if (products.length === 0) {
          return {
            ok: false as const,
            error: 'nada no catálogo encaixa nessa descrição + orçamento — peça pra cliente flexibilizar',
          };
        }

        return {
          ok: true as const,
          recommendations: products.map((p) => ({
            ...p,
            priceFormatted: p.priceCents !== null ? formatCurrency(p.priceCents, p.currency) : null,
          })),
        };
      },
    }),

    track_order: tool({
      description:
        'Consulta status de pedido pelo número público (ex: "PED-1234") ou pelo ID interno. Use quando cliente pede "cadê meu pedido", "rastreio", "número do pedido".',
      inputSchema: z.object({
        publicNumber: z.string().min(3).describe('Número do pedido. Ex: PED-1234 ou só 1234.'),
      }),
      execute: async ({ publicNumber }) => {
        // aceita "PED-1234" ou só "1234"
        const candidates = [publicNumber, publicNumber.replace(/^#?(PED-?)?/i, 'PED-')];
        const order = await prisma.order.findFirst({
          where: {
            workspaceId: deps.workspaceId,
            publicNumber: { in: candidates },
          },
          include: {
            items: { select: { nameSnapshot: true, quantity: true, unitPriceCents: true } },
          },
        });
        if (!order) {
          return { ok: false as const, error: `pedido ${publicNumber} não encontrado` };
        }
        return {
          ok: true as const,
          order: {
            publicNumber: order.publicNumber,
            status: order.status,
            statusFriendly: friendlyOrderStatus(order.status),
            totalFormatted: formatCurrency(order.totalCents, order.currency),
            etaMinutes: order.etaMinutes,
            itemsCount: order.items.length,
            items: order.items.map((i) => ({
              name: i.nameSnapshot,
              quantity: i.quantity,
              priceFormatted: formatCurrency(i.unitPriceCents, order.currency),
            })),
            createdAt: order.createdAt.toISOString(),
          },
        };
      },
    }),

    apply_coupon: tool({
      description:
        'Valida um cupom de desconto e retorna o desconto aplicado. NÃO finaliza venda — só checa se cupom existe, tá ativo, não expirou, e respeitou minSubtotal. Caller decide se aplica.',
      inputSchema: z.object({
        code: z.string().trim().min(1).max(40),
        cartSubtotalCents: z.number().int().nonnegative(),
      }),
      execute: async ({ code, cartSubtotalCents }) => {
        const coupon = await prisma.coupon.findFirst({
          where: {
            workspaceId: deps.workspaceId,
            code: { equals: code, mode: 'insensitive' },
          },
        });
        if (!coupon || !coupon.active) {
          return { ok: false as const, reason: 'invalid' as const, message: `Cupom "${code}" não existe ou está desativado` };
        }
        if (coupon.expiresAt && coupon.expiresAt < new Date()) {
          return { ok: false as const, reason: 'expired' as const, message: `Cupom expirou em ${coupon.expiresAt.toLocaleDateString('pt-BR')}` };
        }
        if (coupon.maxRedemptions !== null && coupon.redeemedCount >= coupon.maxRedemptions) {
          return { ok: false as const, reason: 'maxed' as const, message: 'Cupom já atingiu o limite de usos' };
        }
        if (coupon.minSubtotalCents !== null && cartSubtotalCents < coupon.minSubtotalCents) {
          return {
            ok: false as const,
            reason: 'min_subtotal' as const,
            message: `Cupom exige compra mínima de ${formatCurrency(coupon.minSubtotalCents, 'BRL')}`,
          };
        }
        const discountCents =
          coupon.discountType === CouponDiscountType.PERCENT
            ? Math.floor((cartSubtotalCents * coupon.discountValue) / 100)
            : Math.min(coupon.discountValue, cartSubtotalCents);
        return {
          ok: true as const,
          code: coupon.code,
          discountCents,
          discountFormatted: formatCurrency(discountCents, 'BRL'),
          newSubtotalCents: cartSubtotalCents - discountCents,
        };
      },
    }),

    send_checkout_link: tool({
      description:
        'Gera um link de checkout com os produtos pré-selecionados e UTM rastreável. Use quando cliente quer fechar a compra. Retorna a URL pra colar na mensagem.',
      inputSchema: z.object({
        productIds: z.array(z.string().cuid()).min(1).max(20),
        couponCode: z.string().trim().max(40).optional(),
      }),
      execute: async ({ productIds, couponCode }) => {
        const products = await prisma.product.findMany({
          where: {
            id: { in: productIds },
            workspaceId: deps.workspaceId,
            active: true,
          },
          select: { id: true, name: true, checkoutUrl: true, priceCents: true },
        });
        if (products.length === 0) {
          return { ok: false as const, error: 'nenhum produto válido encontrado' };
        }
        // Integração de checkout online (Shopify/WooCommerce) ainda não conectada
        // — a única URL real disponível é o `checkoutUrl` cadastrado no próprio
        // Product. Se nenhum item tem checkoutUrl, NÃO inventamos link (proibido
        // mandar checkout.example.com pro cliente): degrada honesto com handoff.
        const first = products[0];
        if (!first?.checkoutUrl) {
          log.info(
            { workspaceId: deps.workspaceId, productIds: products.map((p) => p.id) },
            'send_checkout_link sem checkoutUrl real — degradando honesto',
          );
          return {
            ok: false as const,
            reason: 'checkout_not_configured' as const,
            error:
              'Checkout online não está configurado pra esse produto. Não invente link: explique que vai chamar alguém do time pra fechar a compra ou combinar o pagamento por aqui mesmo.',
          };
        }
        const baseUrl = first.checkoutUrl;
        const utm = `utm_source=whatsapp&utm_medium=trato&utm_campaign=conv_${deps.conversationId.slice(0, 8)}`;
        const sep = baseUrl.includes('?') ? '&' : '?';
        const url = `${baseUrl}${sep}${utm}${couponCode ? `&coupon=${encodeURIComponent(couponCode)}` : ''}`;

        log.info(
          { workspaceId: deps.workspaceId, productIds: products.map((p) => p.id), couponCode },
          'checkout link gerado',
        );

        return {
          ok: true as const,
          url,
          items: products.map((p) => ({
            name: p.name,
            priceFormatted: p.priceCents !== null ? formatCurrency(p.priceCents, 'BRL') : null,
          })),
        };
      },
    }),
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(cents: number, currency: string): string {
  const value = cents / 100;
  if (currency === 'BRL') {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  return value.toLocaleString('pt-BR', { style: 'currency', currency });
}

function friendlyOrderStatus(s: string): string {
  const map: Record<string, string> = {
    PENDING: 'aguardando confirmação',
    CONFIRMED: 'confirmado, em preparo',
    PREPARING: 'em preparo',
    OUT_FOR_DELIVERY: 'saiu pra entrega',
    DELIVERED: 'entregue',
    CANCELLED: 'cancelado',
    REFUNDED: 'reembolsado',
  };
  return map[s] ?? s.toLowerCase();
}
