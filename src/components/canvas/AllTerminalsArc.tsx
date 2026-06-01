'use client';

import { RoundedBox, Text } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useRef, useState } from 'react';
import { FrontSide, type Group } from 'three';
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

// V2.6: arc zone covers portrait → orbit-left → orbit-back → orbit-right.
// We render all 7 podiums while the camera is anywhere in that band so the
// CatmullRom orbit always sees a continuous ring of meshes — no popping.
const ORBIT_IDS = ['portrait', 'orbit-left', 'orbit-back', 'orbit-right'] as const;
const ORBIT_INDICES = ORBIT_IDS.map((id) => waypoints.findIndex((w) => w.id === id)).filter((i) => i >= 0);

function isArcZone(section: number): boolean {
  return ORBIT_INDICES.some((i) => Math.abs(section - i) <= 1);
}

const PLINTH_W = 0.5;
const PLINTH_H = 0.25;
const PLINTH_D = 0.4;
const BODY_W = 0.55;
const BODY_H = 0.4;
const BODY_D = 0.45;
const SCREEN_W = 0.42;
const SCREEN_H = 0.28;

export function AllTerminalsArc() {
  const section = usePortfolioStore((s) => s.section);
  if (!isArcZone(section)) return null;
  return (
    <>
      {arcPodiums.map((p) => (
        <TerminalPodium key={p.id} podium={p} />
      ))}
    </>
  );
}

function TerminalPodium({ podium }: { podium: ArcPodium }) {
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<Group | null>(null);
  const lastHoverAt = useRef(0);

  const setCursor = usePortfolioStore((s) => s.setCursorState);
  const openSkillCategory = usePortfolioStore((s) => s.openSkillCategory);
  const openTerminal = usePortfolioStore((s) => s.openTerminal);
  const openResume = usePortfolioStore((s) => s.openResume);

  useFrame((_, dt) => {
    if (!groupRef.current) return;
    const target = hovered ? 0.04 : 0;
    groupRef.current.position.z += (target - groupRef.current.position.z) * Math.min(1, dt * 8);
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

  // Header colour: CRT + Contact get gold to differentiate from skill categories.
  const headerColor =
    podium.kind === 'category' ? palette.emeraldGlow : palette.goldAccent;
  const screenEmissive =
    podium.kind === 'crt'
      ? palette.terminalGrn
      : podium.kind === 'contact'
        ? palette.goldAccent
        : palette.terminalGrn;

  return (
    <group position={podium.position} rotation={[0, podium.yaw, 0]}>
      <group ref={groupRef}>
        {/* Plinth */}
        <mesh castShadow receiveShadow position={[0, PLINTH_H / 2, 0]}>
          <boxGeometry args={[PLINTH_W, PLINTH_H, PLINTH_D]} />
          <meshStandardMaterial color={palette.graphite} metalness={0.7} roughness={0.5} side={FrontSide} />
        </mesh>

        {/* Monitor body — RoundedBox gives the chassis a soft bevel. Handlers
            stay on this mesh so the V2.1 click pattern continues to work. */}
        <RoundedBox
          args={[BODY_W, BODY_H, BODY_D]}
          radius={0.035}
          smoothness={3}
          castShadow
          position={[0, PLINTH_H + BODY_H / 2, 0]}
          onPointerOver={handleOver}
          onPointerOut={handleOut}
          onClick={handleClick}
        >
          <meshStandardMaterial color={palette.graphite} metalness={0.75} roughness={0.4} />
        </RoundedBox>

        {/* Two steel knob cylinders on the lower front face of the body. */}
        {[-0.16, 0.16].map((x) => (
          <mesh
            key={`knob-${x}`}
            position={[x, PLINTH_H + 0.045, BODY_D / 2 + 0.0005]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.015, 0.015, 0.02, 16]} />
            <meshStandardMaterial color={palette.steel} metalness={0.9} roughness={0.3} />
          </mesh>
        ))}

        {/* Power LED — bottom-right of the body, emissive emerald. */}
        <mesh
          position={[BODY_W / 2 - 0.05, PLINTH_H + 0.045, BODY_D / 2 + 0.0008]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.009, 0.009, 0.005, 12]} />
          <meshStandardMaterial
            color={palette.emeraldHot}
            emissive={palette.emeraldHot}
            emissiveIntensity={1.4}
          />
        </mesh>

        {/* Screen plane */}
        <mesh
          position={[0, PLINTH_H + BODY_H / 2, BODY_D / 2 + 0.001]}
          ref={(m) => m?.layers.enable(1)}
        >
          <planeGeometry args={[SCREEN_W, SCREEN_H]} />
          <meshStandardMaterial
            color={palette.void}
            emissive={screenEmissive}
            emissiveIntensity={hovered ? 0.55 : 0.32}
          />
        </mesh>

        {/* Screen text */}
        <group position={[0, PLINTH_H + BODY_H / 2, BODY_D / 2 + 0.003]}>
          <Text
            raycast={noRaycast}
            ref={disableRaycast}
            position={[-SCREEN_W / 2 + 0.02, SCREEN_H / 2 - 0.03, 0]}
            fontSize={0.024}
            color={headerColor}
            anchorX="left"
            anchorY="top"
            letterSpacing={0.1}
          >
            {`// SYS::${podium.title}`}
          </Text>
          {podium.items.map((item, i) => (
            <Text
              key={`${podium.id}-${i}`}
              raycast={noRaycast}
              ref={disableRaycast}
              position={[-SCREEN_W / 2 + 0.02, SCREEN_H / 2 - 0.075 - i * 0.038, 0]}
              fontSize={0.022}
              color={podium.kind === 'contact' ? palette.bone : palette.terminalGrn}
              anchorX="left"
              anchorY="top"
              letterSpacing={0.04}
              maxWidth={SCREEN_W - 0.05}
            >
              {`> ${item}`}
            </Text>
          ))}
        </group>

        {/* Gold corner brackets */}
        <ScreenCornerBrackets bodyOffsetY={PLINTH_H + BODY_H / 2} bodyOffsetZ={BODY_D / 2 + 0.002} />
      </group>
    </group>
  );
}

function ScreenCornerBrackets({
  bodyOffsetY,
  bodyOffsetZ,
}: {
  bodyOffsetY: number;
  bodyOffsetZ: number;
}) {
  const W = SCREEN_W;
  const H = SCREEN_H;
  const L = 0.05;
  const T = 0.008;
  const mat = (
    <meshStandardMaterial
      color={palette.goldAccent}
      emissive={palette.goldAccent}
      emissiveIntensity={1.3}
      metalness={0.95}
      roughness={0.2}
    />
  );
  const corners: readonly [number, number][] = [
    [-1, 1],
    [1, 1],
    [-1, -1],
    [1, -1],
  ];
  return (
    <group position={[0, bodyOffsetY, bodyOffsetZ]}>
      {corners.map(([sx, sy]) => (
        <group key={`${sx}_${sy}`}>
          <mesh position={[sx * (W / 2 - L / 2), sy * (H / 2 - T / 2), 0]}>
            <planeGeometry args={[L, T]} />
            {mat}
          </mesh>
          <mesh position={[sx * (W / 2 - T / 2), sy * (H / 2 - L / 2), 0]}>
            <planeGeometry args={[T, L]} />
            {mat}
          </mesh>
        </group>
      ))}
    </group>
  );
}
