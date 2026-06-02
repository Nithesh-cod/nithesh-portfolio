'use client';

import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Billboard, Text, useTexture } from '@react-three/drei';
import { useRef, useState } from 'react';
import {
  AdditiveBlending,
  DoubleSide,
  SRGBColorSpace,
  type MeshStandardMaterial,
} from 'three';
import { palette } from '@/lib/palette';
import { usePortfolioStore } from '@/lib/store';
import { disableRaycast, noRaycast } from '@/lib/three-utils';
import { play } from '@/lib/audio';

const POS: readonly [number, number, number] = [0, 0, 0];
const CAPSULE_R = 0.75;
const CAPSULE_H = 2.8;
const CAPSULE_Y = 1.4;       // capsule centre = base + height/2
const HEX_SIDES = 6;
const CAGE_BARS = 12;
const CAGE_RADIUS = 0.85;

/**
 * V9.1 — capsule is now a TRANSPARENT glass tube. The cylinder uses
 * openEnded geometry + DoubleSide so you can see straight through.
 * Inside: a Billboarded portrait plane (MeshBasicMaterial) facing the
 * camera, plus an internal pointLight that gives the portrait a soft
 * glow and lights the inside of the glass.
 *
 * Hex base + pedestal + emissive top/bottom rings + 12-bar cage of
 * light all kept from V9.0 but tuned brighter so they hold against
 * the now-transparent body.
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

  useFrame((_, dt) => {
    t.current += dt;
    const phase = (t.current / 3) * Math.PI * 2;
    if (ringMatRef.current) {
      ringMatRef.current.emissiveIntensity = 1.2 + 0.4 * Math.sin(phase);
    }
    if (dotMatRef.current) {
      dotMatRef.current.emissiveIntensity = 1.3 + 0.5 * Math.sin(phase + Math.PI / 4);
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
          emissiveIntensity={1.2}
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
              emissiveIntensity={1.3}
            />
          </mesh>
        );
      })}

      {/* Circular pedestal. */}
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

      {/* V9.1 — BOTTOM energy ring (the "scanner" base of the capsule). */}
      <mesh position={[0, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[CAPSULE_R, 0.016, 10, 64]} />
        <meshStandardMaterial
          color={palette.neonGreen}
          emissive={palette.neonGreen}
          emissiveIntensity={1.6}
          metalness={0.9}
          roughness={0.18}
        />
      </mesh>

      {/* V9.1 — TRANSPARENT glass tube. openEnded geometry + DoubleSide
          so the portrait inside is visible regardless of camera angle. */}
      <mesh
        position={[0, CAPSULE_Y, 0]}
        onPointerOver={handleOver}
        onPointerOut={handleOut}
      >
        <cylinderGeometry args={[CAPSULE_R, CAPSULE_R, CAPSULE_H, 32, 1, true]} />
        <meshPhysicalMaterial
          color="#88FFCC"
          transmission={lowPerf ? 0 : 0.92}
          thickness={0.15}
          roughness={0.05}
          ior={1.5}
          metalness={0.0}
          transparent
          opacity={0.4}
          side={DoubleSide}
          envMapIntensity={1.3}
          emissive={palette.neonGreen}
          emissiveIntensity={hovered ? 0.35 : 0.18}
        />
      </mesh>

      {/* V9.1 — Billboarded portrait plane INSIDE the capsule. Simple
          MeshBasicMaterial with the portrait texture; the PNG already has
          alpha, no shader mask needed. Always faces camera. */}
      <Billboard position={[0, CAPSULE_Y, 0]}>
        <mesh>
          <planeGeometry args={[1.0, 1.6]} />
          <meshBasicMaterial
            map={portrait}
            transparent
            alphaTest={0.05}
          />
        </mesh>
      </Billboard>

      {/* V9.1 — internal pointLight inside the capsule. Lights the portrait
          + gives the glass tube edge glow. */}
      <pointLight
        position={[0, CAPSULE_Y, 0]}
        intensity={1.2}
        color={palette.neonGreen}
        distance={3}
        decay={2}
      />

      {/* V9.1 — TOP energy ring. */}
      <mesh
        position={[0, CAPSULE_Y + CAPSULE_H / 2, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <torusGeometry args={[CAPSULE_R, 0.016, 10, 64]} />
        <meshStandardMaterial
          color={palette.neonGreen}
          emissive={palette.neonGreen}
          emissiveIntensity={1.6}
          metalness={0.9}
          roughness={0.18}
        />
      </mesh>

      {/* V9.1 — 12-bar "cage of light" — thin neon-green beam cylinders
          around the capsule (radius 0.85, every 30°). Additive blending. */}
      {Array.from({ length: CAGE_BARS }).map((_, i) => {
        const a = (i / CAGE_BARS) * Math.PI * 2;
        const x = Math.cos(a) * CAGE_RADIUS;
        const z = Math.sin(a) * CAGE_RADIUS;
        return (
          <mesh key={i} position={[x, CAPSULE_Y, z]}>
            <cylinderGeometry args={[0.005, 0.005, CAPSULE_H, 8]} />
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

      {/* Subtle upward beam (additive cone) — kept from V9.0. */}
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
