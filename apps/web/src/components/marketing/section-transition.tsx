/**
 * SectionTransition v4 — domo cósmico contido + animações sutis
 *
 * Fixes pós-screenshot do usuário:
 *   • Halo + core SEMPRE bottom-anchored, h-full (sem vazar pro próximo)
 *   • Container overflow-x: clip → bloqueia scroll horizontal,
 *     mas mantém overflow-y: visible pra drop-shadow extender vertical
 *   • Path Q720,-180 → vértice a ~73% (dramático mas não absurdo)
 *   • Heights default h-32/h-44 (era h-48/h-64 — estava engolindo tudo)
 *   • Animações com magnitudes reduzidas (±3px breath, scale 1.025 max)
 *   • Drop-shadow stack mais conservador
 *
 * 7 camadas (do fundo pra frente):
 *   1. Container bg = fromColor
 *   2. Halo radial bottom-anchored (blur 40px, pulse 5s)
 *   3. Core saturado mix-blend screen (blur 18px, pulse 5s)
 *   4. SVG dome (preenchimento toColor, breath 7s)
 *   5. 3 strokes sobrepostos (wide/mid/fine, pulse dessincronizado)
 *   6. Hot-spot ellipse no vértice
 *   7. Shimmer line deslizante (14s)
 *
 * Server component — CSS/SVG only.
 */

interface Props {
  fromColor: string;
  toColor: string;
  glow?: 'normal' | 'subtle';
  height?: 'sm' | 'md' | 'lg';
}

