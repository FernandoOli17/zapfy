import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { prisma, TemplateStatus } from '@zapai/db';

import { requireWorkspace } from '@/lib/inbox';

import { NewBroadcastForm } from './new-broadcast-form';

export const metadata = { title: 'Novo broadcast' };
export const dynamic = 'force-dynamic';

export default async function NewBroadcastPage() {
  const { workspace, member } = await requireWorkspace();
  if (member.role !== 'OWNER' && member.role !== 'ADMIN') {
    redirect('/automations/broadcasts');
  }

  const [templates, allTags] = await Promise.all([
    prisma.messageTemplate.findMany({
      where: { workspaceId: workspace.id, status: TemplateStatus.APPROVED },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, language: true, category: true },
    }),
    prisma.contact.findMany({
      where: { workspaceId: workspace.id, deletedAt: null },
      select: { tags: true },
    }),
  ]);

  const tagSet = new Set<string>();
  for (const c of allTags) for (const t of c.tags) tagSet.add(t);
  const tags = [...tagSet].sort();

  const totalContacts = await prisma.contact.count({
    where: { workspaceId: workspace.id, deletedAt: null, optedOut: false },
  });

  return (
    <div className="mx-auto max-w-2xl px-6 py-12 md:px-10 md:py-16">
      <Link
        href="/automations/broadcasts"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Broadcasts
      </Link>
      <h1 className="mt-4 text-3xl font-medium leading-[1.1] tracking-tight md:text-4xl">
        Novo{' '}
        <span className="font-serif italic font-normal text-primary">broadcast.</span>
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Disparo em massa pra contatos elegíveis. Opt-out e contatos deletados são ignorados.
      </p>

      <div className="mt-8">
        {templates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 p-8 text-center">
            <p className="font-medium">Nenhum template aprovado.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Você precisa de pelo menos um template HSM com status APPROVED pra criar um
              broadcast.
            </p>
            <Link
              href="/automations/templates/new"
              className="mt-4 inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Criar template
            </Link>
          </div>
        ) : (
          <NewBroadcastForm
            templates={templates}
            tags={tags}
            totalContacts={totalContacts}
          />
        )}
      </div>
    </div>
  );
}
