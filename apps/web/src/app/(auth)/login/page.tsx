import Link from 'next/link';

import { LoginForm } from './login-form';

export const metadata = { title: 'Entrar' };

export default function LoginPage() {
  return (
    <div>
      <h1 className="text-3xl font-semibold leading-tight tracking-tight md:text-[34px]">
        Entrar no{' '}
        <span className="font-serif italic font-normal text-primary">Orbe</span>
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Use e-mail e senha, Google, ou peça um link mágico.
      </p>
      <div className="mt-8">
        <LoginForm />
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
