'use client';

import { Billboard, Text } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useRef, useState } from 'react';
import { type Group, type MeshStandardMaterial } from 'three';
import type { Project } from '@/lib/content';
import { palette } from '@/lib/palette';
import { usePortfolioStore } from '@/lib/store';
import { disableRaycast, noRaycast } from '@/lib/three-utils';
import { play } from '@/lib/audio';

type Props = {
  slug: Project['slug'];
  label: string;
  subtitle: string;
  position: readonly [number, number, number];
  iconKind: 'leaf' | 'box' | 'globe';
  /** Bob phase offset so adjacent pedestals don't move in unison. */
  phase?: number;
};

const HEX_SIDES = 6;

// V9.1 — 3 stacked hex tiers, each h=0.15.
//   tier 1 (bottom): y centre 0.075, top 0.15, radius 0.85
//   tier 2 (middle): y centre 0.225, top 0.30, radius 0.7
//   tier 3 (top):    y centre 0.375, top 0.45, radius 0.55
const TIERS: readonly { y: number; radius: number; h: number }[] = [
  { y: 0.075, radius: 0.85, h: 0.15 },
  { y: 0.225, radius: 0.70, h: 0.15 },
  { y: 0.375, radius: 0.55, h: 0.15 },
];

const PEDESTAL_TOP_Y = 0.45;
const ICON_Y = PEDESTAL_TOP_Y + 0.30;       // floating wireframe icon
const NAME_Y = PEDESTAL_TOP_Y + 0.10;       // name floats just above pedestal
const SUBTITLE_Y = PEDESTAL_TOP_Y - 0.02;   // subtitle on top tier's front
const BUTTON_Y = 0.375;                     // tier 3 centre — button on its front face

export function ProjectPedestal({ slug, label, subtitle, position, iconKind, phase = 0 }: Props) {
  const groupRef = useRef<Group | null>(null);
  const iconRef = useRef<Group | null>(null);
  const trimRefs = useRef<(MeshStandardMaterial | null)[]>([]);
  const buttonMatRef = useRef<MeshStandardMaterial | null>(null);
  const [hovered, setHovered] = useState(false);
  const t = useRef(phase);

  const openProject = usePortfolioStore((s) => s.openProject);
  const setCursor = usePortfolioStore((s) => s.setCursorState);

  useFrame((_, dt) => {
    t.current += dt;
    if (groupRef.current) {
      // Sin-wave bob, amplitude 0.05, period 6 s.
      const bob = Math.sin((t.current / 6) * Math.PI * 2) * 0.05;
      groupRef.current.position.y = position[1] + bob + (hovered ? 0.06 : 0);
    }
    if (iconRef.current) {
      iconRef.current.rotation.y += dt * 0.5;
      iconRef.current.rotation.x += dt * 0.2;
    }
    trimRefs.current.forEach((m) => {
      if (m) m.emissiveIntensity = hovered ? 1.8 : 1.0;
    });
    if (buttonMatRef.current) {
      buttonMatRef.current.emissiveIntensity = hovered ? 1.6 : 0.8;
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
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    play('click_primary');
    openProject(slug, slug);
  };

  return (
    <group ref={groupRef} position={position}>
      {/* 3 hex tiers — each rotated 30° around Y so the flat hex face points
          straight at the camera-front (z+). */}
      {TIERS.map((tier, i) => (
        <group key={i}>
          <mesh
            position={[0, tier.y, 0]}
            rotation={[0, Math.PI / 6, 0]}
            onPointerOver={handleOver}
            onPointerOut={handleOut}
            onClick={handleClick}
          >
            <cylinderGeometry args={[tier.radius, tier.radius * 1.04, tier.h, HEX_SIDES]} />
            <meshStandardMaterial
              color="#1A1A2A"
              metalness={0.8}
              roughness={0.3}
              emissive={palette.neonGreen}
              emissiveIntensity={0.04}
            />
          </mesh>
          {/* Top-edge emissive trim ring for each tier. */}
          <mesh
            position={[0, tier.y + tier.h / 2, 0]}
            rotation={[Math.PI / 2, 0, Math.PI / 6]}
          >
            <torusGeometry args={[tier.radius, 0.008, 8, 6 * 8]} />
            <meshStandardMaterial
              ref={(m) => {
                trimRefs.current[i] = m;
              }}
              color={palette.neonGreen}
              emissive={palette.neonGreen}
              emissiveIntensity={1.0}
              metalness={0.9}
              roughness={0.2}
            />
          </mesh>
        </group>
      ))}

      {/* Floating wireframe hologram icon above pedestal. */}
      <group ref={iconRef} position={[0, ICON_Y, 0]}>
        <WireframeIcon kind={iconKind} />
      </group>

      {/* Name label — Billboarded so it always faces camera. */}
      <Billboard position={[0, NAME_Y, 0]}>
        <Text
          raycast={noRaycast}
          ref={disableRaycast}
          fontSize={0.16}
          color={palette.neonBright}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.16}
          outlineWidth={0.0025}
          outlineColor={palette.neonGreen}
        >
          {label.toUpperCase()}
        </Text>
      </Billboard>

      {/* Subtitle — also Billboarded. */}
      <Billboard position={[0, SUBTITLE_Y, 0]}>
        <Text
          raycast={noRaycast}
          ref={disableRaycast}
          fontSize={0.055}
          color={palette.textSecondary}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.12}
        >
          {subtitle}
        </Text>
      </Billboard>

      {/* VIEW PROJECT button — recessed rectangle on tier 3 front face. */}
      <group
        position={[0, BUTTON_Y, 0.56]}
        onPointerOver={handleOver}
        onPointerOut={handleOut}
        onClick={handleClick}
      >
        <mesh>
          <planeGeometry args={[0.55, 0.10]} />
          <meshStandardMaterial
            ref={buttonMatRef}
            color="#0A1014"
            emissive={palette.neonGreen}
            emissiveIntensity={0.8}
            metalness={0.5}
            roughness={0.3}
          />
        </mesh>
        <Text
          raycast={noRaycast}
          ref={disableRaycast}
          position={[0, 0, 0.003]}
          fontSize={0.04}
          color={palette.neonBright}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.18}
        >
          VIEW PROJECT →
        </Text>
      </group>
    </group>
  );
}

function WireframeIcon({ kind }: { kind: 'leaf' | 'box' | 'globe' }) {
  const matProps = {
    color: palette.neonGreen,
    wireframe: true,
    emissive: palette.neonGreen,
    emissiveIntensity: 1.2,
  } as const;

  if (kind === 'box') {
    return (
      <mesh>
        <boxGeometry args={[0.34, 0.34, 0.34]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
    );
  }
  if (kind === 'globe') {
    return (
      <mesh>
        <sphereGeometry args={[0.24, 16, 12]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
    );
  }
  // 'leaf' — icosahedron stands in for the procedural plant.
  return (
    <mesh>
      <icosahedronGeometry args={[0.24, 0]} />
      <meshStandardMaterial {...matProps} />
    </mesh>
  );
}
