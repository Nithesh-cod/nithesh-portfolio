'use client';

import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { type Group } from 'three';
import { palette } from '@/lib/palette';
import { disableRaycast, noRaycast } from '@/lib/three-utils';

const GLYPHS = [
  '0x7F', 'DATA', 'SYNC', 'AI', 'REACT', 'NEXT',
  'fn()', 'JWT', '200 OK', 'glsl', 'tsx', 'vec3',
] as const;
const COUNT = 16;

function rand(a: number, b: number) { return a + Math.random() * (b - a); }

type GlyphState = {
  glyph: string;
  base: [number, number, number];
  cycle: number;
  yStart: number;
  yEnd: number;
  offset: number;
};

export function FloatingDataGlyphs() {
  const refs = useRef<(Group | null)[]>([]);
  const t = useRef(0);

  const states = useMemo<GlyphState[]>(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        glyph: GLYPHS[i % GLYPHS.length]!,
        base: [rand(-7, 7), 0, rand(-5, 4)],
        cycle: rand(8, 16),
        yStart: rand(0.5, 1.5),
        yEnd: rand(5, 7),
        offset: Math.random(),
      })),
    [],
  );

  useFrame((_, dt) => {
    t.current += dt;
    for (let i = 0; i < COUNT; i++) {
      const g = refs.current[i];
      const s = states[i];
      if (!g || !s) continue;
      const u = (t.current / s.cycle + s.offset) % 1;
      g.position.set(s.base[0], s.yStart + (s.yEnd - s.yStart) * u, s.base[2]);
      const fadeIn = Math.min(1, u / 0.2);
      const fadeOut = Math.min(1, (1 - u) / 0.25);
      const a = Math.max(0, Math.min(fadeIn, fadeOut));
      const mat = (g.children[0] as { material?: { opacity?: number; transparent?: boolean } } | undefined)?.material;
      if (mat) {
        mat.opacity = a * 0.35;
        mat.transparent = true;
      }
    }
  });

  return (
    <group>
      {states.map((s, i) => (
        <group key={i} ref={(el) => { refs.current[i] = el; }}>
          <Text
            raycast={noRaycast}
            ref={disableRaycast}
            fontSize={0.07}
            color={palette.neonGreen}
            anchorX="center"
            anchorY="middle"
            letterSpacing={0.1}
          >
            {s.glyph}
          </Text>
        </group>
      ))}
    </group>
  );
}
