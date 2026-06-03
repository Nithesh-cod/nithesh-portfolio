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
  /** Angle (rad) the station yaws so it faces the camera centre. */
  yaw?: number;
  iconKind: 'leaf' | 'box' | 'globe';
  phase?: number;
};

const HEX_SIDES = 6;

/**
 * V10.0 — museum-floor project station. 2-tier hex base + a glass display
 * case on top containing a rotating wireframe icon + nameplate on the
 * front of tier 1 + a VIEW PROJECT button on tier 2's front face.
 */
export function ProjectStation({ slug, label, subtitle, position, yaw = 0, iconKind, phase = 0 }: Props) {
  const groupRef = useRef<Group | null>(null);
  const iconRef = useRef<Group | null>(null);
  const trimRefs = useRef<(MeshStandardMaterial | null)[]>([]);
  const buttonMatRef = useRef<MeshStandardMaterial | null>(null);
  const [hovered, setHovered] = useState(false);
  const t = useRef(phase);

  const openProject = usePortfolioStore((s) => s.openProject);
  const setCursor = usePortfolioStore((s) => s.setCursorState);
  const lowPerf = usePortfolioStore((s) => s.perfMode === 'low');

  useFrame((_, dt) => {
    t.current += dt;
    if (groupRef.current) {
      const bob = Math.sin((t.current / 6) * Math.PI * 2) * 0.04;
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

  // Hex base — 2 tiers.
  const TIERS = [
    { y: 0.125, radius: 0.9, h: 0.25 },
    { y: 0.35, radius: 0.7, h: 0.20 },
  ];

  // Display case sits on top of tier 2.
  const CASE_W = 1.0;
  const CASE_H = 0.8;
  const CASE_D = 0.6;
  const CASE_Y = 0.45 + CASE_H / 2;

  return (
    <group ref={groupRef} position={position} rotation={[0, yaw, 0]}>
      {/* 2 hex tiers. */}
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
            <meshStandardMaterial color="#1A1A2A" metalness={0.8} roughness={0.3}
              emissive={palette.neonGreen} emissiveIntensity={0.04} />
          </mesh>
          <mesh position={[0, tier.y + tier.h / 2, 0]} rotation={[Math.PI / 2, 0, Math.PI / 6]}>
            <torusGeometry args={[tier.radius, 0.008, 8, 6 * 8]} />
            <meshStandardMaterial
              ref={(m) => { trimRefs.current[i] = m; }}
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

      {/* GLASS DISPLAY CASE on top of tier 2. */}
      <mesh
        position={[0, CASE_Y, 0]}
        onPointerOver={handleOver}
        onPointerOut={handleOut}
        onClick={handleClick}
      >
        <boxGeometry args={[CASE_W, CASE_H, CASE_D]} />
        <meshPhysicalMaterial
          color="#88FFCC"
          transmission={lowPerf ? 0 : 0.85}
          thickness={0.10}
          roughness={0.08}
          ior={1.4}
          transparent
          opacity={0.22}
          metalness={0.0}
        />
      </mesh>

      {/* 12 thin edge tubes around the display case. */}
      <CaseEdgeTubes y={CASE_Y} />

      {/* Wireframe icon floating inside the case. */}
      <group ref={iconRef} position={[0, CASE_Y, 0]}>
        <WireframeIcon kind={iconKind} />
      </group>

      {/* Project nameplate on front of tier 1. */}
      <group position={[0, 0.125, 0.92]} rotation={[0, 0, 0]}>
        <mesh>
          <planeGeometry args={[0.9, 0.18]} />
          <meshStandardMaterial color="#020608" emissive={palette.neonGreen} emissiveIntensity={0.10}
            metalness={0.6} roughness={0.4} />
        </mesh>
        <Text
          raycast={noRaycast}
          ref={disableRaycast}
          position={[0, 0, 0.003]}
          fontSize={0.065}
          color={palette.neonBright}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.18}
          outlineWidth={0.0015}
          outlineColor={palette.neonGreen}
        >
          {label.toUpperCase()}
        </Text>
      </group>

      {/* Subtitle Billboard just above name. */}
      <Text
        raycast={noRaycast}
        ref={disableRaycast}
        position={[0, CASE_Y + CASE_H / 2 + 0.18, 0]}
        fontSize={0.05}
        color={palette.textSecondary}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.14}
      >
        {subtitle}
      </Text>

      {/* VIEW PROJECT button on tier 2's front face. */}
      <group
        position={[0, 0.35, 0.72]}
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
            toneMapped={false}
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

function CaseEdgeTubes({ y }: { y: number }) {
  const W = 1.0;
  const H = 0.8;
  const D = 0.6;
  const T = 0.015;
  const mat = (
    <meshStandardMaterial
      color={palette.neonGreen}
      emissive={palette.neonGreen}
      emissiveIntensity={1.4}
      metalness={0.9}
      roughness={0.2}
      toneMapped={false}
    />
  );
  // 12 edges of the box: 4 top, 4 bottom, 4 vertical.
  return (
    <group position={[0, y, 0]}>
      {/* Top + bottom rectangles (each 4 edges). */}
      {[H / 2, -H / 2].map((yy, idx) => (
        <group key={idx} position={[0, yy, 0]}>
          <mesh position={[0, 0,  D / 2]}><boxGeometry args={[W, T, T]} />{mat}</mesh>
          <mesh position={[0, 0, -D / 2]}><boxGeometry args={[W, T, T]} />{mat}</mesh>
          <mesh position={[ W / 2, 0, 0]}><boxGeometry args={[T, T, D]} />{mat}</mesh>
          <mesh position={[-W / 2, 0, 0]}><boxGeometry args={[T, T, D]} />{mat}</mesh>
        </group>
      ))}
      {/* 4 vertical corners. */}
      <mesh position={[ W / 2, 0,  D / 2]}><boxGeometry args={[T, H, T]} />{mat}</mesh>
      <mesh position={[-W / 2, 0,  D / 2]}><boxGeometry args={[T, H, T]} />{mat}</mesh>
      <mesh position={[ W / 2, 0, -D / 2]}><boxGeometry args={[T, H, T]} />{mat}</mesh>
      <mesh position={[-W / 2, 0, -D / 2]}><boxGeometry args={[T, H, T]} />{mat}</mesh>
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
    return (<mesh><boxGeometry args={[0.34, 0.34, 0.34]} /><meshStandardMaterial {...matProps} /></mesh>);
  }
  if (kind === 'globe') {
    return (<mesh><sphereGeometry args={[0.24, 16, 12]} /><meshStandardMaterial {...matProps} /></mesh>);
  }
  return (<mesh><icosahedronGeometry args={[0.24, 0]} /><meshStandardMaterial {...matProps} /></mesh>);
}
