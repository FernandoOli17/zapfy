import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { prisma } from '@zapai/db';

import { auth } from '@/lib/auth';

import { OnboardingForm } from './onboarding-form';

export const metadata = { title: 'Criar workspace' };

export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect('/login');
  }

  const existing = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    include: { workspace: true },
  });
  if (existing?.workspace) {
    redirect(`/dashboard`);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight">Crie seu workspace</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cada empresa tem um workspace separado. Você pode criar mais depois.
        </p>
        <div className="mt-8">
          <OnboardingForm />
        </div>
      </div>
    </main>
  );
}
