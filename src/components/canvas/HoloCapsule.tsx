'use client';

import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Billboard, Text, useTexture } from '@react-three/drei';
import { forwardRef, useMemo, useRef, useState } from 'react';
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  type IUniform,
  type Group,
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
const CAPSULE_Y = 1.6;
const CAGE_BARS = 12;
const CAGE_RADIUS = 0.85;

/* Inner plasma shader. */
const INNER_VERT = /* glsl */ `varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const NOISE = /* glsl */ `
float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123); }
float vnoise(vec3 p){
  vec3 i = floor(p); vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), u.x),
                 mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), u.x), u.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), u.x),
                 mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), u.x), u.y), u.z);
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
  float plasma = vnoise(vec3(vUv * 6.0, uTime * 0.6)) * 0.5 + 0.5;
  float alpha = vGrad * rGrad * (0.3 + energy * 0.4 + plasma * 0.3) * 0.7;
  vec3 color = vec3(0.5, 1.0, 0.7) + vec3(0.0, 0.2, 0.1) * plasma;
  gl_FragColor = vec4(color, alpha);
}`;

/**
 * V10.0 — central exhibit. 3-tier hex podium + glass capsule with the
 * pre-rendered 3D portrait inside + rotating ring + name plaque on the
 * front of tier 2.
 */
export const HoloCapsule = forwardRef<Mesh>(function HoloCapsule(_p, sunRef) {
  const ringTopRef = useRef<MeshStandardMaterial | null>(null);
  const ringBotRef = useRef<MeshStandardMaterial | null>(null);
  const rotateRingRef = useRef<Group | null>(null);
  const portraitGroupRef = useRef<Group | null>(null);
  const labelDotRef = useRef<MeshStandardMaterial | null>(null);
  const [hovered, setHovered] = useState(false);
  const t = useRef(0);
  const lowPerf = usePortfolioStore((s) => s.perfMode === 'low');
  const setCursor = usePortfolioStore((s) => s.setCursorState);

  // V10.0 — pre-rendered 3D portrait (transparent PNG, no HSV mask needed).
  const portrait = useTexture('/3dportait.png');
  portrait.colorSpace = SRGBColorSpace;
  portrait.anisotropy = 8;

  const innerUniforms = useMemo<{ uTime: IUniform<number> }>(
    () => ({ uTime: { value: 0 } }),
    [],
  );

  useFrame((_, dt) => {
    t.current += dt;
    innerUniforms.uTime.value = t.current;
    if (ringTopRef.current) ringTopRef.current.emissiveIntensity = 2.5 + Math.sin(t.current * 2) * 0.8;
    if (ringBotRef.current) ringBotRef.current.emissiveIntensity = 2.5 + Math.sin(t.current * 2 + Math.PI) * 0.8;
    if (labelDotRef.current) labelDotRef.current.emissiveIntensity = 1.4 + 0.4 * Math.sin(t.current * 3.5);
    if (rotateRingRef.current) rotateRingRef.current.rotation.y += dt * 0.4;
    if (portraitGroupRef.current) portraitGroupRef.current.rotation.y += dt * (Math.PI / 180); // ~1°/s
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

  // 3-tier hex podium (each 0.3 tall).
  // Tier 1 (floor level): radius 1.8, y 0.15
  // Tier 2:               radius 1.4, y 0.45
  // Tier 3 (capsule):     radius 1.0, y 0.75
  const TIERS = [
    { y: 0.15, radius: 1.8, h: 0.30, intensity: 0.04 },
    { y: 0.45, radius: 1.4, h: 0.30, intensity: 0.08 },
    { y: 0.75, radius: 1.0, h: 0.30, intensity: 0.14 },
  ];

  return (
    <group position={POS}>
      {/* 3 hex tiers. */}
      {TIERS.map((tier, i) => (
        <group key={i}>
          <mesh position={[0, tier.y, 0]} rotation={[0, Math.PI / 6, 0]}>
            <cylinderGeometry args={[tier.radius, tier.radius * 1.02, tier.h, 6]} />
            <meshStandardMaterial
              color="#0A1014"
              metalness={0.85}
              roughness={0.35}
              emissive={palette.neonGreen}
              emissiveIntensity={tier.intensity}
            />
          </mesh>
          {/* Top-edge trim ring on each tier. */}
          <mesh position={[0, tier.y + tier.h / 2, 0]} rotation={[Math.PI / 2, 0, Math.PI / 6]}>
            <torusGeometry args={[tier.radius, 0.012, 8, 6 * 8]} />
            <meshStandardMaterial
              color={palette.neonGreen}
              emissive={palette.neonGreen}
              emissiveIntensity={1.0}
              metalness={0.9}
              roughness={0.2}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}

      {/* Rotating wide ring around tier 3. */}
      <group ref={rotateRingRef}>
        <mesh position={[0, 0.92, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.25, 0.018, 12, 96]} />
          <meshStandardMaterial
            color={palette.neonBright}
            emissive={palette.neonBright}
            emissiveIntensity={1.4}
            metalness={0.9}
            roughness={0.18}
            toneMapped={false}
          />
        </mesh>
        {/* 6 emissive accent dots on the rotating ring. */}
        {Array.from({ length: 6 }).map((_, i) => {
          const a = (i / 6) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 1.25, 0.92, Math.sin(a) * 1.25]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 0.01, 14]} />
              <meshStandardMaterial color={palette.neonBright} emissive={palette.neonBright} emissiveIntensity={2.0} toneMapped={false} />
            </mesh>
          );
        })}
      </group>

      {/* Name plaque on front of tier 2. */}
      <group position={[0, 0.45, 1.42]} rotation={[0, 0, 0]}>
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[1.4, 0.22]} />
          <meshStandardMaterial color="#020608" metalness={0.7} roughness={0.4}
            emissive={palette.neonGreen} emissiveIntensity={0.12} side={DoubleSide} />
        </mesh>
        <Text
          raycast={noRaycast}
          ref={disableRaycast}
          position={[0, 0.03, 0.003]}
          fontSize={0.085}
          color={palette.neonBright}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.18}
          outlineWidth={0.0015}
          outlineColor={palette.neonGreen}
        >
          NITHESH RAMACHANDRAN
        </Text>
        <Text
          raycast={noRaycast}
          ref={disableRaycast}
          position={[0, -0.06, 0.003]}
          fontSize={0.038}
          color={palette.textSecondary}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.22}
        >
          FULL STACK · AI · CREATIVE TECH
        </Text>
      </group>

      {/* Bottom energy ring. */}
      <mesh position={[0, 0.92, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[CAPSULE_R, 0.025, 16, 64]} />
        <meshStandardMaterial
          ref={ringBotRef}
          color="#00FF88"
          emissive="#00FF88"
          emissiveIntensity={3.0}
          toneMapped={false}
        />
      </mesh>

      {/* Glass capsule. */}
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
          opacity={0.30}
          side={DoubleSide}
          envMapIntensity={1.5}
          emissive={palette.neonGreen}
          emissiveIntensity={hovered ? 0.30 : 0.15}
        />
      </mesh>

      {/* Inner plasma. */}
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

      {/* V10.0 — 3D portrait. Slow Y rotation. NOT billboarded so it
          looks like an exhibit piece you can walk around. */}
      <group ref={portraitGroupRef} position={[0, CAPSULE_Y - 0.05, 0]}>
        <mesh>
          <planeGeometry args={[1.2, 1.8]} />
          <meshBasicMaterial map={portrait} transparent toneMapped={false} alphaTest={0.01} side={DoubleSide} />
        </mesh>
      </group>

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

      {/* Light cage. */}
      {Array.from({ length: CAGE_BARS }).map((_, i) => {
        const a = (i / CAGE_BARS) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * CAGE_RADIUS, CAPSULE_Y, Math.sin(a) * CAGE_RADIUS]}>
            <cylinderGeometry args={[0.005, 0.005, CAPSULE_H, 6]} />
            <meshBasicMaterial color="#00FF88" transparent opacity={0.9} toneMapped={false} />
          </mesh>
        );
      })}

      {/* GodRays sun. */}
      <mesh ref={sunRef as React.RefObject<Mesh>} position={[0, CAPSULE_Y, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.001} toneMapped={false} />
      </mesh>

      {/* DIGITAL IDENTITY label above. */}
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
