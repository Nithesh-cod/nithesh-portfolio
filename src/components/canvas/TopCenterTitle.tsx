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

const TITLE_Y = 4.5; // V13.0 — raised + pushed back (Z=-1.5 below) so it sits ABOVE-BEHIND the avatar's head, not across its face.
const TITLE_Z = -1.5;

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
    <Billboard position={[0, TITLE_Y, TITLE_Z]} follow lockX={false} lockY={false} lockZ={false}>
      {/* Eyebrow — ENGINEER / DEVELOPER / INNOVATOR. */}
      <group position={[0, 0.34, 0]}>
        <Text
          raycast={noRaycast}
          ref={disableRaycast}
          fontSize={0.075}
          color={palette.neonBright}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.32}
          outlineWidth={0.002}
          outlineColor={palette.neonGreen}
        >
          ENGINEER   /   DEVELOPER   /   INNOVATOR
        </Text>
      </group>

      {/* Big title — DIGITAL IDENTITY ENGINE. */}
      <group position={[0, 0.10, 0]}>
        <Text
          raycast={noRaycast}
          ref={disableRaycast}
          fontSize={0.24}
          color={palette.neonGreen}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.16}
          outlineWidth={0.004}
          outlineColor={palette.neonBright}
        >
          DIGITAL IDENTITY ENGINE
        </Text>
        {/* Arrow rails flanking the title. */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 3.05, 0, 0]}>
            <mesh raycast={noRaycast}>
              <planeGeometry args={[0.7, 0.012]} />
              <meshBasicMaterial color={palette.neonGreen} transparent opacity={0.7} toneMapped={false} />
            </mesh>
            <mesh raycast={noRaycast} position={[s * 0.38, 0, 0]} rotation={[0, 0, s > 0 ? -Math.PI / 2 : Math.PI / 2]}>
              <circleGeometry args={[0.05, 3]} />
              <meshBasicMaterial color={palette.neonBright} toneMapped={false} />
            </mesh>
          </group>
        ))}
        {/* Two pulsing dot accents flanking the title for definition. */}
        <mesh position={[-2.6, 0, 0]}>
          <circleGeometry args={[0.04, 24]} />
          <meshStandardMaterial
            ref={dotLeftRef}
            color={palette.neonBright}
            emissive={palette.neonBright}
            emissiveIntensity={1.6}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[2.6, 0, 0]}>
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

      {/* Hair-thin emissive accent line under the title. */}
      <mesh position={[0, -0.14, 0]} raycast={noRaycast}>
        <planeGeometry args={[3.2, 0.006]} />
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
