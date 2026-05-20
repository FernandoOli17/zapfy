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
    <div className="mx-auto max-w-xl px-6 py-12 md:px-10 md:py-16">
      <Link
        href="/contacts"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Contatos
      </Link>
      <h1 className="mt-4 text-3xl font-medium leading-[1.1] tracking-tight md:text-4xl">
        Novo{' '}
        <span className="font-serif italic font-normal text-primary">contato.</span>
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Adicione manualmente. Normalmente contatos viram automáticos quando recebem mensagem,
        mas dá pra cadastrar à mão pra broadcasts e CRM.
      </p>

      <div className="mt-8">
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
