import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { auth } from '@/lib/auth';
import { NewTicketForm } from './new-ticket-form';

export const metadata = { title: 'Novo ticket' };
export const dynamic = 'force-dynamic';

export default async function NewTicketPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 md:px-10 md:py-10">
      <Link
        href="/support"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">
        Abrir ticket
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Conta o que está rolando. Quanto mais detalhe (prints, mensagem de erro, passo
        a passo), mais rápido a gente resolve.
      </p>

      <div className="mt-8 rounded-2xl border border-border bg-card p-6">
        <NewTicketForm
          defaultName={session.user.name ?? ''}
          defaultEmail={session.user.email}
        />
      </div>
    </div>
  );
}
