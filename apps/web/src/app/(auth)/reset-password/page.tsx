import { Suspense } from 'react';
import Link from 'next/link';

import { ResetPasswordForm } from './reset-form';

export const metadata = { title: 'Redefinir senha' };

export default function ResetPasswordPage() {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Nova senha</p>
      <h1 className="mt-3 text-4xl font-medium leading-[1.05] tracking-tight">
        Defina sua{' '}
        <span className="font-serif italic font-normal text-primary">nova senha.</span>
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Escolha algo forte que você lembre. A gente nunca vê.
      </p>
      <div className="mt-8">
        <Suspense fallback={<div className="text-sm text-muted-foreground">Carregando…</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
      <p className="mt-8 text-sm text-muted-foreground">
        <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
          Voltar pro login
        </Link>
      </p>
    </div>
  );
}
