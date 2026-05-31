'use client';

import { Text, useTexture } from '@react-three/drei';
import { type ThreeEvent } from '@react-three/fiber';
import { useRef } from 'react';
import { FrontSide, type Texture } from 'three';
import { certificateGroups, type Certificate } from '@/lib/content';
import { palette } from '@/lib/palette';
import { play } from '@/lib/audio';
import { noRaycast } from '@/lib/three-utils';
import { usePortfolioStore } from '@/lib/store';

const CONTAINER_W = 1.0;
const CONTAINER_H = 0.7;
const CONTAINER_D = 0.1;
const GAP_X = 0.18;
const GAP_Y = 0.55; // extra room for title+date under each card
const ROW_GAP = 0.35; // gap between heading and the row beneath

// Wall position — left side of the lab, facing into the room (normal +X).
// y centred mid-height; z mid-room.
const SHELF_POS: readonly [number, number, number] = [-6.5, 1.6, -1.5];

/**
 * 12 framed certificate "containers" on a left-side wall.
 * Layout — 4 rows, each with its own heading; row widths vary (4 / 3 / 3 / 3)
 * so the visual grouping is obvious. Total grid is ~4.4 wide × ~4.7 tall.
 */
type Row = { heading: string; ids: readonly string[] };
const ROWS: readonly Row[] = [
  { heading: 'FRONT-END',     ids: ['front-end-web-dev', 'html5', 'css3', 'javascript'] },
  { heading: 'GENERATIVE AI', ids: ['applied-gen-ai', 'ai-first-software-engineering', 'openai-gpt-models'] },
  { heading: '',              ids: ['gpt-3-for-developers', 'prompt-engineering'] },
  { heading: 'PROGRAMMING',   ids: ['basics-of-python', 'python-fundamentals-part1', 'python-fundamentals-part2'] },
];

const ALL_CERTS: ReadonlyMap<string, Certificate> = new Map(
  certificateGroups.flatMap((g) => g.certs.map((c) => [c.id, c] as const)),
);

export function CertificateShelf() {
  // Layout: stack rows vertically. Each row's heading sits above its cards.
  const rowHeight = CONTAINER_H + GAP_Y + ROW_GAP;
  const totalH = ROWS.length * rowHeight - ROW_GAP;
  const top = totalH / 2;

  return (
    <group position={SHELF_POS} rotation={[0, Math.PI / 2, 0]}>
      {/* Back wall — large dark plane behind the grid for visual grounding. */}
      <mesh position={[0, 0, -0.06]}>
        <planeGeometry args={[7.5, totalH + 1.2]} />
        <meshStandardMaterial color={palette.void} roughness={0.85} metalness={0.1} side={FrontSide} />
      </mesh>

      {/* Single warm amber spotlight from above, sweeping the wall. */}
      <spotLight
        position={[0, top + 1.5, 2.5]}
        target-position={[0, 0, 0]}
        intensity={1.1}
        angle={0.55}
        penumbra={0.6}
        color={palette.amberKey}
        distance={9}
        decay={2}
      />

      {ROWS.map((row, ri) => {
        const yCentre = top - ri * rowHeight - CONTAINER_H / 2 - (row.heading ? ROW_GAP : 0);
        const rowWidth = row.ids.length * CONTAINER_W + (row.ids.length - 1) * GAP_X;
        const xStart = -rowWidth / 2 + CONTAINER_W / 2;
        return (
          <group key={ri} position={[0, yCentre, 0]}>
            {row.heading ? (
              <Text
                raycast={noRaycast}
                position={[0, CONTAINER_H / 2 + 0.18, 0.001]}
                fontSize={0.14}
                color={palette.goldAccent}
                anchorX="center"
                anchorY="middle"
                letterSpacing={0.2}
              >
                {row.heading}
              </Text>
            ) : null}
            {row.ids.map((id, ci) => {
              const cert = ALL_CERTS.get(id);
              if (!cert) return null;
              return (
                <Container
                  key={id}
                  cert={cert}
                  position={[xStart + ci * (CONTAINER_W + GAP_X), 0, 0]}
                />
              );
            })}
          </group>
        );
      })}
    </group>
  );
}

function Container({ cert, position }: { cert: Certificate; position: [number, number, number] }) {
  const tex = useTexture(cert.image) as Texture;
  const setCursor = usePortfolioStore((s) => s.setCursorState);
  const openCertificate = usePortfolioStore((s) => s.openCertificate);
  const lastHoverAt = useRef(0);

  const handleOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setCursor('interactive');
    const now = performance.now();
    if (now - lastHoverAt.current < 150) return;
    lastHoverAt.current = now;
    play('hover');
  };
  const handleOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setCursor('idle');
  };
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    play('click_primary');
    openCertificate(cert.id);
  };

  const innerW = CONTAINER_W - 0.08;
  const innerH = CONTAINER_H - 0.08;

  return (
    <group position={position} onPointerOver={handleOver} onPointerOut={handleOut} onClick={handleClick}>
      {/* Container body — graphite box, slightly recessed into the wall. */}
      <mesh>
        <boxGeometry args={[CONTAINER_W, CONTAINER_H, CONTAINER_D]} />
        <meshStandardMaterial color={palette.graphite} roughness={0.45} metalness={0.85} />
      </mesh>
      {/* Thumbnail face — slightly inset from the bezel. */}
      <mesh position={[0, 0, CONTAINER_D / 2 + 0.001]}>
        <planeGeometry args={[innerW, innerH]} />
        <meshStandardMaterial
          map={tex}
          color={palette.ivory}
          emissive={palette.emeraldMid}
          emissiveIntensity={0.05}
          roughness={0.6}
          metalness={0.05}
          side={FrontSide}
        />
      </mesh>
      {/* Title + date overlaid at the bottom — raycast disabled so the box stays clickable. */}
      <Text
        raycast={noRaycast}
        position={[0, -CONTAINER_H / 2 - 0.16, CONTAINER_D / 2 + 0.002]}
        fontSize={0.058}
        color={palette.ivory}
        anchorX="center"
        anchorY="top"
        maxWidth={CONTAINER_W + 0.2}
        lineHeight={1.2}
        letterSpacing={0.02}
        outlineWidth={0.001}
        outlineColor={palette.void}
      >
        {cert.title}
      </Text>
      <Text
        raycast={noRaycast}
        position={[0, -CONTAINER_H / 2 - 0.34, CONTAINER_D / 2 + 0.002]}
        fontSize={0.04}
        color={palette.bone}
        anchorX="center"
        anchorY="top"
        letterSpacing={0.04}
      >
        {cert.date}
      </Text>
    </group>
  );
}
