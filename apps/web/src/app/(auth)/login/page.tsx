import Link from 'next/link';

import { LoginForm } from './login-form';

export const metadata = { title: 'Entrar' };

export default function LoginPage() {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Bem-vindo</p>
      <h1 className="mt-3 text-4xl font-medium leading-[1.05] tracking-tight">
        Entrar no{' '}
        <span className="font-serif italic font-normal text-primary">ZapAI.</span>
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Use e-mail e senha, Google, ou peça um link mágico.
      </p>
      <div className="mt-8">
        <LoginForm />
      </div>
      <p className="mt-8 text-sm text-muted-foreground">
        Não tem conta?{' '}
        <Link href="/signup" className="text-foreground underline-offset-4 hover:underline">
          Criar agora
        </Link>
      </p>
    </div>
  );
}
