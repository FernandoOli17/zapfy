import type { SVGProps } from 'react';

export type LogoVariant = 'primary' | 'white' | 'icon';

interface ZapfyLogoProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  variant?: LogoVariant;
  height?: number;
}

/**
 * Logo Zapfy — agente IA pra WhatsApp.
 *
 * - `primary`  fundo claro (texto preto, tagline cinza médio)
 * - `white`    fundo escuro / dark mode (texto branco, tagline cinza claro)
 * - `icon`     só o balão+raio, quadrado 32×32 — pra favicons e cantos
 *
 * Cor brand fixa: verde elétrico `#00E676`.
 */
export function ZapfyLogo({
  variant = 'primary',
  height = 40,
  ...props
}: ZapfyLogoProps) {
  if (variant === 'icon') {
    const size = height;
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 32 32"
        width={size}
        height={size}
        role="img"
        aria-label="Zapfy"
        {...props}
      >
        <rect width="32" height="32" rx="8" fill="#00E676" />
        <path d="M22 7 L14 18 L18 18 L11 28 L23 17 L19 17 Z" fill="#0a0a0a" />
      </svg>
    );
  }

  const isWhite = variant === 'white';
  const textColor = isWhite ? '#ffffff' : '#0a0a0a';
  const taglineColor = isWhite ? '#888888' : '#666666';
  const width = (height * 400) / 120;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 400 120"
      width={width}
      height={height}
      role="img"
      aria-label="Zapfy — agente IA para WhatsApp"
      {...props}
    >
      <rect x="16" y="12" width="88" height="82" rx="26" fill="#00E676" />
      <path d="M46 94 L36 114 L62 94" fill="#00E676" />
      <path d="M72 30 L52 60 L63 60 L48 90 L78 56 L66 56 Z" fill="#0a0a0a" />
      <text
        x="124"
        y="62"
        fontFamily="'Geist',system-ui,sans-serif"
        fontSize="44"
        fontWeight="700"
        fill={textColor}
        letterSpacing="-2"
      >
        Zapfy
      </text>
      <text
        x="125"
        y="86"
        fontFamily="'Geist',system-ui,sans-serif"
        fontSize="14"
        fill={taglineColor}
      >
        agente IA para WhatsApp
      </text>
    </svg>
  );
}
