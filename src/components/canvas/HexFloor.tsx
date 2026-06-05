'use client';

import { MeshReflectorMaterial } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import { AdditiveBlending, DoubleSide, type IUniform } from 'three';

/**
 * V9.3 — true reflective floor via drei <MeshReflectorMaterial> + a hex
 * tile overlay shader sitting 1 mm above it (additive blend). The
 * reflector samples the scene into a render target so spotlights + the
 * capsule actually reflect in the floor.
 */

const VERT = /* glsl */ `varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const FRAG = /* glsl */ `
precision highp float;
uniform float uTime;
varying vec2 vUv;

vec2 hexCoord(vec2 p){
  p *= 20.0;
  vec2 r = vec2(1.0, 1.7320508);
  vec2 h = r * 0.5;
  vec2 a = mod(p, r) - h;
  vec2 b = mod(p - h, r) - h;
  return dot(a, a) < dot(b, b) ? a : b;
}

// World-space distance from centre (UV 0.5,0.5). Plane is 40×40, so
// 0.5 UV = 20 world units. Returns world-radius from centre.
float worldRadius(vec2 uv) {
  vec2 p = (uv - 0.5) * 40.0;
  return length(p);
}

void main(){
  // ── Hex tile pattern. ──────────────────────────────────────────
  vec2 hex = hexCoord(vUv - 0.5);
  float dist = length(hex);
  float edge = smoothstep(0.42, 0.45, dist) - smoothstep(0.45, 0.48, dist);
  vec2 cellId = floor((vUv - 0.5) * 20.0);
  float rand = fract(sin(dot(cellId, vec2(12.9898, 78.233))) * 43758.5453);
  float active = step(0.96, rand);
  float pulse = sin(uTime * 1.5 + rand * 6.28) * 0.5 + 0.5;
  float interior = (1.0 - smoothstep(0.0, 0.4, dist)) * active * pulse * 0.18;
  float fade = 1.0 - smoothstep(0.3, 0.5, length(vUv - 0.5));

  float hexAlpha = (edge * 0.55 + interior) * fade;

  // ── V12.4 simplified capsule rings: 1 main + 1 inner pulse. ────
  // Main ring at r=1.6 (matches outermost pedestal tier).
  // Inner ring at r=1.2 with stronger pulse.
  float wr = worldRadius(vUv);
  float ringW = 0.05;
  float ringMain  = (1.0 - smoothstep(0.0, ringW, abs(wr - 1.6))) * 0.80;
  float ringInner = (1.0 - smoothstep(0.0, ringW * 0.6, abs(wr - 1.2)))
                  * (0.40 + 0.50 * (0.5 + 0.5 * sin(uTime * 2.0)));
  float ringsAlpha = (ringMain + ringInner) * 0.65;

  // ── V12.1 centre disc directly under the capsule (bright glow). ─
  float centreGlow = (1.0 - smoothstep(0.0, 1.5, wr)) * (0.4 + 0.2 * sin(uTime * 1.6));

  // ── V12.5 walking-path lines from camera entry (z≈12) to capsule. ──
  // Three subtle linear accents on the floor pointing toward the
  // capsule from the camera side: one straight + two angled toward
  // the project trio.
  vec2 worldPos = (vUv - 0.5) * 40.0;
  // Straight centre path — narrow band along x=0, restricted to z>0.
  float centrePath = (1.0 - smoothstep(0.0, 0.10, abs(worldPos.x)))
                   * smoothstep(0.0, 1.5, worldPos.y)
                   * (1.0 - smoothstep(1.5, 10.0, worldPos.y));
  // Two angled paths converging on the project pedestal arc.
  // worldPos.x ≈ ±worldPos.y at ±45° → use abs(worldPos.x - 0.7*worldPos.y).
  float diagL = (1.0 - smoothstep(0.0, 0.08, abs(worldPos.x + 0.55 * worldPos.y)))
              * smoothstep(0.0, 1.5, worldPos.y)
              * (1.0 - smoothstep(2.0, 8.0, worldPos.y));
  float diagR = (1.0 - smoothstep(0.0, 0.08, abs(worldPos.x - 0.55 * worldPos.y)))
              * smoothstep(0.0, 1.5, worldPos.y)
              * (1.0 - smoothstep(2.0, 8.0, worldPos.y));
  float pathAlpha = (centrePath * 0.15 + diagL * 0.08 + diagR * 0.08);

  vec3 color = vec3(0.18, 1.00, 0.70); // V11.2 cyan-shifted primary
  float alpha = hexAlpha + ringsAlpha + centreGlow * 0.5 + pathAlpha;
  gl_FragColor = vec4(color * alpha, alpha);
}`;

export function HexFloor() {
  const overlayUniforms = useMemo<{ uTime: IUniform<number> }>(
    () => ({ uTime: { value: 0 } }),
    [],
  );
  useFrame((state) => {
    overlayUniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <>
      {/* Reflective base. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <MeshReflectorMaterial
          blur={[300, 80]}
          resolution={1024}
          mixBlur={1.0}
          mixStrength={1.5}
          mirror={0.78}
          metalness={0.65}
          roughness={0.25}
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#060912"
          envMapIntensity={0.55}
        />
      </mesh>

      {/* Hex pattern overlay — additive on top of reflection. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <planeGeometry args={[40, 40]} />
        <shaderMaterial
          vertexShader={VERT}
          fragmentShader={FRAG}
          uniforms={overlayUniforms}
          transparent
          blending={AdditiveBlending}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
    </>
  );
}
