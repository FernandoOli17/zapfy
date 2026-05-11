import Link from 'next/link';

import { LoginForm } from './login-form';

export const metadata = { title: 'Entrar' };

export default function LoginPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Entrar no ZapAI</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Use seu e-mail e senha, Google, ou peça um link mágico.
      </p>
      <div className="mt-8">
        <LoginForm />
      </div>
      <p className="text-sm text-muted-foreground mt-6">
        Não tem conta?{' '}
        <Link href="/signup" className="text-primary hover:underline">
          Criar agora
        </Link>
      </p>
    </div>
  );
}
