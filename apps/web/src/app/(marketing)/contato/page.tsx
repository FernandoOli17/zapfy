import { Mail, MessageCircle, Send } from 'lucide-react';

import { ContactForm } from './contact-form';

export const metadata = {
  title: 'Contato',
  description: 'Fala com a gente. Dúvida, parceria, integração, ou só um oi.',
};

const CHANNELS = [
  {
    icon: Mail,
    label: 'E-mail',
    value: 'oi@Orbe.dev',
    href: 'mailto:oi@Orbe.dev',
    blurb: 'Respondemos em até 1 dia útil.',
  },
  {
    icon: MessageCircle,
    label: 'WhatsApp',
    value: '+55 11 90000-0000',
    href: 'https://wa.me/5511900000000',
    blurb: 'Pra prova de que comemos da própria comida.',
  },
  {
    icon: Send,
    label: 'Comercial',
    value: 'comercial@Orbe.dev',
    href: 'mailto:comercial@Orbe.dev',
    blurb: 'Pra empresa querendo Premium ou parceria.',
  },
];

export default function ContatoPage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="bg-radial-fade absolute inset-0 -z-10" aria-hidden />
        <div className="mx-auto max-w-6xl px-6 pt-20 pb-12 md:pt-28 md:pb-16">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Contato</p>
          <h1 className="mt-4 text-5xl font-medium leading-[1.05] tracking-tight md:text-7xl">
            Fala{' '}
            <span className="font-serif italic font-normal text-primary">com a gente.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
            Dúvida, parceria, integração, sugestão ou só um oi. A gente responde rápido — e quem
            responde é gente, não bot.
          </p>
        </div>
      </section>

      <section className="pb-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-12 md:grid-cols-[1fr_1.4fr] md:gap-16">
            <aside>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Canais</p>
              <ul className="mt-6 space-y-6">
                {CHANNELS.map((c) => (
                  <li key={c.label} className="border-t border-border/60 pt-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <c.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-widest text-muted-foreground">
                          {c.label}
                        </p>
                        <a
                          href={c.href}
                          className="mt-1 block text-base font-medium hover:text-primary"
                        >
                          {c.value}
                        </a>
                        <p className="mt-1 text-sm text-muted-foreground">{c.blurb}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-10 rounded-xl border border-border/60 bg-card/40 p-5 text-sm">
                <p className="font-medium">Suporte de cliente?</p>
                <p className="mt-2 text-muted-foreground">
                  Se você já tem conta, abre o dashboard e clica no menu → Suporte. Tickets de
                  clientes têm prioridade alta.
                </p>
              </div>
            </aside>

            <div className="rounded-xl border border-border/60 bg-card/40 p-6 md:p-8">
              <h2 className="text-2xl font-medium tracking-tight">
                Manda uma mensagem
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Preencha abaixo e te respondemos por e-mail em até 24h úteis.
              </p>
              <div className="mt-6">
                <ContactForm />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
