'use client';

import { MeshReflectorMaterial } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import { AdditiveBlending, DoubleSide, type IUniform } from 'three';
import { ROOM } from '@/components/canvas/OvalRoom';
import { usePortfolioStore } from '@/lib/store';
import { noRaycast } from '@/lib/three-utils';

/* Glossy reflective floor + additive overlay: large square tiles, rings
 * around the avatar, and a neon line tracing the base of the oval wall. */

const VERT = /* glsl */ `
varying vec2 vWorld;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const FRAG = /* glsl */ `
precision highp float;
varying vec2 vWorld;
uniform float uTime;
uniform vec3 uOval; // rx, rz, cz

float ring(float r, float at, float w) { return 1.0 - smoothstep(0.0, w, abs(r - at)); }

void main(){
  vec2 p = vWorld;
  float r = length(p);
  float e = length(vec2(p.x / uOval.x, (p.y - uOval.z) / uOval.y)); // 1.0 on the wall

  // Large square tiles, fading toward the wall.
  vec2 g = abs(fract(p / 2.4 + 0.5) - 0.5) * 2.4;
  float grid = (1.0 - smoothstep(0.0, 0.035, min(g.x, g.y))) * 0.22;
  grid *= 1.0 - smoothstep(0.55, 0.98, e);

  // Concentric rings around the avatar plinth.
  float pulse = 0.5 + 0.5 * sin(uTime * 1.8);
  float rings = ring(r, 1.65, 0.05) * 0.75
              + ring(r, 2.35, 0.035) * (0.25 + 0.45 * pulse)
              + ring(r, 3.3, 0.03) * 0.22
              + ring(r, 4.6, 0.025) * 0.10;
  float centre = (1.0 - smoothstep(0.0, 1.6, r)) * (0.35 + 0.15 * sin(uTime * 1.6));

  // Neon trace along the wall base, plus a soft spill onto the floor.
  float wallLine = ring(e, 0.985, 0.006) * 0.9 + (1.0 - smoothstep(0.0, 0.08, abs(e - 0.96))) * 0.06;
  float inside = 1.0 - smoothstep(1.0, 1.02, e);

  float alpha = (grid + rings + centre * 0.5) * inside + wallLine;
  vec3 color = vec3(0.18, 1.0, 0.70);
  gl_FragColor = vec4(color * alpha, alpha);
}`;

export function ReflectiveFloor() {
  const lowPerf = usePortfolioStore((s) => s.perfMode === 'low');
  const uniforms = useMemo<Record<string, IUniform>>(
    () => ({
      uTime: { value: 0 },
      uOval: { value: [ROOM.rx, ROOM.rz, ROOM.cz] },
    }),
    [],
  );
  useFrame((s) => {
    uniforms.uTime!.value = s.clock.elapsedTime;
  });

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow raycast={noRaycast}>
        <planeGeometry args={[44, 44]} />
        {lowPerf ? (
          <meshStandardMaterial color="#060912" metalness={0.7} roughness={0.3} envMapIntensity={0.6} />
        ) : (
          <MeshReflectorMaterial
            blur={[260, 70]}
            resolution={1024}
            mixBlur={1.0}
            mixStrength={2.4}
            mirror={0.85}
            metalness={0.72}
            roughness={0.18}
            depthScale={1.2}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.4}
            color="#05080E"
            envMapIntensity={0.6}
          />
        )}
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} raycast={noRaycast}>
        <planeGeometry args={[44, 44]} />
        <shaderMaterial
          vertexShader={VERT}
          fragmentShader={FRAG}
          uniforms={uniforms}
          transparent
          blending={AdditiveBlending}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
    </>
  );
}
