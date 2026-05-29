'use client';

import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: 'Posso testar antes de pagar?',
    answer:
      'Sim. O Forge monta o seu agente e te mostra funcionando de graça, sem cartão. Você só assina quando ver que vale a pena — e ainda tem 7 dias de garantia depois.',
  },
  {
    question: 'Por que não tem uma conta grátis pra sempre?',
    answer:
      'Porque agente de IA atendendo de verdade tem custo real. Em vez de um "grátis" limitado e capenga, a gente deixa você ver o agente completo funcionando antes de pagar, e cobre você com garantia. Mais honesto pra todo mundo.',
  },
  {
    question: 'O agente vai falar como um robô?',
    answer:
      'Não. O Forge aprende o tom do seu negócio na entrevista. O cliente sente que está falando com alguém da sua equipe.',
  },
  {
    question: 'Preciso saber programar ou configurar fluxo?',
    answer:
      'Não. O Forge entrevista você e monta tudo. Você só conecta o WhatsApp quando assinar.',
  },
  {
    question: 'Como conecto o meu número?',
    answer:
      'De forma simples e guiada, direto no painel. Em poucos minutos seu agente está no ar.',
  },
  {
    question: 'O agente passa pra mim quando precisa?',
    answer:
      'Sim. Você define quando ele deve te chamar, e ele transfere a conversa com todo o histórico.',
  },
  {
    question: 'O que conta como "conversa"?',
    answer:
      'Uma conversa é a interação contínua com um cliente. Mensagens trocadas dentro da mesma conversa não contam separado.',
  },
  {
    question: 'E os disparos de marketing?',
    answer:
      'Mensagens que você inicia (campanhas, promoções) usam um pacote de créditos transparente, cobrado à parte — assim você só paga pelo que dispara, sem surpresa na fatura.',
  },
  {
    question: 'E a garantia, como funciona?',
    answer:
      'Se em até 7 dias depois de assinar você achar que não é pra você, devolvemos. Sem letrinha miúda.',
  },
  {
    question: 'Tem fidelidade?',
    answer: 'Não. Cancele quando quiser.',
  },
  {
    question: 'Meus dados e dos meus clientes estão seguros?',
    answer: 'Sim. Seguimos as boas práticas de segurança e a LGPD.',
  },
];

export function MarketingFaq() {
  return (
    <section id="faq" className="border-t border-[#1a1a1a] bg-[#0a0a0a] py-32">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#00E676]">
            FAQ
          </p>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-white md:text-5xl">
            Restou alguma{' '}
            <span className="font-serif italic font-normal text-[#888]">dúvida?</span>
          </h2>
          <p className="mt-5 text-base text-[#888]">
            Respostas honestas. Sem letra miúda, sem rodeio comercial.
          </p>
        </div>

        <div className="mt-14 space-y-3">
          {FAQS.map((faq) => (
            <FaqItem key={faq.question} {...faq} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqItem({ question, answer }: FaqItem) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-[#111] transition-colors ${
        open ? 'border-[#00E676]/30' : 'border-[#1a1a1a] hover:border-[#1a1a1a]'
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-white/[0.02]"
      >
        <span className="pr-4 text-base font-medium text-white">{question}</span>
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 transition-colors ${
            open
              ? 'bg-[#00E676]/15 text-[#00E676] ring-[#00E676]/30'
              : 'bg-[#0a0a0a] text-[#00E676] ring-[#1a1a1a]'
          }`}
        >
          {open ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </span>
      </button>
      {open && (
        <div className="px-6 pb-5">
          <p className="text-sm leading-relaxed text-[#888]">{answer}</p>
        </div>
      )}
    </div>
  );
}
