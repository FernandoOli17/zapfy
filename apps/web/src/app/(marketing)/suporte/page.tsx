import { Suspense } from 'react';
import { Mail, MessageSquare, Clock } from 'lucide-react';

import { SupportForm } from './support-form';

export const metadata = {
  title: 'Suporte',
  description:
    'Fale com a gente. Time pequeno, resposta direta — geralmente em algumas horas no horário comercial.',
};

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-28 pb-20">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#00E676]">
            Suporte
          </p>
          <h1 className="mt-4 text-5xl font-bold leading-tight tracking-tight text-white md:text-6xl">
            Fala com a{' '}
            <span className="font-serif italic font-normal text-[#00E676]">gente.</span>
          </h1>
          <p className="mt-5 max-w-xl mx-auto text-base leading-relaxed text-[#888]">
            Time pequeno, resposta direta. Sem atendente bot, sem &quot;abra um chamado nível 2&quot;.
            Quem responde é quem construiu.
          </p>
        </div>

        {/* Stats trio */}
        <div className="mt-10 grid grid-cols-3 gap-3">
          <Stat icon={Clock} label="Resposta em" value="~3h" />
          <Stat icon={MessageSquare} label="Atende em" value="pt-BR" />
          <Stat icon={Mail} label="Quem responde" value="o time" />
        </div>

        {/* Form */}
        <div className="mt-12 rounded-2xl border border-[#1a1a1a] bg-[#111] p-8">
          <h2 className="text-xl font-semibold tracking-tight text-white">
            Abra um ticket
          </h2>
          <p className="mt-1 text-sm text-[#888]">
            Você recebe o número do ticket por email e responde direto pelo Gmail —
            ou na sua área logada se já tem conta.
          </p>

          <div className="mt-6">
            <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-[#0d0d0d]" />}>
              <SupportForm />
            </Suspense>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <InfoCard
            title="Já tem conta?"
            body="Acesse seu dashboard → menu lateral → Suporte. Lá você vê histórico de todos os tickets e responde sem precisar de email."
          />
          <InfoCard
            title="Prefere email direto?"
            body="Pode mandar pra supportezapfy@gmail.com — vira ticket automaticamente."
          />
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[#1a1a1a] bg-[#0d0d0d] p-4 text-center">
      <Icon className="mx-auto h-5 w-5 text-[#00E676]" strokeWidth={1.75} />
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
      <p className="text-[11px] text-[#666]">{label}</p>
    </div>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-[#1a1a1a] bg-[#0d0d0d] p-5">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-[#888]">{body}</p>
    </div>
  );
}
