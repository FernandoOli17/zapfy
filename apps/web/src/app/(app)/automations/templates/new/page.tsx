import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { NewTemplateForm } from './new-template-form';

export const metadata = { title: 'Novo template HSM' };

export default function NewTemplatePage() {
  return (
    <div className="relative overflow-hidden">
      <div className="bg-radial-fade absolute inset-0 -z-10" aria-hidden />
      <div className="mx-auto max-w-3xl px-6 py-12 md:px-10 md:py-16">
        <Link
          href="/automations/templates"
          className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Templates
        </Link>

        <p className="mt-6 text-xs uppercase tracking-widest text-muted-foreground">
          Novo template
        </p>
        <h1 className="mt-3 text-4xl font-medium leading-[1.05] tracking-tight md:text-5xl">
          Submeter à{' '}
          <span className="font-serif italic font-normal text-primary">Meta.</span>
        </h1>
        <p className="mt-4 text-muted-foreground md:text-lg">
          A Meta valida nome único por idioma, conteúdo sem promoção exagerada, e categoria
          coerente. Aprovação geralmente em 1-24h.
        </p>

        <section className="mt-12 rounded-2xl border border-border/60 bg-card/40 p-6 md:p-8">
          <NewTemplateForm />
        </section>

        <section className="mt-8 rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-6">
          <p className="text-sm font-medium">Boas práticas pra aprovar de primeira</p>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            <li>· <strong>Nome:</strong> snake_case, descreve a função (ex: <code>confirma_pedido</code>).</li>
            <li>· <strong>Marketing</strong> só pra promoção/comunicação ativa de marca.</li>
            <li>· <strong>Utility</strong> pra confirmações, alertas, lembretes transacionais.</li>
            <li>· <strong>Authentication</strong> só pra códigos OTP (2FA).</li>
            <li>· Use <code>{'{{1}}'}</code>, <code>{'{{2}}'}</code> pra parâmetros dinâmicos no body.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
