import Link from 'next/link';

import { SignupForm } from './signup-form';

export const metadata = { title: 'Criar conta' };

export default function SignupPage() {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Comece grátis</p>
      <h1 className="mt-3 text-4xl font-medium leading-[1.05] tracking-tight">
        Criar{' '}
        <span className="font-serif italic font-normal text-primary">conta.</span>
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        7 dias grátis. Sem cartão. Sem ligação de vendas.
      </p>
      <div className="mt-8">
        <SignupForm />
      </div>
      <p className="mt-8 text-sm text-muted-foreground">
        Já tem conta?{' '}
        <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
