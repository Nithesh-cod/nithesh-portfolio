'use client';

import { Html, Sparkles } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { forwardRef, useRef, useState } from 'react';
import {
  DoubleSide,
  type Mesh,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
} from 'three';
import { palette } from '@/lib/palette';
import { usePortfolioStore } from '@/lib/store';
import { play } from '@/lib/audio';
import { PortraitBust3D } from '@/components/canvas/PortraitBust3D';

/* V12.7 — central exhibit completely rebuilt around the GLB.
 *
 * The GLB ships its own black tiered pedestal + textured suited bust.
 * We render that AS-IS in PortraitBust3D and surround it with a thin
 * "showcase" of holographic accents — none of which touch the model
 * geometry itself:
 *
 *   • 2 floor-halo emissive rings at the pedestal base
 *   • 10 thin vertical scanner-cage beams in a circle around the bust
 *   • 2 horizontal scanner rings (top above the head, mid at chest)
 *   • A soft halo plane behind the bust for emerald glow
 *   • drei <Sparkles> floating particles
 *   • 4 lights (key + back-cool + front-warm + top-emerald)
 *   • An Html name plaque in front of the pedestal
 *
 * The procedural 3-tier podium / outer glass / inner plasma / 12-bar
 * cage / top + bottom energy rings / capsule name plaque mesh that
 * V12.6 had are ALL DELETED. The GLB IS the centerpiece. */

const AVATAR_HEIGHT = 3.0; // V12.8 — taller for full-body visibility
const AVATAR_BASE_RADIUS = 1.7; // approximate radius of the glb's pedestal disc
const CAGE_BARS = 10;
const CAGE_RADIUS = 1.65;
const CAGE_HEIGHT = 3.0;
const CAGE_Y = 1.55;

