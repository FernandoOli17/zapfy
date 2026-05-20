import { ImageResponse } from 'next/og';

export const runtime = 'edge';

const size = 512;

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
          gap: 40,
          background: 'linear-gradient(160deg, #09090b 0%, #18181b 60%, #052e16 100%)',
        }}
      >
        <div
          style={{
            width: 180,
            height: 180,
            borderRadius: 999,
            background: '#22c55e',
            boxShadow: '0 0 90px rgba(34, 197, 94, 0.6)',
          }}
        />
        <div
          style={{
            fontSize: 88,
            fontWeight: 700,
            color: '#fafafa',
            letterSpacing: '-0.03em',
          }}
        >
          ZapAI
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
