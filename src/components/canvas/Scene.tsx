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
import { useEffect, useRef, useState } from 'react';
import type { Mesh } from 'three';
import { Lab } from '@/components/canvas/Lab';
import { HexFloor } from '@/components/canvas/HexFloor';
import { HoloCapsule } from '@/components/canvas/HoloCapsule';
import { ProjectPedestal } from '@/components/canvas/ProjectPedestal';
import { VolumetricBeam } from '@/components/canvas/VolumetricBeam';
import { FloatingDataGlyphs } from '@/components/canvas/FloatingDataGlyphs';
import { CameraRig } from '@/components/canvas/CameraRig';
import { PostFX } from '@/components/canvas/PostFX';
import { usePortfolioStore, type PerfMode } from '@/lib/store';
import { useIsMobile } from '@/lib/use-is-mobile';
import { palette } from '@/lib/palette';

const FPS_DOWNGRADE_HOLD_MS = 3000;

const PROJECTS = [
  { slug: 'cropai',        label: 'CropAI',        subtitle: 'AI CROP ADVISOR SYSTEM',                  position: [-3.5, 0, 2.5], iconKind: 'leaf',  phase: 0 },
  { slug: 'smart-canteen', label: 'Smart Canteen', subtitle: 'AI · AUTOMATION · IoT CAPSTONE PROJECT', position: [0,    0, 4.0], iconKind: 'box',   phase: 1.4 },
  { slug: 'testai',        label: 'TestAI',        subtitle: 'AI EXAM PROCTORING SYSTEM',               position: [3.5,  0, 2.5], iconKind: 'globe', phase: 2.8 },
] as const;

export function Scene() {
  const setPerfMode = usePortfolioStore((s) => s.setPerfMode);
  const isMobile = useIsMobile();
  const [dpr, setDpr] = useState<[number, number]>([1, 2]);
  // Sun mesh ref — capsule mounts an invisible bright sphere, PostFX uses
  // it as the GodRays source.
  const sunRef = useRef<Mesh | null>(null);

  useEffect(() => {
    if (isMobile) {
      setPerfMode('low');
      setDpr([1, 1.5]);
    }
  }, [isMobile, setPerfMode]);

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
      camera={{ position: [0, 3.2, 9], fov: 38, near: 0.1, far: 120 }}
      onCreated={({ gl }) => gl.setClearColor(palette.bgBase, 1)}
    >
      <PerformanceTier
        onDowngrade={(m) => {
          setPerfMode(m);
          if (m !== 'cinematic') setDpr([1, 1]);
        }}
      />

      <fog attach="fog" args={[palette.bgBase, 8, 30]} />
      <Environment preset="night" background={false} environmentIntensity={0.4} />

      <Lights />
      <Lab />
      <HexFloor />
      <HoloCapsule ref={sunRef} />

      {PROJECTS.map((p) => (
        <ProjectPedestal
          key={p.slug}
          slug={p.slug}
          label={p.label}
          subtitle={p.subtitle}
          position={p.position}
          iconKind={p.iconKind}
          phase={p.phase}
        />
      ))}

      {/* 4 volumetric beams. */}
      <VolumetricBeam position={[-2.5, 8, 1]}  rotation={[0, 0,  0.05]} color="#CCFFDD" intensity={0.85} seed={0} />
      <VolumetricBeam position={[-0.8, 8, -1]} rotation={[0, 0, -0.03]} color="#AAFFCC" intensity={0.7}  seed={1.3} />
      <VolumetricBeam position={[ 0.8, 8, -1]} rotation={[0, 0,  0.04]} color="#AAFFCC" intensity={0.7}  seed={2.6} />
      <VolumetricBeam position={[ 2.5, 8, 1]}  rotation={[0, 0, -0.05]} color="#CCFFDD" intensity={0.85} seed={3.9} />

      <FloatingDataGlyphs />

      <Sparkles
        count={100}
        scale={[12, 8, 12]}
        size={1.2}
        speed={0.15}
        opacity={0.4}
        color="#88FFCC"
        position={[0, 2, 0]}
      />

      <CameraRig />
      <PostFX sunRef={sunRef} />

      <AdaptiveDpr pixelated />
      <AdaptiveEvents />
      <Preload all />
    </Canvas>
  );
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.10} color="#0A1014" />
      <SpotLight position={[-2.5, 7, 2]} target-position={[0, 0, 0]} intensity={2.5} angle={0.35} penumbra={0.7} color="#CCFFDD" distance={20} decay={1.5} castShadow />
      <SpotLight position={[ 2.5, 7, 2]} target-position={[0, 0, 0]} intensity={2.5} angle={0.35} penumbra={0.7} color="#CCFFDD" distance={20} decay={1.5} />
      <SpotLight position={[-2,   7, -1.5]} target-position={[0, 0, 0]} intensity={1.8} angle={0.4} penumbra={0.8} color="#AAFFCC" distance={20} decay={1.5} />
      <SpotLight position={[ 2,   7, -1.5]} target-position={[0, 0, 0]} intensity={1.8} angle={0.4} penumbra={0.8} color="#AAFFCC" distance={20} decay={1.5} />
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
