'use client';

import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { AdditiveBlending, type BufferGeometry, ConeGeometry, CylinderGeometry, DoubleSide, ExtrudeGeometry, type Group, Matrix4, Quaternion, Shape, SphereGeometry, Vector3 } from 'three';
import { drawNR, FONTS, glowText, rr, seeded, useCanvasTexture } from '@/components/room/canvasTex';
import { ROOM, type Vec3 } from '@/components/room/layout';
import { MAT } from '@/components/room/materials';
import { LedBar } from '@/components/room/RoomShell';
import { ball, cube, painted, post, solid, Unmirrored, useGeometries } from '@/components/room/shapes';
import { DeskModel, useGlowTexture } from '@/components/room/Workstation';
import { useClock, useDeviceInfo, useFps } from '@/lib/jarvis/device';
import { useWeather } from '@/lib/jarvis/weather';

export function Decor({ still }: { still: boolean }) {
  return (
    <group>
      <Shelves />
      <SideShelf />
      <Unmirrored>
        <Collectibles />
        <Guitar />
      </Unmirrored>
      <Poster />
      <WallWidgets />
      <NeonSigns />
      <HoloStand still={still} />
      <DeskModel url="/models/room/potted_plant_02.glb" position={[-4.1, 0, 0.35]} scale={1.45} rotation={[0, 0.6, 0]} mirrored />
      <DeskModel url="/models/room/pachira_aquatica_01.glb" position={[4.05, 0, 0.55]} scale={1.65} rotation={[0, -0.8, 0]} mirrored />
    </group>
  );
}

/* ─────────────────────────── shelves ─────────────────────────── */

const BOOKS: [number, string][] = [
  [0.05, '#13302a'],
  [0.04, '#1b1f2a'],
  [0.06, '#0f2420'],
  [0.035, '#2a1d1d'],
  [0.05, '#16261f'],
];

function Shelves() {
  const x = -3.82;
  const z = ROOM.z0 + 0.15;
  return (
    <group position={[x, 0, z]}>
      {/* Carcass: back board, sides and a cap, so the shelves read as one lit unit. */}
      <mesh position={[0, UNIT.mid, -0.125]} material={MAT.matte}>
        <boxGeometry args={[1.25, UNIT.top - UNIT.base, 0.02]} />
      </mesh>
      {[-0.625, 0.625].map((sx) => (
        <mesh key={sx} position={[sx, UNIT.mid, 0]} material={MAT.matte}>
          <boxGeometry args={[0.03, UNIT.top - UNIT.base, 0.28]} />
        </mesh>
      ))}
      <mesh position={[0, UNIT.top, 0]} material={MAT.matte}>
        <boxGeometry args={[1.28, 0.03, 0.28]} />
      </mesh>
      <LedBar from={[-0.6, UNIT.top - 0.018, 0.1]} to={[0.6, UNIT.top - 0.018, 0.1]} thick={0.008} mat={MAT.ledSoft} />
      <ShelfBacklight />
      {[1.05, 1.5, 1.95].map((y, i) => (
        <group key={y} position={[0, y, 0]}>
          <mesh material={MAT.matte}>
            <boxGeometry args={[1.25, 0.03, 0.28]} />
          </mesh>
          <LedBar from={[-0.6, -0.018, 0.1]} to={[0.6, -0.018, 0.1]} thick={0.008} mat={MAT.ledSoft} />
          {i === 0 && <DeskModel url="/models/room/gaming_console.glb" position={[-0.25, 0.015, 0]} rotation={[0, 0.3, 0]} scale={1} />}
          {i === 1 && (
            <group position={[0.15, 0.015, 0]}>
              {BOOKS.map(([w, c], b) => (
                <mesh key={b} position={[b * 0.062, 0.1 + (b % 2) * 0.01, 0]} rotation={[0, 0, b === 4 ? 0.18 : 0]}>
                  <boxGeometry args={[w, 0.2 + (b % 3) * 0.02, 0.17]} />
                  <meshStandardMaterial color={c} roughness={0.8} />
                </mesh>
              ))}
            </group>
          )}
          {i === 1 && <DeskModel url="/models/room/calathea_orbifolia_01.glb" position={[-0.32, 0.015, 0.02]} scale={0.9} />}
          {i === 2 && <DeskModel url="/models/room/gamepad.glb" position={[0.2, 0.02, 0]} rotation={[0.3, -0.5, 0]} scale={0.4} />}
          {i === 2 && <MiniHex position={[-0.25, 0.12, 0]} />}
        </group>
      ))}
    </group>
  );
}

