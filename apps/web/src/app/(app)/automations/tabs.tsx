import Link from 'next/link';
import { FileText, Megaphone } from 'lucide-react';

const TABS = [
  { key: 'templates', href: '/automations/templates', label: 'Templates HSM', icon: FileText },
  { key: 'broadcasts', href: '/automations/broadcasts', label: 'Broadcasts', icon: Megaphone },
] as const;

export function AutomationsTabs({ current }: { current: 'templates' | 'broadcasts' }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {TABS.map((t) => {
        const active = t.key === current;
        const Icon = t.icon;
        return (
          <Link
            key={t.key}
            href={t.href}
            className={
              active
                ? 'inline-flex h-9 items-center gap-2 rounded-md bg-secondary px-3 text-sm font-medium text-foreground'
                : 'inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
            }
          >
            <Icon className="h-4 w-4" />
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
