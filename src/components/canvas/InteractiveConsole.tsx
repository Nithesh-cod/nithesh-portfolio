'use client';

import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { MeshTransmissionMaterial, RoundedBox, Text } from '@react-three/drei';
import { useRef, useState } from 'react';
import { type Group } from 'three';
import { palette } from '@/lib/palette';
import { usePortfolioStore } from '@/lib/store';
import { disableRaycast, noRaycast } from '@/lib/three-utils';
import { play } from '@/lib/audio';
import type { Project, Station } from '@/lib/content';

const CARD_W = 1.5;
const CARD_H = 1.0;
const CARD_D = 0.05;
const FLOAT_AMP = 0.04;
const FLOAT_PERIOD = 6;

/**
 * V7.0 — floating glass card. Replaces the V2.x plinth + monitor body
 * with a single thin glass slab carrying the project name. Floats at
 * y=1.0 with subtle bobbing. Champagne-gold edge stroke + signal-mint
 * project name.
 */
export function InteractiveConsole({
  slug,
  label,
  position,
}: {
  slug: Project['slug'];
  label: string;
  position: Station['position'];
}) {
  const groupRef = useRef<Group | null>(null);
  const [hovered, setHovered] = useState(false);
  const t = useRef(Math.random() * Math.PI * 2);

  const openProject = usePortfolioStore((s) => s.openProject);
  const setCursor = usePortfolioStore((s) => s.setCursorState);
  const lowPerf = usePortfolioStore((s) => s.perfMode === 'low');

  // Final float height: station Y + 0.45 so the card sits roughly at
  // hologram-eye level above the floor.
  const restY = position[1] + 0.45;

  useFrame((_, dt) => {
    t.current += dt;
    if (!groupRef.current) return;
    const bob = Math.sin((t.current / FLOAT_PERIOD) * Math.PI * 2) * FLOAT_AMP;
    const lift = hovered ? 0.05 : 0;
    groupRef.current.position.y = restY + bob + lift;
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
    openProject(slug);
  };

  return (
    <group ref={groupRef} position={[position[0], restY, position[2]]}>
      {/* Glass slab — handlers live here. */}
      <RoundedBox
        args={[CARD_W, CARD_H, CARD_D]}
        radius={0.04}
        smoothness={3}
        onPointerOver={handleOver}
        onPointerOut={handleOut}
        onClick={handleClick}
      >
        {lowPerf ? (
          <meshStandardMaterial
            color={palette.glassIce}
            roughness={0.25}
            metalness={0.1}
            transparent
            opacity={0.35}
          />
        ) : (
          <MeshTransmissionMaterial
            transmission={0.88}
            thickness={0.5}
            roughness={0.12}
            chromaticAberration={0.02}
            ior={1.5}
            distortion={0.05}
            color={palette.glassIce}
            samples={3}
            resolution={256}
          />
        )}
      </RoundedBox>

      {/* Project name in signal-mint, embedded inside the glass. */}
      <Text
        raycast={noRaycast}
        ref={disableRaycast}
        position={[0, 0, CARD_D / 2 + 0.001]}
        fontSize={0.14}
        color={palette.signalMint}
        anchorX="center"
        anchorY="middle"
        maxWidth={CARD_W * 0.85}
        textAlign="center"
        lineHeight={1.0}
        letterSpacing={0.08}
        outlineWidth={0.002}
        outlineColor={palette.champagneGold}
        outlineOpacity={0.5}
      >
        {label.toUpperCase()}
      </Text>

      {/* Champagne-gold edge stroke — 4 thin emissive bars around card perimeter. */}
      <EdgeStroke
        w={CARD_W}
        h={CARD_H}
        z={CARD_D / 2 + 0.001}
        brightness={hovered ? 0.95 : 0.6}
      />
    </group>
  );
}

function EdgeStroke({
  w,
  h,
  z,
  brightness,
}: {
  w: number;
  h: number;
  z: number;
  brightness: number;
}) {
  const T = 0.01;
  const matProps = {
    color: palette.champagneGold,
    emissive: palette.champagneGold,
    emissiveIntensity: brightness,
    metalness: 0.95,
    roughness: 0.22,
  } as const;
  return (
    <>
      <mesh position={[0, h / 2, z]}>
        <planeGeometry args={[w, T]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      <mesh position={[0, -h / 2, z]}>
        <planeGeometry args={[w, T]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      <mesh position={[-w / 2, 0, z]}>
        <planeGeometry args={[T, h]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      <mesh position={[w / 2, 0, z]}>
        <planeGeometry args={[T, h]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
    </>
  );
}
