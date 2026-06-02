'use client';

import { Canvas } from '@react-three/fiber';
import {
  AdaptiveDpr,
  AdaptiveEvents,
  Environment,
  PerformanceMonitor,
  Preload,
  Sparkles,
  SpotLight,
} from '@react-three/drei';
import { useState } from 'react';
import { Lab } from '@/components/canvas/Lab';
import { Hologram } from '@/components/canvas/Hologram';
import { AllTerminalsArc } from '@/components/canvas/AllTerminalsArc';
import { PostFX } from '@/components/canvas/PostFX';
import { AccessibilityProxies } from '@/components/canvas/AccessibilityProxies';
import { ScrollCamera } from '@/components/motion/ScrollCamera';
import { usePortfolioStore, type PerfMode } from '@/lib/store';
import { palette } from '@/lib/palette';

const FPS_DOWNGRADE_HOLD_MS = 3000;

/**
 * V7.0 — refined elegant scene root. V2.7 camera + click architecture
 * preserved. Heavy ambient layer removed. Lighting reduced to warm key +
 * cool fill + ambient. One sparkles layer. Apartment IBL for glass
 * refraction.
 */
export function Scene() {
  const setPerfMode = usePortfolioStore((s) => s.setPerfMode);
  const [dpr, setDpr] = useState<[number, number]>([1, 2]);

  return (
    <Canvas
      dpr={dpr}
      gl={{
        powerPreference: 'high-performance',
        antialias: false,
        stencil: false,
        depth: true,
        alpha: false,
      }}
      camera={{ position: [0, 1.7, 7], fov: 38, near: 0.1, far: 120 }}
      onCreated={({ gl }) => gl.setClearColor(palette.nightBase, 1)}
    >
      <PerformanceTier
        onDowngrade={(m) => {
          setPerfMode(m);
          if (m !== 'cinematic') setDpr([1, 1]);
        }}
      />

      <fog attach="fog" args={[palette.nightBase, 6, 26]} />

      <Environment preset="apartment" background={false} environmentIntensity={0.55} />

      <Lights />

      <Lab />
      <Hologram />
      <AllTerminalsArc />
      <AccessibilityProxies />

      {/* V7.0 — single Sparkles layer. Subtle ivory-warm dust motes. */}
      <Sparkles
        count={80}
        scale={[10, 6, 10]}
        size={1.2}
        speed={0.15}
        opacity={0.35}
        color={palette.ivoryWarm}
        position={[0, 1.5, -2]}
      />

      <ScrollCamera />
      <PostFX />

      <AdaptiveDpr pixelated />
      <AdaptiveEvents />
      <Preload all />
    </Canvas>
  );
}

/**
 * V7.0 refined 2-spot + ambient kit. NO mint rim, NO point lights.
 *   ambient    → warm-tinted ivory fill at 0.08.
 *   key        → warm tungsten SpotLight from front-right above.
 *   fill       → cool moonlight SpotLight from camera-left.
 */
function Lights() {
  return (
    <>
      <ambientLight intensity={0.08} color={palette.ivoryWarm} />
      <SpotLight
        position={[3, 6, 3]}
        target-position={[0, 1, 0]}
        intensity={1.8}
        angle={0.4}
        penumbra={0.8}
        color={palette.lightWarm}
        distance={20}
        decay={1.5}
        castShadow
      />
      <SpotLight
        position={[-3, 5, 0]}
        target-position={[0, 1, 0]}
        intensity={0.6}
        angle={0.5}
        penumbra={0.9}
        color={palette.lightCool}
        distance={20}
        decay={1.5}
      />
    </>
  );
}

function PerformanceTier({ onDowngrade }: { onDowngrade: (mode: PerfMode) => void }) {
  const [tier, setTier] = useState<PerfMode>('medium');
  const [declineSince, setDeclineSince] = useState<number | null>(null);

  return (
    <PerformanceMonitor
      bounds={() => [40, 60]}
      flipflops={3}
      onDecline={() => {
        const now = performance.now();
        if (declineSince === null) {
          setDeclineSince(now);
          return;
        }
        if (now - declineSince < FPS_DOWNGRADE_HOLD_MS) return;
        const next: PerfMode = tier === 'cinematic' ? 'medium' : 'low';
        if (next !== tier) {
          setTier(next);
          onDowngrade(next);
        }
      }}
      onIncline={() => setDeclineSince(null)}
    />
  );
}
