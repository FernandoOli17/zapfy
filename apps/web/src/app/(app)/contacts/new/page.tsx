import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { requireWorkspace } from '@/lib/inbox';

import { ContactForm } from '../contact-form';

export const metadata = { title: 'Novo contato' };

export default async function NewContactPage() {
  const { member } = await requireWorkspace();
  if (member.role !== 'OWNER' && member.role !== 'ADMIN') {
    redirect('/contacts');
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 md:px-10 md:py-10">
      <Link
        href="/contacts"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar para contatos
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">
        Novo contato
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Cadastre manualmente. Contatos costumam ser criados automaticamente quando alguém
        manda mensagem, mas dá pra adicionar à mão pra broadcasts e CRM.
      </p>

      <div className="mt-6 rounded-xl border border-border bg-card p-6 md:p-8">
        <ContactForm
          mode="create"
          initial={{
            phone: '',
            name: '',
            email: '',
            tagsCsv: '',
            optedOut: false,
          }}
        />
      </div>
    </div>
  );
}
