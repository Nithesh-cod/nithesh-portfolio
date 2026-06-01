'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { Billboard, Text, useTexture } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import {
  Color,
  DoubleSide,
  FrontSide,
  type Mesh,
  type MeshStandardMaterial,
  NormalBlending,
  SRGBColorSpace,
  Vector2,
  Vector3,
} from 'three';
import vert from '@/shaders/hologram.vert';
import frag from '@/shaders/hologram.frag';
import { HOLOGRAM_POS, content } from '@/lib/content';
import { palette } from '@/lib/palette';
import { disableRaycast, noRaycast } from '@/lib/three-utils';

const BOOT_DISTANCE = 3.2;
const BOOT_HOLD = 4.2;

/**
 * Holographic ID panel — 3:4 plane displaying the portrait.
 * Layer composition (back to front):
 *   1. Graphite outer bezel with emerald-mid emissive — frames the panel.
 *   2. Thin gold-accent inner border — the premium detail.
 *   3. Portrait plane driven by hologram.frag (subject preserved AS IS).
 *   4. Ground-glow puddle anchoring it to the floor.
 *
 * The mesh is on layer 1 so the emerald rim light in Scene.tsx illuminates it.
 */
export function Hologram() {
  const mesh = useRef<Mesh>(null);
  const bezelMat = useRef<MeshStandardMaterial | null>(null);
  const { camera } = useThree();
  const tmpPos = useMemo(() => new Vector3(), []);

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
      uBoot: { value: 0 },
      uGlowColor: { value: new Color(palette.emeraldHot) },
      uBgTint: { value: new Color(palette.emeraldMid) },
    };
  }, [portrait]);

  useFrame((_, dt) => {
    if (!mesh.current) return;

    mesh.current.getWorldPosition(tmpPos);
    const dist = camera.position.distanceTo(tmpPos);

    const target =
      dist < BOOT_DISTANCE
        ? 1
        : dist > BOOT_HOLD
          ? 0
          : 1 - (dist - BOOT_DISTANCE) / (BOOT_HOLD - BOOT_DISTANCE);

    uniforms.uTime.value += dt;
    uniforms.uBoot.value += (target - uniforms.uBoot.value) * Math.min(1, dt * 2.2);

    // V2.5 — bezel rim pulse. Slow sine sweeps emissiveIntensity 0.05↔0.20 over
    // 4 s. Keeps the hologram alive even at idle without overpowering the panel.
    if (bezelMat.current) {
      const phase = (uniforms.uTime.value / 4) * Math.PI * 2;
      bezelMat.current.emissiveIntensity = 0.125 + 0.075 * Math.sin(phase);
    }
  });

  return (
    <group position={HOLOGRAM_POS}>
      {/* Outer bezel — graphite, very faintly emerald (the plane shader handles the glow).
          V2.5: rim pulse animates emissiveIntensity over 4 s — see useFrame above. */}
      <mesh position={[0, 0, -0.03]} ref={(m) => m?.layers.enable(1)}>
        <boxGeometry args={[1.58, 2.08, 0.04]} />
        <meshStandardMaterial
          ref={bezelMat}
          color={palette.graphite}
          emissive={palette.emeraldMid}
          emissiveIntensity={0.12}
          roughness={0.3}
          metalness={0.9}
        />
      </mesh>

      {/* Rectangular gold frame — four thin slabs hugging the 3:4 portrait. NO ring. */}
      <GoldFrame />

      {/* The hologram itself.
          NormalBlending (was AdditiveBlending): additive was summing the
          shader output onto the bezel's emissive contribution, so subject
          pixels in the framebuffer reached luma > 0.95 even when the shader
          itself capped them at 0.88. Alpha-blend instead — subject occludes
          the bezel where opaque; bezel shows through the panel haze
          (alpha ~= 0.06) elsewhere. Combined with the in-shader luma cap,
          subject pixels can no longer cross Bloom's 0.95 threshold. */}
      <mesh ref={mesh}>
        <planeGeometry args={[1.5, 2.0]} />
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

      {/* Ground glow puddle */}
      <mesh position={[0, -1.45, 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.1, 32]} />
        <meshBasicMaterial color={palette.emeraldMid} transparent opacity={0.12} />
      </mesh>

      {/* Tagline under the hologram, billboarded so it always faces the camera.
          raycast={noRaycast}
          ref={disableRaycast} so the Text mesh can't intercept clicks targeted elsewhere. */}
      <Billboard position={[0, -1.4, 0.2]}>
        <Text
          raycast={noRaycast}
          ref={disableRaycast}
          fontSize={0.14}
          color={palette.ivory}
          anchorX="center"
          anchorY="top"
          maxWidth={3.2}
          letterSpacing={0.05}
          outlineWidth={0.003}
          outlineColor={palette.void}
        >
          {content.hero.tagline + ' Engineering Student'}
        </Text>
        {/* Small "live at …" subtitle — palette.bone, raycast disabled. */}
        <Text
          raycast={noRaycast}
          ref={disableRaycast}
          position={[0, -0.2, 0]}
          fontSize={0.07}
          color={palette.bone}
          anchorX="center"
          anchorY="top"
          letterSpacing={0.06}
        >
          {`live at ${content.liveUrl.replace(/^https?:\/\//, '')}`}
        </Text>
      </Billboard>
    </group>
  );
}

/**
 * Four thin gold slabs hugging the portrait rectangle. Strictly rectangular —
 * no rings, no arcs. side: FrontSide explicit so additive neighbours can't
 * bleed through the back face into a halo.
 */
function GoldFrame() {
  const W = 1.56;
  const H = 2.06;
  const T = 0.012;
  const Z = -0.013;
  const props = {
    color: palette.goldAccent,
    metalness: 0.95,
    roughness: 0.2,
    emissive: palette.goldAccent,
    emissiveIntensity: 0.18,
    side: FrontSide,
  } as const;
  return (
    <>
      <mesh position={[0, H / 2, Z]}>
        <boxGeometry args={[W, T, 0.005]} />
        <meshStandardMaterial {...props} />
      </mesh>
      <mesh position={[0, -H / 2, Z]}>
        <boxGeometry args={[W, T, 0.005]} />
        <meshStandardMaterial {...props} />
      </mesh>
      <mesh position={[-W / 2, 0, Z]}>
        <boxGeometry args={[T, H, 0.005]} />
        <meshStandardMaterial {...props} />
      </mesh>
      <mesh position={[W / 2, 0, Z]}>
        <boxGeometry args={[T, H, 0.005]} />
        <meshStandardMaterial {...props} />
      </mesh>
    </>
  );
}
