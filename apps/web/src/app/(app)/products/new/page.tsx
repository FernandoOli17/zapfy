import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { requireWorkspace } from '@/lib/inbox';

import { ProductForm } from '../product-form';

export const metadata = { title: 'Novo produto' };

export default async function NewProductPage() {
  const { member } = await requireWorkspace();
  if (member.role !== 'OWNER' && member.role !== 'ADMIN') {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12 text-center">
        <p className="text-sm text-muted-foreground">Apenas OWNER/ADMIN podem criar produtos.</p>
        <Link href="/products" className="mt-3 inline-block text-sm text-primary hover:underline">
          ← Voltar
        </Link>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-3xl px-6 py-8 md:px-10 md:py-10">
      <Link
        href="/products"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        Catálogo
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">Novo produto</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Cadastre o produto/item de cardápio. O agente IA usa esses dados quando o cliente perguntar.
      </p>
      <div className="mt-8 rounded-xl border border-border bg-card p-6 md:p-8">
        <ProductForm />
      </div>
    </div>
  );
}
