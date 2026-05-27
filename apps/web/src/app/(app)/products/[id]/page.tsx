import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { prisma } from '@zapai/db';

import { requireWorkspace } from '@/lib/inbox';

import { ProductForm } from '../product-form';

export const metadata = { title: 'Editar produto' };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { workspace, member } = await requireWorkspace();
  if (member.role !== 'OWNER' && member.role !== 'ADMIN') {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12 text-center">
        <p className="text-sm text-muted-foreground">Apenas OWNER/ADMIN podem editar produtos.</p>
      </div>
    );
  }
  const { id } = await params;
  const product = await prisma.product.findFirst({
    where: { id, workspaceId: workspace.id },
    select: {
      id: true,
      name: true,
      description: true,
      priceCents: true,
      sku: true,
      category: true,
      stock: true,
      imageUrl: true,
      checkoutUrl: true,
      active: true,
    },
  });
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 md:px-10 md:py-10">
      <Link
        href="/products"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        Catálogo
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
        Editar {product.name}
      </h1>
      <div className="mt-8 rounded-xl border border-border bg-card p-6 md:p-8">
        <ProductForm initial={product} />
      </div>
    </div>
  );
}
