'use client';

import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: 'Qual a diferença entre os planos Starter, Pro e Premium?',
    answer:
      'Starter (R$97/mês) é pra começar: 1 número WhatsApp, 1 usuário, 1.000 conversas IA por mês, 10 documentos no RAG. Pro (R$297/mês) é pra time pequeno: 3 números, 5 usuários, 10.000 conversas, tools customizadas, webhooks de saída e integração com Google Calendar. Premium (R$697/mês) é ilimitado em tudo, mais API pública (REST + webhooks), SLA de uptime, onboarding assistido e Slack compartilhado com o time.',
  },
  {
    question: 'Como funciona a configuração do agente IA?',
    answer:
      'Você conversa com o Forge — outro agente IA que entrevista seu negócio. Ele detecta seu vertical (e-commerce, clínica, restaurante, infoproduto, serviço), pergunta sobre objetivos, tom de voz, tools necessárias e regras de handoff. No fim, monta o system prompt, configura tools por vertical e publica a v1 do seu agente. Sem formulário gigante, sem dashboard cheio de switch. Em torno de 5 minutos.',
  },
  {
    question: 'Preciso ter Meta Business verificado?',
    answer:
      'Sim. Usamos exclusivamente a Cloud API oficial da Meta (sem libs não-oficiais como whatsapp-web.js). Pra isso você precisa de um Meta App configurado e número WhatsApp Business. A gente te guia passo a passo no onboarding, mas a verificação Meta é responsabilidade sua — leva normalmente de algumas horas a 2 dias úteis.',
  },
  {
    question: 'Existe garantia de devolução?',
    answer:
      'Sim. 7 dias grátis sem cartão de crédito, e após assinar você tem 7 dias pra pedir reembolso total no plano mensal ou 30 dias no plano anual. Cancelamento em um clique a qualquer momento — sem ligação pra atendente, sem retenção forçada.',
  },
  {
    question: 'Em quanto tempo a IA responde?',
    answer:
      'Tempo médio < 2 segundos. Usamos Claude Haiku 4.5 como classificador rápido pra triagem e Claude Sonnet 4.5 pro raciocínio do agente. Prompt caching da Anthropic garante latência baixa em conversas longas. RAG via Voyage AI embeddings (1024 dims) no Postgres com pgvector.',
  },
  {
    question: 'Como vocês protegem meus dados?',
    answer:
      'Tokens da Meta Cloud API ficam cifrados em AES-256-GCM com IV único por registro e auth tag verificada. Telefones são hasheados (SHA-256 + salt) em logs estruturados — zero PII em texto plano nos logs. Postgres do Railway com TDE at-rest. LGPD-friendly: endpoints de export, delete e opt-out por contato. Soft delete em entidades sensíveis com hard delete agendado em 30 dias.',
  },
  {
    question: 'Posso conectar meu CRM, ERP ou ferramenta interna?',
    answer:
      'No plano Pro e Premium você tem webhooks de saída pra notificar seus sistemas (CRM, ERP, planilha, qualquer endpoint HTTP). Premium ainda tem API pública pra puxar dados do Zapfy ou empurrar contatos/mensagens. Tools customizadas no agente IA (Pro+) chamam qualquer endpoint seu durante a conversa — perfeito pra consultar estoque, criar pedido, agendar consulta, etc.',
  },
  {
    question: 'Posso treinar o agente com meus próprios documentos?',
    answer:
      'Sim. Você sobe PDFs, links ou texto direto na base de conhecimento. A gente chunka, gera embeddings via Voyage AI e indexa no Postgres pgvector. O agente busca no RAG automaticamente quando precisa (não em toda mensagem — só quando faz sentido). Starter inclui 10 documentos, Pro 100, Premium ilimitado.',
  },
  {
    question: 'Como funciona o handoff pra humano?',
    answer:
      'O agente IA tem regra de handoff configurável no Forge: por palavra-chave (cliente fala "atendente"), por sentimento negativo detectado, por categoria de pergunta (jurídico, reembolso, etc.) ou manualmente via Inbox. Quando ativa, a conversa vai pra fila da equipe, IA para de responder e mostra contexto completo + sugestão de resposta pro humano. Humano pode devolver pra IA a qualquer momento.',
  },
  {
    question: 'Quais verticais vocês cobrem hoje?',
    answer:
      'Temos playbooks prontos pra e-commerce, clínicas, restaurantes, infoproduto e serviços. Cada playbook traz prompt-base, tools típicas (consultar pedido, agendar consulta, ver cardápio, etc.) e regras de handoff. Verticais novos rodam com playbook genérico — o Forge se adapta. Se seu vertical não está coberto, manda mensagem pra gente que avaliamos prioridade no roadmap.',
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
