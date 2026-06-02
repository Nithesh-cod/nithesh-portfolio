'use client';

import { useMemo } from 'react';
import { BackSide, Color } from 'three';
import { palette } from '@/lib/palette';

/**
 * V9.0 — Lab is now just the deep-space sky sphere. The hex floor lives
 * in HexFloor.tsx, the central capsule + project pedestals are direct
 * Scene children. No FogParticles either — V9 uses drei <Sparkles> + the
 * FloatingDataGlyphs layer instead.
 */
export function Lab() {
  return <Sky />;
}

const SKY_VERT = /* glsl */ `varying vec3 vDir;
void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const SKY_FRAG = /* glsl */ `varying vec3 vDir;
uniform vec3 uBase;
uniform vec3 uTop;
uniform vec3 uHorizon;
void main(){
  vec3 d = normalize(vDir);
  float t = clamp(d.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 col = mix(uBase, uTop, smoothstep(0.55, 1.0, t));
  float band = exp(-pow((t - 0.45) * 5.5, 2.0));
  col = mix(col, uHorizon, band * 0.08);
  gl_FragColor = vec4(col, 1.0);
}`;

function Sky() {
  const uniforms = useMemo(
    () => ({
      uBase:    { value: new Color(palette.bgBase) },
      uTop:     { value: new Color('#020610') },
      uHorizon: { value: new Color(palette.neonDim) },
    }),
    [],
  );
  return (
    <mesh>
      <sphereGeometry args={[80, 32, 16]} />
      <shaderMaterial
        vertexShader={SKY_VERT}
        fragmentShader={SKY_FRAG}
        uniforms={uniforms}
        side={BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}
