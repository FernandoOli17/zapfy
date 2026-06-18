import { describe, it, expect, vi, beforeEach } from 'vitest';
import type * as ZapfyDb from '@zapfy/db';

/**
 * Regressão TASK-0032: tools com TODO(credentials) mandavam link
 * morto/alucinado pro CLIENTE FINAL com ok:true.
 *
 * Regra invariante: integração/URL ausente → ok:false com mensagem honesta de
 * alternativa/handoff. NUNCA URL sintética (checkout.example.com), NUNCA rota
 * 404 (/q/), NUNCA URL vinda do próprio modelo apresentada como configurada.
 *
 * Mock do @zapfy/db: substitui só `prisma` por um fake controlável;
 * reexporta o resto (enums QuoteStatus etc.) do client real.
 */

const productRows = {
  rows: [] as Array<{ id: string; name: string; checkoutUrl: string | null; priceCents: number | null }>,
};

const quoteState = {
  row: null as null | { id: string; publicNumber: string; status: string },
  updated: null as null | Record<string, unknown>,
};

vi.mock('@zapfy/db', async () => {
  const real = await vi.importActual<typeof ZapfyDb>('@zapfy/db');
  return {
    ...real,
    prisma: {
      product: {
        findMany: vi.fn(async () => productRows.rows),
      },
      quote: {
        findFirst: vi.fn(async () => quoteState.row),
        update: vi.fn(async (args: { data: Record<string, unknown> }) => {
          quoteState.updated = args.data;
          return {};
        }),
      },
    },
  };
});

const { buildEcommerceTools } = await import('../src/tools/ecommerce');
const { buildServiceTools } = await import('../src/tools/service');
const { buildInfoproductTools } = await import('../src/tools/infoproduct');

const deps = { workspaceId: 'ws', contactId: 'test-contact', conversationId: 'conv-12345678' };

type ToolResult = { ok: boolean; url?: string; previewUrl?: string; message?: string; error?: string };

async function run(tool: { execute?: unknown }, input: unknown): Promise<ToolResult> {
  return (await (tool.execute as (i: unknown, o: unknown) => Promise<unknown>)(input, {})) as ToolResult;
}

function noSyntheticUrl(value: unknown): void {
  if (typeof value !== 'string') return;
  expect(value).not.toContain('checkout.example.com');
  expect(value).not.toMatch(/\/q\//);
}

beforeEach(() => {
  productRows.rows = [];
  quoteState.row = null;
  quoteState.updated = null;
  vi.clearAllMocks();
});

describe('send_checkout_link — sem checkoutUrl real degrada honesto (FO-A1)', () => {
  it('produto sem checkoutUrl → ok:false e NUNCA URL sintética', async () => {
    productRows.rows = [{ id: 'p'.repeat(25), name: 'Tênis', checkoutUrl: null, priceCents: 19900 }];
    const tools = buildEcommerceTools(deps);
    const res = await run(tools['send_checkout_link']!, { productIds: ['p'.repeat(25)] });

    expect(res.ok).toBe(false);
    expect(res.url).toBeUndefined();
    // a mensagem honesta tem que existir pro agente oferecer alternativa
    expect(typeof res.error === 'string' || typeof res.message === 'string').toBe(true);
    noSyntheticUrl(res.error);
    noSyntheticUrl(res.message);
  });

  it('produto COM checkoutUrl real → ok:true e usa a URL real', async () => {
    productRows.rows = [
      { id: 'p'.repeat(25), name: 'Tênis', checkoutUrl: 'https://loja.com/c/abc', priceCents: 19900 },
    ];
    const tools = buildEcommerceTools(deps);
    const res = await run(tools['send_checkout_link']!, { productIds: ['p'.repeat(25)] });

    expect(res.ok).toBe(true);
    expect(res.url).toContain('https://loja.com/c/abc');
    noSyntheticUrl(res.url);
  });
});

describe('send_proposal — sem rota /q/ não promete link 404 (FO-A10)', () => {
  it('proposta enviada como texto puro, SEM URL /q/ no payload', async () => {
    quoteState.row = { id: 'q1', publicNumber: 'ORC-0001', status: 'DRAFT' };
    const tools = buildServiceTools(deps);
    const res = await run(tools['send_proposal']!, {
      publicNumber: 'ORC-0001',
      items: [{ name: 'Mão de obra', quantity: 1, unitPriceCents: 50000 }],
    });

    expect(res.ok).toBe(true);
    // o quote AINDA é atualizado pra SENT (efeito de negócio preservado)
    expect(quoteState.updated).not.toBeNull();
    // mas nada de link 404
    expect(res.previewUrl).toBeUndefined();
    noSyntheticUrl(res.url);
    noSyntheticUrl(res.message);
    expect(res.message ?? '').not.toMatch(/\/q\//);
  });
});

describe('send_sales_page / schedule_call — URL do LLM não vira promessa (FO-A16)', () => {
  it('send_sales_page → ok:false: não confia em URL vinda do modelo', async () => {
    const tools = buildInfoproductTools(deps);
    const res = await run(tools['send_sales_page']!, {
      salesPageUrl: 'https://dominio-alucinado-pelo-modelo.com/oferta',
      campaign: 'lancamento',
    });

    expect(res.ok).toBe(false);
    expect(res.url).toBeUndefined();
    expect(res.message ?? res.error ?? '').not.toContain('dominio-alucinado-pelo-modelo.com');
  });

  it('schedule_call → ok:false: não devolve Calendly inventado pro lead', async () => {
    const tools = buildInfoproductTools(deps);
    const res = await run(tools['schedule_call']!, {
      calendlyUrl: 'https://calendly.com/inventado-pelo-modelo',
      preferredWeekday: 'tue',
    });

    expect(res.ok).toBe(false);
    expect(res.url).toBeUndefined();
    expect(res.message ?? res.error ?? '').not.toContain('calendly.com/inventado-pelo-modelo');
  });
});
