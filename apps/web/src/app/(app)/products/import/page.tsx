import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { requireWorkspace } from '@/lib/inbox';

import { ImportForm } from './import-form';

export const metadata = { title: 'Importar produtos' };

export default async function ProductsImportPage() {
  const { member } = await requireWorkspace();
  if (member.role !== 'OWNER' && member.role !== 'ADMIN') {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12 text-center">
        <p className="text-sm text-muted-foreground">Apenas OWNER/ADMIN podem importar.</p>
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
      <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">Importar via CSV</h1>
      <p className="mt-1 max-w-xl text-sm text-muted-foreground">
        Cole o conteúdo do CSV abaixo. Colunas suportadas (header obrigatório):{' '}
        <code className="rounded bg-muted px-1 font-mono text-xs">name,description,price,sku,category,stock,active</code>
      </p>

      <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/[0.04] p-4 text-xs text-amber-700 dark:text-amber-300">
        <p className="font-medium">⚠ Regras importantes</p>
        <ul className="mt-2 list-disc space-y-0.5 pl-5">
          <li>
            <code>price</code> em reais (ex: <code>49.90</code>) — convertido pra centavos
            internamente.
          </li>
          <li>
            Se <code>sku</code> informado e já existir nesse workspace, faz UPDATE em vez de criar.
          </li>
          <li>
            <code>active</code> aceita: <code>true</code>, <code>false</code>, <code>sim</code>,{' '}
            <code>não</code>, <code>1</code>, <code>0</code>. Default: <code>true</code>.
          </li>
          <li>Linhas inválidas vão pro relatório de erros mas não param o batch.</li>
        </ul>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-6 md:p-8">
        <ImportForm />
      </div>
    </div>
  );
}
