import { ImageResponse } from 'next/og';
import { content } from '@/lib/content';
import { palette } from '@/lib/palette';

export const runtime = 'edge';
export const alt = `${content.hero.name} — ${content.hero.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * 1200×630 OG card. Generated on the edge via next/og — no PNG asset to ship.
 * Layout: name + tagline + headline, with emerald + gold accent rules
 * matching the in-product palette.
 */
export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: palette.void,
          padding: '72px 80px',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              background: palette.emeraldMid,
              boxShadow: `0 0 24px ${palette.emeraldMid}`,
            }}
          />
          <div
            style={{
              fontSize: 16,
              letterSpacing: 8,
              textTransform: 'uppercase',
              color: palette.bone,
            }}
          >
            Portfolio
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div
            style={{
              fontSize: 112,
              fontWeight: 700,
              color: palette.ivory,
              letterSpacing: -2,
              lineHeight: 1.04,
            }}
          >
            {content.hero.name}
          </div>
          <div
            style={{
              fontSize: 28,
              letterSpacing: 6,
              textTransform: 'uppercase',
              color: palette.emeraldMid,
            }}
          >
            {content.hero.tagline}
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 26,
              color: palette.bone,
              maxWidth: 920,
            }}
          >
            {content.hero.headline}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 56, height: 1, background: palette.goldAccent }} />
            <div
              style={{
                fontSize: 14,
                letterSpacing: 6,
                textTransform: 'uppercase',
                color: palette.goldAccent,
              }}
            >
              {content.hero.location}
            </div>
          </div>
          <div
            style={{
              fontSize: 14,
              letterSpacing: 6,
              textTransform: 'uppercase',
              color: palette.bone,
            }}
          >
            nithesh.dev
          </div>
        </div>
      </div>
    ),
    size,
  );
}
