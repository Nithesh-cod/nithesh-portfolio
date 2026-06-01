'use client';

import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { type Group } from 'three';
import { palette } from '@/lib/palette';
import { disableRaycast, noRaycast } from '@/lib/three-utils';

// 30 short technical strings — they drift upward, fade in, fade out, and respawn.
// Pure ambience; raycast disabled so they can never block clicks.
const GLYPHS = [
  'fn()',
  'async',
  '0xFF',
  'await',
  'React',
  'tsx',
  'GET /',
  '200 OK',
  'POST',
  'JWT',
  'edge',
  'LLM',
  'RAG',
  'pnpm',
  'next',
  'esm',
  'css',
  'rgba',
  'glsl',
  'hsl()',
  'mat4',
  'vec3',
  'arr[]',
  'NaN',
  '<svg/>',
  'flex',
  'grid',
  'idx',
  'env',
  'hash',
] as const;

const COUNT = GLYPHS.length;

type GlyphState = {
  base: [number, number, number];
  amp: number;
  phase: number;
  speed: number;
  yStart: number;
  yEnd: number;
  cycle: number; // seconds for full top→reset
};

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function FloatingGlyphs() {
  const groupRef = useRef<Group>(null);
  const refs = useRef<(Group | null)[]>([]);

  // Pre-randomise positions / motion so the layout is stable across re-renders
  // but feels lively across the whole 20×8 volume around the scene.
  const states = useMemo<GlyphState[]>(
    () =>
      Array.from({ length: COUNT }, () => ({
        base: [rand(-9, 9), rand(0, 0.6), rand(-14, -2)],
        amp: rand(0.1, 0.5),
        phase: rand(0, Math.PI * 2),
        speed: rand(0.3, 0.9),
        yStart: rand(-0.5, 0.5),
        yEnd: rand(4.5, 6.5),
        cycle: rand(7, 14),
      })),
    [],
  );

  // Per-glyph t-offset so they don't all reset on the same beat.
  const offsets = useMemo(() => states.map(() => Math.random()), [states]);
  const t = useRef(0);

  useFrame((_, dt) => {
    t.current += dt;
    for (let i = 0; i < COUNT; i++) {
      const g = refs.current[i];
      const s = states[i];
      const off = offsets[i];
      if (!g || !s || off === undefined) continue;
      const u = ((t.current / s.cycle) + off) % 1;
      // y position lerps yStart→yEnd over the cycle
      const y = s.yStart + (s.yEnd - s.yStart) * u;
      // gentle horizontal sway
      const swayX = Math.sin(t.current * s.speed + s.phase) * s.amp;
      g.position.set(s.base[0] + swayX, y, s.base[2]);
      // alpha: fade in for first 20%, hold, fade out last 25%
      const fadeIn = Math.min(1, u / 0.2);
      const fadeOut = Math.min(1, (1 - u) / 0.25);
      const alpha = Math.max(0, Math.min(fadeIn, fadeOut));
      // troika Text exposes fillOpacity on the material; we drive it via the
      // group's child[0] material if present.
      const mat = (g.children[0] as { material?: { opacity?: number; transparent?: boolean } } | undefined)?.material;
      if (mat) {
        mat.opacity = alpha * 0.55;
        mat.transparent = true;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {states.map((_, i) => (
        <group key={i} ref={(el) => { refs.current[i] = el; }}>
          <Text
            raycast={noRaycast}
            ref={disableRaycast}
            fontSize={0.085}
            color={i % 7 === 0 ? palette.goldAccent : palette.emeraldGlow}
            anchorX="center"
            anchorY="middle"
            letterSpacing={0.1}
          >
            {GLYPHS[i % GLYPHS.length]}
          </Text>
        </group>
      ))}
    </group>
  );
}
