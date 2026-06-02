'use client';

import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Text, useTexture } from '@react-three/drei';
import { useMemo, useRef, useState } from 'react';
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  NormalBlending,
  SRGBColorSpace,
  Vector2,
  type Group,
  type MeshStandardMaterial,
} from 'three';
import vert from '@/shaders/hologram.vert';
import frag from '@/shaders/hologram.frag';
import { palette } from '@/lib/palette';
import { usePortfolioStore } from '@/lib/store';
import { disableRaycast, noRaycast } from '@/lib/three-utils';
import { play } from '@/lib/audio';

const POS: readonly [number, number, number] = [0, 0, 0];
const CAPSULE_R = 0.7;
const CAPSULE_H = 2.8;
const CAPSULE_Y = 1.4;
const HEX_SIDES = 6;
const CAGE_BARS = 12;

/**
 * V9.0 — central holographic capsule. Glass cylinder with the portrait
 * suspended inside, neon-green emissive rings top + bottom, a "cage of
 * light" (12 vertical green beams) surrounding it, and a "DIGITAL
 * IDENTITY // ONLINE" label floating above.
 */
export function HoloCapsule() {
  const ringMatRef = useRef<MeshStandardMaterial | null>(null);
  const dotMatRef = useRef<MeshStandardMaterial | null>(null);
  const labelDotRef = useRef<MeshStandardMaterial | null>(null);
  const [hovered, setHovered] = useState(false);
  const t = useRef(0);
  const lowPerf = usePortfolioStore((s) => s.perfMode === 'low');
  const setCursor = usePortfolioStore((s) => s.setCursorState);

  const portrait = useTexture('/portrait.png');
  portrait.colorSpace = SRGBColorSpace;
  portrait.anisotropy = 8;

  const uniforms = useMemo(() => {
    const w = portrait.image?.width ?? 512;
    const h = portrait.image?.height ?? 768;
    return {
      uMap: { value: portrait },
      uTexelSize: { value: new Vector2(1 / w, 1 / h) },
      uTime: { value: 0 },
      uBoot: { value: 1 },
      uGlowColor: { value: new Color(palette.neonGreen) },
      uBgTint: { value: new Color(palette.neonGreen) },
    };
  }, [portrait]);

  useFrame((_, dt) => {
    t.current += dt;
    uniforms.uTime.value += dt;
    const phase = (t.current / 3) * Math.PI * 2;
    if (ringMatRef.current) {
      ringMatRef.current.emissiveIntensity = 1.0 + 0.3 * Math.sin(phase);
    }
    if (dotMatRef.current) {
      dotMatRef.current.emissiveIntensity = 1.2 + 0.5 * Math.sin(phase + Math.PI / 4);
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
      {/* Hex base — wide dark disc with neon-green edge ring + 8 dots. */}
      <mesh position={[0, 0.15, 0]} rotation={[0, Math.PI / 6, 0]}>
        <cylinderGeometry args={[1.2, 1.25, 0.3, HEX_SIDES]} />
        <meshStandardMaterial
          color="#0A1014"
          metalness={0.85}
          roughness={0.35}
          emissive={palette.neonGreen}
          emissiveIntensity={0.05}
        />
      </mesh>

      {/* Hex top-edge ring. */}
      <mesh position={[0, 0.30, 0]} rotation={[Math.PI / 2, 0, Math.PI / 6]}>
        <torusGeometry args={[1.22, 0.012, 8, 6 * 10]} />
        <meshStandardMaterial
          ref={ringMatRef}
          color={palette.neonGreen}
          emissive={palette.neonGreen}
          emissiveIntensity={1.0}
          metalness={0.9}
          roughness={0.2}
        />
      </mesh>

      {/* 8 perimeter dots on the hex base top. */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        const x = Math.cos(a) * 1.15;
        const z = Math.sin(a) * 1.15;
        return (
          <mesh key={i} position={[x, 0.305, z]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.008, 14]} />
            <meshStandardMaterial
              ref={i === 0 ? dotMatRef : undefined}
              color={palette.neonBright}
              emissive={palette.neonBright}
              emissiveIntensity={1.2}
            />
          </mesh>
        );
      })}

      {/* Circular pedestal above the hex base. */}
      <mesh position={[0, 0.36, 0]}>
        <cylinderGeometry args={[1.0, 1.0, 0.15, 48]} />
        <meshStandardMaterial
          color="#091015"
          metalness={0.85}
          roughness={0.3}
          emissive={palette.neonGreen}
          emissiveIntensity={0.08}
        />
      </mesh>
      <mesh position={[0, 0.435, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.85, 0.95, 64]} />
        <meshStandardMaterial
          color={palette.neonGreen}
          emissive={palette.neonGreen}
          emissiveIntensity={1.0}
          metalness={0.9}
          roughness={0.2}
          side={DoubleSide}
        />
      </mesh>

      {/* Capsule bottom emissive ring (where capsule meets pedestal). */}
      <mesh position={[0, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[CAPSULE_R, 0.014, 8, 48]} />
        <meshStandardMaterial
          color={palette.neonGreen}
          emissive={palette.neonGreen}
          emissiveIntensity={1.2}
          metalness={0.9}
          roughness={0.2}
        />
      </mesh>

      {/* The CAPSULE — glass cylinder. */}
      <mesh
        position={[0, CAPSULE_Y, 0]}
        onPointerOver={handleOver}
        onPointerOut={handleOut}
      >
        <cylinderGeometry args={[CAPSULE_R, CAPSULE_R, CAPSULE_H, 48, 1, true]} />
        <meshPhysicalMaterial
          color="#88FFCC"
          transmission={lowPerf ? 0 : 0.65}
          thickness={0.4}
          roughness={0.15}
          ior={1.5}
          metalness={0.0}
          transparent
          opacity={lowPerf ? 0.22 : 1}
          side={DoubleSide}
          envMapIntensity={1.3}
          emissive={palette.neonGreen}
          emissiveIntensity={hovered ? 0.45 : 0.22}
        />
      </mesh>

      {/* Portrait inside capsule. */}
      <mesh position={[0, CAPSULE_Y, 0]}>
        <planeGeometry args={[1.05, 1.65]} />
        <shaderMaterial
          vertexShader={vert}
          fragmentShader={frag}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          side={DoubleSide}
          blending={NormalBlending}
        />
      </mesh>

      {/* Capsule TOP cap + emissive ring. */}
      <mesh position={[0, CAPSULE_Y + CAPSULE_H / 2, 0]}>
        <cylinderGeometry args={[CAPSULE_R + 0.04, CAPSULE_R + 0.02, 0.10, 32]} />
        <meshStandardMaterial
          color="#0A1014"
          metalness={0.9}
          roughness={0.22}
          emissive={palette.neonGreen}
          emissiveIntensity={0.2}
        />
      </mesh>
      <mesh
        position={[0, CAPSULE_Y + CAPSULE_H / 2 + 0.055, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <torusGeometry args={[CAPSULE_R + 0.02, 0.014, 8, 48]} />
        <meshStandardMaterial
          color={palette.neonGreen}
          emissive={palette.neonGreen}
          emissiveIntensity={1.3}
          metalness={0.9}
          roughness={0.2}
        />
      </mesh>

      {/* Cage of light — 12 vertical neon beams around capsule. */}
      {Array.from({ length: CAGE_BARS }).map((_, i) => {
        const a = (i / CAGE_BARS) * Math.PI * 2;
        const r = CAPSULE_R + 0.18;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        return (
          <mesh key={i} position={[x, CAPSULE_Y, z]}>
            <cylinderGeometry args={[0.008, 0.008, CAPSULE_H * 0.92, 8]} />
            <meshBasicMaterial
              color={palette.neonGreen}
              transparent
              opacity={0.55}
              blending={AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        );
      })}

      {/* "DIGITAL IDENTITY // ONLINE" floating label above capsule. */}
      <group position={[0, CAPSULE_Y + CAPSULE_H / 2 + 0.5, 0]}>
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
        {/* Pulsing dot before the label. */}
        <mesh position={[-1.05, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.005, 14]} />
          <meshStandardMaterial
            ref={labelDotRef}
            color={palette.neonBright}
            emissive={palette.neonBright}
            emissiveIntensity={1.4}
          />
        </mesh>
      </group>

      {/* Additive light beam shooting upward from capsule base. */}
      <mesh position={[0, CAPSULE_Y, 0]}>
        <coneGeometry args={[CAPSULE_R * 0.9, CAPSULE_H * 1.1, 48, 1, true]} />
        <meshBasicMaterial
          color={palette.neonGreen}
          transparent
          opacity={0.04}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
