'use client';

import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr, AdaptiveEvents, PerformanceMonitor, Preload } from '@react-three/drei';
import { useState } from 'react';
import type { PointLight } from 'three';
import { Lab } from '@/components/canvas/Lab';
import { Hologram } from '@/components/canvas/Hologram';
import { SkillPodiums } from '@/components/canvas/SkillPodiums';
import { PostFX } from '@/components/canvas/PostFX';
import { AccessibilityProxies } from '@/components/canvas/AccessibilityProxies';
import { ScrollCamera } from '@/components/motion/ScrollCamera';
import { usePortfolioStore, type PerfMode } from '@/lib/store';
import { palette } from '@/lib/palette';

const FPS_DOWNGRADE_HOLD_MS = 3000;

export function Scene() {
  const setPerfMode = usePortfolioStore((s) => s.setPerfMode);
  const [dpr, setDpr] = useState<[number, number]>([1, 2]);

  return (
    <Canvas
      dpr={dpr}
      // gl props locked to the M3.7 spec EXACTLY — every additional prop is a
      // potential FBO attachment mismatch with the EffectComposer config.
      // outputColorSpace + toneMapping default to (SRGBColorSpace, NoToneMapping)
      // in three.js v0.169 which is what we want; explicit setters here previously
      // forced extra encoding passes that share depth-stencil with the composer.
      // stencil:false MUST match stencilBuffer={false} on EffectComposer.
      gl={{
        powerPreference: 'high-performance',
        antialias: false,
        stencil: false,
        depth: true,
        alpha: false,
      }}
      camera={{ position: [0, 1.7, 7], fov: 38, near: 0.1, far: 120 }}
      onCreated={({ gl }) => gl.setClearColor(palette.void, 1)}
    >
      <PerformanceTier
        onDowngrade={(m) => {
          setPerfMode(m);
          if (m !== 'cinematic') setDpr([1, 1]);
        }}
      />

      <fog attach="fog" args={[palette.void, 6, 26]} />

      <Lights />

      <Lab />
      <Hologram />
      <SkillPodiums />
      <AccessibilityProxies />

      <ScrollCamera />
      <PostFX />

      <AdaptiveDpr pixelated />
      <AdaptiveEvents />
      <Preload all />
    </Canvas>
  );
}

/**
 * Lighting kit per §M3.5-7.
 *   ambient    → very dim void colour (no green ambient — that was making
 *                even shadows read green).
 *   key        → amber-key directional from front-right above, intensity 1.4.
 *   fill       → azure-rim directional from back-left, intensity 0.4.
 *   rim        → emerald-mid point light scoped to layer 1 (hologram + console
 *                screens only); chassis stay neutral.
 */
function Lights() {
  return (
    <>
      <ambientLight intensity={0.15} color={palette.void} />
      <directionalLight
        position={[6, 7, 4]}
        intensity={1.4}
        color={palette.amberKey}
        castShadow
      />
      <directionalLight position={[-5, 3, -4]} intensity={0.4} color={palette.azureRim} />
      <pointLight
        ref={(l: PointLight | null) => {
          if (!l) return;
          l.layers.set(1); // ONLY illuminate meshes that opted into layer 1
        }}
        position={[0, 2.2, 0]}
        intensity={0.8}
        color={palette.emeraldMid}
        distance={8}
        decay={2}
      />
      {/* Tiny warm fill near the hologram for skin readability — layer 0 default. */}
      <pointLight
        position={[0, 1.8, 1.5]}
        intensity={0.5}
        color={palette.amberKey}
        distance={5}
        decay={2}
      />
    </>
  );
}

// r3f-perf overlay removed in V1.5 — its "144 Hz / laptop" badge was leaking
// into production renders. Re-add only behind an explicit dev-branch import.

/**
 * Watches framerate via drei's PerformanceMonitor.
 * Sustained fps < 40 for ~3s drops the perf tier (medium -> low),
 * which PostFX reads to disable the whole chain, and Scene uses to floor DPR.
 *
 * Initial local tier matches the store default (`medium`). Cinematic is only
 * reachable when the user opts in via the (future) PerfToggle — and from there
 * downgrades the normal way on sustained fps dips.
 */
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
