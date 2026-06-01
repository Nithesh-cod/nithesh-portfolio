'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { AdditiveBlending, Color, type Group } from 'three';
import { HOLOGRAM_POS, waypoints } from '@/lib/content';
import { palette } from '@/lib/palette';
import { usePortfolioStore } from '@/lib/store';

/**
 * 3 cone meshes above the hologram acting as volumetric light shafts. Additive,
 * vertical alpha gradient via a tiny shader. Section-gated to the portrait
 * waypoint ±1 so the cones don't bloom into other zones.
 */
const PORTRAIT_WP_IDX = waypoints.findIndex((w) => w.id === 'portrait');

const SHAFT_VERT = /* glsl */ `varying float vY;
void main(){
  vY = position.y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

// Top of the cone is opaque-ish, bottom fades to 0. Cone has its tip at y=0,
// base at y=-CONE_H. So vY < 0; map to alpha.
const SHAFT_FRAG = /* glsl */ `varying float vY;
uniform vec3 uColor;
uniform float uHeight;
void main(){
  float t = clamp(-vY / uHeight, 0.0, 1.0); // 0 at tip, 1 at base
  float a = (1.0 - t) * 0.10;               // fade out toward base
  gl_FragColor = vec4(uColor, a);
}`;

export function VolumetricShafts() {
  const section = usePortfolioStore((s) => s.section);
  const groupRef = useRef<Group>(null);

  useFrame((_, dt) => {
    if (groupRef.current) groupRef.current.rotation.y += dt * 0.04; // slow 2°/s ish
  });

  const CONE_H = 3.0;
  const uniforms = useMemo(
    () => ({
      uColor: { value: new Color(palette.emeraldGlow) },
      uHeight: { value: CONE_H },
    }),
    [],
  );

  if (Math.abs(section - PORTRAIT_WP_IDX) > 1) return null;

  return (
    <group ref={groupRef} position={[HOLOGRAM_POS[0], HOLOGRAM_POS[1] + 2.0, HOLOGRAM_POS[2]]}>
      {([-0.7, 0, 0.7] as const).map((x, i) => (
        <mesh
          key={i}
          position={[x, -CONE_H / 2, 0]}
          // Tip up by default; rotate so the cone hangs DOWN.
          rotation={[Math.PI, 0, 0]}
        >
          <coneGeometry args={[0.55, CONE_H, 24, 1, true]} />
          <shaderMaterial
            vertexShader={SHAFT_VERT}
            fragmentShader={SHAFT_FRAG}
            uniforms={uniforms}
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}
