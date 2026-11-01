'use client';

import { Html } from '@react-three/drei';
import { type ThreeEvent } from '@react-three/fiber';
import { Suspense } from 'react';
import { usePortfolioStore } from '@/lib/store';
import { play } from '@/lib/audio';
import { PortraitBust3D } from '@/components/canvas/PortraitBust3D';
import { PlinthCollar } from '@/components/canvas/Podium';

/* Avatar centrepiece: the GLB (with its own pedestal), a turned collar,
 * a name plaque, a soft 3-point rig that keeps the statue crisp (no
 * volumetric haze or god rays crossing it), and a hover proxy. */

export function HoloCapsule() {
  const setCursor = usePortfolioStore((s) => s.setCursorState);
  const lowPerf = usePortfolioStore((s) => s.perfMode === 'low');

  const handleOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setCursor('interactive');
    play('hover');
  };
  const handleOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setCursor('idle');
  };

  return (
    <group position={[0, 0, 0]}>
      {/* Own Suspense boundary so the model download never holds back the room. */}
      <Suspense fallback={null}>
        <PortraitBust3D position={[0, 0, 0]} targetHeight={3.3} />
      </Suspense>

      <PlinthCollar lowPerf={lowPerf} />

      <Html
        transform
        occlude={false}
        position={[0, 0.50, 1.40]}
        distanceFactor={2.4}
        style={{ pointerEvents: 'none' }}
      >
        <div className="avatar-name-plaque">
          <div className="avatar-name">NITHESH RAMACHANDRAN</div>
          <div className="avatar-subtitle">AI &amp; DS  |  BUILD  |  INNOVATE</div>
        </div>
      </Html>

      {/* Soft 3-point rig. */}
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
      <pointLight position={[ 0.0, 2.5, -3.0]} intensity={0.3} color="#2EFFB0" distance={5} decay={2} />
      <directionalLight position={[0, 6, 0]} intensity={0.4} color="#DDEEDD" />

      <mesh
        position={[0, 1.6, 0]}
        visible={false}
        onPointerOver={handleOver}
        onPointerOut={handleOut}
      >
        <cylinderGeometry args={[1.2, 1.2, 3.0, 12]} />
      </mesh>
    </group>
  );
}
