import Link from 'next/link';

import { SignupForm } from './signup-form';

export const metadata = { title: 'Criar conta' };

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
        <SignupForm />
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
