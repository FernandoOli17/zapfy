import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { prisma } from '@zapai/db';

import { auth } from '@/lib/auth';

export const metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  const member = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    include: { workspace: { include: { subscription: true } } },
    orderBy: { createdAt: 'asc' },
  });

  if (!member) redirect('/onboarding');

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">
        Bem-vindo ao {member.workspace.name}
      </h1>
      <p className="text-sm text-muted-foreground mt-2">
        Plano: <strong>{member.workspace.subscription?.plan ?? 'STARTER'}</strong> · Status:{' '}
        <strong>{member.workspace.subscription?.status ?? 'TRIALING'}</strong>
      </p>

      <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <DashCard
          title="Configurar agente"
          description="Converse com o Forge pra montar seu agente IA."
          cta="Abrir Forge (Fase 3)"
        />
        <DashCard
          title="Conectar WhatsApp"
          description="Cole as credenciais do seu Meta App pra começar a atender."
          cta="Conectar (Fase 4)"
        />
        <DashCard
          title="Inbox"
          description="Conversas em tempo real, com IA e humanos."
          cta="Abrir inbox (Fase 6)"
        />
      </div>
    </div>
  );
}

function DashCard({
  title,
  description,
  cta,
}: {
  title: string;
  description: string;
  cta: string;
}) {
  return (
    <div className="rounded-lg border bg-card text-card-foreground p-6">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
      <p className="text-xs text-muted-foreground mt-3">{cta}</p>
    </div>
  );
}
