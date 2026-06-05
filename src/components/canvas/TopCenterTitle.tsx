'use client';

import { Billboard, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { type MeshBasicMaterial, type MeshStandardMaterial } from 'three';
import { palette } from '@/lib/palette';
import { disableRaycast, noRaycast } from '@/lib/three-utils';

/* V11.0 — top-of-frame title trio billboarded above the capsule:
 *   [ WELCOME TO MY WORLD ]      <- small bracketed badge
 *   DIGITAL IDENTITY ENGINE      <- Orbitron-style large title
 *   Crafting Experiences.        <- subtitle tagline
 *   Building Future.
 */

const TITLE_Y = 4.0; // V12.9 — closer to avatar; fits cleanly between head + ceiling.

export function TopCenterTitle() {
  // Bracketed badge "tick" pulse + faint vertical drift for life.
  const dotLeftRef = useRef<MeshStandardMaterial | null>(null);
  const dotRightRef = useRef<MeshStandardMaterial | null>(null);
  const lineRef = useRef<MeshBasicMaterial | null>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const pulse = 0.6 + 0.4 * Math.sin(t * 2.2);
    if (dotLeftRef.current) dotLeftRef.current.emissiveIntensity = 1.4 + pulse * 0.8;
    if (dotRightRef.current) dotRightRef.current.emissiveIntensity = 1.4 + pulse * 0.8;
    if (lineRef.current) lineRef.current.opacity = 0.35 + pulse * 0.45;
  });

  return (
    <Billboard position={[0, TITLE_Y, 0]} follow lockX={false} lockY={false} lockZ={false}>
      {/* Badge — [ WELCOME TO MY WORLD ]. */}
      <group position={[0, 0.40, 0]}>
        <Text
          raycast={noRaycast}
          ref={disableRaycast}
          fontSize={0.08}
          color={palette.neonBright}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.30}
          outlineWidth={0.002}
          outlineColor={palette.neonGreen}
        >
          [  WELCOME  TO  MY  WORLD  ]
        </Text>
      </group>

      {/* Big title — DIGITAL IDENTITY ENGINE. */}
      <group position={[0, 0.14, 0]}>
        <Text
          raycast={noRaycast}
          ref={disableRaycast}
          fontSize={0.22}
          color={palette.neonGreen}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.18}
          outlineWidth={0.004}
          outlineColor={palette.neonBright}
        >
          DIGITAL IDENTITY ENGINE
        </Text>
        {/* Two pulsing dot accents flanking the title for definition. */}
        <mesh position={[-2.3, 0, 0]}>
          <circleGeometry args={[0.04, 24]} />
          <meshStandardMaterial
            ref={dotLeftRef}
            color={palette.neonBright}
            emissive={palette.neonBright}
            emissiveIntensity={1.6}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[2.3, 0, 0]}>
          <circleGeometry args={[0.04, 24]} />
          <meshStandardMaterial
            ref={dotRightRef}
            color={palette.neonBright}
            emissive={palette.neonBright}
            emissiveIntensity={1.6}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* Subtitle — Crafting Experiences. Building Future. */}
      <group position={[0, -0.10, 0]}>
        <Text
          raycast={noRaycast}
          ref={disableRaycast}
          fontSize={0.06}
          color={palette.textSecondary}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.14}
        >
          Crafting Experiences. Building Future.
        </Text>
      </group>

      {/* Hair-thin emissive accent line under subtitle. */}
      <mesh position={[0, -0.28, 0]} raycast={noRaycast}>
        <planeGeometry args={[2.6, 0.006]} />
        <meshBasicMaterial
          ref={lineRef}
          color={palette.neonGreen}
          transparent
          opacity={0.6}
          toneMapped={false}
        />
      </mesh>
    </Billboard>
  );
}
