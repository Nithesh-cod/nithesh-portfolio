import { Data3DTexture, LinearFilter, RGBAFormat, UnsignedByteType } from 'three';

/**
 * Classic "orange & teal" cinema grade.
 *   shadows    (luma < 0.25)  → pulled toward dark teal-green   (#07261F)
 *   mids       (0.25–0.70)    → NOT tinted; lightly desaturated (skin tone stays)
 *   highlights (luma > 0.70)  → pulled toward warm cream         (#F5D89A)
 * Then a mild S-curve via smoothstep(-0.08, 1.08, x) for extra contrast.
 *
 * The deliberately neutral mid-band is the whole point — without it every
 * skin tone, every off-white pocket square, every grey panel collapses
 * toward the shadow tint and the picture goes monochrome.
 */
export function buildEmeraldLut(size = 32): Data3DTexture {
  const data = new Uint8Array(size ** 3 * 4);

  // V7.0 — shadows toward night-warm (#1A1A2A) at 0.25 strength, highlights
  // toward ivory-warm (#F0EAD8) at 0.12. Subtle warm-cool cinematic grade
  // with no green wash and no blue dominance.
  const shadowTint: [number, number, number] = [0x1a / 255, 0x1a / 255, 0x2a / 255];
  const highlightTint: [number, number, number] = [0xf0 / 255, 0xea / 255, 0xd8 / 255];

  // smoothstep(-0.08, 1.08, x) — a tiny shoulder + toe S-curve.
  const sCurve = (x: number) => {
    const t = Math.max(0, Math.min(1, (x - -0.08) / (1.08 - -0.08)));
    return t * t * (3 - 2 * t);
  };

  for (let z = 0; z < size; z++) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (z * size * size + y * size + x) * 4;

        let r = x / (size - 1);
        let g = y / (size - 1);
        let b = z / (size - 1);

        const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;

        if (luma < 0.25) {
          // Shadows: pull toward night-warm at 0.25 strength.
          const t = 0.25;
          r = r + (shadowTint[0] - r) * t;
          g = g + (shadowTint[1] - g) * t;
          b = b + (shadowTint[2] - b) * t;
        } else if (luma < 0.7) {
          // Mids: lightly desaturate; do NOT tint.
          const sat = 0.92;
          r = luma + (r - luma) * sat;
          g = luma + (g - luma) * sat;
          b = luma + (b - luma) * sat;
        } else {
          // Highlights: pull toward ivory-warm at 0.12 strength.
          const t = 0.12;
          r = r + (highlightTint[0] - r) * t;
          g = g + (highlightTint[1] - g) * t;
          b = b + (highlightTint[2] - b) * t;
        }

        r = sCurve(r);
        g = sCurve(g);
        b = sCurve(b);

        data[idx + 0] = Math.round(Math.max(0, Math.min(1, r)) * 255);
        data[idx + 1] = Math.round(Math.max(0, Math.min(1, g)) * 255);
        data[idx + 2] = Math.round(Math.max(0, Math.min(1, b)) * 255);
        data[idx + 3] = 255;
      }
    }
  }

  const tex = new Data3DTexture(data, size, size, size);
  tex.format = RGBAFormat;
  tex.type = UnsignedByteType;
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.unpackAlignment = 1;
  tex.needsUpdate = true;
  return tex;
}
