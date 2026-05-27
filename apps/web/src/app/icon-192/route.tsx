import { ImageResponse } from 'next/og';

export const runtime = 'edge';

const size = 192;

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
          gap: 14,
          background: 'linear-gradient(160deg, #05070f 0%, #0b1024 60%, #0d2547 100%)',
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 999,
            background: '#60A5FA',
            boxShadow: '0 0 40px rgba(96, 165, 250, 0.65)',
          }}
        />
        <div
          style={{
            fontSize: 34,
            fontWeight: 700,
            color: '#fafafa',
            letterSpacing: '-0.03em',
          }}
        >
          Trato
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
