'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { Button, cn, useToast } from '@zapfy/ui';

import { deleteProduct } from './actions';

interface Props {
  product: {
    id: string;
    name: string;
    description: string | null;
    priceCents: number | null;
    currency: string;
    sku: string | null;
    category: string | null;
    stock: number | null;
    active: boolean;
    imageUrl: string | null;
    checkoutUrl: string | null;
  };
  isAdmin: boolean;
}

export function ProductRow({ product, isAdmin }: Props) {
  const [pending, startTransition] = useTransition();
  const { push } = useToast();

  function onDelete() {
    if (!confirm(`Apagar "${product.name}"?`)) return;
    startTransition(async () => {
      const r = await deleteProduct(product.id);
      if (r.status === 'error') {
        push({ type: 'error', message: r.error });
      } else {
        push({ type: 'success', message: `"${product.name}" removido` });
      }
    });
  }

  const price =
    product.priceCents !== null
      ? new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: product.currency,
        }).format(product.priceCents / 100)
      : 'sob consulta';

  return (
    <div
      className={cn(
        'flex h-full flex-col gap-3 rounded-xl border bg-card p-4 transition-colors',
        product.active ? 'border-border hover:border-primary/30' : 'border-dashed border-border/60 opacity-60',
      )}
    >
      <div className="flex items-start gap-3">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-14 w-14 shrink-0 rounded-md object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xl text-primary">
            {product.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium">{product.name}</h3>
          {product.category && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">{product.category}</p>
          )}
          {product.sku && (
            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{product.sku}</p>
          )}
        </div>
      </div>

      {product.description && (
        <p className="line-clamp-2 text-xs text-muted-foreground">{product.description}</p>
      )}

      <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
        <div>
          <p className="text-sm font-semibold">{price}</p>
          {product.stock !== null && (
            <p
              className={cn(
                'text-[10px]',
                product.stock === 0
                  ? 'text-destructive'
                  : product.stock < 5
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-muted-foreground',
              )}
            >
              {product.stock === 0 ? 'sem estoque' : `${product.stock} em estoque`}
            </p>
          )}
        </div>

        {isAdmin && (
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="icon" className="h-8 w-8">
              <Link href={`/products/${product.id}`} aria-label="Editar">
                <Pencil className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onDelete}
              disabled={pending}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              aria-label="Apagar"
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
