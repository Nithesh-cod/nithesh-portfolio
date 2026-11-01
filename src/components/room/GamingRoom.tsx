'use client';

import { AdaptiveDpr, ContactShadows, Environment, Lightformer, Sparkles, useProgress } from '@react-three/drei';
import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { memo, Suspense, useEffect, useMemo, useState } from 'react';
import { HalfFloatType } from 'three';
import { Bedroom } from '@/components/room/Bedroom';
import { Chair } from '@/components/room/Chair';
import { Decor } from '@/components/room/Decor';
import { Foreground } from '@/components/room/Foreground';
import { RoomFront } from '@/components/room/RoomFront';
import { GamingPC } from '@/components/room/GamingPC';
import { POSES, ROOM, SCREEN } from '@/components/room/layout';
import { RoomCameraRig } from '@/components/room/RoomCameraRig';
import { RoomShell, WINDOW } from '@/components/room/RoomShell';
import { useRoom } from '@/components/room/roomStore';
import { NO_MIRROR } from '@/components/room/shapes';
import { Workstation } from '@/components/room/Workstation';
import { play } from '@/lib/audio';
import { useOS } from '@/lib/jarvis/osStore';
import { usePortfolioStore } from '@/lib/store';
import { useIsMobile } from '@/lib/use-is-mobile';

