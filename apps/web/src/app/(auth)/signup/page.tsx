import { Suspense } from 'react';
import Link from 'next/link';

import { SignupForm } from './signup-form';

export const metadata = { title: 'Criar conta' };

// `useSearchParams()` no SignupForm (lê ?next= e ?email= do convite) exige
// Suspense boundary em Next.js 15+.
function SignupFormSkeleton() {
  return <div className="h-[360px] animate-pulse rounded-lg bg-muted/40" />;
}

export default function SignupPage() {
  return (
    <div>
      <h1 className="text-3xl font-semibold leading-tight tracking-tight md:text-[34px]">
        Criar{' '}
        <span className="font-serif italic font-normal text-primary">conta</span>
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Crie sua conta e converse com o Forge em minutos.
      </p>
      <div className="mt-8">
        <Suspense fallback={<SignupFormSkeleton />}>
          <SignupForm />
        </Suspense>
      </div>
      <p className="mt-8 text-sm text-muted-foreground">
        Já tem conta?{' '}
        <Link href="/login" className="font-medium text-primary hover:text-primary/80">
          Entrar
        </Link>
      </p>
    </div>
  );
}
