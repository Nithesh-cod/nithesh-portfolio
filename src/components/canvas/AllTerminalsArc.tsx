'use client';

import { MeshTransmissionMaterial, RoundedBox, Text } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useRef, useState } from 'react';
import { type Group, type MeshStandardMaterial } from 'three';
import {
  arcPodiums,
  type ArcPodium,
  type SkillCategoryId,
} from '@/lib/content';
import { palette } from '@/lib/palette';
import { play } from '@/lib/audio';
import { disableRaycast, noRaycast } from '@/lib/three-utils';
import { usePortfolioStore } from '@/lib/store';

// V8.0 — skill podiums are now always-visible glass cards flanking the
// hologram (positions from content.V8_PODIUM_POSITIONS). No more section
// gating — they mount whenever the scene is rendered. The CRT + Contact
// podiums get their own hex pylons (rendered as cards too, but with
// distinct accent colours).

const CARD_W = 1.05;
const CARD_H = 0.78;
const CARD_D = 0.06;
const FLOAT_AMP = 0.025;
const FLOAT_PERIOD = 7;
const BORDER_T = 0.012;

export function AllTerminalsArc() {
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
  const borderMatRef = useRef<MeshStandardMaterial | null>(null);
  const accentDotRef = useRef<MeshStandardMaterial | null>(null);
  const t = useRef(phase);
  const lastHoverAt = useRef(0);

  const setCursor = usePortfolioStore((s) => s.setCursorState);
  const openSkillCategory = usePortfolioStore((s) => s.openSkillCategory);
  const openTerminal = usePortfolioStore((s) => s.openTerminal);
  const openResume = usePortfolioStore((s) => s.openResume);
  const focusOn = usePortfolioStore((s) => s.focusOn);
  const lowPerf = usePortfolioStore((s) => s.perfMode === 'low');

  // V8.0 — accent colour by kind. Category cards = mint. CRT/Contact get
  // distinct colours.
  const accentColor =
    podium.kind === 'crt' ? palette.champagneGold :
    podium.kind === 'contact' ? '#B89DFF' :  // contact pop (lilac)
    palette.signalMint;

  useFrame((_, dt) => {
    t.current += dt;
    if (!groupRef.current) return;
    const bob = Math.sin((t.current / FLOAT_PERIOD) * Math.PI * 2) * FLOAT_AMP;
    const lift = hovered ? 0.06 : 0;
    groupRef.current.position.y = podium.position[1] + bob + lift;
    if (borderMatRef.current) {
      borderMatRef.current.emissiveIntensity = hovered ? 1.8 : 1.2;
    }
    if (accentDotRef.current) {
      const blink = 0.6 + 0.4 * Math.sin(t.current * 1.8);
      accentDotRef.current.emissiveIntensity = blink * 1.4;
    }
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
    // Focus camera on this card.
    const [px, py, pz] = podium.position;
    focusOn([px * 0.5, py + 0.3, pz + 2.0], [px, py, pz]);
    if (podium.kind === 'crt') openTerminal();
    else if (podium.kind === 'contact') openResume();
    else openSkillCategory(podium.id as SkillCategoryId);
  };

  return (
    <group position={podium.position}>
      <group ref={groupRef} position={[0, 0, 0]}>
        {/* Substantial glass slab. */}
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
              color="#A8B5D8"
              roughness={0.25}
              metalness={0.15}
              transparent
              opacity={0.55}
            />
          ) : (
            <MeshTransmissionMaterial
              transmission={0.65}
              thickness={0.8}
              roughness={0.18}
              chromaticAberration={0.02}
              ior={1.5}
              distortion={0.04}
              color="#A8B5D8"
              samples={3}
              resolution={256}
            />
          )}
        </RoundedBox>

        {/* Accent dot top-left. */}
        <mesh
          position={[-CARD_W / 2 + 0.06, CARD_H / 2 - 0.06, CARD_D / 2 + 0.0015]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.015, 0.015, 0.005, 16]} />
          <meshStandardMaterial
            ref={accentDotRef}
            color={accentColor}
            emissive={accentColor}
            emissiveIntensity={1.2}
          />
        </mesh>

        {/* Header. */}
        <Text
          raycast={noRaycast}
          ref={disableRaycast}
          position={[0, CARD_H / 2 - 0.12, CARD_D / 2 + 0.002]}
          fontSize={0.092}
          color={accentColor}
          anchorX="center"
          anchorY="top"
          letterSpacing={0.08}
          outlineWidth={0.002}
          outlineColor={palette.champagneGold}
          outlineOpacity={0.5}
        >
          {podium.title}
        </Text>

        {/* Underline. */}
        <mesh position={[0, CARD_H / 2 - 0.21, CARD_D / 2 + 0.0015]}>
          <planeGeometry args={[CARD_W * 0.55, 0.005]} />
          <meshStandardMaterial
            color={palette.champagneGold}
            emissive={palette.champagneGold}
            emissiveIntensity={0.7}
            metalness={0.95}
            roughness={0.22}
          />
        </mesh>

        {/* Items. */}
        {podium.items.map((item, i) => (
          <Text
            key={`${podium.id}-${i}`}
            raycast={noRaycast}
            ref={disableRaycast}
            position={[0, CARD_H / 2 - 0.27 - i * 0.078, CARD_D / 2 + 0.002]}
            fontSize={0.048}
            color={palette.ivoryWarm}
            anchorX="center"
            anchorY="top"
            letterSpacing={0.06}
            maxWidth={CARD_W - 0.18}
          >
            {item}
          </Text>
        ))}

        {/* Border. */}
        <EdgeStroke w={CARD_W} h={CARD_H} z={CARD_D / 2 + 0.001} borderMatRef={borderMatRef} />
      </group>
    </group>
  );
}

function EdgeStroke({
  w,
  h,
  z,
  borderMatRef,
}: {
  w: number;
  h: number;
  z: number;
  borderMatRef: React.MutableRefObject<MeshStandardMaterial | null>;
}) {
  const T = BORDER_T;
  const matProps = {
    color: palette.champagneGold,
    emissive: palette.champagneGold,
    emissiveIntensity: 1.2,
    metalness: 0.95,
    roughness: 0.22,
  } as const;
  return (
    <>
      <mesh position={[0, h / 2, z]}>
        <planeGeometry args={[w, T]} />
        <meshStandardMaterial ref={borderMatRef} {...matProps} />
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
