import Link from 'next/link';
import { Plus, Tag, Upload } from 'lucide-react';
import { prisma } from '@zapfy/db';
import { Button, EmptyState } from '@zapfy/ui';

import { requireWorkspace } from '@/lib/inbox';

import { ProductRow } from './product-row';

export const metadata = { title: 'Catálogo' };
export const dynamic = 'force-dynamic';

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { workspace, member } = await requireWorkspace();
  const params = await searchParams;
  const isAdmin = member.role === 'OWNER' || member.role === 'ADMIN';

  const where = params.category
    ? { workspaceId: workspace.id, category: params.category }
    : { workspaceId: workspace.id };

  const [products, categoriesAgg] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [{ active: 'desc' }, { category: 'asc' }, { name: 'asc' }],
      take: 200,
      select: {
        id: true,
        name: true,
        description: true,
        priceCents: true,
        currency: true,
        sku: true,
        category: true,
        stock: true,
        active: true,
        imageUrl: true,
        checkoutUrl: true,
      },
    }),
    prisma.product.groupBy({
      by: ['category'],
      where: { workspaceId: workspace.id },
      _count: { _all: true },
      orderBy: { category: 'asc' },
    }),
  ]);

  const categories = categoriesAgg
    .filter((c) => c.category !== null)
    .map((c) => ({ name: c.category as string, count: c._count._all }));

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 md:px-10 md:py-10">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Catálogo</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
            Produtos
            <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {products.length}
            </span>
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Produtos, itens de cardápio, serviços. O agente IA usa esse catálogo pra responder e
            fechar pedido com o cliente final no WhatsApp.
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/products/import">
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                Importar CSV
              </Link>
            </Button>
            <Button asChild>
              <Link href="/products/new">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Novo produto
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Categories filter */}
      {categories.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            Categoria:
          </span>
          <Link
            href="/products"
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              !params.category
                ? 'bg-primary text-primary-foreground'
                : 'border border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground'
            }`}
          >
            Todas
          </Link>
          {categories.map((c) => (
            <Link
              key={c.name}
              href={`/products?category=${encodeURIComponent(c.name)}`}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                params.category === c.name
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground'
              }`}
            >
              <Tag className="h-2.5 w-2.5" />
              {c.name}
              <span className="opacity-70">·{c.count}</span>
            </Link>
          ))}
        </div>
      )}

      {/* List */}
      <section className="mt-6">
        {products.length === 0 ? (
          <EmptyState
            icon={Tag}
            title="Catálogo vazio"
            description={
              params.category
                ? `Sem produtos na categoria "${params.category}".`
                : 'Cadastre seu primeiro produto pra o agente IA poder oferecer no WhatsApp.'
            }
            action={
              isAdmin ? (
                <div className="flex gap-2">
                  <Button asChild variant="outline">
                    <Link href="/products/import">
                      <Upload className="mr-1.5 h-3.5 w-3.5" />
                      Importar CSV
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link href="/products/new">Criar produto</Link>
                  </Button>
                </div>
              ) : null
            }
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <li key={p.id}>
                <ProductRow product={p} isAdmin={isAdmin} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
