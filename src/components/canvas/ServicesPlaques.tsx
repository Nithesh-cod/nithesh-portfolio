'use client';

import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import { type Group, type MeshStandardMaterial } from 'three';
import { palette } from '@/lib/palette';
import { disableRaycast, noRaycast } from '@/lib/three-utils';
import { play } from '@/lib/audio';
import { usePortfolioStore } from '@/lib/store';

/* V11.1 — 6 thin glass plaques laid out across the front of the room,
 * tilted slightly toward the camera. Replaces V10.2's hex tiles
 * which read as buttons rather than reference-style floor plaques. */

const TILT = -Math.PI / 2 + 0.20; // ~80° from horizontal, slight lean back
const ROW_Z = 6.5;
const ROW_Y = 0.10;

const SERVICES: ReadonlyArray<{
  title: string;
  sub: string;
  icon: 'brain' | 'code' | 'cloud' | 'bars' | 'shield' | 'palette';
}> = [
  { title: 'AI SOLUTIONS',     sub: 'INTELLIGENT SYSTEMS',  icon: 'brain' },
  { title: 'WEB DEVELOPMENT',  sub: 'FULL STACK SITES',     icon: 'code' },
  { title: 'CLOUD & DEVOPS',   sub: 'SCALABLE INFRA',       icon: 'cloud' },
  { title: 'DATA & ANALYTICS', sub: 'INSIGHTS · METRICS',   icon: 'bars' },
  { title: 'CYBER SECURITY',   sub: 'SECURE BY DESIGN',     icon: 'shield' },
  { title: 'UI / UX DESIGN',   sub: 'CRAFTED EXPERIENCES',  icon: 'palette' },
];

const X_BASE = -4.5;
const X_STEP = 1.8;

export function ServicesPlaques() {
  return (
    <group>
      {SERVICES.map((s, i) => (
        <ServicePlaque
          key={s.title}
          x={X_BASE + i * X_STEP}
          title={s.title}
          sub={s.sub}
          iconKind={s.icon}
        />
      ))}
    </group>
  );
}

function ServicePlaque({
  x,
  title,
  sub,
  iconKind,
}: {
  x: number;
  title: string;
  sub: string;
  iconKind: 'brain' | 'code' | 'cloud' | 'bars' | 'shield' | 'palette';
}) {
  const groupRef = useRef<Group | null>(null);
  const frameMatRef = useRef<MeshStandardMaterial | null>(null);
  const [hovered, setHovered] = useState(false);
  const setCursor = usePortfolioStore((s) => s.setCursorState);

  useFrame(() => {
    if (!groupRef.current) return;
    // Hover: tilt a bit more upright + lift slightly.
    const targetExtra = hovered ? 0.20 : 0;
    const cur = groupRef.current.userData.extra ?? 0;
    const next = cur + (targetExtra - cur) * 0.10;
    groupRef.current.userData.extra = next;
    groupRef.current.rotation.x = TILT + next;
    groupRef.current.position.y = ROW_Y + (hovered ? 0.08 : 0);
    if (frameMatRef.current) {
      frameMatRef.current.emissiveIntensity = hovered ? 3.0 : 1.8;
    }
  });

  return (
    <group
      ref={groupRef}
      position={[x, ROW_Y, ROW_Z]}
      rotation={[TILT, 0, 0]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        setCursor('interactive');
        play('hover');
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        setCursor('idle');
      }}
    >
      {/* Glass plaque (1.0 wide × 0.85 tall when laid flat). */}
      <mesh>
        <boxGeometry args={[1.0, 0.85, 0.04]} />
        <meshPhysicalMaterial
          transmission={0.85}
          thickness={0.05}
          roughness={0.10}
          color="#88FFCC"
          attenuationColor="#88FFCC"
          attenuationDistance={3.0}
          transparent
          opacity={0.32}
          metalness={0.0}
        />
      </mesh>

      {/* 4 emissive edges around the plaque face. */}
      <PlaqueFrame matRef={frameMatRef} />

      {/* Icon (procedural primitive in v11.1, swap for real meshes later). */}
      <group position={[0, 0.20, 0.04]}>
        <ServiceIcon kind={iconKind} />
      </group>

      {/* Title. */}
      <Text
        raycast={noRaycast}
        ref={disableRaycast}
        position={[0, -0.12, 0.04]}
        fontSize={0.08}
        color={palette.neonBright}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.22}
        outlineWidth={0.002}
        outlineColor={palette.neonGreen}
      >
        {title}
      </Text>

      {/* Subtitle. */}
      <Text
        raycast={noRaycast}
        ref={disableRaycast}
        position={[0, -0.27, 0.04]}
        fontSize={0.045}
        color={palette.textSecondary}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.20}
        maxWidth={0.92}
      >
        {sub}
      </Text>
    </group>
  );
}

