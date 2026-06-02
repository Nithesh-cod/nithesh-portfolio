'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import { Color } from 'three';
import { palette } from '@/lib/palette';

const VERT = /* glsl */ `varying vec2 vUv; varying vec3 vWorld;
void main(){
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const FRAG = /* glsl */ `precision highp float;
varying vec2 vUv;
varying vec3 vWorld;
uniform vec3 uBase;
uniform vec3 uEdge;
uniform float uTime;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

// Hex SDF — returns vec4(localPos.xy, dist, cellId).
vec4 hexCell(vec2 p, float r){
  vec2 s = vec2(1.0, 1.7320508);
  vec2 hC = vec2(r * s.x, r * s.y);
  vec2 a = mod(p, hC) - hC * 0.5;
  vec2 b = mod(p - hC * 0.5, hC) - hC * 0.5;
  vec2 gv = dot(a, a) < dot(b, b) ? a : b;
  vec2 id = (p - gv) / hC;
  vec2 ap = abs(gv) / r;
  float d = max(ap.x + ap.y * 0.5, ap.y * 0.866);
  return vec4(gv, d, hash(floor(id * 100.0)));
}

void main(){
  vec2 p = vWorld.xz;
  float r = 0.55;
  vec4 c = hexCell(p, r);
  float d = c.z;
  float id = c.w;

  float rad = length(p);

  // Edge glow.
  float edge = smoothstep(0.86, 0.93, d) * (1.0 - smoothstep(0.96, 1.0, d));

  // ~15 % active hexes pulse.
  float active = step(0.85, id);
  float pulse = 0.4 + 0.4 * sin(uTime * 1.4 + id * 12.0);
  float fill = active * pulse * (1.0 - d) * 0.08;

  vec3 col = uBase;
  col += uEdge * edge * 1.1;
  col += uEdge * fill * 4.0;

  float a = 1.0 - smoothstep(7.0, 19.0, rad);
  gl_FragColor = vec4(col, a);
}`;

export function HexFloor() {
  const uniforms = useMemo(
    () => ({
      uBase: { value: new Color('#030608') },
      uEdge: { value: new Color(palette.neonGreen) },
      uTime: { value: 0 },
    }),
    [],
  );
  useFrame((_, dt) => {
    uniforms.uTime.value += dt;
  });
  return (
    <>
      {/* Reflective base disc for spotlights to catch. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
        <circleGeometry args={[20, 64]} />
        <meshPhysicalMaterial
          color="#020406"
          metalness={0.7}
          roughness={0.25}
          clearcoat={1.0}
          clearcoatRoughness={0.2}
          reflectivity={0.5}
        />
      </mesh>
      {/* Hex grid overlay. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <planeGeometry args={[44, 44, 1, 1]} />
        <shaderMaterial
          vertexShader={VERT}
          fragmentShader={FRAG}
          uniforms={uniforms}
          transparent
          depthWrite={false}
        />
      </mesh>
    </>
  );
}
