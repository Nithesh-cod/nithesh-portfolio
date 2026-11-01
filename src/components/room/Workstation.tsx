'use client';

import { RoundedBox, useGLTF } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { Suspense, useMemo } from 'react';
import { AdditiveBlending, CylinderGeometry, DoubleSide, ExtrudeGeometry, RepeatWrapping, Shape, type Texture } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { FONTS, glowText, seeded, useCanvasTexture } from '@/components/room/canvasTex';
import { Headset, Keyboard, MacroPad, Mouse, Notebook, Speakers } from '@/components/room/DeskGear';
import { Mug } from '@/components/room/Foreground';
import { DESK, DESK_CX, SCREEN, type Vec3 } from '@/components/room/layout';
import { MAT } from '@/components/room/materials';
import { LedBar } from '@/components/room/RoomShell';
import { useBreathingScreen, useFpsScreen, useGamesScreen, useHeroScreen } from '@/components/room/Screens';
import { cube, NO_MIRROR, painted, post, soft, solid, tube, Unmirrored, useGeometries } from '@/components/room/shapes';

type Handlers = {
  onClick: (e: ThreeEvent<MouseEvent>) => void;
  onPointerOver: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut: (e: ThreeEvent<PointerEvent>) => void;
};

const TOP = DESK.top;
const FRONT = DESK.z + DESK.depth / 2;

export function Workstation({ bootHandlers }: { bootHandlers: Handlers }) {
  return (
    <group>
      <Desk />
      <group {...bootHandlers}>
        <Monitors />
      </group>
      <Unmirrored>
        <Keyboard position={[-0.9, TOP + 0.024, -2.58]} />
        <Mouse position={[-0.32, TOP + 0.004, -2.58]} />
        <Headset position={[-2.62, TOP, -2.66]} />
        <Mug position={[-2.08, TOP, -2.5]} turn={-0.4} />
        <Speakers
          at={[
            [-2.42, TOP, -3.12],
            [0.62, TOP, -3.14],
          ]}
        />
        <MacroPad position={[-1.58, TOP, -2.62]} />
        <Notebook position={[0.15, TOP, -2.6]} />
      </Unmirrored>
      <DeskModel url="/models/room/desk_lamp_arm_01.glb" position={[-2.82, TOP, -3.12]} rotation={[0, 0.9, 0]} scale={0.78} />
      <DeskModel url="/models/room/potted_plant_04.glb" position={[1.47, TOP, -2.62]} scale={1.15} />
      <DeskModel url="/models/room/gamepad.glb" position={[0.55, TOP + 0.002, -2.56]} rotation={[0, -0.45, 0]} scale={0.95} />
    </group>
  );
}

/* ─────────────────────────── desk ─────────────────────────── */

