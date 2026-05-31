import { ImageResponse } from 'next/og';
import { palette } from '@/lib/palette';

export const runtime = 'edge';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** 180×180 apple-touch-icon — emerald-mid square with thin gold inner frame. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: palette.void,
        }}
      >
        <div
          style={{
            width: 132,
            height: 132,
            background: palette.emeraldMid,
            border: `2px solid ${palette.goldAccent}`,
            borderRadius: 24,
            boxShadow: `0 0 48px ${palette.emeraldMid}66`,
          }}
        />
      </div>
    ),
    size,
  );
}
