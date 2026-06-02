'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  type IUniform,
  type Mesh,
} from 'three';

/**
 * V9.3 — volumetric spotlight cone. Custom shader uses a compact 3D
 * value-noise (not full simplex, but visually close) to fake dust
 * scatter inside the beam. Additive-blended cone geometry.
 */

const VERT = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const NOISE_GLSL = /* glsl */ `
float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123); }
float vnoise(vec3 p){
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  float n000 = hash(i + vec3(0,0,0));
  float n100 = hash(i + vec3(1,0,0));
  float n010 = hash(i + vec3(0,1,0));
  float n110 = hash(i + vec3(1,1,0));
  float n001 = hash(i + vec3(0,0,1));
  float n101 = hash(i + vec3(1,0,1));
  float n011 = hash(i + vec3(0,1,1));
  float n111 = hash(i + vec3(1,1,1));
  return mix(
    mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y),
    mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y),
    u.z
  );
}`;

const FRAG = /* glsl */ `
precision highp float;
uniform float uTime;
uniform vec3 uColor;
uniform float uIntensity;
varying vec2 vUv;
${NOISE_GLSL}
void main(){
  // Vertical gradient — bright at top (vUv.y near 0 in our flipped cone)
  // → fades toward base.
  float vGrad = pow(1.0 - vUv.y, 1.5);

  // Radial fade — bright at the centre axis, soft at the rim.
  float dist = abs(vUv.x - 0.5) * 2.0;
  float rGrad = pow(1.0 - dist, 1.8);

  // Animated noise dust.
  float dust = vnoise(vec3(vUv * 4.0, uTime * 0.4)) * 0.5 + 0.5;
  dust = pow(dust, 1.5);

  // Vertical shimmer.
  float shimmer = sin(vUv.y * 30.0 - uTime * 2.0) * 0.05 + 0.95;

  float alpha = vGrad * rGrad * (0.5 + dust * 0.5) * shimmer;
  alpha *= uIntensity;

  vec3 color = uColor + vec3(0.0, 0.1, 0.05) * dust;
  gl_FragColor = vec4(color, alpha);
}`;

type BeamUniforms = {
  uTime: IUniform<number>;
  uColor: IUniform<Color>;
  uIntensity: IUniform<number>;
};

type Props = {
  position?: readonly [number, number, number];
  rotation?: readonly [number, number, number];
  height?: number;
  bottomRadius?: number;
  color?: string;
  intensity?: number;
  seed?: number;
};

export function VolumetricBeam({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  height = 8,
  bottomRadius = 3.0,
  color = '#CCFFDD',
  intensity = 0.7,
  seed = 0,
}: Props) {
  const meshRef = useRef<Mesh | null>(null);
  const baseRotZ = rotation[2];

  const uniforms = useMemo<BeamUniforms>(
    () => ({
      uTime: { value: seed },
      uColor: { value: new Color(color) },
      uIntensity: { value: intensity },
    }),
    [color, intensity, seed],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    uniforms.uTime.value = t + seed;
    if (meshRef.current) {
      meshRef.current.rotation.z = baseRotZ + Math.sin(t * 0.5 + seed) * 0.04;
    }
  });

  // Cone geometry: apex at +Y, base at -Y. We position so apex is at the
  // ceiling and the base spreads downward.
  return (
    <mesh
      ref={meshRef}
      position={[position[0], position[1] - height / 2, position[2]]}
      rotation={[Math.PI + rotation[0], rotation[1], rotation[2]]}
      renderOrder={2}
    >
      <coneGeometry args={[bottomRadius, height, 32, 1, true]} />
      <shaderMaterial
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        transparent
        blending={AdditiveBlending}
        side={DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}