const UNIT = { base: 1.04, top: 2.4, mid: 1.72 } as const;
const BAYS = [
  [UNIT.top, 1.95],
  [1.95, 1.5],
  [1.5, 1.05],
] as const;

/** Light pooling down the back of each bay, from the strip under the shelf above. */
function ShelfBacklight() {
  const glow = useCanvasTexture(
    256,
    512,
    (ctx, w, h) => {
      const span = UNIT.top - UNIT.base;
      BAYS.forEach(([from, to]) => {
        const y0 = ((UNIT.top - from) / span) * h;
        const y1 = ((UNIT.top - to) / span) * h;
        const g = ctx.createLinearGradient(0, y0, 0, y1);
        g.addColorStop(0, 'rgba(46,255,176,0.34)');
        g.addColorStop(0.5, 'rgba(46,255,176,0.08)');
        g.addColorStop(1, 'rgba(46,255,176,0.015)');
        ctx.fillStyle = g;
        ctx.fillRect(0, y0, w, y1 - y0);
      });
      const edges = ctx.createLinearGradient(0, 0, w, 0);
      edges.addColorStop(0, 'rgba(0,0,0,0.25)');
      edges.addColorStop(0.3, 'rgba(0,0,0,1)');
      edges.addColorStop(0.7, 'rgba(0,0,0,1)');
      edges.addColorStop(1, 'rgba(0,0,0,0.25)');
      ctx.globalCompositeOperation = 'destination-in';
      ctx.fillStyle = edges;
      ctx.fillRect(0, 0, w, h);
    },
    [],
  );
  return (
    <mesh position={[0, UNIT.mid, -0.112]}>
      <planeGeometry args={[1.22, UNIT.top - UNIT.base]} />
      <meshBasicMaterial map={glow} transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
    </mesh>
  );
}

function MiniHex({ position }: { position: Vec3 }) {
  const tex = useCanvasTexture(256, 256, (ctx, w, h) => drawNR(ctx, w / 2, h / 2, 100), []);
  return (
    <mesh position={position}>
      <planeGeometry args={[0.22, 0.22]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} depthWrite={false} />
    </mesh>
  );
}

/** A small floating shelf under the poster, beside the PC, in a pool of wall light. */
function SideShelf() {
  const wash = useGlowTexture();
  return (
    <group position={[SIDE_SHELF.x, SIDE_SHELF.y, ROOM.z0 + 0.12]}>
      <mesh position={[0.2, 0.3, -0.094]}>
        <planeGeometry args={[1.5, 2]} />
        <meshBasicMaterial map={wash} transparent opacity={0.2} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </mesh>
      <mesh material={MAT.matte}>
        <boxGeometry args={[0.62, 0.03, 0.2]} />
      </mesh>
      <LedBar from={[-0.3, -0.018, 0.07]} to={[0.3, -0.018, 0.07]} thick={0.008} mat={MAT.ledSoft} />
    </group>
  );
}

/* ─────────────────────────── collectibles ─────────────────────────── */

/* Small display figures: a generic mech, a hooded wanderer and a knight, nobody's
 * character in particular. Every figure on every shelf merges into one painted
 * body and one glow mesh, so the whole collection costs two draw calls. */

type Parts = { body: BufferGeometry[]; glow: BufferGeometry[] };

const STEEL = '#5a6a70';
const DARK = '#1b2427';

const plinth = () => post(0.062, 0.067, 0.008, 0, 0.004, 0, DARK, 20);

