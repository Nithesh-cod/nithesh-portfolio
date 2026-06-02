'use client';

import { Text } from '@react-three/drei';
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
  /** Which procedural wireframe icon to render. */
  iconKind: 'leaf' | 'box' | 'globe';
};

const HEX_SIDES = 6;

/**
 * V9.0 — hex pedestal carrying a slowly rotating wireframe icon, the
 * project name, a subtitle, and a "VIEW PROJECT" button. Click anywhere
 * on the group → opens the ProjectModal.
 */
export function ProjectPedestal({ slug, label, subtitle, position, iconKind }: Props) {
  const groupRef = useRef<Group | null>(null);
  const iconRef = useRef<Group | null>(null);
  const trimRef = useRef<MeshStandardMaterial | null>(null);
  const buttonMatRef = useRef<MeshStandardMaterial | null>(null);
  const [hovered, setHovered] = useState(false);
  const t = useRef(Math.random() * 6);

  const openProject = usePortfolioStore((s) => s.openProject);
  const setCursor = usePortfolioStore((s) => s.setCursorState);

  useFrame((_, dt) => {
    t.current += dt;
    if (groupRef.current) {
      const bob = Math.sin(t.current * 0.8) * 0.04;
      groupRef.current.position.y = position[1] + bob + (hovered ? 0.06 : 0);
    }
    if (iconRef.current) {
      iconRef.current.rotation.y += dt * 0.5;
      iconRef.current.rotation.x += dt * 0.2;
    }
    if (trimRef.current) {
      trimRef.current.emissiveIntensity = hovered ? 1.8 : 1.1;
    }
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

  // Pedestal tier stack (3 stepped hex tiers).
  const TIERS = [
    { y: 0.05, radius: 0.65, h: 0.10 },
    { y: 0.18, radius: 0.55, h: 0.16 },
    { y: 0.32, radius: 0.45, h: 0.08 },
  ];

  return (
    <group ref={groupRef} position={position}>
      {/* Hex tiers. */}
      {TIERS.map((tier, i) => (
        <mesh
          key={i}
          position={[0, tier.y, 0]}
          rotation={[0, Math.PI / 6, 0]}
          onPointerOver={handleOver}
          onPointerOut={handleOut}
          onClick={handleClick}
        >
          <cylinderGeometry args={[tier.radius, tier.radius * 1.04, tier.h, HEX_SIDES]} />
          <meshStandardMaterial
            color="#0A1014"
            metalness={0.85}
            roughness={0.35}
            emissive={palette.neonGreen}
            emissiveIntensity={0.05}
          />
        </mesh>
      ))}

      {/* Top-edge trim ring. */}
      <mesh position={[0, 0.37, 0]} rotation={[Math.PI / 2, 0, Math.PI / 6]}>
        <torusGeometry args={[0.46, 0.012, 8, 6 * 8]} />
        <meshStandardMaterial
          ref={trimRef}
          color={palette.neonGreen}
          emissive={palette.neonGreen}
          emissiveIntensity={1.1}
          metalness={0.9}
          roughness={0.2}
        />
      </mesh>

      {/* Floating wireframe icon above pedestal. */}
      <group ref={iconRef} position={[0, 0.8, 0]}>
        <WireframeIcon kind={iconKind} />
      </group>

      {/* Project name. */}
      <Text
        raycast={noRaycast}
        ref={disableRaycast}
        position={[0, 1.25, 0]}
        fontSize={0.15}
        color={palette.neonBright}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.16}
        outlineWidth={0.002}
        outlineColor={palette.neonGreen}
      >
        {label.toUpperCase()}
      </Text>

      {/* Subtitle. */}
      <Text
        raycast={noRaycast}
        ref={disableRaycast}
        position={[0, 1.10, 0]}
        fontSize={0.055}
        color={palette.textSecondary}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.12}
      >
        {subtitle}
      </Text>

      {/* VIEW PROJECT button. */}
      <group
        position={[0, 0.92, 0]}
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
          position={[0, 0, 0.002]}
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

/**
 * Tiny procedural wireframe icons. All neon-green, single material.
 */
function WireframeIcon({ kind }: { kind: 'leaf' | 'box' | 'globe' }) {
  const matProps = {
    color: palette.neonGreen,
    wireframe: true,
    emissive: palette.neonGreen,
    emissiveIntensity: 1.0,
  } as const;

  if (kind === 'box') {
    return (
      <mesh>
        <boxGeometry args={[0.32, 0.32, 0.32]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
    );
  }
  if (kind === 'globe') {
    return (
      <mesh>
        <sphereGeometry args={[0.22, 16, 12]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
    );
  }
  // 'leaf' — use an icosahedron as a stand-in for the procedural plant.
  return (
    <mesh>
      <icosahedronGeometry args={[0.22, 0]} />
      <meshStandardMaterial {...matProps} />
    </mesh>
  );
}