function hashColors(a: string, b: string): string {
  let hash = 0;
  const str = `${a}::${b}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return `bht${Math.abs(hash).toString(36)}`;
}

export function SectionTransition({
  fromColor,
  toColor,
  glow = 'normal',
  height = 'md',
}: Props) {
  const intensity = glow === 'subtle' ? 0.6 : 1;
  const uid = hashColors(fromColor, toColor);

  const heightClass =
    height === 'sm'
      ? 'h-24 md:h-32'
      : height === 'lg'
        ? 'h-48 md:h-60'
        : 'h-32 md:h-44';

  return (
    <div
      aria-hidden
      className={`${uid} bh-trans relative w-full ${heightClass}`}
      style={{
        backgroundColor: fromColor,
        // overflow-x clip impede scrollbar horizontal, overflow-y visible
        // deixa drop-shadow do SVG extender pra seção de cima
        overflowX: 'clip',
        overflowY: 'visible',
      }}
    >
      {/* 2. Halo radial bottom-anchored, CONTIDO no container */}
      <div
        className="bh-trans__halo pointer-events-none absolute inset-x-0 bottom-0 h-full"
        style={{
          background:
            'radial-gradient(ellipse 60% 110% at 50% 100%, hsl(213 100% 60%) 0%, hsl(213 100% 55%) 14%, transparent 62%)',
          filter: 'blur(36px)',
        }}
      />

      {/* 3. Core saturado, idem contido */}
      <div
        className="bh-trans__core pointer-events-none absolute inset-x-0 bottom-0 h-full"
        style={{
          background:
            'radial-gradient(ellipse 45% 100% at 50% 100%, hsl(213 100% 85%) 0%, hsl(213 100% 65%) 16%, hsl(220 95% 50% / 0.25) 38%, transparent 60%)',
          filter: 'blur(14px)',
          mixBlendMode: 'screen',
        }}
      />

      {/* 4-7. SVG com dome + 3 strokes + hot-spot + shimmer */}
      <svg
        className="bh-trans__svg absolute inset-0 h-full w-full"
        viewBox="0 0 1440 400"
        preserveAspectRatio="none"
        style={{
          filter: `
            drop-shadow(0 -1px 0 hsl(213 100% 94% / ${0.95 * intensity}))
            drop-shadow(0 -3px 6px hsl(213 100% 78% / ${0.9 * intensity}))
            drop-shadow(0 -9px 18px hsl(213 100% 62% / ${0.8 * intensity}))
            drop-shadow(0 -22px 40px hsl(215 95% 52% / ${0.55 * intensity}))
            drop-shadow(0 -44px 72px hsl(220 90% 45% / ${0.3 * intensity}))
          `,
        }}
      >
        <defs>
          <linearGradient
            id={`${uid}-shimmer`}
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1="0"
            x2="1440"
            y2="0"
          >
            <stop offset="0%" stopColor="hsl(213 100% 95%)" stopOpacity="0" />
            <stop offset="46%" stopColor="hsl(213 100% 95%)" stopOpacity="0" />
            <stop offset="50%" stopColor="hsl(0 0% 100%)" stopOpacity="1" />
            <stop offset="54%" stopColor="hsl(213 100% 95%)" stopOpacity="0" />
            <stop offset="100%" stopColor="hsl(213 100% 95%)" stopOpacity="0" />
          </linearGradient>

          <radialGradient id={`${uid}-hotspot`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(0 0% 100%)" stopOpacity="1" />
            <stop offset="30%" stopColor="hsl(213 100% 85%)" stopOpacity="0.85" />
            <stop offset="70%" stopColor="hsl(213 100% 60%)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="hsl(220 90% 40%)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Dome: Q720,-180 → vértice em y=110 (~73% da altura do container) */}
        <path
          className="bh-trans__dome"
          d="M0,400 Q720,-180 1440,400 L1440,400 L0,400 Z"
          fill={toColor}
        />

        <path
          className="bh-trans__stroke-wide"
          d="M0,400 Q720,-180 1440,400"
          stroke="hsl(213 100% 65%)"
          strokeWidth="6"
          fill="none"
          opacity={0.6 * intensity}
          vectorEffect="non-scaling-stroke"
        />

        <path
          className="bh-trans__stroke-mid"
          d="M0,400 Q720,-180 1440,400"
          stroke="hsl(213 100% 78%)"
          strokeWidth="3"
          fill="none"
          opacity={0.85 * intensity}
          vectorEffect="non-scaling-stroke"
        />

        <path
          className="bh-trans__stroke-fine"
          d="M0,400 Q720,-180 1440,400"
          stroke="hsl(213 100% 94%)"
          strokeWidth="1.5"
          fill="none"
          opacity={0.95 * intensity}
          vectorEffect="non-scaling-stroke"
        />

        {/* Hot-spot no vértice (y=110) */}
        <ellipse
          className="bh-trans__hotspot"
          cx="720"
          cy="110"
          rx="160"
          ry="32"
          fill={`url(#${uid}-hotspot)`}
        />

        <path
          className="bh-trans__shimmer"
          d="M0,400 Q720,-180 1440,400"
          stroke={`url(#${uid}-shimmer)`}
          strokeWidth="3"
          fill="none"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <style>{`
        /* ─────────────────────────────────────────────────────────────
           ANIMAÇÕES SUTIS SEMPRE ATIVAS
           ───────────────────────────────────────────────────────────── */

        .${uid}.bh-trans {
          animation: ${uid}-breathe 9s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes ${uid}-breathe {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-3px); }
        }

        .${uid} .bh-trans__svg {
          animation: ${uid}-pulse-dome 7s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          transform-origin: 50% 100%;
        }
        @keyframes ${uid}-pulse-dome {
          0%, 100% { transform: scaleY(1); }
          50%      { transform: scaleY(1.025); }
        }

        .${uid} .bh-trans__halo {
          animation: ${uid}-pulse-halo 5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          transform-origin: 50% 100%;
        }
        @keyframes ${uid}-pulse-halo {
          0%, 100% { opacity: ${0.55 * intensity}; transform: scale(0.98); }
          50%      { opacity: ${0.9 * intensity};  transform: scale(1.04); }
        }

        .${uid} .bh-trans__core {
          animation: ${uid}-pulse-core 5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes ${uid}-pulse-core {
          0%, 100% { opacity: ${0.65 * intensity}; }
          50%      { opacity: ${1.0 * intensity}; }
        }

        .${uid} .bh-trans__stroke-wide {
          animation: ${uid}-pulse-stroke-w 4s ease-in-out infinite;
        }
        .${uid} .bh-trans__stroke-mid {
          animation: ${uid}-pulse-stroke-m 3.5s ease-in-out infinite;
        }
        .${uid} .bh-trans__stroke-fine {
          animation: ${uid}-pulse-stroke-f 3s ease-in-out infinite;
        }
        @keyframes ${uid}-pulse-stroke-w {
          0%, 100% { opacity: ${0.45 * intensity}; }
          50%      { opacity: ${0.8 * intensity}; }
        }
        @keyframes ${uid}-pulse-stroke-m {
          0%, 100% { opacity: ${0.7 * intensity}; }
          50%      { opacity: ${1.0 * intensity}; }
        }
        @keyframes ${uid}-pulse-stroke-f {
          0%, 100% { opacity: ${0.8 * intensity}; stroke-width: 1.5; }
          50%      { opacity: ${1.0 * intensity}; stroke-width: 2.2; }
        }

        .${uid} .bh-trans__hotspot {
          animation: ${uid}-pulse-hot 3.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          transform-origin: 720px 110px;
          transform-box: fill-box;
        }
        @keyframes ${uid}-pulse-hot {
          0%, 100% { opacity: ${0.6 * intensity}; transform: scale(0.92); }
          50%      { opacity: ${1.0 * intensity}; transform: scale(1.1); }
        }

        .${uid} .bh-trans__shimmer {
          stroke-dasharray: 220 1500;
          stroke-dashoffset: 0;
          animation: ${uid}-shimmer 14s linear infinite;
        }
        @keyframes ${uid}-shimmer {
          from { stroke-dashoffset: 1720; }
          to   { stroke-dashoffset: 0; }
        }

        /* ─────────────────────────────────────────────────────────────
           SCROLL-DRIVEN (bonus em Chrome/Edge 115+) — magnitudes reduzidas
           ───────────────────────────────────────────────────────────── */
        @supports (animation-timeline: view()) {
          .${uid}.bh-trans {
            animation:
              ${uid}-breathe 9s cubic-bezier(0.4, 0, 0.6, 1) infinite,
              ${uid}-scroll-rise linear both;
            animation-timeline: auto, view();
            animation-range: auto, entry 0% cover 80%;
          }
          @keyframes ${uid}-scroll-rise {
            from { translate: 0 12px; }
            50%  { translate: 0 0; }
            to   { translate: 0 -8px; }
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .${uid}.bh-trans,
          .${uid} .bh-trans__svg,
          .${uid} .bh-trans__halo,
          .${uid} .bh-trans__core,
          .${uid} .bh-trans__stroke-wide,
          .${uid} .bh-trans__stroke-mid,
          .${uid} .bh-trans__stroke-fine,
          .${uid} .bh-trans__hotspot,
          .${uid} .bh-trans__shimmer {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
