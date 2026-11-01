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
import { Suspense, useEffect, useState } from 'react';
import type { PointLight } from 'three';
import { Lab } from '@/components/canvas/Lab';
import { ReflectiveFloor } from '@/components/canvas/ReflectiveFloor';
import { HoloCapsule } from '@/components/canvas/HoloCapsule';
import { ProjectStation } from '@/components/canvas/ProjectStation';
import { OvalRoom, ovalPoint } from '@/components/canvas/OvalRoom';
import { RoomPanels } from '@/components/canvas/RoomPanels';
import { TopCenterTitle } from '@/components/canvas/TopCenterTitle';
import { ServicesPlaques } from '@/components/canvas/ServicesPlaques';
import { PanelStands } from '@/components/canvas/PanelStands';
import { FloatingDataGlyphs } from '@/components/canvas/FloatingDataGlyphs';
import { CameraRig } from '@/components/canvas/CameraRig';
import { ScrollCameraRig } from '@/components/canvas/ScrollCameraRig';
import { StopBillboard } from '@/components/canvas/StopBillboard';
import { PostFX } from '@/components/canvas/PostFX';
import { usePortfolioStore, type PerfMode } from '@/lib/store';
import { useIsMobile } from '@/lib/use-is-mobile';
import { palette } from '@/lib/palette';
import { content, type Project } from '@/lib/content';

const FPS_DOWNGRADE_HOLD_MS = 3000;
const WALL_WASH_ANGLES = [-1.7, -0.9, 0.9, 1.7] as const;

const PROJECTS = [
  // V12.9 — clean foreground arc, all pedestals well clear of avatar at origin.
  { slug: 'cropai',        label: 'CropAI',        position: [-5.0, 0, 3.6], yaw:  0.45, iconKind: 'leaf',  phase: 0,    scale: 0.92, variant: 'hologram' },
  { slug: 'smart-canteen', label: 'Smart Canteen', position: [ 0.0, 0, 4.5], yaw:  0.00, iconKind: 'box',   phase: 1.4,  scale: 0.92, variant: 'vitrine' },
  { slug: 'testai',        label: 'TestAI',        position: [ 5.0, 0, 3.6], yaw: -0.45, iconKind: 'globe', phase: 2.8,  scale: 0.92, variant: 'hologram' },
] as const;

const projectBySlug = (slug: Project['slug']) => content.projects.find((p) => p.slug === slug)!;

