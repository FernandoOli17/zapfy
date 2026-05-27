'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma, type CouponDiscountType } from '@zapai/db';
import { createLogger } from '@zapai/shared';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import { requireWorkspace } from '@/lib/inbox';

const log = createLogger('coupons-actions');

async function requireWorkspaceAdmin() {
  const ctx = await requireWorkspace();
  if (ctx.member.role !== 'OWNER' && ctx.member.role !== 'ADMIN') {
    return { error: 'Apenas OWNER/ADMIN podem gerenciar cupons' as const };
  }
  return { user: ctx.user, workspaceId: ctx.workspace.id };
}

const couponInput = z
  .object({
    id: z.string().cuid().optional(),
    code: z
      .string()
      .trim()
      .min(2)
      .max(40)
      .regex(/^[A-Za-z0-9_-]+$/, 'Use só letras, números, _, -')
      .transform((s) => s.toUpperCase()),
    discountType: z.enum(['PERCENT', 'FIXED_CENTS']),
    /** PERCENT: 1-100. FIXED_CENTS: valor em centavos (>=1). */
    discountValue: z.number().int().positive(),
    minSubtotalCents: z.number().int().nonnegative().nullable().optional(),
    maxRedemptions: z.number().int().positive().nullable().optional(),
    expiresAt: z.string().datetime().optional().nullable(),
    active: z.boolean().default(true),
  })
  .superRefine((v, ctx) => {
    if (v.discountType === 'PERCENT' && v.discountValue > 100) {
      ctx.addIssue({ code: 'custom', message: 'PERCENT deve ser 1-100', path: ['discountValue'] });
    }
  });

export type SaveCouponResult =
  | { status: 'ok'; id: string }
  | { status: 'error'; error: string };

export async function saveCoupon(raw: z.infer<typeof couponInput>): Promise<SaveCouponResult> {
  const ctx = await requireWorkspaceAdmin();
  if ('error' in ctx) return { status: 'error', error: ctx.error };
  const parsed = couponInput.safeParse(raw);
  if (!parsed.success) {
    return { status: 'error', error: parsed.error.issues[0]?.message ?? 'Inválido' };
  }
  const { id, ...data } = parsed.data;

  try {
    let coupon;
    if (id) {
      const existing = await prisma.coupon.findFirst({
        where: { id, workspaceId: ctx.workspaceId },
        select: { id: true },
      });
      if (!existing) return { status: 'error', error: 'Cupom não encontrado' };
      coupon = await prisma.coupon.update({
        where: { id },
        data: {
          code: data.code,
          discountType: data.discountType as CouponDiscountType,
          discountValue: data.discountValue,
          minSubtotalCents: data.minSubtotalCents ?? null,
          maxRedemptions: data.maxRedemptions ?? null,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
          active: data.active,
        },
      });
    } else {
      coupon = await prisma.coupon.create({
        data: {
          workspaceId: ctx.workspaceId,
          code: data.code,
          discountType: data.discountType as CouponDiscountType,
          discountValue: data.discountValue,
          ...(data.minSubtotalCents !== undefined && data.minSubtotalCents !== null
            ? { minSubtotalCents: data.minSubtotalCents }
            : {}),
          ...(data.maxRedemptions !== undefined && data.maxRedemptions !== null
            ? { maxRedemptions: data.maxRedemptions }
            : {}),
          ...(data.expiresAt ? { expiresAt: new Date(data.expiresAt) } : {}),
          active: data.active,
        },
      });
    }
    revalidatePath('/coupons');
    return { status: 'ok', id: coupon.id };
  } catch (err) {
    if (err instanceof Error && err.message.includes('P2002')) {
      return { status: 'error', error: `Cupom "${data.code}" já existe` };
    }
    log.error({ err: String(err) }, 'saveCoupon falhou');
    return { status: 'error', error: err instanceof Error ? err.message : 'Falha' };
  }
}

export async function deleteCoupon(
  id: string,
): Promise<{ status: 'ok' } | { status: 'error'; error: string }> {
  const ctx = await requireWorkspaceAdmin();
  if ('error' in ctx) return { status: 'error', error: ctx.error };
  const c = await prisma.coupon.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
    select: { id: true },
  });
  if (!c) return { status: 'error', error: 'Cupom não encontrado' };
  await prisma.coupon.delete({ where: { id: c.id } });
  revalidatePath('/coupons');
  return { status: 'ok' };
}
