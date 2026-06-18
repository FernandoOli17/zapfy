import Image from 'next/image';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

interface GuideStep {
  slug: string;
  title: string;
  body: React.ReactNode;
}

/** Print opcional: renderiza só se o arquivo existir em public/guias/meta/. */
function StepImage({ slug, alt }: { slug: string; alt: string }) {
  const file = `/guias/meta/${slug}.png`;
  if (!existsSync(join(process.cwd(), 'public', file))) return null;
  return (
    <Image
      src={file}
      alt={alt}
      width={720}
      height={400}
      className="mt-3 rounded-lg border border-border"
    />
  );
}

const STEPS: GuideStep[] = [
  {
    slug: 'passo-1-app',
    title: '1. Crie (ou abra) seu app na Meta',
    body: (
      <>
        Acesse{' '}
        <a
          href="https://developers.facebook.com/apps"
          target="_blank"
          rel="noreferrer"
          className="text-primary underline-offset-4 hover:underline"
        >
          developers.facebook.com/apps
        </a>{' '}
        e crie um app do tipo <strong>Business</strong>. Dentro dele, adicione o produto{' '}
        <strong>WhatsApp</strong> no menu lateral.
      </>
    ),
  },
  {
    slug: 'passo-2-ids',
    title: '2. Copie o Phone Number ID e o WABA ID',
    body: (
      <>
        Em <strong>WhatsApp → API Setup</strong>, logo abaixo do número de teste, estão o{' '}
        <code className="font-mono text-xs">Phone number ID</code> e o{' '}
        <code className="font-mono text-xs">WhatsApp Business Account ID</code>. São os dois
        números longos que o formulário ao lado pede.
      </>
    ),
  },
  {
    slug: 'passo-3-token',
    title: '3. Gere um token PERMANENTE (não o temporário)',
    body: (
      <>
        O token da página API Setup expira em 24h. Pra produção: em{' '}
        <a
          href="https://business.facebook.com/settings/system-users"
          target="_blank"
          rel="noreferrer"
          className="text-primary underline-offset-4 hover:underline"
        >
          Business Settings → System users
        </a>
        , crie um usuário de sistema, dê acesso ao app + WABA e gere um token com as
        permissões <code className="font-mono text-xs">whatsapp_business_messaging</code> e{' '}
        <code className="font-mono text-xs">whatsapp_business_management</code>. Ele começa
        com <code className="font-mono text-xs">EAA</code>.
      </>
    ),
  },
  {
    slug: 'passo-4-secret',
    title: '4. Copie o App Secret',
    body: (
      <>
        Em <strong>App Settings → Basic</strong> do seu app, clique em <em>Show</em> no campo{' '}
        <strong>App secret</strong>. Usamos ele pra validar a assinatura dos webhooks da Meta
        (nada chega aqui sem essa verificação).
      </>
    ),
  },
];

export function MetaGuide() {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="text-sm font-semibold tracking-tight">Onde acho essas credenciais?</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Antes de começar você precisa de: conta no Meta Business, um app criado e um número
        de telefone dedicado (que NÃO esteja em uso no app do WhatsApp).
      </p>
      <div className="mt-4 space-y-2">
        {STEPS.map((s) => (
          <details
            key={s.slug}
            className="group rounded-lg border border-border bg-background px-4 py-3"
          >
            <summary className="cursor-pointer list-none text-sm font-medium marker:hidden">
              {s.title}
            </summary>
            <div className="mt-2 text-sm text-muted-foreground">{s.body}</div>
            <StepImage slug={s.slug} alt={s.title} />
          </details>
        ))}
      </div>
    </div>
  );
}
