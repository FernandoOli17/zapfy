import Link from 'next/link';
import { Button } from '@zapai/ui';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto w-full">
        <Link href="/" className="text-xl font-bold tracking-tight">
          ZapAI
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Criar conta</Link>
          </Button>
        </nav>
      </header>

      <section className="flex-1 max-w-6xl mx-auto w-full px-6 py-24 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.05]">
            O WhatsApp da sua empresa,
            <br />
            <span className="text-primary">com cérebro próprio.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-md">
            Conecte seu WhatsApp Business à API oficial da Meta e ganhe um agente IA que
            vende, agenda e atende 24/7. Você configura tudo conversando com outra IA —
            sem formulário.
          </p>
          <div className="mt-8 flex gap-3">
            <Button asChild size="lg">
              <Link href="/signup">Criar meu agente em 5 minutos</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="#como-funciona">Como funciona</Link>
            </Button>
          </div>
        </div>

        <div className="border rounded-xl p-8 bg-card text-card-foreground">
          <p className="text-sm text-muted-foreground mb-4">→ Demo da Fase 2</p>
          <div className="space-y-3 font-mono text-sm">
            <div className="rounded-lg bg-muted/50 p-3">
              <span className="text-muted-foreground">Forge:</span> Me conta do seu negócio.
              O que vocês vendem?
            </div>
            <div className="rounded-lg bg-primary/10 p-3 ml-8">
              <span className="text-muted-foreground">Você:</span> Loja de tênis online,
              público jovem, foco em corrida.
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <span className="text-muted-foreground">Forge:</span> Show. Detectei: e-commerce.
              Quer que ele recomende produtos? Recupere carrinhos abandonados?
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