// The "sun" mesh that GodRays in PostFX samples — invisible but with a
// position. forwardRef so Scene.tsx can attach a Mesh ref.
export const HoloCapsule = forwardRef<Mesh>(function HoloCapsule(_p, sunRef) {
  const haloRef = useRef<MeshStandardMaterial | null>(null);
  const innerHaloRef = useRef<MeshStandardMaterial | null>(null);
  const ringTopRef = useRef<MeshBasicMaterial | null>(null);
  const ringMidRef = useRef<MeshBasicMaterial | null>(null);
  const [hovered, setHovered] = useState(false);
  const setCursor = usePortfolioStore((s) => s.setCursorState);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // Floor halos breathe.
    if (haloRef.current) haloRef.current.emissiveIntensity = 1.3 + 0.25 * Math.sin(t * 1.4);
    if (innerHaloRef.current) innerHaloRef.current.emissiveIntensity = 2.2 + 0.4 * Math.sin(t * 1.8 + Math.PI);
    // Scanner rings pulse.
    if (ringTopRef.current) ringTopRef.current.opacity = 0.55 + 0.25 * Math.sin(t * 1.2);
    if (ringMidRef.current) ringMidRef.current.opacity = 0.45 + 0.30 * Math.sin(t * 1.0 + 1.0);
  });

  const handleOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    setCursor('interactive');
    play('hover');
  };
  const handleOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(false);
    setCursor('idle');
  };

  return (
    <group position={[0, 0, 0]}>
      {/* GLB avatar — includes its own pedestal. */}
      <PortraitBust3D position={[0, 0, 0]} targetHeight={AVATAR_HEIGHT} />

      {/* V12.8 — bigger, brighter floor halos around the GLB pedestal. */}
      <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.8, 2.2, 96]} />
        <meshStandardMaterial
          ref={haloRef}
          color={palette.neonGreen}
          emissive={palette.neonGreen}
          emissiveIntensity={1.8}
          transparent
          opacity={0.70}
          toneMapped={false}
          side={DoubleSide}
        />
      </mesh>
      {/* Inner pulsing ring (the "scanner" halo). */}
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.34, 1.46, 96]} />
        <meshStandardMaterial
          ref={innerHaloRef}
          color={palette.neonBright}
          emissive={palette.neonBright}
          emissiveIntensity={2.4}
          transparent
          opacity={0.80}
          toneMapped={false}
          side={DoubleSide}
        />
      </mesh>

      {/* SCANNER CAGE — 10 thin vertical beams around the avatar. */}
      <ScannerCage />

      {/* SCANNER RINGS — horizontal accents at head + chest height. */}
      <mesh position={[0, 3.10, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.40, 0.015, 16, 96]} />
        <meshBasicMaterial
          ref={ringTopRef}
          color={palette.neonGreen}
          transparent
          opacity={0.55}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 1.80, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.55, 0.012, 16, 96]} />
        <meshBasicMaterial
          ref={ringMidRef}
          color={palette.neonGreen}
          transparent
          opacity={0.45}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>

      {/* SOFT GLOW HALO PLANE behind avatar (additive emerald wash). */}
      <mesh position={[0, 1.80, -0.40]}>
        <planeGeometry args={[3.0, 4.2]} />
        <meshBasicMaterial
          color={palette.neonGreen}
          transparent
          opacity={0.10}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>

      {/* FLOATING PARTICLES around the avatar. */}
      <Sparkles
        count={50}
        scale={[2.5, 4.0, 2.5]}
        position={[0, 1.6, 0]}
        size={1.0}
        speed={0.20}
        opacity={0.50}
        color={palette.neonGreen}
      />

      {/* NAME PLAQUE — DOM card mounted in front of the pedestal. */}
      <Html
        transform
        occlude={false}
        position={[0, 0.30, 1.70]}
        distanceFactor={2.4}
        style={{ pointerEvents: 'none' }}
      >
        <div className="avatar-name-plaque">
          <div className="avatar-name">NITHESH RAMACHANDRAN</div>
          <div className="avatar-subtitle">FULL STACK · AI · CREATIVE TECH</div>
        </div>
      </Html>

      {/* HOVER PROXY — invisible mesh enabling cursor + audio on the
          avatar zone. */}
      <mesh
        position={[0, 1.6, 0]}
        visible={false}
        onPointerOver={handleOver}
        onPointerOut={handleOut}
      >
        <cylinderGeometry args={[1.2, 1.2, 3.0, 12]} />
      </mesh>

      {/* GodRays sun — invisible, used by PostFX. Subtle pulse-out
          when hovered. */}
      <mesh
        ref={sunRef as React.RefObject<Mesh>}
        position={[0, 1.6, 0]}
        scale={hovered ? 1.4 : 1.0}
      >
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.001} toneMapped={false} />
      </mesh>

      {/* INTERNAL LIGHTING — 4 lights illuminating the avatar.
          See spec FIX 4. */}
      <spotLight
        position={[2.5, 5.0, 3.0]}
        target-position={[0, 1.5, 0]}
        intensity={3.0}
        angle={0.50}
        penumbra={0.70}
        color="#FFEEDD"
        castShadow
      />
      <pointLight position={[-3, 2, -2]} intensity={1.5} color="#88FFCC" distance={6} decay={2} />
      <pointLight position={[0, 0.5, 3]} intensity={0.8} color="#FFDDCC" distance={5} decay={2} />
      <spotLight
        position={[0, 6, 0]}
        target-position={[0, 1.5, 0]}
        intensity={1.4}
        angle={0.35}
        penumbra={0.80}
        color={palette.neonGreen}
      />
    </group>
  );
});

/* 10 thin vertical emissive beams arranged in a circle around the
 * avatar — the "scanning cage" feel from the spec. */
function ScannerCage() {
  return (
    <group>
      {Array.from({ length: CAGE_BARS }).map((_, i) => {
        const a = (i / CAGE_BARS) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * CAGE_RADIUS, CAGE_Y, Math.sin(a) * CAGE_RADIUS]}
          >
            <cylinderGeometry args={[0.012, 0.012, CAGE_HEIGHT, 6]} />
            <meshBasicMaterial
              color={palette.neonGreen}
              transparent
              opacity={0.55}
              toneMapped={false}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}
