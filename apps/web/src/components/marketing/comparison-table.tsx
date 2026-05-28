import Link from 'next/link';
import { ArrowRight, Check, X } from 'lucide-react';

interface Row {
  feature: string;
  zapfy: boolean | string;
  competitor: boolean | string;
  /** se true, força que strings de preço fiquem realçadas em verde no Zapfy / cinza no comp */
  isPrice?: boolean;
}

const ROWS: Row[] = [
  { feature: 'WhatsApp Cloud API oficial (Meta)', zapfy: true, competitor: 'parcial' },
  { feature: 'Configuração conversacional (Forge)', zapfy: true, competitor: false },
  { feature: 'Agente IA com contexto real (não bot de menu)', zapfy: true, competitor: 'limitado' },
  { feature: 'RAG nativo — base de conhecimento', zapfy: true, competitor: false },
  { feature: 'Handoff humano com contexto completo', zapfy: true, competitor: true },
  { feature: 'Broadcasts em massa (HSM)', zapfy: true, competitor: true },
  { feature: 'Custom tools (webhook saída)', zapfy: 'plano Pro', competitor: 'addon caro' },
  { feature: 'Multi-tenant nativo (várias empresas)', zapfy: true, competitor: false },
  { feature: 'Preço inicial', zapfy: 'R$ 97/mês', competitor: 'R$ 197/mês', isPrice: true },
  { feature: 'Trial grátis', zapfy: '7 dias · sem cartão', competitor: false },
];

export function ComparisonTable() {
  return (
    <section className="border-t border-[#1a1a1a] py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#00E676]">
            Comparativo
          </p>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-white md:text-5xl">
            Zapfy <span className="font-serif italic font-normal text-[#888]">vs</span>{' '}
            BotConversa
          </h2>
          <p className="mt-4 text-base text-[#888]">
            Comparativo factual. Sem trash-talk, sem letra miúda.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#1a1a1a] bg-[#0d0d0d]">
          <div className="grid grid-cols-[1fr_140px_140px] text-xs font-semibold uppercase tracking-wider md:grid-cols-[1fr_180px_180px]">
            <span className="flex items-center bg-[#111] px-6 py-4 text-[#888] md:px-8">
              Recurso
            </span>
            <div className="flex flex-col items-center justify-center gap-1.5 bg-[#00E676] px-3 py-4 text-[#0a0a0a]">
              <span className="text-sm font-bold uppercase tracking-wide">Zapfy</span>
              <span className="animate-pulse-green rounded-full bg-[#0a0a0a] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#00E676]">
                Recomendado
              </span>
            </div>
            <span className="flex items-center justify-center bg-[#1a1a1a] px-3 py-4 text-[#666]">
              BotConversa
            </span>
          </div>

          <ul>
            {ROWS.map((row, i) => (
              <li
                key={row.feature}
                className={`grid grid-cols-[1fr_140px_140px] items-center px-6 py-4 text-sm md:grid-cols-[1fr_180px_180px] md:px-8 ${
                  i % 2 === 0 ? 'bg-[#0d0d0d]' : 'bg-[#111]'
                }`}
              >
                <span className="pr-4 text-zinc-200">{row.feature}</span>
                <span className="flex justify-center">
                  <Cell value={row.zapfy} positive isPrice={row.isPrice === true} />
                </span>
                <span className="flex justify-center">
                  <Cell value={row.competitor} isPrice={row.isPrice === true} />
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10 flex justify-center">
          <Link
            href="/precos"
            className="group inline-flex items-center gap-2 text-sm font-medium text-[#00E676] transition-colors hover:text-white"
          >
            Ver todos os detalhes
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Cell({
  value,
  positive = false,
  isPrice = false,
}: {
  value: boolean | string;
  positive?: boolean;
  isPrice?: boolean;
}) {
  if (value === true) {
    return (
      <span
        aria-label="incluso"
        className={`flex h-7 w-7 items-center justify-center rounded-full ${
          positive ? 'bg-[#00E676]/15 text-[#00E676]' : 'bg-emerald-500/10 text-emerald-300'
        }`}
      >
        <Check className="h-4 w-4" strokeWidth={2.5} />
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#ef4444]">
        <X className="h-3.5 w-3.5" strokeWidth={2.5} />
        Não
      </span>
    );
  }
  if (isPrice) {
    return (
      <span className={`font-semibold ${positive ? 'text-[#00E676]' : 'text-[#666]'}`}>
        {value}
      </span>
    );
  }
  return (
    <span className={`text-xs font-medium ${positive ? 'text-white' : 'text-[#666]'}`}>
      {value}
    </span>
  );
}
