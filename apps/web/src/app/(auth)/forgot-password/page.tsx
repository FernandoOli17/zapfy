import Link from 'next/link';

import { ForgotPasswordForm } from './forgot-form';

export const metadata = { title: 'Esqueci minha senha' };

export default function ForgotPasswordPage() {
  return (
    <div>
      <h1 className="text-3xl font-semibold leading-tight tracking-tight md:text-[34px]">
        Esqueceu a{' '}
        <span className="font-serif italic font-normal text-primary">senha?</span>
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Informe seu e-mail e a gente envia um link pra você definir uma nova.
      </p>
      <div className="mt-8">
        <ForgotPasswordForm />
      </div>
      <p className="mt-8 text-sm text-muted-foreground">
        Lembrou a senha?{' '}
        <Link href="/login" className="font-medium text-primary hover:text-primary/80">
          Voltar pro login
        </Link>
      </p>
    </div>
  );
}