function Desk() {
  const sign = useCanvasTexture(
    512,
    512,
    (ctx, w, h) => {
      ctx.fillStyle = '#071311';
      ctx.fillRect(0, 0, w, h);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 74px ${FONTS.sci()}`;
      ['GOOD', 'VIBES', 'ONLY'].forEach((t, i) => glowText(ctx, t, w / 2, h * 0.3 + i * 96, '#2effb0', 18));
    },
    [],
  );
  // A fine woven top and a stitched desk mat: flat colour falls apart up close.
  const weave = useCanvasTexture(
    256,
    256,
    (ctx, w, h) => {
      const rnd = seeded(77);
      ctx.fillStyle = '#c8c8c8';
      ctx.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 4) {
        for (let x = (y / 4) % 2 ? 0 : 4; x < w; x += 8) {
          ctx.fillStyle = `rgba(255,255,255,${0.05 + rnd() * 0.07})`;
          ctx.fillRect(x, y, 4, 4);
        }
      }
    },
    [],
  );
  weave.wrapS = weave.wrapT = RepeatWrapping;
  weave.repeat.set(26, 6);
  const mat = useCanvasTexture(
    1024,
    360,
    (ctx, w, h) => {
      const rnd = seeded(78);
      ctx.fillStyle = '#10171a';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 14000; i++) {
        ctx.fillStyle = rnd() > 0.5 ? 'rgba(90,120,120,0.05)' : 'rgba(0,0,0,0.12)';
        ctx.fillRect(rnd() * w, rnd() * h, 2, 2);
      }
      ctx.setLineDash([9, 7]);
      ctx.strokeStyle = 'rgba(46,255,176,0.42)';
      ctx.lineWidth = 2;
      ctx.strokeRect(12, 12, w - 24, h - 24);
      ctx.setLineDash([]);
      ctx.font = `700 22px ${FONTS.sci()}`;
      ctx.fillStyle = 'rgba(46,255,176,0.3)';
      ctx.textAlign = 'right';
      ctx.fillText('LEVEL UP · BUILD · EXPLORE', w - 34, h - 32);
    },
    [],
  );
  const { cabinets } = useGeometries(buildCabinets);
  const width = DESK.x1 - DESK.x0;
  return (
    <group>
      <RoundedBox args={[width, 0.045, DESK.depth]} radius={0.012} position={[DESK_CX, TOP - 0.0225, DESK.z]}>
        <meshStandardMaterial map={weave} roughnessMap={weave} color="#171d20" roughness={1} metalness={0.2} envMapIntensity={0.6} />
      </RoundedBox>
      <mesh geometry={cabinets} material={MAT.painted} />
      {/* Front edge light + under-desk glow strip. */}
      <LedBar from={[DESK.x0 + 0.02, TOP - 0.05, FRONT - 0.01]} to={[DESK.x1 - 0.02, TOP - 0.05, FRONT - 0.01]} />
      <LedBar from={[DESK.x0 + 0.7, 0.32, DESK.z - 0.38]} to={[DESK.x1 - 0.7, 0.32, DESK.z - 0.38]} mat={MAT.ledSoft} />
      {/* Drawer cabinets at both ends. */}
      {[DESK.x0 + 0.33, DESK.x1 - 0.33].map((x, i) => (
        <group key={x} position={[x, 0, DESK.z]}>
          <LedBar from={[0.3, 0.04, DESK.depth / 2 - 0.02]} to={[0.3, TOP - 0.08, DESK.depth / 2 - 0.02]} thick={0.012} />
          {i === 0 && (
            <mesh position={[-0.02, 0.46, (DESK.depth - 0.06) / 2 + 0.018]}>
              <planeGeometry args={[0.42, 0.42]} />
              <meshBasicMaterial map={sign} toneMapped={false} />
            </mesh>
          )}
        </group>
      ))}
      {/* Cable tray / modesty panel. */}
      <mesh position={[DESK_CX, 0.5, DESK.z - DESK.depth / 2 + 0.03]} material={MAT.matte}>
        <boxGeometry args={[width - 1.3, 0.42, 0.02]} />
      </mesh>
      {/* Large desk mat with lit edge. */}
      <group position={[-0.72, TOP + 0.002, -2.62]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0022, 0]}>
          <planeGeometry args={[1.25, 0.44]} />
          <meshStandardMaterial map={mat} roughness={0.95} />
        </mesh>
        <RoundedBox args={[1.25, 0.004, 0.44]} radius={0.002} material={MAT.matte} />
        <LedBar from={[-0.62, 0.003, 0.22]} to={[0.62, 0.003, 0.22]} thick={0.006} mat={MAT.ledSoft} />
        <LedBar from={[-0.62, 0.003, -0.22]} to={[0.62, 0.003, -0.22]} thick={0.006} mat={MAT.ledSoft} />
      </group>
    </group>
  );
}

/** The desk's two pedestals: carcass, then separate fronts with a shadow gap and a recessed pull. */
function buildCabinets() {
  const FRONT_Z = (DESK.depth - 0.06) / 2;
  const fronts = (x: number, spans: [number, number][]) =>
    spans.flatMap(([y0, y1]) => [
      soft(0.59, y1 - y0, 0.02, x, (y0 + y1) / 2, FRONT_Z + 0.009, '#1a2225', 0.004),
      cube(0.16, 0.012, 0.006, x, y1 - 0.03, FRONT_Z + 0.0195, '#090c0d'),
      cube(0.14, 0.003, 0.006, x, y1 - 0.0255, FRONT_Z + 0.0215, '#6b7a80'),
    ]);
  const pedestal = (x: number) => [cube(0.62, TOP - 0.05, DESK.depth - 0.06, x, (TOP - 0.05) / 2, DESK.z, '#0e1315'), ...[-0.25, 0.25].map((d) => cube(0.05, 0.03, 0.05, x + d, 0.015, DESK.z + 0.33, '#080b0c'))];
  const [left, right] = [DESK.x0 + 0.33, DESK.x1 - 0.33];
  const lift = (g: ReturnType<typeof soft>) => g.translate(0, 0, DESK.z);
  return {
    cabinets: solid([
      ...pedestal(left),
      ...pedestal(right),
      ...fronts(left, [
        [0.04, 0.22],
        [0.235, 0.69],
      ]).map(lift),
      ...fronts(right, [
        [0.04, 0.24],
        [0.255, 0.46],
        [0.475, 0.69],
      ]).map(lift),
    ]),
  };
}

/* ─────────────────────────── monitors ─────────────────────────── */

function Monitors() {
  const games = useGamesScreen();
  const hero = useHeroScreen();
  const fps = useFpsScreen();
  const [cx, cy, cz] = SCREEN;
  return (
    <group>
      <Monitor tex={hero} size={[1.3, 0.75]} position={[cx, cy, cz]} breathe />
      <Monitor tex={games} size={[1.04, 0.615]} position={[cx - 1.17, cy - 0.03, cz + 0.22]} rotationY={0.42} />
      <Monitor tex={fps} size={[1.04, 0.615]} position={[cx + 1.17, cy - 0.03, cz + 0.22]} rotationY={-0.42} />
    </group>
  );
}

/** Soft radial glow card used for bias lighting behind the monitors. */
export function useGlowTexture() {
  return useCanvasTexture(
    256,
    256,
    (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      g.addColorStop(0, 'rgba(46,255,176,0.55)');
      g.addColorStop(0.5, 'rgba(46,255,176,0.18)');
      g.addColorStop(1, 'rgba(46,255,176,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
    [],
  );
}

/** Bezel, chin and rear shell, then the stand: hinge, cable-managed neck and a bevelled foot. */
function buildMonitor(w: number, h: number, height: number) {
  const CASE = '#0e1214';
  const LIP = '#2f3a3e';
  const chin = 0.016;
  const body = painted(new RoundedBoxGeometry(w + 0.03, h + 0.03 + chin, 0.03, 3, 0.008).translate(0, -chin / 2, 0), CASE);
  const rim = [
    cube(w + 0.006, 0.003, 0.002, 0, h / 2 + 0.0015, 0.015, LIP),
    cube(w + 0.006, 0.003, 0.002, 0, -h / 2 - 0.0015, 0.015, LIP),
    cube(0.003, h + 0.006, 0.002, w / 2 + 0.0015, 0, 0.015, LIP),
    cube(0.003, h + 0.006, 0.002, -w / 2 - 0.0015, 0, 0.015, LIP),
  ];
  const shell = [
    body,
    ...rim,
    soft(w * 0.66, h * 0.6, 0.028, 0, -0.014, -0.026, CASE, 0.012),
    soft(w * 0.44, h * 0.4, 0.03, 0, -0.018, -0.05, '#14191c', 0.012),
    // Vents across the shoulders of the back.
    ...[-1, 1].flatMap((s) => Array.from({ length: 9 }, (_, i) => cube(0.008, h * 0.14, 0.002, s * (w * 0.16 + i * 0.016), h * 0.17, -0.0405, '#050708'))),
    // VESA plate and its four screws, then the port bay under it.
    soft(0.1, 0.1, 0.008, 0, -0.018, -0.068, LIP, 0.003),
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sy) => post(0.0038, 0.0038, 0.003, 0, 0, 0, '#0a0d0e', 10).rotateX(Math.PI / 2).translate(sx * 0.036, -0.018 + sy * 0.036, -0.073))),
    cube(w * 0.26, 0.03, 0.006, 0, -h * 0.2 - 0.03, -0.0655, '#050708'),
    ...[-2, -1, 0, 1, 2].map((i) => cube(0.016, 0.009, 0.002, i * 0.03, -h * 0.2 - 0.03, -0.069, '#3a4448')),
  ];

  const toDesk = height - TOP;
  const neck = toDesk - 0.03;
  const footShape = new Shape();
  footShape.moveTo(-0.17, 0.085);
  footShape.quadraticCurveTo(0, 0.13, 0.17, 0.085);
  footShape.quadraticCurveTo(0.2, 0.05, 0.14, 0.02);
  footShape.quadraticCurveTo(0.05, -0.05, 0, -0.09);
  footShape.quadraticCurveTo(-0.05, -0.05, -0.14, 0.02);
  footShape.quadraticCurveTo(-0.2, 0.05, -0.17, 0.085);
  const stand = [
    painted(new ExtrudeGeometry(footShape, { depth: 0.008, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 1, curveSegments: 12 }).rotateX(Math.PI / 2).translate(0, -toDesk + 0.012, -0.06), '#2a3236'),
    cube(0.062, neck, 0.022, 0, (-toDesk + 0.03) / 2 + 0.01, -0.082, '#343e42'),
    cube(0.034, neck * 0.5, 0.004, 0, -toDesk * 0.45, -0.094, '#0e1214'),
    painted(new CylinderGeometry(0.018, 0.018, 0.08, 14).rotateZ(Math.PI / 2).translate(0, -0.03, -0.08), '#343e42'),
  ];
  // Screen cable down the back of the neck and away along the desk.
  const cable = tube(
    [
      [0.018, -0.05, -0.078],
      [0.022, -toDesk * 0.5, -0.1],
      [0.028, -toDesk + 0.03, -0.112],
      [0.06, -toDesk + 0.012, -0.18],
    ],
    0.0034,
    '#0a0d0e',
    { sides: 6, segments: 20 },
  );
  return { shell: solid([...shell, cable]), stand: solid(stand), dot: solid([cube(0.009, 0.0026, 0.002, 0, -h / 2 - 0.012, 0.0152)], { colour: false }) };
}

function Monitor({ tex, size: [w, h], position, rotationY = 0, breathe = false }: { tex: Texture; size: [number, number]; position: Vec3; rotationY?: number; breathe?: boolean }) {
  const mat = useBreathingScreen(breathe ? 1.2 : 1.05, breathe ? 0.1 : 0.02);
  const glow = useGlowTexture();
  const { shell, stand, dot } = useGeometries(() => buildMonitor(w, h, position[1]));
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh geometry={shell} material={MAT.painted} />
      <mesh geometry={stand} material={MAT.painted} />
      <mesh geometry={dot} material={MAT.ledSoft} layers={NO_MIRROR} />
      <mesh position={[0, 0, 0.0155]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial ref={mat} map={tex} toneMapped={false} />
      </mesh>
      {/* Bias light spilling onto the wall behind. */}
      <mesh position={[0, 0.05, -0.08]}>
        <planeGeometry args={[w * 1.9, h * 2.2]} />
        <meshBasicMaterial map={glow} transparent opacity={0.5} side={DoubleSide} depthWrite={false} blending={AdditiveBlending} />
      </mesh>
    </group>
  );
}

type ModelProps = { url: string; position: Vec3; rotation?: Vec3; scale?: number; mirrored?: boolean };

/** A Poly Haven model, cloned so it can appear more than once. Loads on its own. */
export function DeskModel(props: ModelProps) {
  return (
    <Suspense fallback={null}>
      <ModelInner {...props} />
    </Suspense>
  );
}

function ModelInner({ url, mirrored = false, ...props }: ModelProps) {
  const { scene } = useGLTF(url);
  const clone = useMemo(() => {
    const copy = scene.clone(true);
    if (!mirrored) copy.traverse((o) => o.layers.set(NO_MIRROR));
    return copy;
  }, [scene, mirrored]);
  return <primitive object={clone} {...props} />;
}