export function Scene() {
  const setPerfMode = usePortfolioStore((s) => s.setPerfMode);
  const isMobile = useIsMobile();
  const [dpr, setDpr] = useState<[number, number]>([1, 2]);

  // PROVING SLICE — opt in with ?rig=scroll. Default = existing OrbitControls.
  // Wheel + touch drive a virtual scroll (no DOM scroll — the canvas lives
  // inside .hud-stage, whose `perspective` creates a containing block that
  // breaks `position: fixed` under window scroll).
  const [scrollRig, setScrollRig] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setScrollRig(new URLSearchParams(window.location.search).get('rig') === 'scroll');
  }, []);

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
        // V12.10 — exposure reduced from default 1.0 to 0.85 so highlights
        // don't clip to pure white (was washing out the GLB suit/skin).
        toneMappingExposure: 0.85,
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

      {/* Fog starts past the panels so the oval's far wall still reads crisp. */}
      <fog attach="fog" args={[palette.bgBase, 13, 38]} />
      {/* V12.7 — Environment "city" + higher intensity gives the GLB's
          PBR suit + skin proper IBL reflections. The preset HDR comes from a
          third-party CDN, so it gets its own boundary: if that's slow, the
          room still renders and only the reflections arrive late. */}
      <Suspense fallback={null}>
        <Environment preset="city" background={false} environmentIntensity={0.6} />
      </Suspense>

      <Lights />

      {/* Environment shell — oval window hall + reflective floor. */}
      <Lab />
      <ReflectiveFloor />
      <OvalRoom />

      {/* Central exhibit. */}
      <HoloCapsule />
      <TopCenterTitle />

      {/* 3 project stations in a curved arc in front.
          Proving slice: CropAI is swapped for a <StopBillboard> under ?rig=scroll
          so we can feel the reel-2 billboard primitive in-world. */}
      {PROJECTS.map((p) =>
        scrollRig && p.slug === 'cropai' ? (
          <StopBillboard
            key={p.slug}
            position={[p.position[0], 1.6, p.position[2]]}
            rotation={[0, p.yaw, 0]}
            heading={p.label}
            subtitle={projectBySlug(p.slug).plate}
            chips={projectBySlug(p.slug).stack.map((s) => s.toUpperCase())}
            accent={palette.warmAmber}
            width={3.0}
            height={2.0}
          />
        ) : (
          <ProjectStation
            key={p.slug}
            slug={p.slug}
            label={p.label}
            subtitle={projectBySlug(p.slug).plate}
            position={p.position}
            yaw={p.yaw}
            iconKind={p.iconKind}
            phase={p.phase}
            scale={p.scale}
            variant={p.variant}
          />
        )
      )}

      {/* V11.1 — all dashboard panels as styled <Html transform> cards. */}
      <RoomPanels />

      {/* V12.1 — thin metal rod stands anchoring floating mid-air panels. */}
      <PanelStands />

      {/* V11.1 — 6 flat glass plaques on the floor. */}
      <ServicesPlaques />

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

      {scrollRig ? <ScrollCameraRig /> : <CameraRig />}
      <PostFX />

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
      {/* V11.2 — slightly higher ambient, warmer tint. */}
      <ambientLight intensity={0.20} color="#1A2A28" />

      {/* V11.2 — warm rim from above (fills the all-green wash). */}
      <pointLight position={[0, 5.0, 4.0]} intensity={0.45} color="#FFCC88" distance={10} decay={2} />
      {/* Cool back-fill (atmospheric blue spill from the city). */}
      <pointLight position={[0, 2.0, -6.0]} intensity={0.35} color="#6BB8FF" distance={12} decay={2} />

      {/* V12.10 — Scene-level spotlight rig.
       *  • Capsule-area key spot DELETED (was the orange-marked light
       *    above the avatar that blew out PBR materials).
       *  • Smart Canteen centre cone dimmed 0.72 → 0.18 (the green-
       *    marked over-bright cone). Pedestal still has its own
       *    LED ring + emissive icon, so we don't need a bright cone.
       *  • Side project + cert + panel washes kept low. */}
      <SpotLight position={[-5.0, 5.5, 1.6]} target-position={[-5.0, 0.4, 3.6]} intensity={0.45}
        angle={0.42} penumbra={0.90} color="#DDEEDD" distance={12} decay={1.6} />
      <SpotLight position={[ 5.0, 5.5, 1.6]} target-position={[ 5.0, 0.4, 3.6]} intensity={0.45}
        angle={0.42} penumbra={0.90} color="#DDEEDD" distance={12} decay={1.6} />
      {/* No volumetric haze here: from the camera this cone crosses the statue. */}
      <SpotLight volumetric={false} position={[0, 5.5, 2.5]} target-position={[0, 0.4, 4.5]} intensity={0.18}
        angle={0.35} penumbra={0.95} color="#DDEEDD" distance={10} decay={1.8} />
      <SpotLight position={[5.5, 5.6, 3.5]} target-position={[6.5, 1.5, 4.5]} intensity={0.48}
        angle={0.55} penumbra={0.90} color="#DDEEDD" distance={14} decay={1.6} />
      <SpotLight position={[-5.5, 5.5, 0.5]} target-position={[-3.5, 2.0, 1.0]} intensity={0.36}
        angle={0.55} penumbra={0.90} color="#DDEEDD" distance={12} decay={1.6} />
      <SpotLight position={[5.5, 5.5, 0.5]} target-position={[5.5, 2.0, -0.5]} intensity={0.36}
        angle={0.55} penumbra={0.90} color="#DDEEDD" distance={12} decay={1.6} />

      {/* Green wash just inside the oval wall. */}
      {WALL_WASH_ANGLES.map((th) => {
        const [x, z] = ovalPoint(th, 0.88);
        return (
          <pointLight key={th} position={[x, 1.2, z]} intensity={0.7} color={palette.neonGreen} distance={6} decay={2} />
        );
      })}

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
