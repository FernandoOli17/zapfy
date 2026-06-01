'use client';

import { useState, useTransition } from 'react';
import { ArrowRight, Check, Loader2, Sparkles } from 'lucide-react';
import { Button, cn } from '@zapfy/ui';
import { VERTICAL_LIST, VERTICAL_META } from '@zapfy/ai/forge';
import type { ForgeState } from '@zapfy/ai/forge/types';
import type { VerticalId } from '@zapfy/ai/forge/types';

import { saveForgeBasics } from './actions';

type PersonaStyle = 'human' | 'assistant';

interface Props {
  sessionId: string;
  onComplete: (state: ForgeState) => void;
}

const TOTAL_STEPS = 4;

export function ForgeWizard({ sessionId, onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [brandName, setBrandName] = useState('');
  const [vertical, setVertical] = useState<VerticalId | null>(null);
  const [personaStyle, setPersonaStyle] = useState<PersonaStyle | null>(null);
  const [goals, setGoals] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  const goalOptions = vertical ? VERTICAL_META[vertical].goalSuggestions : [];

  function toggleGoal(g: string) {
    setGoals((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  function finish() {
    if (!vertical || !personaStyle || goals.length === 0) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await saveForgeBasics({
          sessionId,
          brandName: brandName.trim(),
          vertical,
          personaStyle,
          goals,
        });
        if (result.status === 'error') {
          setError(result.error);
          return;
        }
        onComplete(result.state);
      } catch {
        setError('Falha ao salvar. Tenta de novo.');
      }
    });
  }

  return (
    <div className="flex h-[calc(100vh-3.75rem)] flex-col lg:h-screen">
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 py-10">
        {/* Progresso */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Forge · passo {step} de {TOTAL_STEPS}
          </div>
          <div className="mt-3 h-1 rounded-full bg-secondary">
            <div
              className="h-1 rounded-full bg-primary transition-all"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Passo 1: nome */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-medium tracking-tight md:text-3xl">
              Como chama o seu negócio?
            </h2>
            <p className="mt-2 text-muted-foreground">É o nome que aparece pro seu cliente.</p>
            <input
              autoFocus
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && brandName.trim()) setStep(2);
              }}
              placeholder="Ex: Bella Pizza"
              className="mt-6 w-full rounded-xl border border-border/60 bg-card/40 px-4 py-3 text-lg focus:border-primary/60 focus:outline-none"
            />
            <Button
              type="button"
              onClick={() => setStep(2)}
              disabled={!brandName.trim()}
              className="mt-6 gap-2"
            >
              Próximo <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Passo 2: tipo de negócio (auto-avança) */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-medium tracking-tight md:text-3xl">
              Que tipo de negócio é?
            </h2>
            <p className="mt-2 text-muted-foreground">Escolho um modelo pronto pra você.</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {VERTICAL_LIST.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    setVertical(v.id);
                    setGoals([]);
                    setStep(3);
                  }}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border px-4 py-4 text-left transition-colors',
                    vertical === v.id
                      ? 'border-primary/60 bg-primary/5'
                      : 'border-border/60 bg-card/40 hover:border-primary/40',
                  )}
                >
                  <span className="text-2xl">{v.emoji}</span>
                  <span className="text-sm font-medium">{v.label}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="mt-6 text-sm text-muted-foreground hover:text-foreground"
            >
              ‹ Voltar
            </button>
          </div>
        )}

        {/* Passo 3: estilo de atendimento (auto-avança) */}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-medium tracking-tight md:text-3xl">
              Como ela deve atender?
            </h2>
            <p className="mt-2 text-muted-foreground">Dá pra mudar depois.</p>
            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={() => {
                  setPersonaStyle('human');
                  setStep(4);
                }}
                className="flex w-full items-start gap-3 rounded-xl border border-border/60 bg-card/40 px-4 py-4 text-left transition-colors hover:border-primary/40"
              >
                <span className="text-2xl">🧑</span>
                <span>
                  <span className="block text-sm font-medium">Como uma pessoa real</span>
                  <span className="block text-sm text-muted-foreground">
                    Calorosa, com nome próprio. Se perguntarem direto se é um robô, ela admite com leveza.
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPersonaStyle('assistant');
                  setStep(4);
                }}
                className="flex w-full items-start gap-3 rounded-xl border border-border/60 bg-card/40 px-4 py-4 text-left transition-colors hover:border-primary/40"
              >
                <span className="text-2xl">🤖</span>
                <span>
                  <span className="block text-sm font-medium">Assistente virtual</span>
                  <span className="block text-sm text-muted-foreground">
                    Se apresenta como atendimento automático da empresa, direto ao ponto.
                  </span>
                </span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="mt-6 text-sm text-muted-foreground hover:text-foreground"
            >
              ‹ Voltar
            </button>
          </div>
        )}

        {/* Passo 4: objetivos (multi-escolha) */}
        {step === 4 && (
          <div>
            <h2 className="text-2xl font-medium tracking-tight md:text-3xl">
              O que ela deve resolver sozinha?
            </h2>
            <p className="mt-2 text-muted-foreground">Escolha uma ou mais.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {goalOptions.map((g) => {
                const active = goals.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleGoal(g)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
                      active
                        ? 'border-primary/60 bg-primary/10 text-foreground'
                        : 'border-border/60 bg-card/40 text-muted-foreground hover:border-primary/40',
                    )}
                  >
                    {active && <Check className="h-3.5 w-3.5 text-primary" />}
                    {g}
                  </button>
                );
              })}
            </div>
            <Button
              type="button"
              onClick={finish}
              disabled={goals.length === 0 || busy}
              className="mt-8 gap-2"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Concluir e montar
            </Button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="mt-6 ml-4 text-sm text-muted-foreground hover:text-foreground"
            >
              ‹ Voltar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
