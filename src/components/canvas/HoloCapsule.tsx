'use client';

import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Billboard, Text, useTexture } from '@react-three/drei';
import { forwardRef, useMemo, useRef, useState } from 'react';
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  type IUniform,
  type Mesh,
  type MeshStandardMaterial,
  SRGBColorSpace,
} from 'three';
import { palette } from '@/lib/palette';
import { usePortfolioStore } from '@/lib/store';
import { disableRaycast, noRaycast } from '@/lib/three-utils';
import { play } from '@/lib/audio';

const POS: readonly [number, number, number] = [0, 0, 0];
const CAPSULE_R = 0.78;
const CAPSULE_H = 2.8;
const CAPSULE_Y = 1.4;
const HEX_SIDES = 6;
const CAGE_BARS = 12;
const CAGE_RADIUS = 0.85;

/* ──────────────  Inner plasma shader  ────────────── */
const INNER_VERT = /* glsl */ `varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const NOISE = /* glsl */ `
float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123); }
float vnoise(vec3 p){
  vec3 i = floor(p); vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  float n000 = hash(i + vec3(0,0,0));
  float n100 = hash(i + vec3(1,0,0));
  float n010 = hash(i + vec3(0,1,0));
  float n110 = hash(i + vec3(1,1,0));
  float n001 = hash(i + vec3(0,0,1));
  float n101 = hash(i + vec3(1,0,1));
  float n011 = hash(i + vec3(0,1,1));
  float n111 = hash(i + vec3(1,1,1));
  return mix(mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y),
             mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y), u.z);
}`;

const INNER_FRAG = /* glsl */ `
precision highp float;
uniform float uTime;
varying vec2 vUv;
${NOISE}
void main(){
  float vGrad = pow(sin(vUv.y * 3.14159), 0.6);
  float dist = abs(vUv.x - 0.5) * 2.0;
  float rGrad = pow(1.0 - dist, 1.2);
  float energy = sin(vUv.y * 40.0 - uTime * 1.5) * 0.5 + 0.5;
  energy = pow(energy, 3.0);
  float plasma = vnoise(vec3(vUv * 6.0, uTime * 0.6));
  plasma = plasma * 0.5 + 0.5;
  float alpha = vGrad * rGrad * (0.3 + energy * 0.4 + plasma * 0.3);
  alpha *= 0.7;
  vec3 color = vec3(0.5, 1.0, 0.7) + vec3(0.0, 0.2, 0.1) * plasma;
  gl_FragColor = vec4(color, alpha);
}`;

export const HoloCapsule = forwardRef<Mesh>(function HoloCapsule(_props, sunRef) {
  const ringTopRef = useRef<MeshStandardMaterial | null>(null);
  const ringBotRef = useRef<MeshStandardMaterial | null>(null);
  const dotMatRef = useRef<MeshStandardMaterial | null>(null);
  const labelDotRef = useRef<MeshStandardMaterial | null>(null);
  const [hovered, setHovered] = useState(false);
  const t = useRef(0);
  const lowPerf = usePortfolioStore((s) => s.perfMode === 'low');
  const setCursor = usePortfolioStore((s) => s.setCursorState);

  const portrait = useTexture('/portrait.png');
  portrait.colorSpace = SRGBColorSpace;
  portrait.anisotropy = 8;

  const innerUniforms = useMemo<{ uTime: IUniform<number> }>(
    () => ({ uTime: { value: 0 } }),
    [],
  );

  useFrame((_, dt) => {
    t.current += dt;
    innerUniforms.uTime.value = t.current;
    if (ringTopRef.current) {
      ringTopRef.current.emissiveIntensity = 2.5 + Math.sin(t.current * 2) * 0.8;
    }
    if (ringBotRef.current) {
      ringBotRef.current.emissiveIntensity = 2.5 + Math.sin(t.current * 2 + Math.PI) * 0.8;
    }
    if (dotMatRef.current) {
      dotMatRef.current.emissiveIntensity = 1.3 + 0.5 * Math.sin(t.current * 2);
    }
    if (labelDotRef.current) {
      labelDotRef.current.emissiveIntensity = 1.4 + 0.4 * Math.sin(t.current * 3.5);
    }
  });

  const handleOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    setCursor('interactive');
    play('hover');
  };
  const handleOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(false);
    setCursor('idle');
  };

  return (
    <group position={POS}>
      {/* Hex base. */}
      <mesh position={[0, 0.15, 0]} rotation={[0, Math.PI / 6, 0]}>
        <cylinderGeometry args={[1.2, 1.25, 0.3, HEX_SIDES]} />
        <meshStandardMaterial color="#0A1014" metalness={0.85} roughness={0.35}
          emissive={palette.neonGreen} emissiveIntensity={0.05} />
      </mesh>

      {/* 8 perimeter dots. */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 1.15, 0.305, Math.sin(a) * 1.15]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.008, 14]} />
            <meshStandardMaterial
              ref={i === 0 ? dotMatRef : undefined}
              color={palette.neonBright}
              emissive={palette.neonBright}
              emissiveIntensity={1.3}
              toneMapped={false}
            />
          </mesh>
        );
      })}

      {/* Circular pedestal + top edge ring. */}
      <mesh position={[0, 0.36, 0]}>
        <cylinderGeometry args={[1.0, 1.0, 0.15, 48]} />
        <meshStandardMaterial color="#091015" metalness={0.85} roughness={0.3}
          emissive={palette.neonGreen} emissiveIntensity={0.08} />
      </mesh>

      {/* Bottom energy ring. */}
      <mesh position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[CAPSULE_R, 0.025, 16, 64]} />
        <meshStandardMaterial
          ref={ringBotRef}
          color="#00FF88"
          emissive="#00FF88"
          emissiveIntensity={3.0}
          toneMapped={false}
        />
      </mesh>

      {/* OUTER glass cylinder. */}
      <mesh
        position={[0, CAPSULE_Y, 0]}
        onPointerOver={handleOver}
        onPointerOut={handleOut}
      >
        <cylinderGeometry args={[CAPSULE_R, CAPSULE_R, CAPSULE_H, 64, 1, true]} />
        <meshPhysicalMaterial
          color="#88FFCC"
          transmission={lowPerf ? 0 : 0.92}
          thickness={0.15}
          roughness={0.04}
          ior={1.4}
          attenuationColor={new Color('#88FFCC')}
          attenuationDistance={2.0}
          metalness={0.0}
          transparent
          opacity={0.35}
          side={DoubleSide}
          envMapIntensity={1.5}
        />
      </mesh>

      {/* INNER volumetric plasma core. */}
      {!lowPerf && (
        <mesh position={[0, CAPSULE_Y, 0]}>
          <cylinderGeometry args={[0.55, 0.55, CAPSULE_H * 0.96, 32, 1, true]} />
          <shaderMaterial
            vertexShader={INNER_VERT}
            fragmentShader={INNER_FRAG}
            uniforms={innerUniforms}
            transparent
            blending={AdditiveBlending}
            side={DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Billboarded portrait inside. */}
      <Billboard position={[0, CAPSULE_Y, 0]}>
        <mesh>
          <planeGeometry args={[1.0, 1.5]} />
          <meshBasicMaterial map={portrait} transparent toneMapped={false} alphaTest={0.05} />
        </mesh>
      </Billboard>

      {/* Internal point light. */}
      <pointLight position={[0, CAPSULE_Y, 0]} intensity={2.0} color="#00FF88" distance={4} decay={2} />

      {/* Top energy ring. */}
      <mesh position={[0, CAPSULE_Y + CAPSULE_H / 2 + 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[CAPSULE_R, 0.025, 16, 64]} />
        <meshStandardMaterial
          ref={ringTopRef}
          color="#00FF88"
          emissive="#00FF88"
          emissiveIntensity={3.0}
          toneMapped={false}
        />
      </mesh>

      {/* Light cage — 12 thin vertical beams. */}
      {Array.from({ length: CAGE_BARS }).map((_, i) => {
        const a = (i / CAGE_BARS) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * CAGE_RADIUS, CAPSULE_Y, Math.sin(a) * CAGE_RADIUS]}>
            <cylinderGeometry args={[0.005, 0.005, CAPSULE_H, 6]} />
            <meshBasicMaterial color="#00FF88" transparent opacity={0.9} toneMapped={false} />
          </mesh>
        );
      })}

      {/* Invisible GodRays sun — small bright sphere at capsule centre. */}
      <mesh ref={sunRef as React.RefObject<Mesh>} position={[0, CAPSULE_Y, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.001} toneMapped={false} />
      </mesh>

      {/* DIGITAL IDENTITY label. */}
      <group position={[0, CAPSULE_Y + CAPSULE_H / 2 + 0.55, 0]}>
        <Text
          raycast={noRaycast}
          ref={disableRaycast}
          fontSize={0.15}
          color={palette.neonBright}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.2}
          outlineWidth={0.002}
          outlineColor={palette.neonGreen}
        >
          DIGITAL IDENTITY // ONLINE
        </Text>
        <mesh position={[-1.05, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.005, 14]} />
          <meshStandardMaterial
            ref={labelDotRef}
            color={palette.neonBright}
            emissive={palette.neonBright}
            emissiveIntensity={1.4}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
});
