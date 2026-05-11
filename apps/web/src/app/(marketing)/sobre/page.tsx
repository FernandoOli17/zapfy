import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@zapai/ui';

export const metadata = {
  title: 'Sobre',
  description: 'O ZapAI nasce de uma irritação simples: por que configurar um agente IA tem que parecer planilha?',
};

const PRINCIPLES = [
  {
    title: 'Conversa, não formulário.',
    body: 'Se o cliente final do nosso cliente conversa via WhatsApp, faz sentido que o cliente configure o agente conversando também. Formulário é desistir antes de tentar.',
  },
  {
    title: 'Versionado, sempre.',
    body: 'Toda mudança no agente é uma versão nova. Rollback em um clique. A IA não fala diferente sem você saber por quê.',
  },
  {
    title: 'A IA admite quando não sabe.',
    body: 'Política de não-invenção é guardrail de código, não de prompt. Quando o RAG não tem resposta, o agente oferece humano. Nada de chutar pra parecer que sabe.',
  },
  {
    title: 'LGPD é feature, não checkbox.',
    body: 'Endpoints de export, delete e opt-out funcionam de verdade. Tokens da Meta cifrados at-rest. Audit log de tudo. Privacidade vira diferencial competitivo, não compliance defensivo.',
  },
  {
    title: 'Falar bem em pt-BR.',
    body: 'Built no Brasil, pra quem atende em português. O Forge entende "moço, dá um desconto" e o agente responde no tom certo. Tradução de software gringo não capta isso.',
  },
  {
    title: 'Sem dark pattern.',
    body: 'Cancelamento em um clique no portal Stripe. Preço previsível. Limites avisados em 80%. Trial sem cartão. Nada de letrinha miúda.',
  },
];

export default function SobrePage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="bg-radial-fade absolute inset-0 -z-10" aria-hidden />
        <div className="mx-auto max-w-4xl px-6 pt-20 pb-12 md:pt-28 md:pb-16">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Sobre</p>
          <h1 className="mt-4 text-5xl font-medium leading-[1.05] tracking-tight md:text-7xl">
            A gente acha que SaaS de IA{' '}
            <span className="font-serif italic font-normal text-primary">deveria conversar.</span>
          </h1>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-3xl px-6 space-y-7 text-lg leading-relaxed text-muted-foreground md:text-xl">
          <p>
            <span className="text-foreground">Toda ferramenta de IA pro WhatsApp começa igual:</span>{' '}
            você cria conta, abre um dashboard com 40 campos, switches, dropdowns, e tem que adivinhar
            o que cada um faz. Vertical? Tom de voz? Tools? Knowledge base? Handoff rules? Você vai
            ler doc enquanto tá perdendo cliente.
          </p>
          <p>
            <span className="text-foreground">Não tem que ser assim.</span> Se a IA já consegue
            atender seu cliente, ela consegue te entrevistar e gerar a configuração inteira. A gente
            chamou esse entrevistador de <strong className="text-foreground">Forge</strong>: ele
            pergunta o que importa, classifica seu negócio, propõe o agente, e te deixa refinar em
            linguagem natural ("seja menos vendedor", "se perguntarem horário, mande esse texto").
          </p>
          <p>
            O agente que sai daí é versionado, com rollback, e conectado ao WhatsApp Business via
            Cloud API oficial da Meta. Atende 24/7, passa pra humano quando precisa, fala como sua
            marca fala.
          </p>
          <p>
            <span className="text-foreground">Isso é o ZapAI.</span>
          </p>
        </div>
      </section>

      <section className="border-t border-border/60 bg-secondary/20 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">No que acreditamos</p>
          <h2 className="mt-3 text-3xl font-medium tracking-tight md:text-5xl">
            Seis princípios que pautam{' '}
            <span className="font-serif italic font-normal text-muted-foreground">cada decisão.</span>
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-2 md:gap-x-12">
            {PRINCIPLES.map((p, i) => (
              <div key={p.title} className="border-t border-border/60 pt-6">
                <div className="font-serif text-2xl italic text-primary">{(i + 1).toString().padStart(2, '0')}</div>
                <h3 className="mt-3 text-xl font-medium tracking-tight">{p.title}</h3>
                <p className="mt-2 text-muted-foreground">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Quem faz</p>
          <h2 className="mt-3 text-3xl font-medium tracking-tight md:text-4xl">
            Pequeno e{' '}
            <span className="font-serif italic font-normal text-muted-foreground">obsessivo.</span>
          </h2>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
            ZapAI é construído por um time enxuto no Brasil, com obsessão por qualidade de produto
            e atendimento. Cada feature passa pelo crivo de "isso melhora um único atendimento real"
            antes de virar release.
          </p>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            Quer trabalhar com a gente, sugerir algo, ou só dar oi?{' '}
            <Link href="/contato" className="text-foreground underline-offset-4 hover:underline">
              Manda um e-mail
            </Link>.
          </p>
        </div>
      </section>

      <section className="border-t border-border/60 py-20 md:py-28">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-4xl font-medium tracking-tight md:text-6xl">
            Bora{' '}
            <span className="font-serif italic font-normal text-primary">conversar?</span>
          </h2>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="h-12 px-6 text-base">
              <Link href="/signup">
                Criar conta grátis <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-5 text-base">
              <Link href="/precos">Ver preços</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
