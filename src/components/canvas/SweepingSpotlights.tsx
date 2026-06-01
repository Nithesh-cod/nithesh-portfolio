'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { AdditiveBlending, Color, DoubleSide, type Group, type IUniform } from 'three';
import { palette } from '@/lib/palette';

/**
 * Two cone-shaped light shafts sweeping the floor in opposite directions.
 *
 * Each cone is a tall, narrow cone geometry with a custom shader that fades
 * from the apex out to the rim using the local UV, additively blended.
 * They yaw slowly around the world Y axis, anchored above the scene.
 *
 * This is a *visual* fixture only — no Three.js Light is involved; the shading
 * is fake. Lights are expensive; this looks better at zero cost.
 */
const CONE_RADIUS = 1.6;
const CONE_HEIGHT = 6.0;

const VERT = /* glsl */ `varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAG = /* glsl */ `precision highp float;
varying vec2 vUv;
uniform vec3 uColor;
uniform float uTime;
void main(){
  // vUv.y goes 0 at apex, 1 at base of cone.
  float vert = 1.0 - vUv.y; // 1 near apex, 0 at base
  // soft horizontal feather around the cone seam
  float rim = sin(vUv.x * 3.14159);
  // gentle vertical flicker
  float flick = 0.9 + 0.1 * sin(uTime * 1.7 + vUv.y * 6.0);
  float a = vert * rim * 0.22 * flick;
  gl_FragColor = vec4(uColor, a);
}`;

export function SweepingSpotlights() {
  return (
    <group>
      <Cone direction={1} color={palette.amberKey} pivot={[-4, 5.5, -2]} />
      <Cone direction={-1} color={palette.azureRim} pivot={[4, 5.5, -2]} />
    </group>
  );
}

type ConeUniforms = {
  uColor: IUniform<Color>;
  uTime: IUniform<number>;
};

function Cone({
  direction,
  color,
  pivot,
}: {
  direction: 1 | -1;
  color: string;
  pivot: [number, number, number];
}) {
  const groupRef = useRef<Group>(null);
  const uniforms = useMemo<ConeUniforms>(
    () => ({ uColor: { value: new Color(color) }, uTime: { value: 0 } }),
    [color],
  );
  const t = useRef(Math.random() * Math.PI * 2);
  useFrame((_, dt) => {
    t.current += dt * 0.25 * direction;
    uniforms.uTime.value += dt;
    if (groupRef.current) {
      // Sweep yaw between -0.45 and +0.45 rad (~ ±26°). Tilt is fixed so the
      // beam always points at the floor.
      groupRef.current.rotation.y = Math.sin(t.current) * 0.45;
    }
  });

  return (
    <group ref={groupRef} position={pivot}>
      {/* Cone apex is at local origin; rotate 180° so apex points down. */}
      <mesh rotation={[Math.PI, 0, 0]} position={[0, -CONE_HEIGHT / 2, 0]} renderOrder={-1}>
        <coneGeometry args={[CONE_RADIUS, CONE_HEIGHT, 32, 1, true]} />
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
    </group>
  );
}
