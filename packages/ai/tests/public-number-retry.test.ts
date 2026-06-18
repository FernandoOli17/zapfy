import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Prisma as PrismaNs } from '@zapfy/db';
import type * as ZapfyDb from '@zapfy/db';

/**
 * Regressão TASK-0033: genPublicNumber/genQuoteNumber usavam count+1 sem retry.
 *
 * Dois bugs provados aqui:
 *  1. Order/Quote deletado faz count+1 colidir DETERMINISTICAMENTE com um
 *     publicNumber que ainda existe → todo pedido novo falha até o count
 *     alcançar. max(publicNumber)+1 elimina isso.
 *  2. Submits concorrentes geram o mesmo número e o segundo create dá P2002.
 *     O comentário prometia retry que não existia → agora existe (captura
 *     P2002 e tenta de novo recomputando o número).
 *
 * Mock do @zapfy/db: substitui só o `prisma` por um fake; reexporta o resto
 * (enums, namespace Prisma com a classe de erro real) do client de verdade.
 */

const orderState = {
  rows: [] as Array<{ publicNumber: string }>,
  // sequência de "comportamentos" do create: cada entrada é 'p2002' (lança
  // colisão como se outro processo tivesse pego o número) ou 'ok' (persiste).
  createBehaviors: [] as Array<'p2002' | 'ok'>,
  createCalls: 0,
};

const quoteState = {
  rows: [] as Array<{ publicNumber: string }>,
  createBehaviors: [] as Array<'p2002' | 'ok'>,
  createCalls: 0,
};

// Preenchido pelo mock factory com o namespace Prisma REAL (classe de erro
// real), pra que `err instanceof Prisma.PrismaClientKnownRequestError` no
// código sob teste seja verdadeiro.
let PrismaNamespace: typeof PrismaNs;

function p2002(target: string[]): Error {
  return new PrismaNamespace.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target },
  });
}

function makeDelegate(
  state: { rows: Array<{ publicNumber: string }>; createBehaviors: Array<'p2002' | 'ok'>; createCalls: number },
  uniqueTarget: string[],
) {
  return {
    findMany: vi.fn(async (args: { orderBy?: { publicNumber?: 'asc' | 'desc' }; take?: number }) => {
      const dir = args.orderBy?.publicNumber ?? 'asc';
      const sorted = [...state.rows].sort((a, b) =>
        a.publicNumber < b.publicNumber ? -1 : a.publicNumber > b.publicNumber ? 1 : 0,
      );
      const ordered = dir === 'desc' ? sorted.reverse() : sorted;
      return typeof args.take === 'number' ? ordered.slice(0, args.take) : ordered;
    }),
    create: vi.fn(async (args: { data: { publicNumber: string }; select?: Record<string, boolean> }) => {
      const behavior = state.createBehaviors[state.createCalls] ?? 'ok';
      state.createCalls += 1;
      const publicNumber = args.data.publicNumber;
      if (behavior === 'p2002') throw p2002(uniqueTarget);
      if (state.rows.some((r) => r.publicNumber === publicNumber)) throw p2002(uniqueTarget);
      state.rows.push({ publicNumber });
      return { publicNumber, totalCents: 0, etaMinutes: 45 };
    }),
  };
}

vi.mock('@zapfy/db', async () => {
  const real = await vi.importActual<typeof ZapfyDb>('@zapfy/db');
  PrismaNamespace = real.Prisma;
  return {
    ...real,
    prisma: {
      order: makeDelegate(orderState, ['workspaceId', 'publicNumber']),
      quote: makeDelegate(quoteState, ['workspaceId', 'publicNumber']),
      conversation: {
        findUnique: vi.fn(async () => ({ internalNotes: null })),
        update: vi.fn(async () => ({})),
      },
    },
  };
});

const { buildRestaurantTools } = await import('../src/tools/restaurant');
const { buildServiceTools } = await import('../src/tools/service');

function resetState() {
  orderState.rows = [];
  orderState.createBehaviors = [];
  orderState.createCalls = 0;
  quoteState.rows = [];
  quoteState.createBehaviors = [];
  quoteState.createCalls = 0;
}

beforeEach(() => {
  resetState();
  vi.clearAllMocks();
});

const deps = { workspaceId: 'ws', contactId: 'test-contact', conversationId: 'test-conversation' };

const orderInput = {
  shippingAddress: {
    street: 'Rua A',
    number: '10',
    neighborhood: 'Centro',
    city: 'SP',
    state: 'SP',
    zip: '01000-000',
  },
  paymentMethod: 'pix' as const,
  etaMinutes: 45,
};

