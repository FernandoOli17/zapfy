import { Ticket } from 'lucide-react';
import { prisma } from '@zapfy/db';
import { EmptyState } from '@zapfy/ui';

import { requireWorkspace } from '@/lib/inbox';

import { CouponsManager } from './coupons-manager';

export const metadata = { title: 'Cupons' };
export const dynamic = 'force-dynamic';

export default async function CouponsPage() {
  const { workspace, member } = await requireWorkspace();
  const isAdmin = member.role === 'OWNER' || member.role === 'ADMIN';

  const coupons = await prisma.coupon.findMany({
    where: { workspaceId: workspace.id },
    orderBy: [{ active: 'desc' }, { createdAt: 'desc' }],
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 md:px-10 md:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Promoções</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
            Cupons
            <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {coupons.length}
            </span>
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Cupons de desconto que o agente IA pode aplicar quando o cliente final pedir. Aceita
            percentual ou valor fixo, com limite de uso e expiração.
          </p>
        </div>
      </div>

      <div className="mt-6">
        {coupons.length === 0 && !isAdmin ? (
          <EmptyState
            icon={Ticket}
            title="Sem cupons cadastrados"
            description="Peça pro OWNER ou ADMIN cadastrar."
          />
        ) : (
          <CouponsManager
            isAdmin={isAdmin}
            coupons={coupons.map((c) => ({
              id: c.id,
              code: c.code,
              discountType: c.discountType,
              discountValue: c.discountValue,
              minSubtotalCents: c.minSubtotalCents,
              maxRedemptions: c.maxRedemptions,
              redeemedCount: c.redeemedCount,
              expiresAt: c.expiresAt?.toISOString() ?? null,
              active: c.active,
            }))}
          />
        )}
      </div>
    </div>
  );
}
