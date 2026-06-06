'use client';

import { Html } from '@react-three/drei';
import { type ThreeEvent } from '@react-three/fiber';
import { forwardRef, useState } from 'react';
import { type Mesh } from 'three';
import { usePortfolioStore } from '@/lib/store';
import { play } from '@/lib/audio';
import { PortraitBust3D } from '@/components/canvas/PortraitBust3D';

/* V12.9 — bare avatar centerpiece. Everything that was previously
 * surrounding the GLB has been deleted:
 *
 *   ✗ Scanner cage (10 vertical beams)
 *   ✗ Floor halos (2 emissive rings)
 *   ✗ Scanner rings (top + mid torus)
 *   ✗ Soft glow plane behind avatar
 *   ✗ <Sparkles>
 *   ✗ Hex podium / outer glass cylinder / inner plasma / 12-bar cage
 *
 * The GLB ships with its own black pedestal — that's the entire stage.
 * Only retained:
 *   • The GLB itself via PortraitBust3D
 *   • A name plaque attached to the GLB pedestal front
 *   • A soft 3-point lighting rig (key + cool fill + emerald rim)
 *   • Subtle ambient lift
 *   • An invisible GodRays sun mesh (so PostFX can sample from the
 *     avatar's centre)
 *   • An invisible hover-proxy cylinder for cursor + audio feedback
 */

export const HoloCapsule = forwardRef<Mesh>(function HoloCapsule(_p, sunRef) {
  const [hovered, setHovered] = useState(false);
  const setCursor = usePortfolioStore((s) => s.setCursorState);

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
      {/* GLB avatar — includes its own pedestal. Nothing surrounds it. */}
      <PortraitBust3D position={[0, 0, 0]} targetHeight={3.3} />

      {/* V12.11 — subtle emerald under-glow disc beneath avatar. Signals
          "this is the focus" without surrounding the model. */}
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 1.8, 64]} />
        <meshStandardMaterial
          color="#2EFFB0"
          emissive="#2EFFB0"
          emissiveIntensity={0.8}
          transparent
          opacity={0.40}
          toneMapped={false}
        />
      </mesh>

      {/* Name plaque on the GLB pedestal's front face. */}
      <Html
        transform
        occlude={false}
        position={[0, 0.50, 1.40]}
        distanceFactor={2.4}
        style={{ pointerEvents: 'none' }}
      >
        <div className="avatar-name-plaque">
          <div className="avatar-name">NITHESH RAMACHANDRAN</div>
          <div className="avatar-subtitle">FULL STACK · AI · CREATIVE TECH</div>
        </div>
      </Html>

      {/* SOFT 3-POINT LIGHTING — central spotlight removed. */}
      <ambientLight intensity={0.25} color="#A8C8B0" />
      <spotLight
        position={[2.0, 4.0, 3.0]}
        target-position={[0, 1.5, 0]}
        intensity={1.2}
        angle={0.40}
        penumbra={0.90}
        color="#FFEEDD"
        castShadow
      />
      <pointLight position={[-2.0, 1.0, 2.5]} intensity={0.6} color="#88FFCC" distance={6} decay={2} />
      {/* V12.11 — back rim opacity reduced 0.8 → 0.3 per spec. */}
      <pointLight position={[ 0.0, 2.5, -3.0]} intensity={0.3} color="#2EFFB0" distance={5} decay={2} />
      {/* V12.11 — soft directional top light (replaces deleted front spot). */}
      <directionalLight position={[0, 6, 0]} intensity={0.4} color="#DDEEDD" />

      {/* HOVER PROXY — invisible cylinder for cursor + audio feedback. */}
      <mesh
        position={[0, 1.6, 0]}
        visible={false}
        onPointerOver={handleOver}
        onPointerOut={handleOut}
      >
        <cylinderGeometry args={[1.2, 1.2, 3.0, 12]} />
      </mesh>

      {/* GodRays sun — invisible mesh sampled by PostFX. Subtle pulse on hover. */}
      <mesh
        ref={sunRef as React.RefObject<Mesh>}
        position={[0, 1.6, 0]}
        scale={hovered ? 1.4 : 1.0}
      >
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.001} toneMapped={false} />
      </mesh>
    </group>
  );
});
