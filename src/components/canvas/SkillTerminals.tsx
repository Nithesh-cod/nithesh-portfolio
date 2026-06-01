'use client';

import { Text } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useRef, useState } from 'react';
import { FrontSide, type Group } from 'three';
import { SKILL_ARC_POS, skillCategories, type SkillCategory, waypoints } from '@/lib/content';
import { palette } from '@/lib/palette';
import { play } from '@/lib/audio';
import { disableRaycast, noRaycast } from '@/lib/three-utils';
import { usePortfolioStore } from '@/lib/store';

const SKILLS_WP_IDX = waypoints.findIndex((w) => w.id === 'skills');

const ARC_RADIUS = 1.85;
const ARC_SPAN = Math.PI * 0.72; // ~130°

// Per-podium dims
const PLINTH_W = 0.5;
const PLINTH_H = 0.25;
const PLINTH_D = 0.4;
const BODY_W = 0.55;
const BODY_H = 0.4;
const BODY_D = 0.45;
const SCREEN_W = 0.42;
const SCREEN_H = 0.28;

/**
 * Five in-scene CRT terminal podiums arranged in a tight arc, replacing the
 * old DOM HudPanels SkillsPanel. Each terminal shows one skill category and
 * its items; clicking opens the CategoryDetailModal. Section-gated so it only
 * exists in the scene when the visitor is at (or one step from) the skills
 * waypoint — keeps the cylinders out of click rays at other waypoints.
 */
export function SkillTerminals() {
  const section = usePortfolioStore((s) => s.section);
  if (Math.abs(section - SKILLS_WP_IDX) > 1) return null;

  const n = skillCategories.length;

  return (
    <group position={SKILL_ARC_POS}>
      {skillCategories.map((cat, i) => {
        const t = n === 1 ? 0 : i / (n - 1);
        const angle = -ARC_SPAN / 2 + t * ARC_SPAN;
        const x = Math.sin(angle) * ARC_RADIUS;
        const z = Math.cos(angle) * ARC_RADIUS;
        // Each podium yaws toward arc centre so the screen faces the camera-side.
        const yaw = -angle;
        return <TerminalPodium key={cat.id} category={cat} position={[x, 0, z]} yaw={yaw} />;
      })}
    </group>
  );
}

function TerminalPodium({
  category,
  position,
  yaw,
}: {
  category: SkillCategory;
  position: [number, number, number];
  yaw: number;
}) {
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<Group | null>(null);
  const openSkillCategory = usePortfolioStore((s) => s.openSkillCategory);
  const setCursor = usePortfolioStore((s) => s.setCursorState);
  const lastHoverAt = useRef(0);
  const baseZ = 0;

  // Hover wake: whole monitor + plinth slides +0.04 toward camera.
  useFrame((_, dt) => {
    if (!groupRef.current) return;
    const target = baseZ + (hovered ? 0.04 : 0);
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
    openSkillCategory(category.id);
  };

  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <group ref={groupRef}>
        {/* Plinth */}
        <mesh castShadow receiveShadow position={[0, PLINTH_H / 2, 0]}>
          <boxGeometry args={[PLINTH_W, PLINTH_H, PLINTH_D]} />
          <meshStandardMaterial color={palette.graphite} metalness={0.7} roughness={0.5} side={FrontSide} />
        </mesh>

        {/* Monitor body — pointer handlers on this mesh (FIX 1 lesson). */}
        <mesh
          castShadow
          position={[0, PLINTH_H + BODY_H / 2, 0]}
          onPointerOver={handleOver}
          onPointerOut={handleOut}
          onClick={handleClick}
        >
          <boxGeometry args={[BODY_W, BODY_H, BODY_D]} />
          <meshStandardMaterial color={palette.graphite} metalness={0.75} roughness={0.4} />
        </mesh>

        {/* Recessed screen plane — emits the terminal-green phosphor glow. */}
        <mesh
          position={[0, PLINTH_H + BODY_H / 2, BODY_D / 2 + 0.001]}
          ref={(m) => m?.layers.enable(1)}
        >
          <planeGeometry args={[SCREEN_W, SCREEN_H]} />
          <meshStandardMaterial
            color={palette.void}
            emissive={palette.terminalGrn}
            emissiveIntensity={hovered ? 0.55 : 0.32}
          />
        </mesh>

        {/* Screen content — header + items, mono terminal-green. */}
        <group position={[0, PLINTH_H + BODY_H / 2, BODY_D / 2 + 0.003]}>
          <Text
            raycast={noRaycast}
            ref={disableRaycast}
            position={[-SCREEN_W / 2 + 0.02, SCREEN_H / 2 - 0.03, 0]}
            fontSize={0.024}
            color={palette.emeraldGlow}
            anchorX="left"
            anchorY="top"
            letterSpacing={0.1}
          >
            {`// SYS::${category.title}`}
          </Text>
          {category.items.map((item, i) => (
            <Text
              key={item}
              raycast={noRaycast}
              ref={disableRaycast}
              position={[-SCREEN_W / 2 + 0.02, SCREEN_H / 2 - 0.075 - i * 0.038, 0]}
              fontSize={0.022}
              color={palette.terminalGrn}
              anchorX="left"
              anchorY="top"
              letterSpacing={0.04}
            >
              {`> ${item}`}
            </Text>
          ))}
        </group>

        {/* 4 gold targeting-corner brackets on the screen frame. */}
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
      emissiveIntensity={0.8}
      metalness={0.95}
      roughness={0.25}
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
