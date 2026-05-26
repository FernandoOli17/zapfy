import { Suspense } from 'react';
import Link from 'next/link';

import { ResetPasswordForm } from './reset-form';

export const metadata = { title: 'Redefinir senha' };

export default function ResetPasswordPage() {
  return (
    <div>
      <h1 className="text-3xl font-semibold leading-tight tracking-tight md:text-[34px]">
        Defina sua{' '}
        <span className="font-serif italic font-normal text-primary">nova senha</span>
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Escolha algo forte que você lembre. A gente nunca vê.
      </p>
      <div className="mt-8">
        <Suspense fallback={<div className="text-sm text-muted-foreground">Carregando…</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
      <p className="mt-8 text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary hover:text-primary/80">
          Voltar pro login
        </Link>
      </p>
    </div>
  );
}
