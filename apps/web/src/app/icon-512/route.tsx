import { ImageResponse } from 'next/og';

export const runtime = 'edge';

const size = 512;

/**
 * PWA icon 512×512 — splash screen + store.
 * Brand Zapfy: balão verde grande com raio preto + wordmark abaixo.
 */
export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 36,
          background: '#0a0a0a',
        }}
      >
        <div
          style={{
            width: 240,
            height: 240,
            borderRadius: 60,
            background: '#00E676',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width={170} height={170} viewBox="0 0 32 32">
            <path d="M22 7 L14 18 L18 18 L11 28 L23 17 L19 17 Z" fill="#0a0a0a" />
          </svg>
        </div>
        <div
          style={{
            fontSize: 88,
            fontWeight: 700,
            color: '#fafafa',
            letterSpacing: '-0.03em',
          }}
        >
          Zapfy
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
