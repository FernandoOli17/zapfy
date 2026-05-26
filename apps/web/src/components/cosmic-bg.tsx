/**
 * Cosmic background — server component, CSS-only.
 *
 * Camadas (z-index relativo no parent):
 *   1. Deep space gradient (estático)
 *   2. Nebula drift (animação suave, 24s)
 *   3. Stars (3 layers, twinkle)
 *   4. Blue radial glow pulsando (8s)
 *   5. Dot grid sutil
 *
 * Use como filho absoluto de uma `section relative overflow-hidden`:
 *
 *   <section className="relative overflow-hidden">
 *     <CosmicBackground />
 *     <div className="relative">conteúdo...</div>
 *   </section>
 *
 * Variantes:
 *   - `intensity="hero"` (default) — todas as camadas, glow forte
 *   - `intensity="muted"` — só nebula + dot grid, sem glow pulsante
 */

type Intensity = 'hero' | 'muted';

interface Props {
  intensity?: Intensity;
  className?: string;
}

export function CosmicBackground({ intensity = 'hero', className = '' }: Props) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {/* 1. Deep space gradient — vertical fade */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 100% 80% at 50% 0%, hsl(225 45% 6%), hsl(225 50% 3%) 70%)',
        }}
      />

      {/* 2. Nebula drift — blur-xl (não blur-3xl) pra evitar repaint caro em animação */}
      <div
        className="animate-nebula absolute -left-[10%] top-[10%] h-[600px] w-[600px] rounded-full opacity-[0.18] blur-xl"
        style={{
          background:
            'radial-gradient(circle, hsl(263 70% 50%) 0%, hsl(213 93% 50%) 40%, transparent 70%)',
          willChange: 'transform, opacity',
        }}
      />
      <div
        className="animate-nebula absolute -right-[15%] bottom-[10%] h-[700px] w-[700px] rounded-full opacity-[0.14] blur-xl"
        style={{
          background:
            'radial-gradient(circle, hsl(213 93% 60%) 0%, hsl(195 100% 50%) 40%, transparent 70%)',
          animationDelay: '8s',
          willChange: 'transform, opacity',
        }}
      />

      {/* 3. Stars — SVG único em vez de 87 spans individuais */}
      <Stars />

      {/* 4. Blue radial glow pulsando — estático (sem animação no glow) */}
      {intensity === 'hero' && (
        <div
          className="absolute left-1/2 top-0 h-[800px] w-[1200px] -translate-x-1/2 -translate-y-1/3 rounded-full blur-2xl"
          style={{
            background:
              'radial-gradient(ellipse 50% 50% at 50% 50%, hsl(213 93% 55% / 0.20), transparent 60%)',
          }}
        />
      )}

      {/* 5. Dot grid sutil — estático */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(255, 255, 255, 0.06) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* 6. Vignette pra fechar bordas */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 100% at 50% 50%, transparent 50%, hsl(225 50% 3%) 100%)',
        }}
      />
    </div>
  );
}

/**
 * Stars — SVG único com 40 círculos em vez de 87 spans individuais.
 * Uma única animação de opacity no SVG inteiro ao invés de 87 keyframe contexts.
 * Sem box-shadow animado (repaint caro) — apenas fill branco com opacidade variada.
 */
function Stars() {
  const positions = generatePositions();

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full animate-star-twinkle"
      style={{ willChange: 'opacity' }}
    >
      {/* Pequenas (r=0.5) */}
      {positions.slice(0, 22).map((pos, i) => (
        <circle
          key={`s${i}`}
          cx={`${pos.x}%`}
          cy={`${pos.y}%`}
          r={0.5}
          fill="white"
          opacity={0.35 + (i % 4) * 0.12}
        />
      ))}
      {/* Médias (r=0.85) */}
      {positions.slice(22, 34).map((pos, i) => (
        <circle
          key={`m${i}`}
          cx={`${pos.x}%`}
          cy={`${pos.y}%`}
          r={0.85}
          fill="white"
          opacity={0.45 + (i % 3) * 0.12}
        />
      ))}
      {/* Grandes (r=1.2) — sem box-shadow animado */}
      {positions.slice(34, 40).map((pos, i) => (
        <circle
          key={`l${i}`}
          cx={`${pos.x}%`}
          cy={`${pos.y}%`}
          r={1.2}
          fill="hsl(213 80% 88%)"
          opacity={0.6 + (i % 2) * 0.15}
        />
      ))}
    </svg>
  );
}

/** Posições determinísticas (golden-ratio — sem random pra evitar hydration mismatch). */
function generatePositions() {
  const out: Array<{ x: number; y: number }> = [];
  const phi = 0.6180339887;
  for (let i = 0; i < 40; i++) {
    out.push({
      x: ((i * phi * 100) % 100 + 100) % 100,
      y: ((i * phi * phi * 100) % 100 + 100) % 100,
    });
  }
  return out;
}
