import Link from 'next/link';
import { ArrowLeft, FileSpreadsheet } from 'lucide-react';

import { ImportForm } from './import-form';

export const metadata = { title: 'Importar contatos' };

export default function ImportContactsPage() {
  return (
    <div className="relative overflow-hidden">
      <div className="bg-radial-fade absolute inset-0 -z-10" aria-hidden />
      <div className="mx-auto max-w-3xl px-6 py-12 md:px-10 md:py-16">
        <Link
          href="/contacts"
          className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Contatos
        </Link>

        <p className="mt-6 text-xs uppercase tracking-widest text-muted-foreground">
          Importar contatos
        </p>
        <h1 className="mt-3 text-4xl font-medium leading-[1.05] tracking-tight md:text-5xl">
          Sobe um{' '}
          <span className="font-serif italic font-normal text-primary">CSV.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground md:text-lg">
          Cada linha vira um contato. Mantemos os existentes (atualizando se vier mais info)
          e criamos os novos. Sem duplicar.
        </p>

        <section className="mt-10 rounded-2xl border border-border/60 bg-card/40 p-6 md:p-8">
          <ImportForm />
        </section>

        <section className="mt-10 rounded-2xl border border-border/60 bg-card/40 p-6">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FileSpreadsheet className="h-4 w-4 text-primary" />
            Formato esperado
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Header obrigatório na primeira linha. Colunas aceitas (case-insensitive):
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            <li>
              <code>phone</code> (ou <code>telefone</code>, <code>numero</code>, <code>number</code>) — <strong>obrigatório</strong>,
              formato internacional (ex: <code>5511999998888</code>)
            </li>
            <li>
              <code>name</code> (ou <code>nome</code>) — opcional
            </li>
            <li>
              <code>email</code> (ou <code>e-mail</code>) — opcional
            </li>
            <li>
              <code>tags</code> — opcional, separadas por <code>,</code>{' '}<code>;</code>{' '}ou <code>|</code>
            </li>
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            Máximo 5.000 linhas por arquivo, 5 MB. Acima disso, divida em vários imports.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-md border border-border/60 bg-background/40 p-3 font-mono text-[11px]">
{`phone,name,email,tags
5511999998888,Ana Silva,ana@exemplo.com,vip;recorrente
5521988887777,João Souza,,
5519944443333,,joao@empresa.com,trial`}
          </pre>
        </section>
      </div>
    </div>
  );
}
