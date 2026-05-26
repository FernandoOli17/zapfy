import { ImageResponse } from 'next/og';

import { getPost } from '@/lib/blog';

export const runtime = 'nodejs';
export const alt = 'Post no blog Orbe';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

interface Props {
  params: { slug: string };
}

export default async function BlogOG({ params }: Props) {
  const post = await getPost(params.slug);
  const title = post?.title ?? 'Orbe';
  const description = post?.description ?? '';
  const date = post?.publishedAt ?? '';
  const author = post?.author ?? '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(160deg, #05070f 0%, #0b1024 60%, #0d2547 100%)',
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
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: '-0.02em',
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              background: '#60A5FA',
            }}
          />
          Orbe Blog
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div
            style={{
              fontSize: 60,
              fontWeight: 600,
              letterSpacing: '-0.03em',
              lineHeight: 1.05,
              maxWidth: 1040,
            }}
          >
            {title}
          </div>
          {description && (
            <div
              style={{
                fontSize: 24,
                color: '#a1a1aa',
                maxWidth: 1040,
                lineHeight: 1.4,
              }}
            >
              {description}
            </div>
          )}
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
          <div>
            {author}
            {date ? ` · ${date}` : ''}
          </div>
          <div style={{ color: '#60A5FA' }}>Orbe.dev</div>
        </div>
      </div>
    ),
    size,
  );
}
