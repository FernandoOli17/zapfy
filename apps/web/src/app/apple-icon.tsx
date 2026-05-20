import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

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
          gap: 12,
          background: 'linear-gradient(160deg, #09090b 0%, #18181b 60%, #052e16 100%)',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 999,
            background: '#22c55e',
            boxShadow: '0 0 32px rgba(34, 197, 94, 0.5)',
          }}
        />
        <div
          style={{
            fontSize: 30,
            fontWeight: 700,
            color: '#fafafa',
            letterSpacing: '-0.03em',
          }}
        >
          ZapAI
        </div>
      </div>
    ),
    size,
  );
}
