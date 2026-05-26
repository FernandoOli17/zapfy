import Link from 'next/link';
import { ArrowLeft, Lightbulb } from 'lucide-react';

import { NewTemplateForm } from './new-template-form';

export const metadata = { title: 'Novo template HSM' };

export default function NewTemplatePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8 md:px-10 md:py-10">
      <Link
        href="/automations/templates"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar para templates
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">
        Novo template HSM
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        A Meta valida nome único por idioma, conteúdo sem promoção exagerada, e categoria
        coerente. Aprovação geralmente em 1-24h.
      </p>

      <section className="mt-6 rounded-xl border border-border bg-card p-6 md:p-8">
        <NewTemplateForm />
      </section>

      <section className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <Lightbulb className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">Boas práticas pra aprovar de primeira</p>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              <li>
                <strong className="text-foreground">Nome:</strong> snake_case, descreve a função (ex:{' '}
                <code className="font-mono text-foreground">confirma_pedido</code>).
              </li>
              <li>
                <strong className="text-foreground">Marketing</strong> só pra promoção/comunicação
                ativa de marca.
              </li>
              <li>
                <strong className="text-foreground">Utility</strong> pra confirmações, alertas,
                lembretes transacionais.
              </li>
              <li>
                <strong className="text-foreground">Authentication</strong> só pra códigos OTP
                (2FA).
              </li>
              <li>
                Use <code className="font-mono text-foreground">{'{{1}}'}</code>,{' '}
                <code className="font-mono text-foreground">{'{{2}}'}</code> pra parâmetros
                dinâmicos no body.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
