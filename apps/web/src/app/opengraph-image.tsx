import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'ZapAI — O WhatsApp da sua empresa, com cérebro próprio.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(160deg, #09090b 0%, #18181b 50%, #1e0a3c 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '70px 80px',
          color: '#fafafa',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: '-0.02em',
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              background: '#7C3AED',
            }}
          />
          ZapAI
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div
            style={{
              fontSize: 88,
              fontWeight: 600,
              letterSpacing: '-0.04em',
              lineHeight: 1.02,
              maxWidth: 980,
            }}
          >
            O WhatsApp da sua empresa,
            <br />
            <span
              style={{
                fontStyle: 'italic',
                color: '#7C3AED',
                fontWeight: 400,
                fontFamily: 'serif',
              }}
            >
              com cérebro próprio.
            </span>
          </div>
          <div style={{ fontSize: 26, color: '#a1a1aa', maxWidth: 880 }}>
            Configure conversando com outra IA. Atende, vende e agenda 24/7.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 18,
            color: '#a1a1aa',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          <div>Cloud API oficial · LGPD-friendly</div>
          <div style={{ color: '#7C3AED' }}>zapai.dev</div>
        </div>
      </div>
    ),
    size,
  );
}
