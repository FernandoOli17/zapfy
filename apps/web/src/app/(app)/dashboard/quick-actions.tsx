import Link from 'next/link';
import { BookOpen, Inbox, Megaphone, Sparkles } from 'lucide-react';

const ACTIONS = [
  { href: '/forge', label: 'Forge', icon: Sparkles },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/knowledge', label: 'Conhecimento', icon: BookOpen },
  { href: '/automations/broadcasts', label: 'Broadcasts', icon: Megaphone },
] as const;

/** Faixa fina de navegação rápida — substitui o grid "Próximos passos" antigo. */
export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {ACTIONS.map((a) => {
        const Icon = a.icon;
        return (
          <Link
            key={a.href}
            href={a.href}
            className="group flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary/40"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="text-sm font-medium">{a.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