function mech(paint: string): Parts {
  return {
    body: [
      plinth(),
      ...[-1, 1].flatMap((s) => [
        cube(0.036, 0.014, 0.054, s * 0.025, 0.015, 0.007, DARK),
        cube(0.025, 0.07, 0.03, s * 0.025, 0.056, 0, paint),
        cube(0.031, 0.02, 0.037, s * 0.025, 0.098, 0.003, DARK),
        cube(0.028, 0.05, 0.032, s * 0.025, 0.13, 0, paint),
        cube(0.046, 0.034, 0.052, s * 0.072, 0.21, 0, paint, s * -0.24),
        cube(0.02, 0.066, 0.026, s * 0.076, 0.162, 0, DARK),
        cube(0.025, 0.05, 0.031, s * 0.079, 0.11, 0.004, paint),
      ]),
      cube(0.07, 0.024, 0.04, 0, 0.158, 0, DARK),
      cube(0.094, 0.072, 0.054, 0, 0.205, 0, paint),
      cube(0.037, 0.034, 0.039, 0, 0.26, 0, DARK),
      cube(0.005, 0.03, 0.005, 0.014, 0.29, 0),
    ],
    glow: [cube(0.028, 0.006, 0.003, 0, 0.263, 0.02), cube(0.024, 0.012, 0.003, 0, 0.21, 0.028)],
  };
}

function wanderer(paint: string): Parts {
  return {
    body: [
      plinth(),
      painted(new ConeGeometry(0.076, 0.2, 9, 1, true).translate(0, 0.108, 0), paint),
      painted(new SphereGeometry(0.044, 10, 8).scale(1.25, 0.7, 0.95).translate(0, 0.2, 0), paint),
      ball(0.033, 0, 0.236, 0, DARK),
      painted(new ConeGeometry(0.033, 0.05, 9).translate(0, 0.268, -0.004), paint),
      post(0.0035, 0.0035, 0.27, 0.064, 0.139, 0.01, STEEL, 6),
    ],
    glow: [cube(0.022, 0.004, 0.003, 0, 0.24, 0.032), ball(0.011, 0.064, 0.282, 0.01)],
  };
}

function knight(paint: string): Parts {
  return {
    body: [
      plinth(),
      ...[-1, 1].flatMap((s) => [post(0.017, 0.021, 0.1, s * 0.021, 0.058, 0, paint), ball(0.027, s * 0.06, 0.216, 0, paint)]),
      post(0.031, 0.052, 0.05, 0, 0.125, 0, DARK),
      post(0.052, 0.034, 0.08, 0, 0.186, 0, paint),
      post(0.026, 0.031, 0.046, 0, 0.252, 0, paint, 12),
      cube(0.006, 0.036, 0.052, 0, 0.286, 0, DARK),
      painted(new CylinderGeometry(0.05, 0.05, 0.008, 14).rotateX(Math.PI / 2).translate(-0.078, 0.164, 0.022), DARK),
      cube(0.032, 0.006, 0.009, 0.074, 0.142, 0.012),
    ],
    glow: [cube(0.008, 0.13, 0.003, 0.074, 0.212, 0.012), cube(0.03, 0.004, 0.003, 0, 0.253, 0.031)],
  };
}

const L_SHELF = { x: -3.82, z: ROOM.z0 + 0.15 };
const SIDE_SHELF = { x: 1.68, y: 1.47 };

const FIGURES: { make: (paint: string) => Parts; paint: string; at: Vec3; turn: number; scale: number }[] = [
  { make: mech, paint: '#d39a2c', at: [L_SHELF.x + 0.3, 1.066, L_SHELF.z], turn: -0.3, scale: 0.92 },
  { make: knight, paint: '#3a9d7c', at: [L_SHELF.x + 0.48, 1.066, L_SHELF.z + 0.02], turn: -0.5, scale: 0.8 },
  { make: wanderer, paint: '#2f6b5c', at: [L_SHELF.x - 0.06, 1.516, L_SHELF.z], turn: 0.25, scale: 0.92 },
  { make: knight, paint: '#d39a2c', at: [L_SHELF.x + 0.46, 1.966, L_SHELF.z], turn: -0.35, scale: 0.9 },
  { make: mech, paint: '#3a9d7c', at: [SIDE_SHELF.x - 0.17, SIDE_SHELF.y + 0.016, ROOM.z0 + 0.12], turn: 0.2, scale: 0.95 },
  { make: wanderer, paint: '#3d6b7a', at: [SIDE_SHELF.x + 0.13, SIDE_SHELF.y + 0.016, ROOM.z0 + 0.12], turn: -0.25, scale: 0.9 },
];

