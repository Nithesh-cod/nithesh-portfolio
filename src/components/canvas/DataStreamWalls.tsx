'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import { AdditiveBlending, Color, DoubleSide, type IUniform } from 'three';
import { palette } from '@/lib/palette';

/**
 * Far-back vertical panels rendering a procedural "data rain" — falling
 * emerald glyphs (Matrix-style) generated entirely in the fragment shader so
 * we never have to load a glyph atlas.
 *
 * 6 panels arranged in a wide curtain ~17 units deep along -Z. Additively
 * blended so they read as light, not surface. Faded toward the floor + ceiling
 * to feel like a shaft, not a wall.
 *
 * Each panel gets its own seed offset so the columns never line up between
 * panels — that would give the illusion away.
 */
// V2.6: 3 walls (down from 6), pulled further back, spaced wider.
const PANEL_COUNT = 3;
const PANEL_W = 4.5;
const PANEL_H = 7.0;
const PANEL_Z = -22;

const VERT = /* glsl */ `varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
}`;

// Cell-based pseudo glyph: each cell is a 3×5 pixel mask, randomised per row
// and per time-step. We use hash-based randomness on (col, floor(row + t)).
const FRAG = /* glsl */ `precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform float uSeed;
uniform vec3 uColor;
uniform vec3 uHot;

float hash(vec2 p){
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main(){
  // 32 columns × 56 rows of "glyphs".
  vec2 grid = vec2(32.0, 56.0);
  vec2 g = vUv * grid;
  vec2 cell = floor(g);
  vec2 frac = fract(g);

  // Each column scrolls down at a slightly different speed.
  // V2.6: reduced 30% — ambient, not chaotic.
  float colSpeed = (0.4 + hash(vec2(cell.x, uSeed)) * 1.4) * 0.7;
  float scrolled = cell.y + uTime * colSpeed;
  float row = floor(scrolled);

  // Per-cell glyph: 3×5 binary mask from a hash.
  vec2 sub = floor(frac * vec2(3.0, 5.0));
  float maskRng = hash(vec2(cell.x * 7.0 + sub.x, row * 13.0 + sub.y + uSeed));
  float mask = step(0.45, maskRng);

  // Brightness profile: the head of the trail is hot, the tail dims with row offset.
  float head = hash(vec2(cell.x + uSeed * 3.0, floor(uTime * 0.4 + cell.x))) * grid.y;
  float dist = mod(scrolled - head, grid.y);
  float trail = exp(-dist * 0.18);

  vec3 col = mix(uColor, uHot, smoothstep(0.7, 1.0, trail));
  // V2.6: cut peak alpha from 0.85 → 0.18 (~3× less) and apply a vertical
  // gradient so the top of the panel is faintly visible (0.06) and the bottom
  // fades to almost nothing (0.01) — reads ambient, not dominant.
  float vGrad = mix(0.06, 0.01, 1.0 - vUv.y);
  float alpha = mask * trail * vGrad;

  // Vertical fade — top + bottom 12% feather toward 0 so the panel reads as
  // a shaft, not a hard rectangle.
  float top = smoothstep(1.0, 0.88, vUv.y);
  float bot = smoothstep(0.0, 0.12, vUv.y);
  alpha *= top * bot;

  gl_FragColor = vec4(col, alpha);
}`;

export function DataStreamWalls() {
  return (
    <group position={[0, PANEL_H / 2 - 0.2, PANEL_Z]}>
      {Array.from({ length: PANEL_COUNT }, (_, i) => {
        // 3 panels: centre + two flanks with a wide gap between them.
        const t = i / (PANEL_COUNT - 1) - 0.5;
        const x = t * 14;
        const z = Math.abs(t) * 3.0; // mild curtain curve toward camera at edges
        return <Panel key={i} position={[x, 0, z]} seed={i * 7.13 + 1.4} />;
      })}
    </group>
  );
}

type WallUniforms = {
  uTime: IUniform<number>;
  uSeed: IUniform<number>;
  uColor: IUniform<Color>;
  uHot: IUniform<Color>;
};

function Panel({ position, seed }: { position: [number, number, number]; seed: number }) {
  const uniforms = useMemo<WallUniforms>(
    () => ({
      uTime: { value: 0 },
      uSeed: { value: seed },
      uColor: { value: new Color(palette.emeraldDim) },
      uHot: { value: new Color(palette.emeraldHot) },
    }),
    [seed],
  );
  useFrame((_, dt) => {
    uniforms.uTime.value += dt;
  });
  return (
    <mesh position={position} renderOrder={-2}>
      <planeGeometry args={[PANEL_W, PANEL_H]} />
      <shaderMaterial
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={DoubleSide}
        blending={AdditiveBlending}
      />
    </mesh>
  );
}
