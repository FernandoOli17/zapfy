import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { prisma } from '@zapfy/db';

import { auth } from '@/lib/auth';

import { loadCurrentForgeSession } from './actions';
import { ForgeWorkspace } from './forge-workspace';

export const metadata = { title: 'Forge — Configurar agente' };
export const dynamic = 'force-dynamic';

export default async function ForgePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  const member = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    include: { workspace: { select: { id: true, developerModeEnabled: true } } },
    orderBy: { createdAt: 'asc' },
  });
  if (!member) redirect('/onboarding');

  const isAdmin = member.role === 'OWNER' || member.role === 'ADMIN';
  const showDevHandoff = member.workspace.developerModeEnabled && isAdmin;

  const state = await loadCurrentForgeSession();
  return <ForgeWorkspace initialState={state} showDevHandoff={showDevHandoff} />;
}
