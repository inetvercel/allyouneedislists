import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get('title') || 'All You Need Is Lists'
  const category = searchParams.get('category') || ''

  const fontSize = title.length > 70 ? 38 : title.length > 50 ? 46 : 56

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: '#0D0D0D',
          padding: '0',
          position: 'relative',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Red top bar */}
        <div style={{ width: '100%', height: '8px', background: '#E63946', flexShrink: 0 }} />

        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            padding: '56px 80px 48px',
          }}
        >
          {/* Brand header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: 'auto' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                background: '#E63946',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                fontWeight: 900,
                color: 'white',
              }}
            >
              #
            </div>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.3px' }}>
              All You Need Is Lists
            </span>
          </div>

          {/* Title block */}
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: '32px' }}>
            {category && (
              <div
                style={{
                  color: '#E63946',
                  fontSize: '15px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '4px',
                  marginBottom: '18px',
                }}
              >
                {category}
              </div>
            )}
            <div
              style={{
                color: '#FFFFFF',
                fontSize: `${fontSize}px`,
                fontWeight: 900,
                lineHeight: 1.18,
                maxWidth: '960px',
                letterSpacing: '-0.5px',
              }}
            >
              {title}
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '56px',
              paddingTop: '28px',
              borderTop: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '16px', fontWeight: 500 }}>
              allyouneedislists.com
            </span>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(230,57,70,0.12)',
                border: '1px solid rgba(230,57,70,0.3)',
                borderRadius: '20px',
                padding: '6px 16px',
              }}
            >
              <span style={{ color: '#E63946', fontSize: '14px', fontWeight: 700 }}>
                The Best Lists on the Internet
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