function Collectibles() {
  const { body, glow } = useGeometries(() => {
    const placed = FIGURES.map(({ make, paint, at, turn, scale }) => {
      const parts = make(paint);
      const m = new Matrix4().compose(new Vector3(...at), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), turn), new Vector3(scale, scale, scale));
      [...parts.body, ...parts.glow].forEach((g) => g.applyMatrix4(m));
      return parts;
    });
    return { body: solid(placed.flatMap((p) => p.body)), glow: solid(placed.flatMap((p) => p.glow), { colour: false }) };
  });
  return (
    <group>
      <mesh geometry={body} material={MAT.painted} />
      <mesh geometry={glow} material={MAT.ledGreen} />
    </group>
  );
}

/* ─────────────────────────── poster ─────────────────────────── */

/** Back-lit print: original artwork, a lone wanderer under a hex moon. */
function Poster() {
  const art = useCanvasTexture(
    512,
    768,
    (ctx, w, h) => {
      const rnd = seeded(9);
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#031a18');
      sky.addColorStop(0.5, '#0b5a48');
      sky.addColorStop(0.72, '#04221d');
      sky.addColorStop(1, '#010807');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h * 0.34;
      const halo = ctx.createRadialGradient(cx, cy, 10, cx, cy, 300);
      halo.addColorStop(0, 'rgba(120,255,214,0.42)');
      halo.addColorStop(0.3, 'rgba(46,255,176,0.2)');
      halo.addColorStop(1, 'rgba(46,255,176,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, w, h);
      // Nested hex rings.
      ctx.strokeStyle = '#7dffd3';
      [190, 150, 112].forEach((r, i) => {
        ctx.globalAlpha = 0.75 - i * 0.2;
        ctx.lineWidth = 5 - i;
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = Math.PI / 6 + (k * Math.PI) / 3;
          ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
      // Three ridges, far to near.
      ['#064238', '#032a24', '#010f0d'].forEach((fill, l) => {
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.moveTo(0, h);
        const base = h * (0.56 + l * 0.05);
        for (let x = 0; x <= w; x += 34) ctx.lineTo(x, base - (rnd() - 0.3) * (70 - l * 12) - Math.abs(x - cx) * (0.12 - l * 0.03));
        ctx.lineTo(w, h);
        ctx.fill();
      });
      // The wanderer on the near ridge, seen from behind.
      const fy = h * 0.66;
      ctx.fillStyle = '#000303';
      ctx.beginPath();
      ctx.moveTo(cx - 44, fy + 44);
      ctx.quadraticCurveTo(cx - 34, fy - 76, cx - 15, fy - 92);
      ctx.quadraticCurveTo(cx, fy - 132, cx + 15, fy - 92);
      ctx.quadraticCurveTo(cx + 34, fy - 76, cx + 44, fy + 44);
      ctx.fill();
      ctx.fillRect(cx + 52, fy - 124, 4, 168);
      ctx.fillStyle = '#b4ffe6';
      ctx.fillRect(cx + 50, fy - 134, 8, 12);
      // Stacked motto.
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 40px ${FONTS.sci()}`;
      ['DREAM', 'BUILD', 'ACHIEVE'].forEach((t, i) => glowText(ctx, t, cx, h * 0.8 + i * 46, '#2effb0', 10));
    },
    [],
  );
  return (
    <group position={[1.67, 2.13, ROOM.z0 + 0.04]}>
      <RoundedBox args={[0.52, 0.76, 0.024]} radius={0.004} material={MAT.metal} />
      <mesh position={[0, 0, 0.0125]}>
        <planeGeometry args={[0.48, 0.72]} />
        <meshStandardMaterial map={art} emissiveMap={art} emissive="#ffffff" emissiveIntensity={0.5} roughness={0.26} metalness={0.1} />
      </mesh>
    </group>
  );
}

/* ─────────────────────────── guitar ─────────────────────────── */

/** An original offset double-cut body, 0.45 m long. Neck points along +y. */
function guitarBody() {
  const s = new Shape();
  s.moveTo(0.022, 0.17);
  s.bezierCurveTo(0.04, 0.2, 0.09, 0.262, 0.125, 0.258);
  s.bezierCurveTo(0.152, 0.25, 0.125, 0.135, 0.105, 0.078);
  s.bezierCurveTo(0.095, 0.04, 0.165, 0.02, 0.17, -0.1);
  s.bezierCurveTo(0.175, -0.19, 0.09, -0.225, 0, -0.225);
  s.bezierCurveTo(-0.09, -0.225, -0.165, -0.18, -0.16, -0.095);
  s.bezierCurveTo(-0.155, -0.01, -0.095, 0.02, -0.1, 0.06);
  s.bezierCurveTo(-0.105, 0.1, -0.14, 0.16, -0.122, 0.19);
  s.bezierCurveTo(-0.09, 0.225, -0.04, 0.19, -0.022, 0.17);
  return s;
}

function Guitar() {
  const { shell, edge, neck, inlay, hardware } = useGeometries(() => {
    const extrude = { depth: 0.034, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.005, bevelSegments: 2, curveSegments: 18 };
    const shell = new ExtrudeGeometry(guitarBody(), extrude);
    // A dim lit edge behind the body, like the case light on the PC.
    const edge = new ExtrudeGeometry(guitarBody(), { ...extrude, depth: 0.006, bevelEnabled: false }).scale(1.07, 1.06, 1).translate(0, 0, -0.008);
    const neck = solid([cube(0.05, 0.47, 0.018, 0, 0.41, 0.03), cube(0.084, 0.17, 0.014, 0.008, 0.71, 0.03)]);
    // Dim inlay down the fretboard so the neck reads against the dark wall.
    const inlay = cube(0.005, 0.44, 0.002, 0, 0.41, 0.04);
    const pegs = [0, 1, 2].flatMap((i) =>
      [-1, 1].map((s) => painted(new CylinderGeometry(0.006, 0.006, 0.03, 8).rotateZ(Math.PI / 2).translate(0.008 + s * 0.05, 0.66 + i * 0.05, 0.03), STEEL)),
    );
    const strings = [0, 1, 2, 3, 4, 5].map((i) => cube(0.0012, 0.72, 0.0012, -0.0125 + i * 0.005, 0.26, 0.045));
    const pickups = [-0.03, 0.07].map((y) => cube(0.078, 0.03, 0.008, 0, y, 0.042, DARK));
    const knobs = [0, 1, 2].map((i) => painted(new CylinderGeometry(0.011, 0.012, 0.012, 14).rotateX(Math.PI / 2).translate(0.11 - i * 0.012, -0.11 - i * 0.034, 0.043), STEEL));
    const hardware = solid([...pegs, ...strings, ...pickups, ...knobs, cube(0.08, 0.018, 0.012, 0, -0.1, 0.043), cube(0.05, 0.012, 0.02, 0, 0.66, 0.012)]);
    return { shell, edge, neck, inlay, hardware };
  });
  return (
    <group position={[2.13, 1.4, ROOM.z0 + 0.04]} rotation={[0, 0, 0.035]}>
      <mesh geometry={shell}>
        <meshStandardMaterial color="#17282a" roughness={0.2} metalness={0.4} />
      </mesh>
      <mesh geometry={edge} material={MAT.ledSoft} />
      <mesh geometry={neck} material={MAT.metal} />
      <mesh geometry={inlay} material={MAT.ledSoft} />
      <mesh geometry={hardware} material={MAT.metal} />
    </group>
  );
}

/* ─────────────────────────── wall widgets ─────────────────────────── */

const PANEL_W = 1.0;
const PANEL_H = 0.5;

function panelChrome(ctx: CanvasRenderingContext2D, w: number, h: number, title: string) {
  rr(ctx, 6, 6, w - 12, h - 12, 26);
  ctx.fillStyle = 'rgba(4,16,14,0.92)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(46,255,176,0.75)';
  ctx.lineWidth = 4;
  ctx.shadowColor = '#2effb0';
  ctx.shadowBlur = 16;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.font = `700 26px ${FONTS.sci()}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#2effb0';
  ctx.fillText(title, 40, 52);
}

function WallWidgets() {
  const clock = useClock('Asia/Kolkata');
  const weather = useWeather();
  const device = useDeviceInfo();
  const fps = useFps();

  const clockTex = useCanvasTexture(
    640,
    320,
    (ctx, w, h) => {
      panelChrome(ctx, w, h, 'COIMBATORE · IST');
      ctx.font = `900 92px ${FONTS.sci()}`;
      glowText(ctx, clock?.time.slice(0, 8) ?? '--:--:--', 40, 160, '#eafff6', 14);
      ctx.font = `700 30px ${FONTS.sci()}`;
      ctx.fillStyle = '#2effb0';
      ctx.fillText(clock?.time.slice(9) ?? '', 40 + 470, 178);
      ctx.font = `500 26px ${FONTS.mono()}`;
      ctx.fillStyle = 'rgba(207,233,220,0.7)';
      ctx.fillText(clock?.date ?? '', 40, 250);
    },
    [clock?.time],
  );

  const sysTex = useCanvasTexture(
    640,
    320,
    (ctx, w, h) => {
      panelChrome(ctx, w, h, 'YOUR DEVICE · LIVE');
      const rows: [string, string][] = [
        ['FPS', fps === null ? '—' : String(fps)],
        ['CPU THREADS', device?.cores ? String(device.cores) : '—'],
        ['MEMORY', device?.memoryGB ? `${device.memoryGB} GB+` : '—'],
        ['GPU', device?.gpu ?? '—'],
      ];
      rows.forEach(([k, v], i) => {
        const y = 112 + i * 50;
        ctx.font = `500 24px ${FONTS.mono()}`;
        ctx.fillStyle = 'rgba(207,233,220,0.6)';
        ctx.textAlign = 'left';
        ctx.fillText(k, 40, y);
        ctx.font = `700 26px ${FONTS.sans()}`;
        ctx.fillStyle = '#eafff6';
        ctx.textAlign = 'right';
        const value = v.length > 26 ? `${v.slice(0, 25)}…` : v;
        ctx.fillText(value, w - 40, y);
      });
    },
    [fps, device?.gpu, device?.cores, device?.memoryGB],
  );

  const weatherTex = useCanvasTexture(
    640,
    320,
    (ctx, w, h) => {
      panelChrome(ctx, w, h, 'COIMBATORE');
      ctx.font = `900 110px ${FONTS.sci()}`;
      glowText(ctx, weather ? `${weather.tempC}°` : '--°', 40, 170, '#eafff6', 14);
      ctx.font = `500 30px ${FONTS.sans()}`;
      ctx.fillStyle = '#cfe9dc';
      ctx.fillText(weather?.label ?? 'Fetching live weather…', 40, 258);
      ctx.font = `500 18px ${FONTS.mono()}`;
      ctx.fillStyle = 'rgba(207,233,220,0.45)';
      ctx.textAlign = 'right';
      ctx.fillText('OPEN-METEO · LIVE', w - 40, 52);
    },
    [weather?.tempC, weather?.label],
  );

  const quoteTex = useCanvasTexture(
    640,
    320,
    (ctx, w, h) => {
      panelChrome(ctx, w, h, 'MOTTO');
      ctx.font = `500 36px ${FONTS.display()}`;
      ctx.fillStyle = '#eafff6';
      ctx.fillText('Small progress every day', 40, 130);
      ctx.fillText('leads to big results.', 40, 178);
      ctx.font = `700 22px ${FONTS.sci()}`;
      ctx.fillStyle = '#2effb0';
      ctx.fillText('THINK · PLAN · EXECUTE', 40, 250);
    },
    [],
  );

  const y = 2.32;
  const z = ROOM.z0 + 0.05;
  return (
    <group>
      {[clockTex, sysTex, weatherTex, quoteTex].map((tex, i) => (
        <mesh key={i} position={[-2.55 + i * 1.12, y, z]}>
          <planeGeometry args={[PANEL_W, PANEL_H]} />
          <meshBasicMaterial map={tex} transparent toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/* ─────────────────────────── neon signs ─────────────────────────── */

function useNeon(lines: string[], size: number, w: number, h: number, color = '#2effb0', align: CanvasTextAlign = 'left') {
  return useCanvasTexture(
    w,
    h,
    (ctx) => {
      ctx.font = `700 ${size}px ${FONTS.sci()}`;
      ctx.textAlign = align;
      ctx.textBaseline = 'middle';
      const x = align === 'center' ? w / 2 : 40;
      const step = h / (lines.length + 0.6);
      lines.forEach((l, i) => glowText(ctx, l, x, step * (i + 0.8), color, size * 0.35));
    },
    [],
  );
}

function NeonSigns() {
  const play = useNeon(['PLAY', 'CODE', 'CREATE', 'REPEAT'], 96, 512, 640);
  const dreams = useNeon(['BIGGER DREAMS', 'BETTER CODE', 'GREATER IMPACT'], 64, 720, 420);
  const achieve = useNeon(['DREAM · BUILD · ACHIEVE'], 58, 1024, 160, '#2effb0', 'center');
  const nr = useCanvasTexture(512, 512, (ctx, w, h) => drawNR(ctx, w / 2, h / 2, 190), []);

  const neon = (tex: ReturnType<typeof useNeon>) => (
    <meshBasicMaterial map={tex} transparent toneMapped={false} depthWrite={false} blending={AdditiveBlending} color="#d8fff0" />
  );

  return (
    <group>
      {/* Left wall. */}
      <mesh position={[ROOM.x0 + 0.03, 1.85, -2.5]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.8, 1.0]} />
        {neon(play)}
      </mesh>
      <mesh position={[ROOM.x0 + 0.03, 2.3, -0.7]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.8, 0.8]} />
        {neon(nr)}
      </mesh>
      <pointLight position={[ROOM.x0 + 0.5, 1.9, -2.4]} color="#2effb0" intensity={1.6} distance={2.6} decay={2} />
      {/* Right wall, front section. */}
      <mesh position={[ROOM.x1 - 0.03, 1.8, 1.5]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[1.37, 0.8]} />
        {neon(dreams)}
      </mesh>
      <pointLight position={[ROOM.x1 - 0.5, 1.8, 1.5]} color="#2effb0" intensity={1} distance={2.4} decay={2} />
      {/* Right wall, beside the bed. */}
      <mesh position={[ROOM.x1 - 0.03, 2.3, -1.15]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[1.6, 0.25]} />
        {neon(achieve)}
      </mesh>
    </group>
  );
}

/* ─────────────────────────── NR hologram ─────────────────────────── */

function HoloStand({ still }: { still: boolean }) {
  const emblem = useCanvasTexture(512, 512, (ctx, w, h) => drawNR(ctx, w / 2, h / 2, 180), []);
  const spin = useRef<Group>(null);
  const shell = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (still) return;
    if (spin.current) {
      spin.current.rotation.y = t * 0.8;
      spin.current.position.y = 0.95 + Math.sin(t * 1.6) * 0.02;
    }
    if (shell.current) shell.current.rotation.set(t * 0.2, t * 0.35, 0);
  });
  return (
    <group position={[-3.4, 0, -1.65]}>
      <RoundedBox args={[0.8, 0.56, 0.5]} radius={0.02} position={[0, 0.28, 0]} material={MAT.matte} />
      <LedBar from={[-0.39, 0.54, 0.252]} to={[0.39, 0.54, 0.252]} thick={0.01} />
      <LedBar from={[-0.39, 0.04, 0.252]} to={[0.39, 0.04, 0.252]} thick={0.01} mat={MAT.ledSoft} />
      {/* Projector puck. */}
      <mesh position={[0, 0.59, 0]} material={MAT.metal}>
        <cylinderGeometry args={[0.13, 0.15, 0.05, 40]} />
      </mesh>
      <mesh position={[0, 0.616, 0]} rotation={[-Math.PI / 2, 0, 0]} material={MAT.ledGreen}>
        <ringGeometry args={[0.09, 0.11, 48]} />
      </mesh>
      {/* Light cone. */}
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.22, 0.1, 0.36, 40, 1, true]} />
        <meshBasicMaterial color="#2effb0" transparent opacity={0.07} side={DoubleSide} depthWrite={false} blending={AdditiveBlending} />
      </mesh>
      <group ref={spin} position={[0, 0.95, 0]}>
        <mesh>
          <planeGeometry args={[0.32, 0.32]} />
          <meshBasicMaterial map={emblem} transparent toneMapped={false} side={DoubleSide} depthWrite={false} blending={AdditiveBlending} />
        </mesh>
      </group>
      <group ref={shell} position={[0, 0.95, 0]}>
        <mesh>
          <icosahedronGeometry args={[0.2, 1]} />
          <meshBasicMaterial color="#2effb0" wireframe transparent opacity={0.25} />
        </mesh>
      </group>
      <pointLight position={[0, 0.95, 0.1]} color="#2effb0" intensity={0.8} distance={1.6} decay={2} />
    </group>
  );
}
