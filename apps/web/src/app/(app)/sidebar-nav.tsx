'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  BookOpen,
  Code2,
  CreditCard,
  Headset,
  Inbox,
  KeyRound,
  LayoutDashboard,
  Megaphone,
  MessageSquareText,
  Phone,
  Radio,
  Settings,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@zapai/ui';

/**
 * Em Next 15, Server Components não podem passar funções/forwardRefs (incluindo
 * componentes Lucide) como prop pra Client Components. Workaround: o caller
 * passa `iconName: IconName` (string) e o client component resolve o ícone via
 * mapa. Pra adicionar um ícone novo: importe acima + adicione a entrada em
 * `ICONS` + estenda o type `IconName`.
 */
const ICONS = {
  dashboard: LayoutDashboard,
  sparkles: Sparkles,
  inbox: Inbox,
  users: Users,
  'message-square-text': MessageSquareText,
  'book-open': BookOpen,
  phone: Phone,
  megaphone: Megaphone,
  radio: Radio,
  'bar-chart-3': BarChart3,
  headset: Headset,
  'key-round': KeyRound,
  'credit-card': CreditCard,
  settings: Settings,
  'code-2': Code2,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export interface NavSection {
  label: string;
  items: NavItemDef[];
}

export interface NavItemDef {
  href: string;
  label: string;
  iconName: IconName;
  badge?: string;
}

export function SidebarNav({ sections }: { sections: NavSection[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-2">
      {sections.map((section, si) => (
        <div key={section.label} className={si > 0 ? 'mt-5' : undefined}>
          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            {section.label}
          </p>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active =
                item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(item.href);
              const Icon = ICONS[item.iconName];
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-4 w-4 shrink-0 transition-colors',
                        active ? 'text-primary' : 'group-hover:text-foreground',
                      )}
                    />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge && (
                      <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
