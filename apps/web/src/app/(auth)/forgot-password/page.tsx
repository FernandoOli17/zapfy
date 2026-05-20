import Link from 'next/link';

import { ForgotPasswordForm } from './forgot-form';

export const metadata = { title: 'Esqueci minha senha' };

export default function ForgotPasswordPage() {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Recuperar acesso</p>
      <h1 className="mt-3 text-4xl font-medium leading-[1.05] tracking-tight">
        Esqueceu a{' '}
        <span className="font-serif italic font-normal text-primary">senha?</span>
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Informe seu e-mail e a gente envia um link pra você definir uma nova.
      </p>
      <div className="mt-8">
        <ForgotPasswordForm />
      </div>
      <p className="mt-8 text-sm text-muted-foreground">
        Lembrou a senha?{' '}
        <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
          Voltar pro login
        </Link>
      </p>
    </div>
  );
}
