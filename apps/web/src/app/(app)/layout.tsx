import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import {
  BookOpen,
  CreditCard,
  Headset,
  Inbox,
  KeyRound,
  LayoutDashboard,
  MessageSquareText,
  Phone,
  Settings,
  Sparkles,
  Users,
} from 'lucide-react';
import { prisma } from '@zapai/db';
import { cn } from '@zapai/ui';

import { auth } from '@/lib/auth';
import { SignOutLink } from '@/components/sign-out-link';
import { ThemeToggle } from '@/components/theme-toggle';

const NAV = [
  { href: '/dashboard', label: 'Início', icon: LayoutDashboard, ready: true },
  { href: '/forge', label: 'Forge', icon: Sparkles, ready: true },
  { href: '/inbox', label: 'Inbox', icon: Inbox, ready: true },
  { href: '/contacts', label: 'Contatos', icon: Users, ready: true },
  { href: '/agent', label: 'Agente', icon: MessageSquareText, ready: false },
  { href: '/knowledge', label: 'Conhecimento', icon: BookOpen, ready: false },
  { href: '/whatsapp', label: 'WhatsApp', icon: Phone, ready: true },
  { href: '/team', label: 'Time', icon: Headset, ready: true },
  { href: '/integrations', label: 'Integrações', icon: KeyRound, ready: true },
  { href: '/billing', label: 'Billing', icon: CreditCard, ready: true },
  { href: '/settings', label: 'Configurações', icon: Settings, ready: false },
] as const;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  const member = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    include: { workspace: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!member) redirect('/onboarding');

  const workspace = member.workspace;
  const initials =
    workspace.name
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'W';

  return (
    <div className="min-h-screen grid md:grid-cols-[240px_1fr] lg:grid-cols-[260px_1fr]">
      <aside className="hidden border-r border-border/60 bg-secondary/30 md:flex md:flex-col">
        <div className="px-5 py-5">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="inline-block h-2 w-2 rounded-full bg-primary" aria-hidden />
            ZapAI
          </Link>
        </div>

        <div className="mx-3 mb-4 rounded-lg border border-border/60 bg-card/40 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-sm font-semibold text-primary">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{workspace.name}</p>
              <p className="truncate text-xs text-muted-foreground">zapai.dev/{workspace.slug}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-2">
          <ul className="space-y-0.5">
            {NAV.map((item) => (
              <li key={item.href}>
                <NavItem {...item} />
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-border/60 px-5 py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs text-muted-foreground">Logado como</p>
              <p className="truncate text-sm">{session.user.email}</p>
            </div>
            <ThemeToggle />
          </div>
          <SignOutLink className="mt-3 text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">
            Sair
          </SignOutLink>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        {/* Mobile topbar */}
        <header className="flex items-center justify-between border-b border-border/60 px-5 py-4 md:hidden">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="inline-block h-2 w-2 rounded-full bg-primary" aria-hidden />
            ZapAI
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  ready,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  ready: boolean;
}) {
  if (!ready) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground/70 cursor-not-allowed',
        )}
        aria-disabled
        title="Em breve"
      >
        <Icon className="h-4 w-4 opacity-70" />
        <span className="flex-1">{label}</span>
        <span className="text-[10px] uppercase tracking-wider opacity-60">soon</span>
      </div>
    );
  }
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
    >
      <Icon className="h-4 w-4 text-primary" />
      <span>{label}</span>
    </Link>
  );
}
