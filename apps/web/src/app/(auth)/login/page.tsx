import { Suspense } from 'react';
import Link from 'next/link';

import { LoginForm } from './login-form';

export const metadata = { title: 'Entrar' };

// `useSearchParams()` no LoginForm exige Suspense boundary em Next.js 15+
// pra permitir prerender estático da página. Sem isso, o build quebra com
// "useSearchParams() should be wrapped in a suspense boundary".
export default function LoginPage() {
  return (
    <div>
      <h1 className="text-3xl font-semibold leading-tight tracking-tight md:text-[34px]">
        Entrar no{' '}
        <span className="font-serif italic font-normal text-primary">Trato</span>
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Use e-mail e senha, Google, ou peça um link mágico.
      </p>
      <div className="mt-8">
        <Suspense fallback={<LoginFormSkeleton />}>
          <LoginForm />
        </Suspense>
      </div>
      <p className="mt-8 text-sm text-muted-foreground">
        Não tem conta?{' '}
        <Link href="/signup" className="font-medium text-primary hover:text-primary/80">
          Criar agora
        </Link>
      </p>
    </div>
  );
}

function LoginFormSkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-4">
        <div className="h-16 animate-pulse rounded-md bg-muted/30" />
        <div className="h-16 animate-pulse rounded-md bg-muted/30" />
        <div className="h-11 animate-pulse rounded-md bg-muted/30" />
      </div>
    </div>
  );
}