/** The gaming room. Click the PC or the monitors to boot JARVIS OS. */
export default function GamingRoom() {
  const world = usePortfolioStore((s) => s.world);
  const perfMode = usePortfolioStore((s) => s.perfMode);
  const setCursorState = usePortfolioStore((s) => s.setCursorState);
  const settled = useRoom((s) => s.settled);
  const setReady = useRoom((s) => s.setReady);
  const setHover = useRoom((s) => s.setHover);
  const requestBoot = useRoom((s) => s.requestBoot);
  const reduceSetting = useOS((s) => s.settings.reduceMotion);
  const isMobile = useIsMobile();
  const lowPerf = isMobile || perfMode === 'low';

  const [narrow, setNarrow] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const check = () => setNarrow(window.innerWidth / window.innerHeight < 1);
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    check();
    window.addEventListener('resize', check);
    return () => {
      window.removeEventListener('resize', check);
      setReady(false);
      setHover(false);
    };
  }, [setReady, setHover]);
  const still = reducedMotion || reduceSetting;

  const bootHandlers = useMemo(
    () => ({
      onClick: (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (usePortfolioStore.getState().world !== 'room') return;
        play('click_primary');
        setHover(false);
        setCursorState('idle');
        requestBoot();
      },
      onPointerOver: (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        if (usePortfolioStore.getState().world !== 'room') return;
        setHover(true);
        setCursorState('interactive');
        document.body.style.cursor = 'pointer';
      },
      onPointerOut: () => {
        setHover(false);
        setCursorState('idle');
        document.body.style.cursor = '';
      },
    }),
    [requestBoot, setCursorState, setHover],
  );

  return (
    <Canvas
      dpr={lowPerf ? [1, 1.25] : [1, 1.75]}
      frameloop={world === 'jarvis' && settled ? 'demand' : 'always'}
      gl={{ antialias: false, powerPreference: 'high-performance', alpha: false, stencil: false, toneMappingExposure: 1 }}
      camera={{ position: POSES.base.pos, fov: POSES.base.fov, near: 0.03, far: 40 }}
      onCreated={({ gl, camera }) => {
        // The context has no alpha, so 0 only affects render targets. Without it the
        // ground-shadow capture clears to opaque and blacks out the floor on phones.
        gl.setClearColor('#020606', 0);
        camera.layers.enable(NO_MIRROR);
        setReady(true);
      }}
    >
      <fog attach="fog" args={['#020606', 9, 20]} />

      {/* Reflections come from soft light cards, not a downloaded HDR. */}
      <Environment resolution={128} frames={1} environmentIntensity={0.9}>
        <Lightformer form="rect" intensity={2.2} color="#2effb0" position={[0, 3, -1]} rotation-x={Math.PI / 2} scale={[6, 0.4, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#7fb3ff" position={[5, 1.8, -1.5]} rotation-y={-Math.PI / 2} scale={[3, 2, 1]} />
        <Lightformer form="rect" intensity={1.4} color="#bfffe8" position={[-0.9, 1.2, -2.6]} scale={[2.6, 0.6, 1]} />
        <Lightformer form="ring" intensity={1.2} color="#ffb36b" position={[-2.5, 1.4, -2.6]} scale={0.4} />
      </Environment>

      <RoomLights lowPerf={lowPerf} />

      <RoomShell lowPerf={lowPerf} />
      <GroundShadows lowPerf={lowPerf} />
      <Workstation bootHandlers={bootHandlers} />
      <GamingPC handlers={bootHandlers} still={still} />
      <Chair position={[1.62, 0, -1.3]} rotationY={0.36} />
      <Bedroom />
      <Decor still={still} />
      <Foreground />
      <RoomFront />
      {!lowPerf && !still && (
        <Sparkles count={40} scale={[8, 2.6, 5]} position={[0, 1.5, -0.6]} size={1.4} speed={0.12} opacity={0.25} color="#5cffc4" />
      )}

      <RoomCameraRig narrow={narrow} still={still} />

      {!lowPerf && (
        <Suspense fallback={null}>
          <EffectComposer multisampling={4} enableNormalPass={false} frameBufferType={HalfFloatType}>
            <Bloom intensity={0.9} luminanceThreshold={1} luminanceSmoothing={0.2} mipmapBlur radius={0.72} />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
            <Vignette offset={0.28} darkness={0.62} />
          </EffectComposer>
        </Suspense>
      )}
      <AdaptiveDpr pixelated />
    </Canvas>
  );
}

/** Soft shadows under everything that stands on the floor. Nothing there moves,
 *  so they wait for the last model to land, capture once and stay. drei re-arms
 *  `frames` on every render, hence the memoised element. */
const GroundShadows = memo(function GroundShadows({ lowPerf }: { lowPerf: boolean }) {
  const loading = useProgress((s) => s.active);
  const [landed, setLanded] = useState(false);
  useEffect(() => {
    if (loading) return;
    // Parsed models mount a moment after the loader reports done.
    const id = window.setTimeout(() => setLanded(true), 600);
    return () => window.clearTimeout(id);
  }, [loading]);
  const capture = useMemo(
    () => (
      <ContactShadows
        frames={1}
        position={[0, 0.012, (ROOM.z0 + ROOM.z1) / 2]}
        scale={[ROOM.x1 - ROOM.x0, ROOM.z1 - ROOM.z0]}
        resolution={lowPerf ? 512 : 1024}
        far={1.05}
        blur={1.6}
        opacity={0.82}
        color="#000000"
      />
    ),
    [lowPerf],
  );
  return landed ? capture : null;
});

function RoomLights({ lowPerf }: { lowPerf: boolean }) {
  const [sx, sy, sz] = SCREEN;
  // Without reflections and bloom, phones need more of the flat fill.
  const fill = lowPerf ? 2.2 : 1;
  return (
    <>
      <ambientLight intensity={0.2 * fill} color="#8fd6c4" />
      <hemisphereLight args={['#2c5a50', '#060a09', 0.5 * fill]} />
      {/* Green ceiling cove. */}
      <pointLight position={[-1.8, 1.9, -1.9]} color="#2effb0" intensity={5.5} distance={6} decay={2} />
      <pointLight position={[1.75, 1.9, -2.2]} color="#2effb0" intensity={2.6} distance={6} decay={2} />
      <pointLight position={[-3.6, 2.4, -2.6]} color="#2effb0" intensity={5} distance={4} decay={2} />
      {/* Monitor spill onto the desk and chair. */}
      <pointLight position={[sx, sy, sz + 0.55]} color="#9fffe0" intensity={5} distance={3.6} decay={2} />
      {/* Desk underglow. */}
      <pointLight position={[-0.7, 0.4, -2.55]} color="#2effb0" intensity={3} distance={2.6} decay={2} />
      {/* Warm desk lamp pool. */}
      <spotLight position={[-2.55, 1.35, -2.9]} angle={0.62} penumbra={0.7} intensity={7} distance={3} decay={2} color="#ffbf73" target-position={[-2.2, 0.76, -2.55]} />
      {/* Cool moonlight through the window. */}
      <spotLight
        position={[(WINDOW.x0 + WINDOW.x1) / 2, 2.6, ROOM.z0 - 1.4]}
        angle={0.75}
        penumbra={1}
        intensity={2.2}
        distance={10}
        decay={1.6}
        color="#6f9dff"
        target-position={[2.6, 0, -1.2]}
      />
      {/* Soft fill from the ceiling so the chair and rug read. */}
      <pointLight position={[0.4, 2.35, 1.4]} color="#d6efff" intensity={11} distance={9} decay={2} />
      {/* The far end: one light hugging each long wall, one for the end wall. */}
      <pointLight position={[-3.45, 2.25, 3.2]} color="#6ff0c4" intensity={7.5} distance={6} decay={2} />
      <pointLight position={[3.45, 2.25, 3.2]} color="#9ff2da" intensity={7.5} distance={6} decay={2} />
      <pointLight position={[0.2, 2.25, 4.9]} color="#c8f5e6" intensity={6} distance={6.5} decay={2} />
      {/* Soft light raking across the bed, so the duvet folds read. */}
      <pointLight position={[3.2, 1.5, -1.55]} color="#a8d4ff" intensity={3.4} distance={3.6} decay={2} />
    </>
  );
}
