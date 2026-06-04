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
import type { Mesh, PointLight } from 'three';
import { Lab } from '@/components/canvas/Lab';
import { HexFloor } from '@/components/canvas/HexFloor';
import { HoloCapsule } from '@/components/canvas/HoloCapsule';
import { ProjectStation } from '@/components/canvas/ProjectStation';
import { ModernCertRack } from '@/components/canvas/ModernCertRack';
import { RoomShell } from '@/components/canvas/RoomShell';
import { RoomPanels } from '@/components/canvas/RoomPanels';
import { FloatingDataGlyphs } from '@/components/canvas/FloatingDataGlyphs';
import { CameraRig } from '@/components/canvas/CameraRig';
import { PostFX } from '@/components/canvas/PostFX';
import { usePortfolioStore, type PerfMode } from '@/lib/store';
import { useIsMobile } from '@/lib/use-is-mobile';
import { palette } from '@/lib/palette';

const FPS_DOWNGRADE_HOLD_MS = 3000;

const PROJECTS = [
  { slug: 'cropai',        label: 'CropAI',        subtitle: 'AI CROP ADVISOR SYSTEM',                  position: [-4, 0, 3.5], yaw:  0.3, iconKind: 'leaf',  phase: 0 },
  { slug: 'smart-canteen', label: 'Smart Canteen', subtitle: 'AI · AUTOMATION · IoT CAPSTONE PROJECT', position: [0, 0, 4.5], yaw:  0.0, iconKind: 'box',   phase: 1.4 },
  { slug: 'testai',        label: 'TestAI',        subtitle: 'AI EXAM PROCTORING SYSTEM',               position: [4, 0, 3.5], yaw: -0.3, iconKind: 'globe', phase: 2.8 },
] as const;

export function Scene() {
  const setPerfMode = usePortfolioStore((s) => s.setPerfMode);
  const isMobile = useIsMobile();
  const [dpr, setDpr] = useState<[number, number]>([1, 2]);
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
      camera={{ position: [0, 3.0, 12], fov: 55, near: 0.1, far: 120 }}
      onCreated={({ gl }) => gl.setClearColor(palette.bgBase, 1)}
    >
      <PerformanceTier
        onDowngrade={(m) => {
          setPerfMode(m);
          if (m !== 'cinematic') setDpr([1, 1]);
        }}
      />

      <fog attach="fog" args={[palette.bgBase, 10, 36]} />
      <Environment preset="city" background={false} environmentIntensity={0.4} />

      <Lights />

      {/* Environment shell. */}
      <Lab />
      <HexFloor />
      <RoomShell />

      {/* Central exhibit. */}
      <HoloCapsule ref={sunRef} />

      {/* 3 project stations in a curved arc in front. */}
      {PROJECTS.map((p) => (
        <ProjectStation
          key={p.slug}
          slug={p.slug}
          label={p.label}
          subtitle={p.subtitle}
          position={p.position}
          yaw={p.yaw}
          iconKind={p.iconKind}
          phase={p.phase}
        />
      ))}

      {/* V10.2 — freestanding cert rack replaces the back-wall vault. */}
      <ModernCertRack />

      {/* V10.1 — all dashboard panels reborn as in-room 3D meshes. */}
      <RoomPanels />

      <FloatingDataGlyphs />

      <Sparkles
        count={100}
        scale={[16, 6, 16]}
        size={1.2}
        speed={0.15}
        opacity={0.35}
        color="#33FFAA"
        position={[0, 2.5, 0]}
      />

      <CameraRig />
      <PostFX sunRef={sunRef} />

      <AdaptiveDpr pixelated />
      <AdaptiveEvents />
      <Preload all />
    </Canvas>
  );
}

/**
 * V10.0 — 5 ceiling spotlights aimed at the key exhibit positions:
 * 1 over the capsule (centre), 3 over each project station, 1 over the
 * cert rack at the back wall.
 */
function Lights() {
  return (
    <>
      <ambientLight intensity={0.15} color="#1A2A22" />

      {/* Capsule key. */}
      <SpotLight position={[0, 5.7, 0]} target-position={[0, 0, 0]} intensity={2.0}
        angle={0.5} penumbra={0.8} color="#DDFFEE" distance={12} decay={1.4} castShadow />
      {/* Project stations. */}
      <SpotLight position={[-4, 5.7, -2]} target-position={[-4, 0, 3.5]} intensity={1.5}
        angle={0.5} penumbra={0.8} color="#DDFFEE" distance={12} decay={1.4} />
      <SpotLight position={[ 4, 5.7, -2]} target-position={[ 4, 0, 3.5]} intensity={1.5}
        angle={0.5} penumbra={0.8} color="#DDFFEE" distance={12} decay={1.4} />
      <SpotLight position={[-2, 5.7,  2]} target-position={[ 0, 0, 4.5]} intensity={1.5}
        angle={0.5} penumbra={0.8} color="#DDFFEE" distance={12} decay={1.4} />
      {/* Cert rack key — V10.2 aimed at the new freestanding rack at [4,0,-4]. */}
      <SpotLight position={[4, 5.5, -4]} target-position={[4, 2.2, -4]} intensity={1.5}
        angle={0.55} penumbra={0.85} color="#EAFFF4" distance={14} decay={1.4} />

      {/* Corner pillar point lights. */}
      <pointLight position={[-7.8, 2, -7.8]} intensity={0.6} color={palette.neonGreen} distance={5} decay={2} />
      <pointLight position={[ 7.8, 2, -7.8]} intensity={0.6} color={palette.neonGreen} distance={5} decay={2} />
      <pointLight position={[-7.8, 2,  7]}   intensity={0.6} color={palette.neonGreen} distance={5} decay={2} />
      <pointLight position={[ 7.8, 2,  7]}   intensity={0.6} color={palette.neonGreen} distance={5} decay={2} />

      {/* Capsule rim — layer-1 only so glass + emissives catch it without lighting walls. */}
      <pointLight
        ref={(l: PointLight | null) => { if (l) l.layers.set(1); }}
        position={[0, 2, 0]}
        intensity={0.6}
        color={palette.neonGreen}
        distance={6}
        decay={2}
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
