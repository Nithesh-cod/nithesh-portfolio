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

// V8.0 — more substantial glass sandwich. Lower transmission on front pane
// (0.70), more frosted back pane (transmission 0.5, thickness 0.9), brighter
// gold inner frame, 4 mint LEDs at the corner posts, larger mint glow disc
// behind the whole hologram.
const W_FRONT = 1.2;
const H_FRONT = 1.6;
const W_BACK = 1.4;
const H_BACK = 1.8;
const PORTRAIT_W = 1.0;
const PORTRAIT_H = 1.4;
const FRONT_Z = 0.025;
const BACK_Z = -0.045;
const POST_R = 0.014;
const INNER_FRAME_W = 1.05;
const INNER_FRAME_H = 1.45;
const INNER_FRAME_T = 0.012;

export function Hologram() {
  const rimMatRef = useRef<MeshStandardMaterial | null>(null);
  const ledMatRef = useRef<MeshStandardMaterial | null>(null);
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
    const t = uniforms.uTime.value;
    const phase = (t / 4) * Math.PI * 2;
    if (rimMatRef.current) {
      rimMatRef.current.emissiveIntensity = 0.6 + 0.22 * Math.sin(phase);
    }
    if (ledMatRef.current) {
      ledMatRef.current.emissiveIntensity = 1.2 + 0.4 * Math.sin(phase + Math.PI / 4);
    }
  });

  return (
    <group position={HOLOGRAM_POS}>
      {/* V8.0 — larger mint glow disc behind the whole hologram. */}
      <mesh position={[0, 0, BACK_Z - 0.02]}>
        <circleGeometry args={[1.5, 48]} />
        <meshBasicMaterial
          color={palette.signalMint}
          transparent
          opacity={0.12}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Back frosted pane — more diffusion than V7. */}
      <mesh position={[0, 0, BACK_Z]} ref={(m) => m?.layers.enable(1)}>
        <planeGeometry args={[W_BACK, H_BACK]} />
        {lowPerf ? (
          <meshStandardMaterial
            color={palette.glassIce}
            roughness={0.55}
            metalness={0.05}
            transparent
            opacity={0.32}
          />
        ) : (
          <MeshTransmissionMaterial
            transmission={0.5}
            thickness={0.9}
            roughness={0.45}
            chromaticAberration={0.025}
            ior={1.5}
            distortion={0.05}
            color={palette.glassIce}
            samples={4}
            resolution={256}
          />
        )}
      </mesh>

      {/* Portrait plane between panes. */}
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

      {/* V8.0 — visible gold inner frame around the portrait. */}
      <InnerGoldFrame />

      {/* Front clearer pane — but more visible than V7 (transmission 0.70). */}
      <mesh position={[0, 0, FRONT_Z]}>
        <planeGeometry args={[W_FRONT, H_FRONT]} />
        <meshPhysicalMaterial
          color={palette.glassIce}
          roughness={0.05}
          metalness={0.0}
          transmission={lowPerf ? 0 : 0.7}
          thickness={0.12}
          ior={1.45}
          transparent
          opacity={0.32}
          side={FrontSide}
        />
      </mesh>

      {/* 4 champagne-gold corner posts. */}
      <CornerPosts rimMatRef={rimMatRef} />

      {/* V8.0 — 4 mint LEDs at the corner posts. */}
      <CornerLeds ledMatRef={ledMatRef} />

      {/* Ground glow puddle. */}
      <mesh position={[0, -1.05, 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.0, 32]} />
        <meshBasicMaterial color={palette.signalMint} transparent opacity={0.08} />
      </mesh>
    </group>
  );
}

function InnerGoldFrame() {
  const props = {
    color: palette.champagneGold,
    emissive: palette.champagneGold,
    emissiveIntensity: 0.5,
    metalness: 0.95,
    roughness: 0.2,
  } as const;
  const Z = 0.008;
  return (
    <>
      <mesh position={[0, INNER_FRAME_H / 2, Z]}>
        <boxGeometry args={[INNER_FRAME_W, INNER_FRAME_T, 0.004]} />
        <meshStandardMaterial {...props} />
      </mesh>
      <mesh position={[0, -INNER_FRAME_H / 2, Z]}>
        <boxGeometry args={[INNER_FRAME_W, INNER_FRAME_T, 0.004]} />
        <meshStandardMaterial {...props} />
      </mesh>
      <mesh position={[-INNER_FRAME_W / 2, 0, Z]}>
        <boxGeometry args={[INNER_FRAME_T, INNER_FRAME_H, 0.004]} />
        <meshStandardMaterial {...props} />
      </mesh>
      <mesh position={[INNER_FRAME_W / 2, 0, Z]}>
        <boxGeometry args={[INNER_FRAME_T, INNER_FRAME_H, 0.004]} />
        <meshStandardMaterial {...props} />
      </mesh>
    </>
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
            emissiveIntensity={0.6}
            metalness={0.95}
            roughness={0.2}
          />
        </mesh>
      ))}
    </>
  );
}

function CornerLeds({
  ledMatRef,
}: {
  ledMatRef: React.MutableRefObject<MeshStandardMaterial | null>;
}) {
  // 4 small mint LEDs at the gold corner posts, slightly inset on the front face.
  const corners: readonly [number, number][] = [
    [-W_BACK / 2 + 0.06, H_BACK / 2 - 0.06],
    [W_BACK / 2 - 0.06, H_BACK / 2 - 0.06],
    [-W_BACK / 2 + 0.06, -H_BACK / 2 + 0.06],
    [W_BACK / 2 - 0.06, -H_BACK / 2 + 0.06],
  ];
  return (
    <>
      {corners.map(([x, y], i) => (
        <mesh key={i} position={[x, y, FRONT_Z + 0.005]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.006, 14]} />
          <meshStandardMaterial
            ref={i === 0 ? ledMatRef : undefined}
            color={palette.signalMint}
            emissive={palette.signalMint}
            emissiveIntensity={1.4}
          />
        </mesh>
      ))}
    </>
  );
}
