import Link from 'next/link';

import { SignupForm } from './signup-form';

export const metadata = { title: 'Criar conta' };

export default function SignupPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Criar conta no ZapAI</h1>
      <p className="text-sm text-muted-foreground mt-1">
        7 dias grátis. Sem cartão. Configure seu agente conversando com o Forge.
      </p>
      <div className="mt-8">
        <SignupForm />
      </div>
      <p className="text-sm text-muted-foreground mt-6">
        Já tem conta?{' '}
        <Link href="/login" className="text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
