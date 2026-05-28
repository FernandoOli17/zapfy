'use client';

import { useState } from 'react';
import { Code2, Network, Wrench } from 'lucide-react';
import { cn } from '@zapfy/ui';

import { FlowEditor } from './flow-editor';
import { RawPromptEditor } from './raw-prompt-editor';
import { CustomToolsManager } from './custom-tools-manager';

interface AgentSummary {
  id: string;
  name: string;
  vertical: string;
  currentVersion: {
    id: string;
    versionNumber: number;
    systemPrompt: string;
    customToolNames: string[];
    flowGraph: Record<string, unknown> | null;
  };
}

interface CustomToolSummary {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  secretPrefix: string;
  active: boolean;
  createdAt: string;
}

type Tab = 'flow' | 'prompt' | 'tools';

const TABS: Array<{ id: Tab; label: string; icon: typeof Code2 }> = [
  { id: 'flow', label: 'Flow', icon: Network },
  { id: 'prompt', label: 'Prompt raw', icon: Code2 },
  { id: 'tools', label: 'Tools custom', icon: Wrench },
];

export function DeveloperWorkspace({
  agent,
  customTools,
}: {
  agent: AgentSummary;
  customTools: CustomToolSummary[];
}) {
  const [tab, setTab] = useState<Tab>('flow');

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col md:h-screen">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Modo desenvolvedor
            </p>
            <h1 className="mt-0.5 text-xl font-semibold tracking-tight">
              {agent.name}{' '}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                v{agent.currentVersion.versionNumber} · {agent.vertical}
              </span>
            </h1>
          </div>
          <div className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
            ⚠ Edições criam nova AgentVersion (versionado, rollback disponível)
          </div>
        </div>

        {/* Tabs */}
        <nav className="mt-4 flex gap-1" role="tablist" aria-label="Editores">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                tab === t.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === 'flow' && (
          <FlowEditor
            agentId={agent.id}
            initialGraph={agent.currentVersion.flowGraph}
            customToolNames={customTools.filter((t) => t.active).map((t) => t.name)}
          />
        )}
        {tab === 'prompt' && (
          <RawPromptEditor
            agentId={agent.id}
            initialPrompt={agent.currentVersion.systemPrompt}
          />
        )}
        {tab === 'tools' && <CustomToolsManager tools={customTools} />}
      </div>
    </div>
  );
}
