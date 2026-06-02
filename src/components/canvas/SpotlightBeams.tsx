'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import { AdditiveBlending, Color, DoubleSide, type IUniform } from 'three';

const VERT = /* glsl */ `varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const FRAG = /* glsl */ `precision highp float;
varying vec2 vUv;
uniform vec3 uColor;
uniform float uTime;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
void main(){
  float top = 1.0 - vUv.y;
  float rim = sin(vUv.x * 3.14159);
  float dust = 0.85 + 0.15 * hash(floor(vUv * 80.0 + uTime * 0.3));
  float a = top * rim * 0.30 * dust;
  a *= mix(0.6, 1.4, top);
  gl_FragColor = vec4(uColor, a);
}`;

type BeamSpec = { pos: readonly [number, number, number] };
const BEAMS: readonly BeamSpec[] = [
  { pos: [-2.5, 7, 2] },
  { pos: [2.5, 7, 2] },
  { pos: [-2, 7, -1.5] },
  { pos: [2, 7, -1.5] },
];
const CONE_R = 1.6;
const CONE_H = 7.0;

export function SpotlightBeams() {
  return (
    <>
      {BEAMS.map((b, i) => (
        <Beam key={i} {...b} />
      ))}
    </>
  );
}

function Beam({ pos }: BeamSpec) {
  const uniforms = useMemo<{ uColor: IUniform<Color>; uTime: IUniform<number> }>(
    () => ({ uColor: { value: new Color('#CCFFDD') }, uTime: { value: Math.random() * 5 } }),
    [],
  );
  useFrame((_, dt) => {
    uniforms.uTime.value += dt;
  });
  return (
    <mesh position={[pos[0], pos[1] - CONE_H / 2, pos[2]]} rotation={[Math.PI, 0, 0]}>
      <coneGeometry args={[CONE_R, CONE_H, 32, 1, true]} />
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
