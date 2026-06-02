'use client';

import { MeshTransmissionMaterial, RoundedBox, Text } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useRef, useState } from 'react';
import { type Group } from 'three';
import {
  arcPodiums,
  waypoints,
  type ArcPodium,
  type SkillCategoryId,
} from '@/lib/content';
import { palette } from '@/lib/palette';
import { play } from '@/lib/audio';
import { disableRaycast, noRaycast } from '@/lib/three-utils';
import { usePortfolioStore } from '@/lib/store';

const ORBIT_IDS = ['portrait', 'orbit-left', 'orbit-back', 'orbit-right'] as const;
const ORBIT_INDICES = ORBIT_IDS.map((id) => waypoints.findIndex((w) => w.id === id)).filter((i) => i >= 0);

function isArcZone(section: number): boolean {
  return ORBIT_INDICES.some((i) => Math.abs(section - i) <= 1);
}

// V7.0 — floating glass card. No plinth, no monitor body. Each podium is
// a single thin slab carrying the category name + items list, floating at
// arc-eye-height.
const CARD_W = 1.05;
const CARD_H = 0.8;
const CARD_D = 0.05;
const FLOAT_AMP = 0.025;
const FLOAT_PERIOD = 7;
const RIDE_HEIGHT = 1.15;

export function AllTerminalsArc() {
  const section = usePortfolioStore((s) => s.section);
  if (!isArcZone(section)) return null;
  return (
    <>
      {arcPodiums.map((p, i) => (
        <TerminalCard key={p.id} podium={p} phase={i * 0.7} />
      ))}
    </>
  );
}

function TerminalCard({ podium, phase }: { podium: ArcPodium; phase: number }) {
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<Group | null>(null);
  const t = useRef(phase);
  const lastHoverAt = useRef(0);

  const setCursor = usePortfolioStore((s) => s.setCursorState);
  const openSkillCategory = usePortfolioStore((s) => s.openSkillCategory);
  const openTerminal = usePortfolioStore((s) => s.openTerminal);
  const openResume = usePortfolioStore((s) => s.openResume);
  const lowPerf = usePortfolioStore((s) => s.perfMode === 'low');

  useFrame((_, dt) => {
    t.current += dt;
    if (!groupRef.current) return;
    const bob = Math.sin((t.current / FLOAT_PERIOD) * Math.PI * 2) * FLOAT_AMP;
    const lift = hovered ? 0.06 : 0;
    groupRef.current.position.y = RIDE_HEIGHT + bob + lift;
  });

  const handleOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    setCursor('interactive');
    const now = performance.now();
    if (now - lastHoverAt.current < 150) return;
    lastHoverAt.current = now;
    play('hover');
  };
  const handleOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(false);
    setCursor('idle');
  };
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    play('click_secondary');
    if (podium.kind === 'crt') openTerminal();
    else if (podium.kind === 'contact') openResume();
    else openSkillCategory(podium.id as SkillCategoryId);
  };

  // Header colour: signal-mint for live data, champagne-gold for CRT/Contact.
  const headerColor = podium.kind === 'category' ? palette.signalMint : palette.champagneGold;
  // Body text: ivory-warm.
  const itemColor = palette.ivoryWarm;

  return (
    <group
      position={[podium.position[0], RIDE_HEIGHT, podium.position[2]]}
      rotation={[0, podium.yaw, 0]}
    >
      <group ref={groupRef}>
        {/* Glass slab. */}
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
              thickness={0.45}
              roughness={0.14}
              chromaticAberration={0.02}
              ior={1.5}
              distortion={0.05}
              color={palette.glassIce}
              samples={3}
              resolution={256}
            />
          )}
        </RoundedBox>

        {/* Header text. */}
        <Text
          raycast={noRaycast}
          ref={disableRaycast}
          position={[0, CARD_H / 2 - 0.12, CARD_D / 2 + 0.002]}
          fontSize={0.10}
          color={headerColor}
          anchorX="center"
          anchorY="top"
          letterSpacing={0.08}
          outlineWidth={0.002}
          outlineColor={palette.champagneGold}
          outlineOpacity={0.5}
        >
          {podium.title}
        </Text>

        {/* Items list. */}
        {podium.items.map((item, i) => (
          <Text
            key={`${podium.id}-${i}`}
            raycast={noRaycast}
            ref={disableRaycast}
            position={[0, CARD_H / 2 - 0.27 - i * 0.085, CARD_D / 2 + 0.002]}
            fontSize={0.05}
            color={itemColor}
            anchorX="center"
            anchorY="top"
            letterSpacing={0.08}
            maxWidth={CARD_W - 0.18}
          >
            {item}
          </Text>
        ))}

        {/* Champagne-gold edge stroke. */}
        <EdgeStroke w={CARD_W} h={CARD_H} z={CARD_D / 2 + 0.001} brightness={hovered ? 0.95 : 0.55} />
      </group>
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
  const T = 0.008;
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
