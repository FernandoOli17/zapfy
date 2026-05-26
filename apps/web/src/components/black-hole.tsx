/**
 * BlackHole — buraco negro CSS-only com 7 camadas.
 *
 * Camadas (ordem visual, do fundo pra frente):
 *   1. Halo pulsante externo (8s)
 *   2. Accretion ring outer  — slow spin 16s
 *   3. Accretion ring middle — medium spin 10s (reverso)
 *   4. Accretion ring inner  — fast spin 6s
 *   5. Photon ring (Einstein ring) — pulsa brilho 4s
 *   6. Event horizon — pitch black com sucção pra dentro
 *   7. 5 partículas em órbitas elípticas (offset-path), tamanhos/velocidades variados
 *
 * Respeita prefers-reduced-motion (animações desligadas).
 * Server component — só CSS, sem JS.
 *
 * Uso:
 *   <BlackHole size={520} />
 *
 * O `size` define o lado do quadrado em px. Default 480.
 */

interface Props {
  size?: number;
  className?: string;
}

export function BlackHole({ size = 480, className = '' }: Props) {
  return (
    <div
      className={`bh-root pointer-events-none relative ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* 1. Halo pulsante externo (ultra wide, blurred) */}
      <div className="bh-halo" />

      {/* 2-4. Accretion disk rings */}
      <div className="bh-ring bh-ring-outer" />
      <div className="bh-ring bh-ring-mid" />
      <div className="bh-ring bh-ring-inner" />

      {/* 5. Photon ring (Einstein ring) */}
      <div className="bh-photon" />

      {/* 6. Event horizon */}
      <div className="bh-horizon" />

      {/* 7. Partículas em órbitas elípticas */}
      <div className="bh-orbits">
        <span className="bh-particle bh-particle-1" />
        <span className="bh-particle bh-particle-2" />
        <span className="bh-particle bh-particle-3" />
        <span className="bh-particle bh-particle-4" />
        <span className="bh-particle bh-particle-5" />
      </div>

      {/* CSS isolated por escopo de classe — sem styled-jsx pra manter como server component */}
      <style>{`
        .bh-root {
          isolation: isolate;
          contain: layout style paint;
        }

        /* ───────────────────────────────────────────────────
           1. HALO PULSANTE EXTERNO
           ─────────────────────────────────────────────────── */
        .bh-halo {
          position: absolute;
          inset: -18%;
          border-radius: 50%;
          background:
            radial-gradient(
              circle at center,
              transparent 38%,
              hsl(213 93% 58% / 0.18) 46%,
              hsl(263 70% 58% / 0.12) 56%,
              hsl(195 100% 50% / 0.06) 68%,
              transparent 78%
            );
          filter: blur(18px);
          animation: bh-halo-pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          will-change: transform, opacity;
          z-index: 1;
        }

        @keyframes bh-halo-pulse {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50%      { opacity: 1;   transform: scale(1.08); }
        }

        /* ───────────────────────────────────────────────────
           2-4. ACCRETION DISK RINGS
           Conic-gradient mascarado pra virar anel rotativo
           ─────────────────────────────────────────────────── */
        .bh-ring {
          position: absolute;
          border-radius: 50%;
          background: conic-gradient(
            from 0deg,
            transparent 0deg,
            hsl(213 93% 70%) 60deg,
            hsl(195 100% 75%) 100deg,
            hsl(263 70% 70%) 180deg,
            hsl(213 93% 70% / 0.3) 240deg,
            transparent 320deg
          );
          /* Mask cria o anel — apenas a borda fica visível */
          mask: radial-gradient(circle, transparent 47%, #000 49%, #000 50%, transparent 52%);
          -webkit-mask: radial-gradient(circle, transparent 47%, #000 49%, #000 50%, transparent 52%);
          filter: blur(1.5px);
          z-index: 2;
        }

        .bh-ring-outer {
          inset: 8%;
          opacity: 0.7;
          animation: bh-spin 16s linear infinite;
          will-change: transform;
        }
        .bh-ring-mid {
          inset: 18%;
          opacity: 0.85;
          animation: bh-spin 10s linear infinite reverse;
          mask: radial-gradient(circle, transparent 44%, #000 47%, #000 51%, transparent 54%);
          -webkit-mask: radial-gradient(circle, transparent 44%, #000 47%, #000 51%, transparent 54%);
          will-change: transform;
        }
        .bh-ring-inner {
          inset: 26%;
          opacity: 1;
          animation: bh-spin 6s linear infinite;
          mask: radial-gradient(circle, transparent 40%, #000 44%, #000 52%, transparent 56%);
          -webkit-mask: radial-gradient(circle, transparent 40%, #000 44%, #000 52%, transparent 56%);
          filter: blur(0.8px) brightness(1.3);
          will-change: transform;
        }

        @keyframes bh-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        /* ───────────────────────────────────────────────────
           5. PHOTON RING (Einstein ring)
           Anel fino brilhante envolvendo o event horizon
           ─────────────────────────────────────────────────── */
        .bh-photon {
          position: absolute;
          inset: 35%;
          border-radius: 50%;
          border: 1.5px solid hsl(213 100% 85% / 0.9);
          box-shadow:
            0 0 14px hsl(213 93% 70% / 0.9),
            0 0 28px hsl(213 93% 60% / 0.7),
            inset 0 0 16px hsl(213 93% 75% / 0.55),
            inset 0 0 4px hsl(0 0% 100% / 0.7);
          animation: bh-photon-pulse 4s ease-in-out infinite;
          z-index: 3;
        }

        @keyframes bh-photon-pulse {
          0%, 100% {
            box-shadow:
              0 0 14px hsl(213 93% 70% / 0.9),
              0 0 28px hsl(213 93% 60% / 0.7),
              inset 0 0 16px hsl(213 93% 75% / 0.55),
              inset 0 0 4px hsl(0 0% 100% / 0.7);
          }
          50% {
            box-shadow:
              0 0 22px hsl(213 100% 80% / 1),
              0 0 44px hsl(195 100% 65% / 0.85),
              0 0 70px hsl(263 70% 65% / 0.5),
              inset 0 0 26px hsl(213 100% 80% / 0.8),
              inset 0 0 8px hsl(0 0% 100% / 0.95);
          }
        }

        /* ───────────────────────────────────────────────────
           6. EVENT HORIZON
           Centro preto com fade pras bordas
           ─────────────────────────────────────────────────── */
        .bh-horizon {
          position: absolute;
          inset: 36%;
          border-radius: 50%;
          background:
            radial-gradient(
              circle at center,
              hsl(0 0% 0%) 0%,
              hsl(225 50% 2%) 60%,
              hsl(225 50% 4% / 0.6) 80%,
              transparent 100%
            );
          box-shadow:
            inset 0 0 24px hsl(0 0% 0%),
            0 0 32px hsl(0 0% 0% / 0.6);
          z-index: 4;
        }

        /* ───────────────────────────────────────────────────
           7. PARTÍCULAS EM ÓRBITA ELÍPTICA
           Usa offset-path com ellipse() pra trajetória curva
           ─────────────────────────────────────────────────── */
        .bh-orbits {
          position: absolute;
          inset: 0;
          z-index: 5;
        }

        .bh-particle {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 4px;
          height: 4px;
          margin: -2px 0 0 -2px;
          background: hsl(0 0% 100%);
          border-radius: 50%;
          box-shadow:
            0 0 6px hsl(0 0% 100%),
            0 0 12px hsl(213 93% 70%),
            0 0 20px hsl(213 93% 60% / 0.6);
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          will-change: offset-distance;
        }

        /* Cada partícula tem trajetória elíptica única + velocidade diferente */
        .bh-particle-1 {
          offset-path: path('M 0,0 m -190,0 a 190,76 0 1,1 380,0 a 190,76 0 1,1 -380,0');
          animation-name: bh-orbit;
          animation-duration: 7s;
        }
        .bh-particle-2 {
          offset-path: path('M 0,0 m -160,0 a 160,64 30 1,1 320,0 a 160,64 30 1,1 -320,0');
          animation-name: bh-orbit;
          animation-duration: 9s;
          animation-delay: -2s;
          width: 3px;
          height: 3px;
          margin: -1.5px 0 0 -1.5px;
        }
        .bh-particle-3 {
          offset-path: path('M 0,0 m -130,0 a 130,52 -25 1,1 260,0 a 130,52 -25 1,1 -260,0');
          animation-name: bh-orbit;
          animation-duration: 5s;
          animation-delay: -1s;
          width: 5px;
          height: 5px;
          margin: -2.5px 0 0 -2.5px;
          background: hsl(213 100% 88%);
          box-shadow:
            0 0 8px hsl(213 100% 88%),
            0 0 16px hsl(213 93% 70%),
            0 0 28px hsl(213 93% 60% / 0.7);
        }
        .bh-particle-4 {
          offset-path: path('M 0,0 m -210,0 a 210,84 15 1,1 420,0 a 210,84 15 1,1 -420,0');
          animation-name: bh-orbit;
          animation-duration: 11s;
          animation-delay: -4s;
          width: 2.5px;
          height: 2.5px;
          margin: -1.25px 0 0 -1.25px;
          opacity: 0.85;
        }
        .bh-particle-5 {
          offset-path: path('M 0,0 m -110,0 a 110,44 -45 1,1 220,0 a 110,44 -45 1,1 -220,0');
          animation-name: bh-orbit;
          animation-duration: 4.5s;
          animation-delay: -1.5s;
          width: 3.5px;
          height: 3.5px;
          margin: -1.75px 0 0 -1.75px;
          background: hsl(195 100% 80%);
          box-shadow:
            0 0 7px hsl(195 100% 80%),
            0 0 14px hsl(195 100% 60%);
        }

        @keyframes bh-orbit {
          to { offset-distance: 100%; }
        }

        /* ───────────────────────────────────────────────────
           ACCESSIBILITY: reduced motion
           ─────────────────────────────────────────────────── */
        @media (prefers-reduced-motion: reduce) {
          .bh-halo,
          .bh-ring-outer,
          .bh-ring-mid,
          .bh-ring-inner,
          .bh-photon,
          .bh-particle {
            animation-duration: 0s !important;
            animation-iteration-count: 1 !important;
          }
        }
      `}</style>
    </div>
  );
}
