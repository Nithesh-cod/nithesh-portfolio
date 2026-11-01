'use client';

import { Text } from '@react-three/drei';
import { palette } from '@/lib/palette';
import { disableRaycast, noRaycast } from '@/lib/three-utils';

type Props = {
  position: readonly [number, number, number];
  rotation?: readonly [number, number, number];
  heading: string;
  subtitle?: string;
  chips?: readonly string[];
  accent?: string;
  width?: number;
  height?: number;
  onClick?: () => void;
};

/**
 * Reel-2 "stop" primitive — big flat panel with a neon frame, heading,
 * optional subtitle, and a chip grid. Proving-slice only wires one of
 * these in place of CropAI's ProjectStation.
 */
export function StopBillboard({
  position,
  rotation = [0, 0, 0],
  heading,
  subtitle,
  chips = [],
  accent = palette.warmAmber,
  width = 3.0,
  height = 2.0,
  onClick,
}: Props) {
  const W = width;
  const H = height;
  const BAR = 0.03;
  const perRow = chips.length > 4 ? Math.ceil(chips.length / 2) : chips.length;
  const rows = chips.length > perRow ? 2 : 1;
  const colW = (W - 0.5) / Math.max(1, perRow);

  return (
    <group position={position as [number, number, number]} rotation={rotation as [number, number, number]}>
      {/* Backing panel. */}
      <mesh onClick={onClick}>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial
          color="#040608"
          emissive={accent}
          emissiveIntensity={0.08}
          metalness={0.3}
          roughness={0.5}
        />
      </mesh>

      {/* Neon frame — top/bottom/left/right. */}
      <mesh position={[0,  H / 2, 0.01]}><planeGeometry args={[W, BAR]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2.2} toneMapped={false} /></mesh>
      <mesh position={[0, -H / 2, 0.01]}><planeGeometry args={[W, BAR]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2.2} toneMapped={false} /></mesh>
      <mesh position={[-W / 2, 0, 0.01]}><planeGeometry args={[BAR, H]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2.2} toneMapped={false} /></mesh>
      <mesh position={[ W / 2, 0, 0.01]}><planeGeometry args={[BAR, H]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2.2} toneMapped={false} /></mesh>

      {/* Heading. */}
      <Text
        raycast={noRaycast}
        ref={disableRaycast}
        position={[0, H / 2 - 0.35, 0.02]}
        fontSize={0.28}
        color={accent}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.08}
        outlineWidth={0.004}
        outlineColor={accent}
        maxWidth={W - 0.4}
      >
        {heading.toUpperCase()}
      </Text>

      {subtitle && (
        <Text
          raycast={noRaycast}
          ref={disableRaycast}
          position={[0, H / 2 - 0.75, 0.02]}
          fontSize={0.11}
          color={palette.textPrimary}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.14}
          maxWidth={W - 0.4}
        >
          {subtitle.toUpperCase()}
        </Text>
      )}

      {/* Chip grid. */}
      {chips.length > 0 && (
        <group position={[0, -H / 2 + 0.55, 0.02]}>
          {chips.map((c, i) => {
            const row = Math.floor(i / perRow);
            const col = i % perRow;
            const x = -((perRow - 1) / 2) * colW + col * colW;
            const y = (rows === 1 ? 0 : (0.5 - row) * 0.28);
            return (
              <group key={c} position={[x, y, 0]}>
                <mesh>
                  <planeGeometry args={[colW * 0.9, 0.22]} />
                  <meshStandardMaterial
                    color="#0A1014"
                    emissive={accent}
                    emissiveIntensity={0.3}
                    transparent
                    opacity={0.85}
                  />
                </mesh>
                <Text
                  raycast={noRaycast}
                  ref={disableRaycast}
                  position={[0, 0, 0.01]}
                  fontSize={0.09}
                  color={accent}
                  anchorX="center"
                  anchorY="middle"
                  letterSpacing={0.08}
                  maxWidth={colW * 0.85}
                >
                  {c}
                </Text>
              </group>
            );
          })}
        </group>
      )}
    </group>
  );
}
