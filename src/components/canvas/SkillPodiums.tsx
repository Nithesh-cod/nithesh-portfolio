'use client';

import { Billboard, Text } from '@react-three/drei';
import { type ThreeEvent } from '@react-three/fiber';
import { useRef, useState } from 'react';
import { FrontSide } from 'three';
import { content, SKILL_ARC_POS, waypoints } from '@/lib/content';
import { palette } from '@/lib/palette';
import { play } from '@/lib/audio';
import { noRaycast } from '@/lib/three-utils';
import { usePortfolioStore } from '@/lib/store';

// Pre-compute the skills waypoint index from the static waypoint list.
const SKILLS_WP_IDX = waypoints.findIndex((w) => w.id === 'skills');

const PODIUM_RADIUS = 0.35;
const PODIUM_HEIGHT = 0.4;
// V1.9: tightened from 2.6 / 155° → 2.2 / 130° so the extreme podiums sit
// inside the camera's horizontal half-FOV (≈31° at the skills waypoint).
const ARC_RADIUS = 2.2;
const ARC_SPAN = Math.PI * 0.72; // ~130°

/**
 * Five skill-group podiums in a shallow semicircular arc. Each podium is a
 * graphite cylinder with a gold-accent rim; the group name + items hover above
 * via Billboard so they always face the camera. Hovering pulses the rim.
 */
export function SkillPodiums() {
  const section = usePortfolioStore((s) => s.section);

  // Render the podiums ONLY when the visitor is near the skills waypoint.
  // Otherwise the cylinder bodies (which are raycastable) AND the Billboard
  // text could sit between the camera and the consoles at other waypoints,
  // intercepting clicks and bleeding visually across other zones.
  if (Math.abs(section - SKILLS_WP_IDX) > 1) return null;

  const groups = Object.entries(content.skills); // 5 ordered entries
  const n = groups.length;

  return (
    <group position={SKILL_ARC_POS}>
      {groups.map(([heading, items], i) => {
        // Lay out across ARC_SPAN, centred. -ARC_SPAN/2 .. +ARC_SPAN/2.
        const t = n === 1 ? 0 : i / (n - 1);
        const angle = -ARC_SPAN / 2 + t * ARC_SPAN;
        const x = Math.sin(angle) * ARC_RADIUS;
        const z = Math.cos(angle) * ARC_RADIUS; // +Z opens toward camera
        return <Podium key={heading} position={[x, 0, z]} heading={heading} items={items} />;
      })}
    </group>
  );
}

function Podium({
  position,
  heading,
  items,
}: {
  position: [number, number, number];
  heading: string;
  items: readonly string[];
}) {
  const [hovered, setHovered] = useState(false);
  const setCursor = usePortfolioStore((s) => s.setCursorState);
  const lastHoverAt = useRef(0);

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

  return (
    <group position={position} onPointerOver={handleOver} onPointerOut={handleOut}>
      {/* Podium body */}
      <mesh castShadow receiveShadow position={[0, PODIUM_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[PODIUM_RADIUS, PODIUM_RADIUS, PODIUM_HEIGHT, 24]} />
        <meshStandardMaterial
          color={palette.graphite}
          roughness={0.4}
          metalness={0.85}
          side={FrontSide}
        />
      </mesh>
      {/* Gold rim — thin torus at the top edge. */}
      <mesh position={[0, PODIUM_HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[PODIUM_RADIUS - 0.005, 0.012, 12, 48]} />
        <meshStandardMaterial
          color={palette.goldAccent}
          emissive={palette.goldAccent}
          emissiveIntensity={hovered ? 0.55 : 0.22}
          metalness={0.95}
          roughness={0.25}
        />
      </mesh>
      {/* Top cap — barely visible, gives the cylinder a closed look from above. */}
      <mesh position={[0, PODIUM_HEIGHT + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[PODIUM_RADIUS - 0.01, 24]} />
        <meshStandardMaterial color={palette.void} roughness={0.7} metalness={0.4} />
      </mesh>

      {/* Floating label: heading + items. Sizes per FIX 2a — heading 0.08,
          items 0.05, maxWidth 1.2 (≈ podium width). Both Text raycast disabled. */}
      <Billboard position={[0, PODIUM_HEIGHT + 0.25, 0]}>
        <Text
          raycast={noRaycast}
          fontSize={0.08}
          color={palette.emeraldGlow}
          anchorX="center"
          anchorY="bottom"
          letterSpacing={0.16}
          outlineWidth={0.002}
          outlineColor={palette.void}
        >
          {heading.toUpperCase()}
        </Text>
        <Text
          raycast={noRaycast}
          position={[0, -0.04, 0]}
          fontSize={0.05}
          color={palette.bone}
          anchorX="center"
          anchorY="top"
          maxWidth={1.2}
          textAlign="center"
          lineHeight={1.25}
          letterSpacing={0.02}
        >
          {items.join(' · ')}
        </Text>
      </Billboard>
    </group>
  );
}
