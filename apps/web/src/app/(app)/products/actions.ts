'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@zapai/db';
import { createLogger } from '@zapai/shared';
import { z } from 'zod';

import { requireWorkspace } from '@/lib/inbox';

const log = createLogger('products-actions');

async function requireWorkspaceAdmin() {
  const ctx = await requireWorkspace();
  if (ctx.member.role !== 'OWNER' && ctx.member.role !== 'ADMIN') {
    return { error: 'Apenas OWNER/ADMIN podem gerenciar catálogo' as const };
  }
  return { user: ctx.user, workspaceId: ctx.workspace.id };
}

// ─── CREATE / UPDATE ────────────────────────────────────────────────────────

const productInput = z.object({
  id: z.string().cuid().optional(), // se presente, é update
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  priceCents: z.number().int().nonnegative().nullable(),
  sku: z.string().trim().max(50).optional(),
  category: z.string().trim().max(60).optional(),
  imageUrl: z.string().url().optional(),
  checkoutUrl: z.string().url().optional(),
  stock: z.number().int().nonnegative().nullable().optional(),
  active: z.boolean().default(true),
});

export type ProductActionResult =
  | { status: 'ok'; productId: string }
  | { status: 'error'; error: string };

export async function saveProduct(
  raw: z.infer<typeof productInput>,
): Promise<ProductActionResult> {
  const ctx = await requireWorkspaceAdmin();
  if ('error' in ctx) return { status: 'error', error: ctx.error };
  const parsed = productInput.safeParse(raw);
  if (!parsed.success) {
    return { status: 'error', error: parsed.error.issues[0]?.message ?? 'Inválido' };
  }
  const { id, ...data } = parsed.data;

  try {
    let product;
    if (id) {
      // update — confirma workspace ownership
      const existing = await prisma.product.findFirst({
        where: { id, workspaceId: ctx.workspaceId },
        select: { id: true },
      });
      if (!existing) return { status: 'error', error: 'Produto não encontrado' };
      product = await prisma.product.update({
        where: { id },
        data: {
          name: data.name,
          ...(data.description !== undefined ? { description: data.description } : { description: null }),
          priceCents: data.priceCents,
          ...(data.sku ? { sku: data.sku } : { sku: null }),
          ...(data.category ? { category: data.category } : { category: null }),
          ...(data.imageUrl ? { imageUrl: data.imageUrl } : { imageUrl: null }),
          ...(data.checkoutUrl ? { checkoutUrl: data.checkoutUrl } : { checkoutUrl: null }),
          stock: data.stock ?? null,
          active: data.active,
        },
      });
    } else {
      product = await prisma.product.create({
        data: {
          workspaceId: ctx.workspaceId,
          name: data.name,
          ...(data.description ? { description: data.description } : {}),
          priceCents: data.priceCents,
          ...(data.sku ? { sku: data.sku } : {}),
          ...(data.category ? { category: data.category } : {}),
          ...(data.imageUrl ? { imageUrl: data.imageUrl } : {}),
          ...(data.checkoutUrl ? { checkoutUrl: data.checkoutUrl } : {}),
          ...(data.stock !== null && data.stock !== undefined ? { stock: data.stock } : {}),
          active: data.active,
        },
      });
    }
    revalidatePath('/products');
    return { status: 'ok', productId: product.id };
  } catch (err) {
    // P2002 = unique constraint (workspaceId + sku)
    if (err instanceof Error && err.message.includes('P2002')) {
      return { status: 'error', error: `SKU "${data.sku}" já existe nesse workspace` };
    }
    log.error({ workspaceId: ctx.workspaceId, err: String(err) }, 'saveProduct falhou');
    return { status: 'error', error: err instanceof Error ? err.message : 'Falha desconhecida' };
  }
}

// ─── DELETE ─────────────────────────────────────────────────────────────────

export async function deleteProduct(
  productId: string,
): Promise<{ status: 'ok' } | { status: 'error'; error: string }> {
  const ctx = await requireWorkspaceAdmin();
  if ('error' in ctx) return { status: 'error', error: ctx.error };

  const product = await prisma.product.findFirst({
    where: { id: productId, workspaceId: ctx.workspaceId },
    select: { id: true, name: true },
  });
  if (!product) return { status: 'error', error: 'Produto não encontrado' };

  // soft delete via active=false? Vamos hard delete (Order preserva nameSnapshot)
  try {
    await prisma.product.delete({ where: { id: product.id } });
    revalidatePath('/products');
    return { status: 'ok' };
  } catch (err) {
    log.warn({ productId, err: String(err) }, 'deleteProduct falhou');
    return { status: 'error', error: 'Não foi possível apagar (pode ter pedidos associados)' };
  }
}

