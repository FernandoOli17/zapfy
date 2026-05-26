import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import {
  BarChart3,
  BookOpen,
  CreditCard,
  Headset,
  Inbox,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageSquareText,
  Phone,
  Radio,
  Settings,
  Sparkles,
  Users,
} from 'lucide-react';
import { prisma } from '@zapai/db';

import { auth } from '@/lib/auth';
import { SignOutLink } from '@/components/sign-out-link';
import { ThemeToggle } from '@/components/theme-toggle';

import { SidebarNav, type NavSection } from './sidebar-nav';

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Principal',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/forge', label: 'Forge', icon: Sparkles, badge: 'IA' },
      { href: '/inbox', label: 'Inbox', icon: Inbox },
      { href: '/contacts', label: 'Contatos', icon: Users },
    ],
  },
  {
    label: 'Agente IA',
    items: [
      { href: '/agent', label: 'Configurar agente', icon: MessageSquareText },
      { href: '/knowledge', label: 'Base de conhecimento', icon: BookOpen },
      { href: '/whatsapp', label: 'WhatsApp', icon: Phone },
    ],
  },
  {
    label: 'Automações',
    items: [
      { href: '/automations/templates', label: 'Templates HSM', icon: Megaphone },
      { href: '/automations/broadcasts', label: 'Broadcasts', icon: Radio },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { href: '/analytics', label: 'Analytics', icon: BarChart3 },
      { href: '/team', label: 'Time', icon: Headset },
      { href: '/integrations', label: 'Integrações', icon: KeyRound },
      { href: '/billing', label: 'Billing', icon: CreditCard },
      { href: '/settings', label: 'Configurações', icon: Settings },
    ],
  },
];

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

  const userName = session.user.name ?? session.user.email.split('@')[0] ?? 'Usuário';
  const userEmail = session.user.email;

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Sidebar desktop ─────────────────────────────────── */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card md:flex lg:w-[260px]">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <span className="text-xs font-bold text-primary-foreground">O</span>
          </div>
          <span className="text-base font-semibold tracking-tight">Orbe</span>
        </div>

        {/* Workspace card */}
        <div className="mx-3 mb-3">
          <div className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/40 px-3 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-xs font-bold text-primary">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium leading-tight">{workspace.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                Orbe.dev/{workspace.slug}
              </p>
            </div>
          </div>
        </div>

        {/* Nav sections */}
        <SidebarNav sections={NAV_SECTIONS} />

        {/* User footer */}
        <div className="border-t border-border px-3 py-3">
          <div className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
              {userName[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium leading-tight">{userName}</p>
              <p className="truncate text-[11px] text-muted-foreground">{userEmail}</p>
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <SignOutLink
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Sair"
              >
                <LogOut className="h-3.5 w-3.5" />
              </SignOutLink>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────────── */}
      <div className="flex min-h-screen flex-1 flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header className="flex items-center justify-between border-b border-border bg-card px-5 py-3.5 md:hidden">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
              <span className="text-[10px] font-bold text-primary-foreground">O</span>
            </div>
            Orbe
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
