'use client';

import { useFrame } from '@react-three/fiber';
import { MeshTransmissionMaterial, useTexture } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  FrontSide,
  NormalBlending,
  SRGBColorSpace,
  Vector2,
  type MeshStandardMaterial,
} from 'three';
import vert from '@/shaders/hologram.vert';
import frag from '@/shaders/hologram.frag';
import { HOLOGRAM_POS } from '@/lib/content';
import { palette } from '@/lib/palette';
import { usePortfolioStore } from '@/lib/store';

const W_FRONT = 1.2;
const H_FRONT = 1.6;
const W_BACK = 1.4;
const H_BACK = 1.8;
const PORTRAIT_W = 1.0;
const PORTRAIT_H = 1.4;
const FRONT_Z = 0.025;
const BACK_Z = -0.045;
const POST_R = 0.012;

/**
 * V7.0 — glass-sandwich hologram. Two parallel glass panes (front clear,
 * back frosted) connected by 4 thin champagne-gold corner posts. Portrait
 * shader plane sits between them. Subtle mint glow disc behind the back
 * pane.
 *
 * No chunky bezel, no panel haze, no boot reveal. Reads as a museum
 * display piece, not a Tron monitor.
 */
export function Hologram() {
  const rimMatRef = useRef<MeshStandardMaterial | null>(null);
  const perfMode = usePortfolioStore((s) => s.perfMode);
  const lowPerf = perfMode === 'low';

  const portrait = useTexture('/portrait.png');
  portrait.colorSpace = SRGBColorSpace;
  portrait.anisotropy = 8;

  const uniforms = useMemo(() => {
    const w = portrait.image?.width ?? 512;
    const h = portrait.image?.height ?? 768;
    return {
      uMap: { value: portrait },
      uTexelSize: { value: new Vector2(1 / w, 1 / h) },
      uTime: { value: 0 },
      uBoot: { value: 1 },
      uGlowColor: { value: new Color(palette.champagneGold) },
      uBgTint: { value: new Color(palette.signalMint) },
    };
  }, [portrait]);

  useFrame((_, dt) => {
    uniforms.uTime.value += dt;
    if (rimMatRef.current) {
      // V2.5 rim pulse retained — gentle 4 s sine on the gold corner posts.
      const t = uniforms.uTime.value;
      const phase = (t / 4) * Math.PI * 2;
      rimMatRef.current.emissiveIntensity = 0.5 + 0.18 * Math.sin(phase);
    }
  });

  return (
    <group position={HOLOGRAM_POS}>
      {/* Soft mint glow disc behind the back pane. */}
      <mesh position={[0, 0, BACK_Z - 0.01]}>
        <circleGeometry args={[1.1, 48]} />
        <meshBasicMaterial
          color={palette.signalMint}
          transparent
          opacity={0.06}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Back frosted pane. */}
      <mesh position={[0, 0, BACK_Z]} ref={(m) => m?.layers.enable(1)}>
        <planeGeometry args={[W_BACK, H_BACK]} />
        {lowPerf ? (
          <meshStandardMaterial
            color={palette.glassIce}
            roughness={0.5}
            metalness={0.05}
            transparent
            opacity={0.22}
          />
        ) : (
          <MeshTransmissionMaterial
            transmission={0.5}
            thickness={0.6}
            roughness={0.35}
            chromaticAberration={0.02}
            ior={1.5}
            distortion={0.04}
            color={palette.glassIce}
            samples={4}
            resolution={256}
          />
        )}
      </mesh>

      {/* Portrait plane sandwiched between panes. */}
      <mesh>
        <planeGeometry args={[PORTRAIT_W, PORTRAIT_H]} />
        <shaderMaterial
          vertexShader={vert}
          fragmentShader={frag}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          side={DoubleSide}
          blending={NormalBlending}
        />
      </mesh>

      {/* Front clear pane. */}
      <mesh position={[0, 0, FRONT_Z]}>
        <planeGeometry args={[W_FRONT, H_FRONT]} />
        <meshPhysicalMaterial
          color={palette.glassIce}
          roughness={0.02}
          metalness={0.0}
          transmission={lowPerf ? 0 : 0.95}
          thickness={0.04}
          ior={1.45}
          transparent
          opacity={0.16}
          side={FrontSide}
        />
      </mesh>

      {/* 4 champagne-gold corner posts connecting front + back panes. */}
      <CornerPosts rimMatRef={rimMatRef} />

      {/* Ground glow puddle — mint at low opacity. */}
      <mesh position={[0, -1.05, 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.9, 32]} />
        <meshBasicMaterial color={palette.signalMint} transparent opacity={0.05} />
      </mesh>
    </group>
  );
}

function CornerPosts({
  rimMatRef,
}: {
  rimMatRef: React.MutableRefObject<MeshStandardMaterial | null>;
}) {
  const depth = FRONT_Z - BACK_Z;
  const cz = (FRONT_Z + BACK_Z) / 2;
  const corners: readonly [number, number][] = [
    [-W_BACK / 2 + 0.06, H_BACK / 2 - 0.06],
    [W_BACK / 2 - 0.06, H_BACK / 2 - 0.06],
    [-W_BACK / 2 + 0.06, -H_BACK / 2 + 0.06],
    [W_BACK / 2 - 0.06, -H_BACK / 2 + 0.06],
  ];
  return (
    <>
      {corners.map(([x, y], i) => (
        <mesh key={i} position={[x, y, cz]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[POST_R, POST_R, depth, 14]} />
          <meshStandardMaterial
            ref={i === 0 ? rimMatRef : undefined}
            color={palette.champagneGold}
            emissive={palette.champagneGold}
            emissiveIntensity={0.5}
            metalness={0.95}
            roughness={0.2}
          />
        </mesh>
      ))}
    </>
  );
}
