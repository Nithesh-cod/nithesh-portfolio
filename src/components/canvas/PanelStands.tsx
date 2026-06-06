'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { type Mesh, type MeshStandardMaterial } from 'three';
import { palette } from '@/lib/palette';
import { noRaycast } from '@/lib/three-utils';

/* V12.1 — thin metal rod + neon trim "stands" beneath the 4 floating
 * mid-air panels (Achievements, About Me, Philosophy, Tech Stack) so
 * they read as physically anchored to the room rather than floating
 * arbitrarily in space. */

type StandSpec = {
  x: number;
  z: number;
  topY: number; // bottom of the panel
};

// V12.4 — panel positions:
//   AboutMe        [-3.5, 2.4, 1.0]
//   Achievements   [-3.5, 0.5, 1.0]
//   Philosophy     [ 3.5, 2.4, 1.0]
//   TechStack      [ 5.5, 2.5, -0.5]
//   SystemOverview [ 5.5, 0.8, -0.5]
const STANDS: StandSpec[] = [
  // Achievements panel y=0.5 touches the floor — no stand needed.
  { x: -3.5, z: 1.0, topY: 2.4 - 0.55 }, // About Me
  { x:  3.5, z: 1.0, topY: 2.4 - 0.55 }, // Philosophy
  // V13.1 — Tech Stack panel @ [5.5, 2.5, 1.0] gets its own tall stand.
  { x:  5.5, z: 1.0, topY: 2.5 - 0.55 }, // Tech Stack
  { x:  5.5, z: 1.0, topY: 0.8 - 0.55 }, // System Overview (column-brace)
];

export function PanelStands() {
  return (
    <group>
      {STANDS.map((s, i) => (
        <Stand key={i} x={s.x} z={s.z} topY={s.topY} phase={i * 0.7} />
      ))}
    </group>
  );
}

function Stand({
  x,
  z,
  topY,
  phase,
}: {
  x: number;
  z: number;
  topY: number;
  phase: number;
}) {
  const trimRef = useRef<MeshStandardMaterial | null>(null);
  const beamRef = useRef<Mesh | null>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (trimRef.current) {
      trimRef.current.emissiveIntensity = 1.4 + Math.sin(t * 1.2 + phase) * 0.30;
    }
    if (beamRef.current) {
      const mat = beamRef.current.material as { opacity?: number } | undefined;
      if (mat && typeof mat.opacity === 'number') {
        mat.opacity = 0.12 + 0.06 * Math.sin(t * 0.8 + phase);
      }
    }
  });

  const length = Math.max(topY, 0.05); // rod from floor (y=0) up to panel bottom

  return (
    <group position={[x, length / 2, z]}>
      {/* Central thin metal rod. */}
      <mesh raycast={noRaycast}>
        <cylinderGeometry args={[0.015, 0.020, length, 12]} />
        <meshStandardMaterial
          color={palette.darkSurface}
          metalness={0.85}
          roughness={0.25}
          emissive={palette.neonGreen}
          emissiveIntensity={0.10}
        />
      </mesh>

      {/* Vertical neon trim line beside the rod (additive feel). */}
      <mesh raycast={noRaycast} position={[0, 0, 0.022]}>
        <boxGeometry args={[0.012, length * 0.85, 0.005]} />
        <meshStandardMaterial
          ref={trimRef}
          color={palette.neonGreen}
          emissive={palette.neonGreen}
          emissiveIntensity={1.4}
          toneMapped={false}
        />
      </mesh>

      {/* Floor cap (small hex base where the rod meets the floor). */}
      <mesh raycast={noRaycast} position={[0, -length / 2 + 0.025, 0]}>
        <cylinderGeometry args={[0.10, 0.12, 0.04, 6]} />
        <meshStandardMaterial
          color={palette.darkSurface}
          metalness={0.85}
          roughness={0.30}
          emissive={palette.neonGreen}
          emissiveIntensity={0.25}
          toneMapped={false}
        />
      </mesh>
      <mesh raycast={noRaycast} position={[0, -length / 2 + 0.046, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.10, 0.006, 8, 6]} />
        <meshStandardMaterial
          color={palette.neonGreen}
          emissive={palette.neonGreen}
          emissiveIntensity={1.8}
          toneMapped={false}
        />
      </mesh>

      {/* Soft holographic beam halo behind the rod. */}
      <mesh ref={beamRef} raycast={noRaycast} position={[0, 0, -0.015]}>
        <planeGeometry args={[0.06, length * 0.95]} />
        <meshBasicMaterial
          color={palette.neonBright}
          transparent
          opacity={0.18}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