describe('submit_order — numeração de Order resiliente (TASK-0033)', () => {
  it('Order deletado no meio NÃO colide deterministicamente (max+1, não count+1)', async () => {
    // Histórico: existe PED-0003 (os anteriores foram deletados). count = 1.
    // count+1 → "PED-0002" que está LIVRE neste fixture, mas o caso real é:
    // se o maior existente é PED-0003 e count diz 1, count+1=PED-0002 colide
    // quando PED-0002 ainda existe. Montamos exatamente esse cenário:
    orderState.rows = [{ publicNumber: 'PED-0002' }, { publicNumber: 'PED-0003' }];
    // count = 2 → count+1 = PED-0003 → COLIDE com existente.
    // max+1 = PED-0004 → livre.
    const tools = buildRestaurantTools(deps);
    const conv = await import('@zapfy/db');
    (conv.prisma.conversation.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      internalNotes: '__CART__:' + JSON.stringify({ items: [{ productId: 'c'.repeat(25), name: 'X', qty: 1, priceCents: 100 }] }),
    });
    const submit = tools['submit_order']!;
    const res = (await (submit.execute as (i: unknown, o: unknown) => Promise<unknown>)(
      orderInput,
      {},
    )) as { ok: boolean; publicNumber?: string };
    expect(res.ok).toBe(true);
    expect(res.publicNumber).toBe('PED-0004');
  });

  it('submits concorrentes: primeiro create dá P2002, retry recomputa e sucede', async () => {
    orderState.rows = [{ publicNumber: 'PED-0001' }];
    // 1ª tentativa: P2002 (outro processo pegou o número). 2ª: ok.
    orderState.createBehaviors = ['p2002', 'ok'];
    const tools = buildRestaurantTools(deps);
    const conv = await import('@zapfy/db');
    (conv.prisma.conversation.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      internalNotes: '__CART__:' + JSON.stringify({ items: [{ productId: 'c'.repeat(25), name: 'X', qty: 1, priceCents: 100 }] }),
    });
    const submit = tools['submit_order']!;
    const res = (await (submit.execute as (i: unknown, o: unknown) => Promise<unknown>)(
      orderInput,
      {},
    )) as { ok: boolean; publicNumber?: string };
    expect(orderState.createCalls).toBeGreaterThanOrEqual(2);
    expect(res.ok).toBe(true);
  });

  it('numeração acima de 9999 não regride (largura 4→5 dígitos)', async () => {
    // Ordenação lexicográfica colocaria "PED-10000" ANTES de "PED-9999" e
    // devolveria max defasado. O max NUMÉRICO correto é 10000 → próximo 10001.
    orderState.rows = [
      { publicNumber: 'PED-9998' },
      { publicNumber: 'PED-9999' },
      { publicNumber: 'PED-10000' },
    ];
    const tools = buildRestaurantTools(deps);
    const conv = await import('@zapfy/db');
    (conv.prisma.conversation.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      internalNotes: '__CART__:' + JSON.stringify({ items: [{ productId: 'c'.repeat(25), name: 'X', qty: 1, priceCents: 100 }] }),
    });
    const submit = tools['submit_order']!;
    const res = (await (submit.execute as (i: unknown, o: unknown) => Promise<unknown>)(
      orderInput,
      {},
    )) as { ok: boolean; publicNumber?: string };
    expect(res.ok).toBe(true);
    expect(res.publicNumber).toBe('PED-10001');
  });
});

describe('request_quote — numeração de Quote resiliente (TASK-0033)', () => {
  it('Quote deletado no meio NÃO colide deterministicamente (max+1)', async () => {
    quoteState.rows = [{ publicNumber: 'ORC-0002' }, { publicNumber: 'ORC-0003' }];
    const tools = buildServiceTools(deps);
    const req = tools['request_quote']!;
    const res = (await (req.execute as (i: unknown, o: unknown) => Promise<unknown>)(
      { serviceDescription: 'troca de chuveiro elétrico', urgency: 'flexible' },
      {},
    )) as { ok: boolean; publicNumber?: string };
    expect(res.ok).toBe(true);
    expect(res.publicNumber).toBe('ORC-0004');
  });

  it('orçamentos concorrentes: primeiro create dá P2002, retry recomputa e sucede', async () => {
    quoteState.rows = [{ publicNumber: 'ORC-0001' }];
    quoteState.createBehaviors = ['p2002', 'ok'];
    const tools = buildServiceTools(deps);
    const req = tools['request_quote']!;
    const res = (await (req.execute as (i: unknown, o: unknown) => Promise<unknown>)(
      { serviceDescription: 'instalação de tomada nova', urgency: 'flexible' },
      {},
    )) as { ok: boolean };
    expect(quoteState.createCalls).toBeGreaterThanOrEqual(2);
    expect(res.ok).toBe(true);
  });
});
