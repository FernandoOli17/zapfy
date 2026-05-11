import Link from 'next/link';
import { ArrowRight, MessageSquare, Sparkles } from 'lucide-react';
import { Button } from '@zapai/ui';

import { ThemeToggle } from '@/components/theme-toggle';

const VERTICALS = [
  'E-commerce',
  'Clínicas',
  'Restaurantes',
  'Infoproduto',
  'Serviços',
  'Educação',
  'Imobiliário',
  'B2B',
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Header />
      <Hero />
      <Verticals />
      <HowItWorks />
      <ForgeSection />
      <FinalCta />
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-block h-2 w-2 rounded-full bg-primary" aria-hidden />
          ZapAI
        </Link>
        <nav className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">
              Criar conta
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="bg-radial-fade absolute inset-0 -z-10" aria-hidden />
      <div className="bg-dot-grid absolute inset-0 -z-10 opacity-40" aria-hidden />

      <div className="mx-auto max-w-6xl px-6 pt-20 pb-24 md:pt-32 md:pb-40">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/40 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground backdrop-blur">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
          </span>
          Agente IA · WhatsApp Business
        </div>

        <h1 className="mt-8 max-w-[18ch] text-[clamp(2.75rem,8.5vw,7.5rem)] font-medium leading-[0.95] tracking-[-0.04em]">
          O WhatsApp da sua empresa,{' '}
          <span className="font-serif italic font-normal text-primary">
            com cérebro próprio.
          </span>
        </h1>

        <p className="mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground md:text-xl">
          Conecte ao WhatsApp Business via Cloud API oficial da Meta e ganhe um agente IA
          que vende, agenda e atende 24/7. Você configura tudo{' '}
          <span className="text-foreground">conversando com outra IA</span> — sem formulário,
          sem dashboard cheio de switch.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Button asChild size="lg" className="h-12 px-6 text-base">
            <Link href="/signup">
              Criar meu agente em 5 min
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="lg" className="h-12 px-5 text-base">
            <Link href="#como-funciona">Ver como funciona</Link>
          </Button>
        </div>

        <div className="mt-20 grid max-w-3xl grid-cols-1 gap-8 border-t border-border/60 pt-10 sm:grid-cols-3">
          <Stat number="5min" label="pra publicar o primeiro agente" />
          <Stat number="24/7" label="atendendo sem perder o tom" />
          <Stat number="0" label="formulários, só conversa" />
        </div>
      </div>
    </section>
  );
}

function Stat({ number, label }: { number: string; label: string }) {
  return (
    <div>
      <div className="text-4xl font-medium tracking-tight md:text-5xl">{number}</div>
      <div className="mt-2 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function Verticals() {
  return (
    <section className="border-y border-border/60 bg-secondary/20 py-12">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Pra qualquer negócio</p>
        <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 text-xl md:text-2xl">
          {VERTICALS.map((v, i) => (
            <span key={v} className="flex items-center gap-8">
              <span className="font-medium tracking-tight">{v}</span>
              {i < VERTICALS.length - 1 && (
                <span className="text-muted-foreground/40" aria-hidden>
                  ·
                </span>
              )}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="como-funciona" className="py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-12 md:grid-cols-[1fr_2fr] md:gap-20">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Como funciona
            </p>
            <h2 className="mt-4 text-4xl font-medium leading-tight tracking-tight md:text-6xl">
              Três passos.{' '}
              <span className="font-serif italic font-normal text-muted-foreground">
                Sem trapaça.
              </span>
            </h2>
          </div>
          <div className="space-y-12">
            <Step
              n="01"
              title="Você conta seu negócio"
              body="Numa conversa em pt-BR, o Forge entrevista você. Detecta seu vertical (e-com, clínica, restaurante, infoproduto, serviço), entende o tom da marca, qual o objetivo do atendimento e o que ele nunca pode dizer."
            />
            <Step
              n="02"
              title="Ele monta o agente"
              body="System prompt, personalidade, tools por vertical, regras de handoff humano, horários de atendimento, base de conhecimento. Tudo gerado, versionado e com rollback. Você revisa, refina pedindo em linguagem natural e publica."
            />
            <Step
              n="03"
              title="Liga no WhatsApp"
              body="Conecte seu WhatsApp Business via Cloud API oficial da Meta. Ele já começa a atender. Quando vira um pedido complexo, passa pro time. Quando precisa mudar algo, você só conversa de novo com o Forge."
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-6 border-t border-border/60 pt-8">
      <div className="font-serif text-3xl italic text-primary md:text-4xl">{n}</div>
      <div>
        <h3 className="text-2xl font-medium tracking-tight md:text-3xl">{title}</h3>
        <p className="mt-3 text-muted-foreground md:text-lg">{body}</p>
      </div>
    </div>
  );
}

function ForgeSection() {
  return (
    <section className="relative overflow-hidden border-y border-border/60 bg-secondary/20 py-32">
      <div className="bg-radial-fade absolute inset-0 -z-10" aria-hidden />
      <div className="mx-auto max-w-5xl px-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-primary">
          <Sparkles className="h-3 w-3" />O moat
        </div>
        <h2 className="mt-8 text-5xl font-medium leading-[1.05] tracking-tight md:text-7xl">
          O segredo não é a IA que atende.{' '}
          <span className="font-serif italic font-normal text-primary">
            É a IA que constrói a IA que atende.
          </span>
        </h2>
        <div className="mt-12 grid gap-8 md:grid-cols-2 md:gap-16">
          <p className="text-lg leading-relaxed text-muted-foreground md:text-xl">
            Outros SaaS te dão um formulário de 40 campos pra preencher antes de funcionar.
            Aqui você conversa com o <strong className="text-foreground">Forge</strong>, e ele
            entrevista seu negócio do jeito que um consultor faria.
          </p>
          <p className="text-lg leading-relaxed text-muted-foreground md:text-xl">
            Quando quiser ajustar — "deixa ela menos vendedora", "se perguntarem horário, manda
            esse texto" —{' '}
            <strong className="text-foreground">você só conversa</strong>. O Forge aplica o
            patch, versiona, e o agente já fala diferente.
          </p>
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="py-32">
      <div className="mx-auto max-w-5xl px-6 text-center">
        <h2 className="text-5xl font-medium leading-[1.05] tracking-tight md:text-7xl">
          Seu primeiro agente em{' '}
          <span className="font-serif italic font-normal text-primary">5 minutos.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground md:text-xl">
          7 dias grátis. Sem cartão. Sem ligação de vendas. Se não gostar, cancela em um clique.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="h-12 px-6 text-base">
            <Link href="/signup">
              Criar conta grátis
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-12 px-5 text-base">
            <Link href="/contato">
              <MessageSquare className="mr-2 h-4 w-4" />
              Falar com a gente
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/60 py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="flex items-center gap-2 text-sm">
            <span className="inline-block h-2 w-2 rounded-full bg-primary" aria-hidden />
            <span className="font-semibold tracking-tight">ZapAI</span>
            <span className="text-muted-foreground">— WhatsApp com cérebro próprio</span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href="/precos" className="hover:text-foreground">
              Preços
            </Link>
            <Link href="/termos" className="hover:text-foreground">
              Termos
            </Link>
            <Link href="/privacidade" className="hover:text-foreground">
              Privacidade
            </Link>
            <Link href="/lgpd" className="hover:text-foreground">
              LGPD
            </Link>
            <Link href="/contato" className="hover:text-foreground">
              Contato
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