// ─── BULK IMPORT CSV ────────────────────────────────────────────────────────

const csvRowSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  price: z.coerce
    .number()
    .nonnegative()
    .nullable()
    .transform((v) => (v === null ? null : Math.round(v * 100))),
  sku: z.string().trim().max(50).optional(),
  category: z.string().trim().max(60).optional(),
  stock: z.coerce.number().int().nonnegative().nullable().optional(),
  active: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => {
      if (typeof v === 'boolean') return v;
      if (typeof v === 'string') return ['true', '1', 'sim', 'yes', 'ativo'].includes(v.toLowerCase());
      return true;
    }),
});

const importInput = z.object({
  csv: z.string().min(10).max(2_000_000), // 2MB cap
});

export type ImportResult =
  | {
      status: 'ok';
      created: number;
      updated: number;
      skipped: number;
      errors: Array<{ row: number; error: string }>;
    }
  | { status: 'error'; error: string };

/**
 * Importa CSV com colunas: name, description?, price, sku?, category?, stock?, active?
 *
 * Comportamento:
 *  - se sku informado e já existe pra este workspace, faz UPDATE
 *  - senão, faz CREATE
 *  - price em reais (ex: 49.90 → priceCents=4990)
 *  - active aceita true/false/sim/não/1/0
 *  - linhas inválidas viram erro mas não param o batch
 */
export async function importProductsCsv(
  raw: z.infer<typeof importInput>,
): Promise<ImportResult> {
  const ctx = await requireWorkspaceAdmin();
  if ('error' in ctx) return { status: 'error', error: ctx.error };
  const parsed = importInput.safeParse(raw);
  if (!parsed.success) return { status: 'error', error: 'CSV inválido' };

  const rows = parseCsv(parsed.data.csv);
  if (rows.length === 0) return { status: 'error', error: 'CSV vazio ou sem header válido' };

  const errors: Array<{ row: number; error: string }> = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) {
      skipped += 1;
      continue;
    }
    const validated = csvRowSchema.safeParse(row);
    if (!validated.success) {
      errors.push({ row: i + 2, error: validated.error.issues[0]?.message ?? 'inválido' });
      skipped += 1;
      continue;
    }
    const v = validated.data;

    try {
      if (v.sku) {
        const existing = await prisma.product.findUnique({
          where: { workspaceId_sku: { workspaceId: ctx.workspaceId, sku: v.sku } },
          select: { id: true },
        });
        if (existing) {
          await prisma.product.update({
            where: { id: existing.id },
            data: {
              name: v.name,
              ...(v.description ? { description: v.description } : {}),
              priceCents: v.price,
              ...(v.category ? { category: v.category } : {}),
              ...(v.stock !== undefined && v.stock !== null ? { stock: v.stock } : {}),
              active: v.active ?? true,
            },
          });
          updated += 1;
          continue;
        }
      }
      await prisma.product.create({
        data: {
          workspaceId: ctx.workspaceId,
          name: v.name,
          ...(v.description ? { description: v.description } : {}),
          priceCents: v.price,
          ...(v.sku ? { sku: v.sku } : {}),
          ...(v.category ? { category: v.category } : {}),
          ...(v.stock !== undefined && v.stock !== null ? { stock: v.stock } : {}),
          active: v.active ?? true,
        },
      });
      created += 1;
    } catch (err) {
      errors.push({ row: i + 2, error: err instanceof Error ? err.message : 'falha' });
      skipped += 1;
    }
  }

  log.info(
    { workspaceId: ctx.workspaceId, created, updated, skipped, errorsCount: errors.length },
    'CSV import concluído',
  );
  revalidatePath('/products');
  return { status: 'ok', created, updated, skipped, errors };
}

/**
 * Parser CSV simples — suporta header na primeira linha, valores entre aspas
 * (escapando vírgulas), e quebras de linha. Robusto pra exports do Excel/Sheets.
 */
function parseCsv(csv: string): Array<Record<string, string>> {
  const lines = csv.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = parseCsvLine(lines[0]!).map((h) => h.trim().toLowerCase());
  const out: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]!);
    const row: Record<string, string> = {};
    header.forEach((h, idx) => {
      const cell = cells[idx];
      if (cell !== undefined) row[h] = cell.trim();
    });
    out.push(row);
  }
  return out;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === '"') {
      // escape de aspas dupladas
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      cells.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  cells.push(cur);
  return cells;
}
