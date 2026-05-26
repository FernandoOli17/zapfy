import Link from 'next/link';
import { FileText, Megaphone } from 'lucide-react';

const TABS = [
  { key: 'templates', href: '/automations/templates', label: 'Templates HSM', icon: FileText },
  { key: 'broadcasts', href: '/automations/broadcasts', label: 'Broadcasts', icon: Megaphone },
] as const;

export function AutomationsTabs({ current }: { current: 'templates' | 'broadcasts' }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-card p-1">
      {TABS.map((t) => {
        const active = t.key === current;
        const Icon = t.icon;
        return (
          <Link
            key={t.key}
            href={t.href}
            className={
              active
                ? 'inline-flex h-8 items-center gap-2 rounded-md bg-primary/10 px-3 text-sm font-medium text-primary'
                : 'inline-flex h-8 items-center gap-2 rounded-md px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground'
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
