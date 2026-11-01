'use client';

import { RoundedBox, useGLTF } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { Suspense, useLayoutEffect, useMemo, useRef } from 'react';
import { AdditiveBlending, CylinderGeometry, DoubleSide, ExtrudeGeometry, InstancedMesh, Object3D, Shape, type Texture } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { drawNR, FONTS, glowText, useCanvasTexture } from '@/components/room/canvasTex';
import { DESK, DESK_CX, SCREEN, type Vec3 } from '@/components/room/layout';
import { MAT } from '@/components/room/materials';
import { LedBar } from '@/components/room/RoomShell';
import { useBreathingScreen, useFpsScreen, useGamesScreen, useHeroScreen } from '@/components/room/Screens';
import { cube, NO_MIRROR, painted, solid, tube, Unmirrored, useGeometries } from '@/components/room/shapes';

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
        <Keyboard />
        <Mouse />
        <Headphones position={[-2.62, TOP, -2.66]} />
        <Mug position={[-2.08, TOP, -2.5]} />
        <Speaker position={[-2.42, TOP, -3.12]} />
        <Speaker position={[0.62, TOP, -3.14]} />
      </Unmirrored>
      <DeskModel url="/models/room/desk_lamp_arm_01.glb" position={[-2.82, TOP, -3.12]} rotation={[0, 0.9, 0]} scale={0.78} />
      <DeskModel url="/models/room/potted_plant_04.glb" position={[1.47, TOP, -2.62]} scale={1.15} />
      <DeskModel url="/models/room/gamepad.glb" position={[0.5, TOP + 0.002, -2.56]} rotation={[0, -0.45, 0]} scale={0.42} />
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
  const width = DESK.x1 - DESK.x0;
  return (
    <group>
      <RoundedBox args={[width, 0.045, DESK.depth]} radius={0.012} position={[DESK_CX, TOP - 0.0225, DESK.z]} material={MAT.matte} />
      {/* Front edge light + under-desk glow strip. */}
      <LedBar from={[DESK.x0 + 0.02, TOP - 0.05, FRONT - 0.01]} to={[DESK.x1 - 0.02, TOP - 0.05, FRONT - 0.01]} />
      <LedBar from={[DESK.x0 + 0.7, 0.32, DESK.z - 0.38]} to={[DESK.x1 - 0.7, 0.32, DESK.z - 0.38]} mat={MAT.ledSoft} />
      {/* Drawer cabinets at both ends. */}
      {[DESK.x0 + 0.33, DESK.x1 - 0.33].map((x, i) => (
        <group key={x} position={[x, 0, DESK.z]}>
          <mesh position={[0, (TOP - 0.05) / 2, 0]} material={MAT.matte}>
            <boxGeometry args={[0.62, TOP - 0.05, DESK.depth - 0.06]} />
          </mesh>
          {[0.18, 0.42].map((y) => (
            <mesh key={y} position={[0, y, (DESK.depth - 0.06) / 2 + 0.001]} material={MAT.metal}>
              <boxGeometry args={[0.58, 0.006, 0.004]} />
            </mesh>
          ))}
          <LedBar from={[0.3, 0.04, DESK.depth / 2 - 0.02]} to={[0.3, TOP - 0.08, DESK.depth / 2 - 0.02]} thick={0.012} />
          {i === 0 && (
            <mesh position={[-0.02, 0.46, (DESK.depth - 0.06) / 2 + 0.003]}>
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
        <RoundedBox args={[1.25, 0.004, 0.44]} radius={0.002} material={MAT.fabric} />
        <LedBar from={[-0.62, 0.003, 0.22]} to={[0.62, 0.003, 0.22]} thick={0.006} mat={MAT.ledSoft} />
        <LedBar from={[-0.62, 0.003, -0.22]} to={[0.62, 0.003, -0.22]} thick={0.006} mat={MAT.ledSoft} />
      </group>
    </group>
  );
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
    cube(w * 0.62, h * 0.56, 0.026, 0, -0.012, -0.027, CASE),
    cube(w * 0.42, h * 0.38, 0.03, 0, -0.018, -0.052, '#14191c'),
    cube(0.07, 0.07, 0.014, 0, -0.018, -0.071, LIP),
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

/* ─────────────────────────── peripherals ─────────────────────────── */

const KEY_COLS = 17;
const KEY_ROWS = 5;

function Keyboard() {
  const keys = useRef<InstancedMesh>(null);
  const count = KEY_COLS * KEY_ROWS;
  useLayoutEffect(() => {
    const o = new Object3D();
    let i = 0;
    for (let r = 0; r < KEY_ROWS; r++)
      for (let c = 0; c < KEY_COLS; c++) {
        o.position.set(-0.208 + c * 0.026, 0, -0.052 + r * 0.026);
        o.updateMatrix();
        keys.current?.setMatrixAt(i++, o.matrix);
      }
    if (keys.current) keys.current.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <group position={[-0.9, TOP + 0.006, -2.58]} rotation={[0.05, 0, 0]}>
      <RoundedBox args={[0.47, 0.016, 0.155]} radius={0.006} material={MAT.metal} />
      {/* Underglow seen between the keycaps. */}
      <mesh position={[0, 0.0085, 0]} rotation={[-Math.PI / 2, 0, 0]} material={MAT.ledSoft}>
        <planeGeometry args={[0.45, 0.135]} />
      </mesh>
      <instancedMesh ref={keys} args={[undefined, undefined, count]} position={[0, 0.014, 0]} material={MAT.plastic}>
        <boxGeometry args={[0.021, 0.011, 0.021]} />
      </instancedMesh>
    </group>
  );
}

function Mouse() {
  return (
    <group position={[-0.32, TOP + 0.016, -2.58]} rotation={[0, 0.12, 0]}>
      <mesh scale={[0.034, 0.018, 0.06]} material={MAT.plastic}>
        <sphereGeometry args={[1, 24, 16]} />
      </mesh>
      <LedBar from={[0, 0.017, -0.035]} to={[0, 0.017, 0.01]} thick={0.004} />
    </group>
  );
}

function Headphones({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.006, 0]} material={MAT.metal}>
        <cylinderGeometry args={[0.07, 0.08, 0.012, 32]} />
      </mesh>
      <mesh position={[0, 0.16, 0]} material={MAT.metal}>
        <cylinderGeometry args={[0.008, 0.008, 0.3, 12]} />
      </mesh>
      <group position={[0, 0.3, 0]} rotation={[0, 0.5, 0]}>
        <mesh rotation={[0, 0, 0]} material={MAT.leather}>
          <torusGeometry args={[0.085, 0.012, 12, 40, Math.PI]} />
        </mesh>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.085, -0.03, 0]} rotation={[0, 0, (s * Math.PI) / 2]}>
            <mesh material={MAT.leather}>
              <cylinderGeometry args={[0.045, 0.045, 0.035, 28]} />
            </mesh>
            <mesh position={[0, s * -0.019, 0]} rotation={[Math.PI / 2, 0, 0]} material={MAT.ledGreen}>
              <torusGeometry args={[0.03, 0.003, 8, 32]} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

function Mug({ position }: { position: Vec3 }) {
  const logo = useCanvasTexture(256, 256, (ctx, w, h) => drawNR(ctx, w / 2, h / 2, 90), []);
  return (
    <group position={position} rotation={[0, -0.4, 0]}>
      <mesh position={[0, 0.05, 0]} material={MAT.matte}>
        <cylinderGeometry args={[0.04, 0.037, 0.1, 32]} />
      </mesh>
      <mesh position={[0.045, 0.05, 0]} rotation={[0, 0, Math.PI / 2]} material={MAT.matte}>
        <torusGeometry args={[0.025, 0.007, 10, 24]} />
      </mesh>
      <mesh position={[0, 0.05, 0.0405]}>
        <planeGeometry args={[0.055, 0.055]} />
        <meshBasicMaterial map={logo} transparent toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Speaker({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <RoundedBox args={[0.12, 0.2, 0.12]} radius={0.01} position={[0, 0.1, 0]} material={MAT.matte} />
      <mesh position={[0, 0.12, 0.061]} material={MAT.ledGreen}>
        <ringGeometry args={[0.032, 0.038, 32]} />
      </mesh>
      <mesh position={[0, 0.12, 0.0605]} material={MAT.plastic}>
        <circleGeometry args={[0.032, 32]} />
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
