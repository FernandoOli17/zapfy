import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/**
 * Apple touch icon 180×180 — homescreen iOS.
 * Balão verde brand grande com raio preto + wordmark "Zapfy" abaixo.
 */
export default function AppleIcon() {
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
          gap: 14,
          background: '#0a0a0a',
        }}
      >
        <div
          style={{
            width: 84,
            height: 84,
            borderRadius: 20,
            background: '#00E676',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width={58} height={58} viewBox="0 0 32 32">
            <path d="M22 7 L14 18 L18 18 L11 28 L23 17 L19 17 Z" fill="#0a0a0a" />
          </svg>
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: '#fafafa',
            letterSpacing: '-0.03em',
          }}
        >
          Zapfy
        </div>
      </div>
    ),
    size,
  );
}
