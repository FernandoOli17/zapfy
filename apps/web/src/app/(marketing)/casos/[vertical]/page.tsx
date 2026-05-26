import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@zapai/ui';

import { VERTICALS, VERTICAL_SLUGS, isVerticalSlug, type VerticalContent } from './content';

export function generateStaticParams() {
  return VERTICAL_SLUGS.map((vertical) => ({ vertical }));
}

interface PageProps {
  params: Promise<{ vertical: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { vertical } = await params;
  if (!isVerticalSlug(vertical)) return {};
  const v = VERTICALS[vertical];
  return {
    title: `${v.label} no WhatsApp com IA`,
    description: v.subtitle,
  };
}

export default async function CasoVerticalPage({ params }: PageProps) {
  const { vertical } = await params;
  if (!isVerticalSlug(vertical)) notFound();
  const content = VERTICALS[vertical];

  return (
    <>
      <Hero content={content} />
      <Pains content={content} />
      <ToolsAndConversation content={content} />
      <Roi content={content} />
      <Faq content={content} />
      <Cta />
      <OtherVerticals current={content.slug} />
    </>
  );
}

function Hero({ content }: { content: VerticalContent }) {
  return (
    <section className="relative overflow-hidden">
      <div className="bg-radial-fade absolute inset-0 -z-10" aria-hidden />
      <div className="bg-dot-grid absolute inset-0 -z-10 opacity-30" aria-hidden />
      <div className="mx-auto max-w-6xl px-6 pt-20 pb-16 md:pt-28 md:pb-24">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Caso · {content.label}
        </p>
        <h1 className="mt-4 max-w-[20ch] text-[clamp(2.5rem,7.5vw,6.5rem)] font-medium leading-[0.95] tracking-[-0.04em]">
          {content.titleLead}{' '}
          <span className="font-serif italic font-normal text-primary">
            {content.titleAccent}
          </span>
        </h1>
        <p className="mt-7 max-w-2xl text-lg text-muted-foreground md:text-xl">
          {content.subtitle}
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-3">
          <Button asChild size="lg" className="h-12 px-6 text-base">
            <Link href="/signup">
              Criar agente {content.label.toLowerCase()} <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="lg" className="h-12 px-5 text-base">
            <Link href="/precos">Ver planos</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function Pains({ content }: { content: VerticalContent }) {
  return (
    <section className="border-y border-border/60 bg-secondary/20 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">As dores</p>
        <h2 className="mt-3 text-3xl font-medium tracking-tight md:text-5xl">
          O que tá te queimando hoje,{' '}
          <span className="font-serif italic font-normal text-muted-foreground">e o que muda.</span>
        </h2>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {content.pains.map((p, i) => (
            <div key={p.title} className="border-t border-border/60 pt-6">
              <div className="font-serif text-2xl italic text-primary">
                {(i + 1).toString().padStart(2, '0')}
              </div>
              <h3 className="mt-3 text-xl font-medium tracking-tight">{p.title}</h3>
              <p className="mt-3 text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ToolsAndConversation({ content }: { content: VerticalContent }) {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-12 md:grid-cols-[1fr_1.2fr] md:gap-16">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Playbook</p>
            <h2 className="mt-3 text-3xl font-medium tracking-tight md:text-5xl">
              Tools que ele{' '}
              <span className="font-serif italic font-normal text-muted-foreground">já sabe usar.</span>
            </h2>
            <p className="mt-4 text-muted-foreground md:text-lg">
              No vertical de {content.label.toLowerCase()}, o Forge ativa essas tools por padrão.
              Você pode ligar e desligar cada uma conversando com ele.
            </p>
            <ul className="mt-8 space-y-3 text-sm">
              {content.tools.map((t) => (
                <li
                  key={t.name}
                  className="rounded-lg border border-border/60 bg-card/30 p-4 hover:border-primary/40 transition-colors"
                >
                  <code className="font-mono text-foreground">{t.name}()</code>
                  <p className="mt-1.5 text-muted-foreground">{t.description}</p>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Conversa real</p>
            <h3 className="mt-3 text-2xl font-medium tracking-tight md:text-3xl">
              Como soa{' '}
              <span className="font-serif italic font-normal text-muted-foreground">na prática.</span>
            </h3>
            <div className="mt-6 rounded-2xl border border-border/60 bg-card/40 p-5 md:p-6">
              <div className="space-y-2.5">
                {content.conversation.map((msg, i) => (
                  <ConversationBubble key={i} msg={msg} />
                ))}
                <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                  </span>
                  Agente respondendo em &lt; 60s
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ConversationBubble({ msg }: { msg: VerticalContent['conversation'][number] }) {
  const isCliente = msg.from === 'cliente';
  return (
    <div className={`flex ${isCliente ? 'justify-start' : 'justify-end'}`}>
      <div
        className={
          isCliente
            ? 'max-w-[80%] rounded-2xl rounded-bl-sm bg-secondary/60 px-4 py-2.5 text-sm'
            : 'max-w-[80%] rounded-2xl rounded-br-sm bg-primary/15 px-4 py-2.5 text-sm text-foreground'
        }
      >
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {isCliente ? 'Cliente' : 'Agente'}
        </p>
        <p className="mt-1 leading-relaxed">{msg.text}</p>
      </div>
    </div>
  );
}

function Roi({ content }: { content: VerticalContent }) {
  return (
    <section className="border-y border-border/60 bg-secondary/20 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Retorno</p>
        <h2 className="mt-3 text-3xl font-medium tracking-tight md:text-5xl">
          O que muda na{' '}
          <span className="font-serif italic font-normal text-muted-foreground">operação.</span>
        </h2>
        <div className="mt-10 grid grid-cols-1 gap-10 md:grid-cols-3">
          {content.roi.map((r) => (
            <div key={r.label}>
              <div className="text-5xl font-medium tracking-tight md:text-6xl">{r.metric}</div>
              <div className="mt-2 text-sm text-muted-foreground">{r.label}</div>
            </div>
          ))}
        </div>
        <p className="mt-10 text-xs text-muted-foreground">
          Métricas de referência baseadas em casos reais de operações similares. Resultados variam
          conforme implementação e tráfego do canal.
        </p>
      </div>
    </section>
  );
}

function Faq({ content }: { content: VerticalContent }) {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-3xl px-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">FAQ</p>
        <h2 className="mt-3 text-3xl font-medium tracking-tight md:text-4xl">
          Dúvidas frequentes do{' '}
          <span className="font-serif italic font-normal text-muted-foreground">{content.label.toLowerCase()}.</span>
        </h2>
        <div className="mt-8 divide-y divide-border/60 rounded-xl border border-border/60 bg-card/40">
          {content.faq.map((item) => (
            <details key={item.q} className="group p-6">
              <summary className="cursor-pointer list-none text-base font-medium tracking-tight transition-colors group-hover:text-primary">
                {item.q}
              </summary>
              <p className="mt-3 text-muted-foreground leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Cta() {
  return (
    <section className="border-t border-border/60 py-20 md:py-28">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <h2 className="text-4xl font-medium tracking-tight md:text-6xl">
          7 dias grátis pra ver{' '}
          <span className="font-serif italic font-normal text-primary">se funciona pra você.</span>
        </h2>
        <p className="mt-5 text-lg text-muted-foreground md:text-xl">
          Sem cartão. Sem ligação. Conversa com o Forge, publica o agente, conecta o WhatsApp.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="h-12 px-6 text-base">
            <Link href="/signup">
              Criar conta grátis <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-12 px-5 text-base">
            <Link href="/contato">Falar com a gente</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function OtherVerticals({ current }: { current: string }) {
  const others = VERTICAL_SLUGS.filter((s) => s !== current);
  return (
    <section className="border-t border-border/60 bg-secondary/20 py-16">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Outros casos</p>
        <div className="mt-6 flex flex-wrap gap-3">
          {others.map((slug) => (
            <Link
              key={slug}
              href={`/casos/${slug}`}
              className="rounded-full border border-border/60 bg-background/40 px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              {VERTICALS[slug].label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
