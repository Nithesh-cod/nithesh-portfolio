'use client';

import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { DoubleSide, type Group, type Mesh, type MeshBasicMaterial } from 'three';
import { palette } from '@/lib/palette';
import { noRaycast, disableRaycast } from '@/lib/three-utils';

/**
 * V10.1 — Shared 3D panel shell used by every wall-mounted + floating
 * dashboard panel. Glass backing, neon-edge frame, sweeping scan line,
 * optional title bar, optional Y-axis bob.
 */
export type HUDPanel3DProps = {
  position: [number, number, number];
  rotation?: [number, number, number];
  width: number;
  height: number;
  children?: React.ReactNode;
  title?: string;
  bob?: boolean;
  color?: string;
};

export function HUDPanel3D({
  position,
  rotation = [0, 0, 0],
  width,
  height,
  children,
  title,
  bob = false,
  color = palette.neonGreen,
}: HUDPanel3DProps) {
  const groupRef = useRef<Group | null>(null);

  useFrame((state) => {
    if (bob && groupRef.current) {
      groupRef.current.position.y =
        position[1] + Math.sin(state.clock.elapsedTime * 0.5) * 0.04;
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* Glass backing plate (transparent green-tinted). */}
      <mesh raycast={noRaycast}>
        <planeGeometry args={[width, height]} />
        <meshPhysicalMaterial
          transmission={0.85}
          thickness={0.05}
          roughness={0.12}
          metalness={0.1}
          color="#88FFCC"
          transparent
          opacity={0.35}
          side={DoubleSide}
        />
      </mesh>

      {/* Neon frame + corner accents. */}
      <PanelFrame width={width} height={height} color={color} />

      {/* Sweeping top scanline. */}
      <ScanLine width={width} y={height / 2 - 0.04} />

      {/* Title row. */}
      {title && (
        <Text
          raycast={noRaycast}
          ref={disableRaycast}
          position={[0, height / 2 - 0.16, 0.012]}
          fontSize={0.10}
          color={palette.neonBright}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.22}
          outlineWidth={0.003}
          outlineColor="#000"
        >
          {title}
        </Text>
      )}

      {/* Content (drei <Text>, <Html>, simple meshes, …). */}
      <group position={[0, 0, 0.012]}>{children}</group>
    </group>
  );
}

function PanelFrame({
  width,
  height,
  color,
}: {
  width: number;
  height: number;
  color: string;
}) {
  const T = 0.015;
  return (
    <>
      {/* 4 emissive edges. */}
      <mesh raycast={noRaycast} position={[0, height / 2, 0.005]}>
        <boxGeometry args={[width + 0.02, T, 0.01]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.5} toneMapped={false} />
      </mesh>
      <mesh raycast={noRaycast} position={[0, -height / 2, 0.005]}>
        <boxGeometry args={[width + 0.02, T, 0.01]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.5} toneMapped={false} />
      </mesh>
      <mesh raycast={noRaycast} position={[width / 2, 0, 0.005]}>
        <boxGeometry args={[T, height, 0.01]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.5} toneMapped={false} />
      </mesh>
      <mesh raycast={noRaycast} position={[-width / 2, 0, 0.005]}>
        <boxGeometry args={[T, height, 0.01]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.5} toneMapped={false} />
      </mesh>
      {/* Corner accents. */}
      {(
        [
          [-1, -1],
          [-1, 1],
          [1, -1],
          [1, 1],
        ] as const
      ).map(([sx, sy], i) => (
        <mesh key={i} raycast={noRaycast} position={[(sx * width) / 2, (sy * height) / 2, 0.01]}>
          <boxGeometry args={[0.08, 0.08, 0.02]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={3.5} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}

function ScanLine({ width, y }: { width: number; y: number }) {
  const ref = useRef<Mesh | null>(null);
  const matRef = useRef<MeshBasicMaterial | null>(null);
  useFrame((state) => {
    if (!ref.current || !matRef.current) return;
    const t = (state.clock.elapsedTime % 3) / 3;
    ref.current.position.x = -width / 2 + t * width;
    matRef.current.opacity = Math.sin(t * Math.PI);
  });
  return (
    <mesh ref={ref} raycast={noRaycast} position={[-width / 2, y, 0.014]}>
      <boxGeometry args={[Math.min(0.3, width * 0.3), 0.005, 0.005]} />
      <meshBasicMaterial
        ref={matRef}
        color="#FFFFFF"
        transparent
        opacity={1}
        toneMapped={false}
      />
    </mesh>
  );
}
