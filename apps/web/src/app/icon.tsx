import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

/**
 * Favicon Zapfy 32×32: fundo verde brand (#00E676) com raio preto.
 * Mesma identidade do ZapfyLogo variant="icon".
 */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#00E676',
          borderRadius: 8,
        }}
      >
        <svg width={22} height={22} viewBox="0 0 32 32">
          <path d="M22 7 L14 18 L18 18 L11 28 L23 17 L19 17 Z" fill="#0a0a0a" />
        </svg>
      </div>
    ),
    size,
  );
}
