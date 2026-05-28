import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { prisma } from '@zapfy/db';

import { requireWorkspace } from '@/lib/inbox';

import { ContactForm } from '../../contact-form';

export const metadata = { title: 'Editar contato' };
export const dynamic = 'force-dynamic';

export default async function EditContactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { workspace, member } = await requireWorkspace();
  if (member.role !== 'OWNER' && member.role !== 'ADMIN') {
    redirect('/contacts');
  }

  const contact = await prisma.contact.findFirst({
    where: { id, workspaceId: workspace.id, deletedAt: null },
  });
  if (!contact) notFound();

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
        Editar contato
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Alterações ficam logadas em audit. Telefone único por workspace.
      </p>

      <div className="mt-6 rounded-xl border border-border bg-card p-6 md:p-8">
        <ContactForm
          mode="edit"
          initial={{
            id: contact.id,
            phone: contact.phoneE164,
            name: contact.name ?? '',
            email: contact.email ?? '',
            tagsCsv: contact.tags.join(', '),
            optedOut: contact.optedOut,
          }}
        />
      </div>
    </div>
  );
}
