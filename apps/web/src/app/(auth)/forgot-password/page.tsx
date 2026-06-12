import Link from 'next/link';

import { ForgotPasswordForm } from './forgot-form';

export const metadata = { title: 'Esqueci minha senha' };

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ revoked?: string }>;
}) {
  const { revoked } = await searchParams;
  return (
    <div>
      {revoked === '1' && (
        <div className="mb-6 rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
          Acesso bloqueado com sucesso — a sessão daquele dispositivo foi encerrada.
          Defina uma senha nova abaixo pra proteger sua conta.
        </div>
      )}
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