function PlaqueFrame({
  matRef,
}: {
  matRef: React.MutableRefObject<MeshStandardMaterial | null>;
}) {
  const W = 1.0;
  const H = 0.85;
  const T = 0.018;
  return (
    <>
      <mesh raycast={noRaycast} position={[0, H / 2, 0.022]}>
        <boxGeometry args={[W + 0.02, T, 0.02]} />
        <meshStandardMaterial
          ref={matRef}
          color={palette.neonGreen}
          emissive={palette.neonGreen}
          emissiveIntensity={1.8}
          toneMapped={false}
        />
      </mesh>
      <mesh raycast={noRaycast} position={[0, -H / 2, 0.022]}>
        <boxGeometry args={[W + 0.02, T, 0.02]} />
        <meshStandardMaterial
          color={palette.neonGreen}
          emissive={palette.neonGreen}
          emissiveIntensity={1.8}
          toneMapped={false}
        />
      </mesh>
      <mesh raycast={noRaycast} position={[W / 2, 0, 0.022]}>
        <boxGeometry args={[T, H, 0.02]} />
        <meshStandardMaterial
          color={palette.neonGreen}
          emissive={palette.neonGreen}
          emissiveIntensity={1.8}
          toneMapped={false}
        />
      </mesh>
      <mesh raycast={noRaycast} position={[-W / 2, 0, 0.022]}>
        <boxGeometry args={[T, H, 0.02]} />
        <meshStandardMaterial
          color={palette.neonGreen}
          emissive={palette.neonGreen}
          emissiveIntensity={1.8}
          toneMapped={false}
        />
      </mesh>
    </>
  );
}

/** Minimal procedural icon — wireframe primitive per service. */
function ServiceIcon({
  kind,
}: {
  kind: 'brain' | 'code' | 'cloud' | 'bars' | 'shield' | 'palette';
}) {
  const m = (
    <meshStandardMaterial
      color={palette.neonBright}
      emissive={palette.neonBright}
      emissiveIntensity={1.4}
      wireframe
      toneMapped={false}
    />
  );
  if (kind === 'brain') {
    return (
      <mesh>
        <sphereGeometry args={[0.10, 14, 10]} />
        {m}
      </mesh>
    );
  }
  if (kind === 'code') {
    return (
      <mesh>
        <boxGeometry args={[0.16, 0.10, 0.02]} />
        {m}
      </mesh>
    );
  }
  if (kind === 'cloud') {
    return (
      <group>
        <mesh position={[-0.06, 0, 0]}>
          <sphereGeometry args={[0.06, 12, 8]} />
          {m}
        </mesh>
        <mesh position={[0.04, 0.02, 0]}>
          <sphereGeometry args={[0.08, 12, 8]} />
          {m}
        </mesh>
        <mesh position={[0.10, -0.02, 0]}>
          <sphereGeometry args={[0.06, 12, 8]} />
          {m}
        </mesh>
      </group>
    );
  }
  if (kind === 'bars') {
    return (
      <group>
        {[-0.08, 0, 0.08].map((dx, i) => (
          <mesh key={i} position={[dx, -0.04 + i * 0.035, 0]}>
            <boxGeometry args={[0.04, 0.08 + i * 0.04, 0.02]} />
            {m}
          </mesh>
        ))}
      </group>
    );
  }
  if (kind === 'shield') {
    return (
      <mesh>
        <cylinderGeometry args={[0.10, 0.04, 0.02, 5]} />
        {m}
      </mesh>
    );
  }
  // palette
  return (
    <group>
      <mesh>
        <circleGeometry args={[0.10, 14]} />
        {m}
      </mesh>
    </group>
  );
}
