import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import { prisma } from '@zapai/db';

import { auth } from '@/lib/auth';
import { SignOutLink } from '@/components/sign-out-link';
import { ThemeToggle } from '@/components/theme-toggle';

import { OnboardingForm } from './onboarding-form';

export const metadata = { title: 'Criar workspace' };

export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect('/login');
  }

  const existing = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
  });
  if (existing) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="bg-radial-fade absolute inset-0 -z-10" aria-hidden />
      <div className="bg-dot-grid absolute inset-0 -z-10 opacity-30" aria-hidden />

      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-block h-2 w-2 rounded-full bg-primary" aria-hidden />
          ZapAI
        </Link>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="hidden sm:inline">{session.user.email}</span>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Passo 1 de 2</p>
        <h1 className="mt-4 text-5xl font-medium leading-[1.05] tracking-tight md:text-6xl">
          Crie seu{' '}
          <span className="font-serif italic font-normal text-primary">workspace.</span>
        </h1>
        <p className="mt-4 max-w-md text-muted-foreground md:text-lg">
          Cada empresa tem um workspace separado. Depois você convida o time, conecta o WhatsApp
          e conversa com o Forge pra montar o agente.
        </p>

        <div className="mt-12 rounded-xl border border-border/60 bg-card/40 p-6 backdrop-blur md:p-8">
          <OnboardingForm />
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          Você já está logado como <strong className="text-foreground">{session.user.email}</strong>.{' '}
          <SignOutLink className="underline-offset-4 hover:underline">Não é você?</SignOutLink>
        </p>
      </main>
    </div>
  );
}
