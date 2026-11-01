'use client';

import type { ReactNode } from 'react';
import { AdditiveBlending, CylinderGeometry, DoubleSide, ExtrudeGeometry, PlaneGeometry, Shape, ShapeGeometry, TorusGeometry, type BufferGeometry, type Texture } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { drawNR, FONTS, glowText, seeded, useCanvasTexture } from '@/components/room/canvasTex';
import { ROOM, type Vec3 } from '@/components/room/layout';
import { led, MAT } from '@/components/room/materials';
import { myApps, myGames } from '@/lib/content';
import { cube, cushion, painted, pillow, post, soft, solid, tube, Unmirrored, useGeometries } from '@/components/room/shapes';
import { paintHeroArt, useBreathingScreen } from '@/components/room/Screens';
import { panelChrome } from '@/components/room/Decor';
import { DeskModel, useGlowTexture } from '@/components/room/Workstation';

/* The end of the room behind the start view: a door, a built-in wardrobe with
 * one bay left open, a media wall, a lounge and an arcade corner. Each zone is
 * its own merged mesh, so whatever is behind the visitor is culled whole. */

const H = ROOM.h;
const LAMP = led('#ffbe78', 1.5);

const INK = '#0c1113';
const CHARCOAL = '#171f22';
const STEEL = '#58666b';
const LINEN = '#2a3f5a';
const LINEN_DARK = '#1e2f45';

/** Space along the front wall. +z points into the room, +x towards the left wall. */
function FrontWall({ children }: { children: ReactNode }) {
  return (
    <group position={[0, 0, ROOM.z1]} rotation={[0, Math.PI, 0]}>
      {children}
    </group>
  );
}

export function RoomFront() {
  return (
    <group>
      <FrontWall>
        <Door />
        <Wardrobe />
        <MediaWall />
      </FrontWall>
      <Lounge />
      <ArcadeCabinet />
      <Triptych />
      <ControllerWall />
      <Sconces />
      <WallLights />
      <WallKit />
      <GamesBoard />
      <SetupBoard />
      <Planter />
      {/* Fills the corner beyond the media wall. */}
      <DeskModel url="/models/room/pachira_aquatica_01.glb" position={[4.22, 0, 5.98]} scale={1.5} rotation={[0, 2.2, 0]} mirrored />
    </group>
  );
}

/* ─────────────────────────── door ─────────────────────────── */

const DOOR = { x: 0.35, w: 1.02, h: 2.2 } as const;

function buildDoor() {
  const { x, w, h } = DOOR;
  const leaf = [
    soft(w, h, 0.05, x, h / 2, 0.035, CHARCOAL, 0.006),
    ...[0.58, 1.15].map((y) => cube(w - 0.1, 0.008, 0.004, x, y, 0.0605, INK)),
    ...[-1, 1].map((s) => cube(0.008, h - 0.24, 0.004, x + (s * (w - 0.1)) / 2, h / 2, 0.0605, INK)),
    // Lever handle, rose and keypad.
    post(0.032, 0.034, 0.012, 0, 0, 0, STEEL, 22).rotateX(Math.PI / 2).translate(x - w / 2 + 0.09, 1.02, 0.066),
    tube(
      [
        [x - w / 2 + 0.09, 1.02, 0.07],
        [x - w / 2 + 0.09, 1.02, 0.1],
        [x - w / 2 + 0.17, 1.018, 0.102],
      ],
      0.009,
      STEEL,
      { sides: 10, segments: 14 },
    ),
    soft(0.09, 0.15, 0.012, x - w / 2 + 0.09, 1.28, 0.066, INK, 0.003),
    ...[0, 1, 2].flatMap((row) => [0, 1, 2].map((col) => cube(0.016, 0.016, 0.003, x - w / 2 + 0.066 + col * 0.024, 1.31 - row * 0.024, 0.0735, STEEL))),
  ];
  const frame = [
    ...[-1, 1].map((s) => soft(0.09, h + 0.07, 0.09, x + (s * (w + 0.09)) / 2, (h + 0.07) / 2, 0.045, '#232d30', 0.006)),
    soft(w + 0.18, 0.09, 0.09, x, h + 0.08, 0.045, '#232d30', 0.006),
  ];
  // Thin lit jambs, in the sample's manner.
  const glow = solid([...[-1, 1].map((s) => cube(0.008, h, 0.006, x + (s * (w + 0.05)) / 2, h / 2, 0.092)), cube(w + 0.06, 0.008, 0.006, x, h + 0.044, 0.092)], { colour: false });
  return { door: solid([...leaf, ...frame]), glow };
}

function Door() {
  const { door, glow } = useGeometries(buildDoor);
  const emblem = useCanvasTexture(256, 256, (ctx, w, h) => drawNR(ctx, w / 2, h / 2, 96), []);
  return (
    <group>
      <mesh geometry={door} material={MAT.satin} />
      <mesh geometry={glow} material={MAT.piping} />
      <mesh position={[DOOR.x, 1.68, 0.0625]}>
        <planeGeometry args={[0.32, 0.32]} />
        <meshBasicMaterial map={emblem} transparent toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ─────────────────────────── wardrobe ─────────────────────────── */

const ROBE = { x: 2.925, w: 3.35, d: 0.6 } as const;
const BAY = ROBE.w / 4;

function buildWardrobe() {
  const { x, w, d } = ROBE;
  const rnd = seeded(40);
  const openX = x - w / 2 + BAY / 2; // the bay nearest the door stands open
  const shell = [
    cube(w, 0.09, d - 0.02, x, 0.045, d / 2 - 0.01, INK),
    soft(w + 0.02, 0.12, d + 0.02, x, H - 0.06, d / 2, '#20292c', 0.008),
    cube(0.02, H - 0.12, d, x - w / 2, (H - 0.12) / 2, d / 2, '#2a383c'),
    cube(w, H - 0.12, 0.01, x, (H - 0.12) / 2, 0.012, '#0a0e0f'),
    // Sliding door frames on their two tracks; the open bay's door is parked behind its neighbour.
    ...[1, 2, 3].flatMap((i) => {
      const cx = x - w / 2 + BAY * (i + 0.5);
      const z = d - (i % 2 ? 0.05 : 0.02);
      return [cube(0.028, H - 0.22, 0.026, cx - BAY / 2 + 0.014, 1.53, z, STEEL), cube(0.028, H - 0.22, 0.026, cx + BAY / 2 - 0.014, 1.53, z, STEEL), cube(BAY, 0.03, 0.026, cx, 0.105, z, STEEL), cube(BAY, 0.03, 0.026, cx, H - 0.135, z, STEEL)];
    }),
    cube(w, 0.012, 0.05, x, 0.095, d - 0.03, STEEL),
    cube(w, 0.012, 0.05, x, H - 0.13, d - 0.03, STEEL),
    // Inside the open bay: hanging rail, shelves and drawers.
    ...[0.86, 1.86].flatMap((y) => [cube(BAY - 0.04, 0.024, d - 0.1, openX, y, d / 2 - 0.05, '#232d30')]),
    painted(new CylinderGeometry(0.012, 0.012, BAY - 0.04, 14).rotateZ(Math.PI / 2).translate(openX, 1.74, d / 2 - 0.05), STEEL),
    ...[0.22, 0.44, 0.66].flatMap((y) => [soft(BAY - 0.05, 0.2, 0.42, openX, y, d / 2 - 0.05, '#20292c', 0.006), cube(0.12, 0.012, 0.016, openX, y + 0.03, d / 2 + 0.165, STEEL)]),
  ];
  // Clothes on hangers, seen end-on the way a wardrobe holds them.
  const clothes = Array.from({ length: 8 }, (_, i) => {
    const gx = openX - BAY / 2 + 0.08 + i * 0.1;
    const tall = 0.6 + rnd() * 0.2;
    const tone = ['#17345a', '#1b2d2a', '#26303c', '#0f4a3b', '#3a3f4a'][i % 5] ?? '#26303c';
    return [cushion(0.05, tall, 0.4 + rnd() * 0.05, tone, 0.022, 0).translate(gx, 1.7 - tall / 2, d / 2 - 0.05), tube([[gx, 1.7, d / 2 - 0.05], [gx, 1.745, d / 2 - 0.05]], 0.003, STEEL, { sides: 5, segments: 3 })];
  }).flat();
  // Folded stacks on the top shelf.
  const stacks = [0, 1, 2].flatMap((c) =>
    [0, 1, 2, 3].slice(0, 2 + c).map((n) => soft(0.2, 0.05, 0.3, openX - 0.25 + c * 0.25, 1.9 + n * 0.054, d / 2 - 0.06, ['#203a4a', '#16302a', '#2b3644'][(c + n) % 3] ?? '#203a4a', 0.018)),
  );
  const panes = mergeGeometries(
    [1, 2, 3].map((i) => {
      const cx = x - w / 2 + BAY * (i + 0.5);
      return new PlaneGeometry(BAY - 0.056, H - 0.24).translate(cx, 1.53, d - (i % 2 ? 0.05 : 0.02));
    }),
  );
  // A slim lit pull on each sliding door, and the strip inside the open bay.
  const glow = solid(
    [...[1, 2, 3].map((i) => cube(0.008, 1.5, 0.006, x - w / 2 + BAY * (i + 0.5) - BAY / 2 + 0.05, 1.3, d - (i % 2 ? 0.03 : 0))), cube(BAY - 0.06, 0.008, 0.012, openX, 2.72, d - 0.1)],
    { colour: false },
  );
  return { shell: solid([...shell, ...clothes, ...stacks]), panes, glow };
}

function Wardrobe() {
  const { shell, panes, glow } = useGeometries(buildWardrobe);
  const wash = useGlowTexture();
  const fluted = useCanvasTexture(
    256,
    1024,
    (ctx, w, h) => {
      const base = ctx.createLinearGradient(0, 0, 0, h);
      base.addColorStop(0, '#1f5a4a');
      base.addColorStop(0.35, '#16322f');
      base.addColorStop(1, '#0f2022');
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 12) {
        const g = ctx.createLinearGradient(x, 0, x + 12, 0);
        g.addColorStop(0, 'rgba(0,0,0,0.42)');
        g.addColorStop(0.5, 'rgba(255,255,255,0.1)');
        g.addColorStop(1, 'rgba(0,0,0,0.42)');
        ctx.fillStyle = g;
        ctx.fillRect(x, 0, 12, h);
      }
      ctx.fillStyle = '#0a0f10';
      ctx.fillRect(0, h * 0.52, w, 10);
      ctx.fillStyle = 'rgba(190,225,214,0.22)';
      ctx.fillRect(0, h * 0.52 + 10, w, 2);
    },
    [],
  );
  return (
    <group>
      <mesh geometry={shell} material={MAT.satin} />
      <mesh geometry={panes}>
        <meshStandardMaterial map={fluted} emissiveMap={fluted} emissive="#ffffff" emissiveIntensity={0.6} roughness={0.62} metalness={0.1} />
      </mesh>
      <mesh geometry={glow} material={MAT.piping} />
      {/* Soft light inside the open bay, without a lamp to burn a spot on the glass. */}
      <mesh position={[ROBE.x - ROBE.w / 2 + BAY / 2, 1.9, 0.03]}>
        <planeGeometry args={[BAY - 0.04, 1.9]} />
        <meshBasicMaterial map={wash} transparent opacity={0.34} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </mesh>
    </group>
  );
}

/* ─────────────────────────── media wall ─────────────────────────── */

const MEDIA = { x: -2.65, tv: [1.9, 1.07] as [number, number], y: 1.58 } as const;

function buildMedia() {
  const { x, tv, y } = MEDIA;
  const slats = Array.from({ length: 27 }, (_, i) => cube(0.062, 2.5, 0.032, x - 1.3 + i * 0.1, 1.68, 0.03, i % 2 ? '#1e2a2c' : '#172124'));
  const unit = [
    cube(2.72, 2.54, 0.012, x, 1.68, 0.008, '#080b0c'),
    soft(tv[0] + 0.03, tv[1] + 0.03, 0.05, x, y, 0.07, '#0a0d0e', 0.006),
    // Low console: carcass, four push-to-open fronts, recessed plinth.
    soft(2.7, 0.04, 0.46, x, 0.46, 0.23, CHARCOAL, 0.008),
    cube(2.66, 0.34, 0.4, x, 0.27, 0.2, INK),
    cube(2.5, 0.08, 0.36, x, 0.05, 0.18, '#080b0c'),
    ...[0, 1, 2, 3].flatMap((i) => [soft(0.64, 0.3, 0.018, x - 0.99 + i * 0.66, 0.27, 0.41, '#1b2528', 0.004), cube(0.1, 0.006, 0.01, x - 0.99 + i * 0.66, 0.39, 0.42, STEEL)]),
    // Soundbar under the screen.
    soft(1.1, 0.07, 0.1, x, 0.52, 0.2, '#0e1315', 0.02),
    ...Array.from({ length: 28 }, (_, i) => cube(0.012, 0.042, 0.002, x - 0.5 + i * 0.037, 0.52, 0.251, '#20292c')),
    // Rack of game cases, one for each game on the desk monitor.
    ...myGames.map((g, i) => soft(0.024, 0.19, 0.14, x + 0.72 + i * 0.03, 0.575, 0.2, `hsl(${g.hue}, 55%, 24%)`, 0.002)),
  ];
  const glow = solid([cube(2.46, 0.008, 0.008, x, 0.012, 0.36), cube(0.009, 0.0026, 0.002, x, y - tv[1] / 2 - 0.006, 0.0955)], { colour: false });
  return { unit: solid([...slats, ...unit]), glow };
}

function MediaWall() {
  const { unit, glow } = useGeometries(buildMedia);
  const bias = useGlowTexture();
  const screen = useBreathingScreen(1.05, 0.03);
  const art = useCanvasTexture(
    1024,
    576,
    (ctx, w, h) => {
      paintHeroArt(ctx, w, h);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `900 74px ${FONTS.sci()}`;
      glowText(ctx, 'LEVEL UP', w / 2, h * 0.6, '#2effb0', 22);
      ctx.font = `500 24px ${FONTS.mono()}`;
      ctx.fillStyle = '#cfe9dc';
      ctx.fillText('PLAY  ·  CODE  ·  CREATE  ·  REPEAT', w / 2, h * 0.72);
    },
    [],
  );
  const { x, tv, y } = MEDIA;
  return (
    <group>
      <mesh geometry={unit} material={MAT.satin} />
      <mesh geometry={glow} material={MAT.piping} />
      <mesh position={[x, y, 0.05]}>
        <planeGeometry args={[tv[0] * 1.9, tv[1] * 2.3]} />
        <meshBasicMaterial map={bias} transparent opacity={0.26} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </mesh>
      <mesh position={[x, y, 0.0955]}>
        <planeGeometry args={tv} />
        <meshBasicMaterial ref={screen} map={art} toneMapped={false} />
      </mesh>
      <DeskModel url="/models/room/gaming_console.glb" position={[x - 0.85, 0.48, 0.2]} rotation={[0, 0.25, 0]} scale={1} />
      <DeskModel url="/models/room/gamepad.glb" position={[x + 0.28, 0.5, 0.31]} rotation={[0, -0.5, 0]} scale={0.95} />
      <DeskModel url="/models/room/potted_plant_04.glb" position={[x + 1.2, 0.48, 0.22]} scale={1.15} />
    </group>
  );
}

/* ─────────────────────────── lounge ─────────────────────────── */

const SOFA = { x: 2.6, z: 3.45, w: 2.3, d: 0.95 } as const;
const COFFEE = { x: 2.6, z: 4.6, w: 1.15, d: 0.56 } as const;
const FLOOR_LAMP = { x: 1.2, z: 3.05, turn: 2.44 } as const;

function buildSofa() {
  const { w, d } = SOFA;
  const seats = [-1, 0, 1].flatMap((i) => [
    cushion(0.69, 0.17, 0.68, LINEN, 0.05, 0.022).translate(i * 0.7, 0.36, 0.1),
    cushion(0.68, 0.46, 0.2, LINEN_DARK, 0.07, 0).rotateX(-0.2).translate(i * 0.7, 0.68, -0.27),
  ]);
  const body = [
    cushion(w - 0.04, 0.26, d - 0.08, '#101a26', 0.04, 0).translate(0, 0.19, 0),
    cushion(w - 0.08, 0.66, 0.2, '#16222f', 0.07, 0).translate(0, 0.5, -d / 2 + 0.1),
    ...[-1, 1].map((s) => cushion(0.2, 0.46, d - 0.02, '#16222f', 0.07, 0.016).translate((s * (w - 0.2)) / 2, 0.42, 0)),
    // Tapered metal feet.
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => post(0.018, 0.012, 0.06, sx * (w / 2 - 0.1), 0.03, sz * (d / 2 - 0.1), STEEL, 12))),
  ];
  const throws = [
    pillow(0.44, 0.44, 0.16, '#143b33', 1.7).rotateX(-0.32).rotateY(0.42).translate(-0.76, 0.66, 0.0),
    pillow(0.42, 0.42, 0.15, '#20324a', 2.9).rotateX(-0.28).rotateY(-0.38).translate(0.82, 0.65, 0.0),
  ];
  return { sofa: solid([...body, ...seats, ...throws]) };
}

function buildCoffee() {
  const { w, d } = COFFEE;
  const parts = [
    soft(w, 0.03, d, 0, 0.36, 0, '#1a2326', 0.008),
    soft(w - 0.1, 0.02, d - 0.1, 0, 0.14, 0, INK, 0.004),
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => cube(0.024, 0.34, 0.024, sx * (w / 2 - 0.07), 0.175, sz * (d / 2 - 0.06), STEEL))),
    // A remote and two magazines on the top; a tray of board games beneath.
    soft(0.05, 0.018, 0.17, 0.3, 0.385, 0.05, INK, 0.006),
    soft(0.3, 0.012, 0.22, -0.26, 0.382, -0.02, '#1d4a3d', 0.002),
    soft(0.28, 0.01, 0.21, -0.24, 0.393, -0.01, '#22344a', 0.002),
    soft(0.32, 0.04, 0.24, -0.15, 0.17, 0, '#25333a', 0.003),
  ];
  return { coffee: solid(parts) };
}

function buildFloorLamp() {
  const head: Vec3 = [-0.52, 1.92, 0.2];
  const stem = [
    post(0.15, 0.17, 0.03, 0, 0.015, 0, CHARCOAL, 36),
    tube(
      [
        [0, 0.03, 0],
        [0, 1.2, 0],
        [-0.06, 1.72, 0.02],
        [-0.26, 2.02, 0.1],
        [head[0], head[1] + 0.05, head[2]],
      ],
      0.011,
      STEEL,
      { sides: 10, segments: 44 },
    ),
    painted(new CylinderGeometry(0.05, 0.17, 0.15, 36, 1, true).translate(...head), CHARCOAL),
  ];
  return { stem: solid(stem), bulb: solid([new CylinderGeometry(0.16, 0.16, 0.004, 32).translate(head[0], head[1] - 0.072, head[2])], { colour: false }) };
}

function Lounge() {
  const { sofa } = useGeometries(buildSofa);
  const { coffee } = useGeometries(buildCoffee);
  const { stem, bulb } = useGeometries(buildFloorLamp);
  const crest = useCanvasTexture(256, 256, (ctx, w, h) => drawNR(ctx, w / 2, h / 2, 96), []);
  const rug = useCanvasTexture(
    512,
    384,
    (ctx, w, h) => {
      const rnd = seeded(23);
      ctx.fillStyle = '#0a1115';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 5200; i++) {
        ctx.fillStyle = rnd() > 0.5 ? 'rgba(46,70,80,0.28)' : 'rgba(0,0,0,0.36)';
        ctx.fillRect(rnd() * w, rnd() * h, 2, 2);
      }
      ctx.strokeStyle = 'rgba(46,255,176,0.34)';
      ctx.lineWidth = 3;
      ctx.strokeRect(20, 20, w - 40, h - 40);
    },
    [],
  );
  return (
    <group>
      <group position={[SOFA.x, 0, SOFA.z]}>
        <mesh geometry={sofa} material={MAT.cloth} />
        {/* The NR cushion's crest. */}
        <group position={[0.82, 0.65, 0]} rotation={[-0.28, -0.38, 0, 'YXZ']}>
          <mesh position={[0, 0, 0.082]}>
            <planeGeometry args={[0.2, 0.2]} />
            <meshBasicMaterial map={crest} transparent toneMapped={false} depthWrite={false} />
          </mesh>
        </group>
      </group>
      <group position={[COFFEE.x, 0, COFFEE.z]}>
        <mesh geometry={coffee} material={MAT.painted} />
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[2.6, 0.006, 4.5]}>
        <planeGeometry args={[3.1, 2.3]} />
        <meshStandardMaterial map={rug} roughness={1} metalness={0} />
      </mesh>
      <group position={[FLOOR_LAMP.x, 0, FLOOR_LAMP.z]} rotation={[0, FLOOR_LAMP.turn, 0]}>
        <mesh geometry={stem} material={MAT.metal} />
        <mesh geometry={bulb} material={LAMP} />
        <pointLight position={[-0.52, 1.72, 0.2]} color="#ffbe78" intensity={2.4} distance={3.4} decay={2} />
      </group>
    </group>
  );
}

/* ─────────────────────────── arcade cabinet ─────────────────────────── */

const ARCADE = { z: 2.75, depth: 0.74, width: 0.7 } as const;

/** Side profile: y up, x towards the player. */
function arcadeProfile() {
  const s = new Shape();
  s.moveTo(0, 0);
  s.lineTo(0.62, 0);
  s.lineTo(0.62, 0.84);
  s.lineTo(0.7, 0.94);
  s.lineTo(0.7, 1.0);
  s.lineTo(0.42, 1.14);
  s.lineTo(0.3, 1.66);
  s.lineTo(0.4, 1.7);
  s.lineTo(0.46, 1.9);
  s.lineTo(0, 1.9);
  s.closePath();
  return s;
}

const ARCADE_BODY = 0.56;

function buildArcade() {
  const side = (x: number) => new ExtrudeGeometry(arcadeProfile(), { depth: 0.024, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1 }).rotateY(-Math.PI / 2).translate(x, 0, 0);
  const half = ARCADE_BODY / 2;
  const slope = Math.atan2(0.14, 0.28);
  const place = (g: BufferGeometry) => g.rotateX(slope).translate(0, 1.075, 0.555);
  const cabinet = [
    painted(side(half + 0.024), '#111a1c'),
    painted(side(-half), '#111a1c'),
    cube(ARCADE_BODY, 0.84, 0.6, 0, 0.42, 0.3, CHARCOAL),
    cube(ARCADE_BODY, 0.8, 0.3, 0, 1.3, 0.16, INK),
    cube(ARCADE_BODY, 0.2, 0.42, 0, 1.8, 0.22, INK),
    // Coin door, slots and kick plate.
    soft(0.34, 0.42, 0.012, 0, 0.52, 0.626, '#242f33', 0.004),
    ...[-1, 1].flatMap((s) => [cube(0.012, 0.05, 0.004, s * 0.08, 0.6, 0.634, '#c1a24a'), cube(0.1, 0.02, 0.004, s * 0.08, 0.45, 0.634, INK)]),
    cube(ARCADE_BODY, 0.1, 0.01, 0, 0.05, 0.628, '#0a0e0f'),
    // Speaker grille under the marquee.
    ...Array.from({ length: 12 }, (_, i) => cube(0.4, 0.006, 0.006, 0, 1.68 + i * 0.008, 0.388, '#080b0c')),
  ];
  // Control deck, angled towards the player.
  const deck = [
    cube(ARCADE_BODY, 0.024, 0.34, 0, 0, 0, '#222d30'),
    // Joystick: shaft, ball and dust washer.
    post(0.032, 0.032, 0.004, -0.14, 0.014, 0, STEEL, 20),
    post(0.006, 0.007, 0.06, -0.14, 0.042, 0, STEEL, 10),
  ];
  const buttons = [0, 1, 2].flatMap((c) => [0, 1].map((r) => post(0.019, 0.021, 0.012, 0.03 + c * 0.05, 0.018, -0.03 + r * 0.06, '#000', 18)));
  return {
    cabinet: solid([...cabinet, ...deck.map(place)]),
    buttons: solid(buttons.map(place), { colour: false }),
    knob: solid([place(post(0.016, 0.016, 0.03, -0.14, 0.086, 0, '#000', 18))], { colour: false }),
    trim: solid(
      [half + 0.028, -half - 0.028].map((x) => {
        const p = arcadeProfile().getPoints(1).slice(0, -1);
        const dense = p.flatMap((q, i) => {
          const next = p[(i + 1) % p.length] ?? q;
          return Array.from({ length: 8 }, (_, k): Vec3 => [x, q.y + ((next.y - q.y) * k) / 8, q.x + ((next.x - q.x) * k) / 8]);
        });
        return tube(dense, 0.004, '#000', { closed: true, sides: 5, segments: 300 });
      }),
      { colour: false },
    ),
  };
}

function ArcadeCabinet() {
  const { cabinet, buttons, knob, trim } = useGeometries(buildArcade);
  const { art } = useGeometries(() => {
    const face = new ShapeGeometry(arcadeProfile(), 1).rotateY(-Math.PI / 2);
    const out = ARCADE_BODY / 2 + 0.0295;
    return { art: mergeGeometries([face.clone().translate(out, 0, 0), face.translate(-out, 0, 0)]) };
  });
  const sideArt = useCanvasTexture(
    360,
    976,
    (ctx, w, h) => {
      const rnd = seeded(61);
      const bg = ctx.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, '#0e4d3d');
      bg.addColorStop(0.55, '#08201c');
      bg.addColorStop(1, '#04100e');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 7; i++) {
        ctx.strokeStyle = `rgba(46,255,176,${0.14 + rnd() * 0.26})`;
        ctx.lineWidth = 6 + rnd() * 22;
        ctx.beginPath();
        ctx.moveTo(-40, h * (0.2 + i * 0.13));
        ctx.lineTo(w + 40, h * (0.2 + i * 0.13) - 230);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
      // A pixel snake climbing the side, wordless so it reads either way round.
      const cell = 24;
      [[3, 34], [4, 34], [5, 34], [6, 34], [7, 34], [7, 33], [7, 32], [7, 31], [8, 31], [9, 31], [9, 30], [9, 29], [9, 28], [10, 28], [11, 28]].forEach(([cx = 0, cy = 0], i) => {
        ctx.fillStyle = `rgba(120,255,214,${0.35 + i * 0.04})`;
        ctx.fillRect(cx * cell + 2, cy * cell + 2, cell - 4, cell - 4);
      });
    },
    [],
  );
  sideArt.repeat.set(1 / 0.7, 1 / 1.9);
  const screen = useBreathingScreen(1.1, 0.04, 2.2);
  const game = useCanvasTexture(
    384,
    512,
    (ctx, w, h) => {
      const cell = 24;
      ctx.fillStyle = '#020a08';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(46,255,176,0.08)';
      for (let x = 0; x <= w; x += cell) ctx.strokeRect(x, 0, 0, h);
      for (let y = 0; y <= h; y += cell) ctx.strokeRect(0, y, w, 0);
      // The snake mid-turn, chasing the pellet.
      const body: [number, number][] = [[4, 15], [5, 15], [6, 15], [7, 15], [8, 15], [8, 14], [8, 13], [8, 12], [9, 12], [10, 12], [11, 12], [11, 11], [11, 10], [11, 9]];
      body.forEach(([cx, cy], i) => {
        ctx.fillStyle = `rgba(46,255,176,${0.35 + (0.65 * i) / body.length})`;
        ctx.shadowColor = '#2effb0';
        ctx.shadowBlur = 8;
        ctx.fillRect(cx * cell + 2, cy * cell + 2, cell - 4, cell - 4);
      });
      ctx.fillStyle = '#ff4fd8';
      ctx.shadowColor = '#ff4fd8';
      ctx.fillRect(5 * cell + 4, 7 * cell + 4, cell - 8, cell - 8);
      ctx.shadowBlur = 0;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 42px ${FONTS.sci()}`;
      glowText(ctx, 'NEON SNAKE', w / 2, 64, '#2effb0', 14);
      ctx.font = `500 20px ${FONTS.mono()}`;
      ctx.fillStyle = '#cfe9dc';
      ctx.fillText('PRESS START', w / 2, h - 44);
    },
    [],
  );
  const marquee = useCanvasTexture(
    512,
    128,
    (ctx, w, h) => {
      ctx.fillStyle = '#04201a';
      ctx.fillRect(0, 0, w, h);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `900 58px ${FONTS.sci()}`;
      glowText(ctx, 'NEON SNAKE', w / 2, h / 2 + 2, '#2effb0', 16);
    },
    [],
  );
  const lean = Math.atan2(0.12, 0.52);
  return (
    <group position={[ROOM.x0 + 0.03, 0, ARCADE.z]} rotation={[0, Math.PI / 2, 0]}>
      <mesh geometry={cabinet} material={MAT.painted} />
      <mesh geometry={trim} material={MAT.piping} />
      <mesh geometry={art}>
        <meshStandardMaterial map={sideArt} emissiveMap={sideArt} emissive="#ffffff" emissiveIntensity={0.7} roughness={0.7} side={DoubleSide} />
      </mesh>
      <mesh geometry={buttons} material={MAT.ledGreen} />
      <mesh geometry={knob} material={MAT.ledMagenta} />
      <mesh position={[0, 1.41, 0.365]} rotation={[-lean, 0, 0]}>
        <planeGeometry args={[0.46, 0.5]} />
        <meshBasicMaterial ref={screen} map={game} toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.8, 0.436]} rotation={[-0.29, 0, 0]}>
        <planeGeometry args={[ARCADE_BODY - 0.01, 0.17]} />
        <meshBasicMaterial map={marquee} toneMapped={false} />
      </mesh>
    </group>
  );
}

/* ─────────────────────────── wall dressing ─────────────────────────── */

/** Three framed prints on the left wall, reading across as one picture. */
function Triptych() {
  const frames = useGeometries(() => ({
    frame: solid(
      [-1, 0, 1].flatMap((i) => {
        const cx = i * 0.72;
        return [
          ...[-1, 1].map((s) => cube(0.02, 0.92, 0.03, cx + s * 0.33, 0, 0.015, CHARCOAL)),
          ...[-1, 1].map((s) => cube(0.68, 0.02, 0.03, cx, s * 0.45, 0.015, CHARCOAL)),
        ];
      }).concat([-1, 1].map((s) => cube(0.06, 0.94, 0.03, s * 0.36, 0, 0.015, '#0a0e0f'))),
    ),
  }));
  const print = useCanvasTexture(
    1024,
    460,
    (ctx, w, h) => {
      const rnd = seeded(66);
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#04201b');
      sky.addColorStop(0.6, '#0a5140');
      sky.addColorStop(1, '#021210');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 18; i++) {
        const x = (i / 17) * w;
        ctx.strokeStyle = `rgba(46,255,176,${0.1 + rnd() * 0.25})`;
        ctx.lineWidth = 1 + rnd() * 2;
        ctx.beginPath();
        ctx.moveTo(w / 2, h * 0.6);
        ctx.lineTo(x, 0);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
      ['#032a24', '#010f0d'].forEach((fill, l) => {
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 30) ctx.lineTo(x, h * (0.62 + l * 0.12) - rnd() * 60);
        ctx.lineTo(w, h);
        ctx.fill();
      });
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 36px ${FONTS.sci()}`;
      ['LEVEL UP', 'BUILD', 'EXPLORE'].forEach((t, i) => glowText(ctx, t, w * (0.17 + i * 0.33), h * 0.88, '#2effb0', 10));
    },
    [],
  );
  return (
    <group position={[ROOM.x0 + 0.03, 1.72, 4.75]} rotation={[0, Math.PI / 2, 0]}>
      <mesh geometry={frames.frame} material={MAT.painted} />
      <mesh position={[0, 0, 0.012]}>
        <planeGeometry args={[2.1, 0.88]} />
        <meshStandardMaterial map={print} emissiveMap={print} emissive="#ffffff" emissiveIntensity={0.55} roughness={0.85} />
      </mesh>
    </group>
  );
}

const PADS = [-0.59, -0.03, 0.53];

/** A pegboard of controllers and a headset on the right wall. */
function ControllerWall() {
  const { board, hooks } = useGeometries(() => {
    const hook = (x: number, y: number) =>
      tube(
        [
          [x, y, 0.016],
          [x, y, 0.075],
          [x, y + 0.026, 0.086],
        ],
        0.0036,
        STEEL,
        { sides: 6, segments: 8 },
      );
    const pegs = [...PADS.map((x) => hook(x - 0.05, 0.09)), hook(0.78, -0.014)];
    return { board: solid([soft(1.94, 1.04, 0.016, 0, 0, 0.008, '#182326', 0.004)]), hooks: solid(pegs) };
  });
  const holes = useCanvasTexture(
    1024,
    540,
    (ctx, w, h) => {
      ctx.fillStyle = '#26343a';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#060a0b';
      for (let x = 21; x < w; x += 42.5) {
        for (let y = 21; y < h; y += 42.5) {
          ctx.beginPath();
          ctx.arc(x, y, 7, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },
    [],
  );
  const wash = useGlowTexture();
  const headset = useGeometries(() => ({
    gear: solid([
      painted(new TorusGeometry(0.082, 0.011, 10, 34, Math.PI).translate(0.78, -0.08, 0.05), CHARCOAL),
      ...[-1, 1].map((s) => cushion(0.05, 0.1, 0.075, '#2a383c', 0.022, 0).translate(0.78 + s * 0.082, -0.13, 0.05)),
    ]),
  }));
  return (
    <group position={[ROOM.x1 - 0.03, 1.62, 4.75]} rotation={[0, -Math.PI / 2, 0]}>
      <mesh geometry={board} material={MAT.painted} />
      <mesh position={[0, 0, 0.0165]}>
        <planeGeometry args={[1.92, 1.02]} />
        <meshStandardMaterial map={holes} roughness={0.7} metalness={0.2} />
      </mesh>
      <Unmirrored>
        <mesh geometry={hooks} material={MAT.painted} />
        <mesh geometry={headset.gear} material={MAT.painted} />
      </Unmirrored>
      <mesh position={[0, 0.545, 0.03]} material={MAT.piping}>
        <boxGeometry args={[1.9, 0.008, 0.012]} />
      </mesh>
      {/* The bar's light on the board and the wall round it. */}
      <mesh position={[0, 0.1, 0.019]}>
        <planeGeometry args={[2.5, 1.5]} />
        <meshBasicMaterial map={wash} transparent opacity={0.22} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </mesh>
      {PADS.map((x) => (
        <DeskModel key={x} url="/models/room/gamepad.glb" position={[x, -0.1, 0.06]} rotation={[1.45, 0, 0]} scale={0.95} />
      ))}
    </group>
  );
}

/** LED columns on the far pilasters, each in its own pool of light on the wall,
 *  and light rising from the skirting. This is what gives the desk end its glow,
 *  and these are cards, so they cost no shader time. */
function WallLights() {
  const pool = useGlowTexture();
  const rise = useCanvasTexture(
    4,
    128,
    (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, h, 0, 0);
      g.addColorStop(0, 'rgba(46,255,176,0.27)');
      g.addColorStop(0.35, 'rgba(46,255,176,0.08)');
      g.addColorStop(1, 'rgba(46,255,176,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
    [],
  );
  const { strips, pools, wash } = useGeometries(() => {
    const COLUMNS = [1.1, 3.75];
    const CORNER: Vec3 = [ROOM.x1 - 0.05, 1.55, ROOM.z1 - 0.05];
    const side = (w: number, h: number, x: number, y: number, z: number, turn: number) => new PlaneGeometry(w, h).rotateY(turn).translate(x, y, z);
    const LEFT = Math.PI / 2;
    const RIGHT = -Math.PI / 2;
    const FRONT = Math.PI;
    const run = ROOM.z1 - 1.1;
    const mid = (ROOM.z1 + 1.1) / 2;
    return {
      strips: solid(
        [...COLUMNS.flatMap((z) => [cube(0.012, 2.84, 0.014, ROOM.x0 + 0.036, 1.55, z), cube(0.012, 2.84, 0.014, ROOM.x1 - 0.036, 1.55, z)]), cube(0.014, 2.84, 0.012, 1.0, 1.55, ROOM.z1 - 0.036), cube(0.014, 2.84, 0.014, ...CORNER)],
        { colour: false },
      ),
      pools: mergeGeometries([
        ...COLUMNS.flatMap((z) => [side(2.3, 3.1, ROOM.x0 + 0.032, 1.55, z, LEFT), side(2.3, 3.1, ROOM.x1 - 0.032, 1.55, z, RIGHT)]),
        side(2.3, 3.1, 1.0, 1.55, ROOM.z1 - 0.032, FRONT),
        side(1.8, 3.1, ROOM.x1 - 0.032, 1.55, ROOM.z1 - 0.6, RIGHT),
        side(1.8, 3.1, ROOM.x1 - 0.6, 1.55, ROOM.z1 - 0.032, FRONT),
      ]),
      wash: mergeGeometries([side(run, 0.9, ROOM.x0 + 0.033, 0.55, mid, LEFT), side(run, 0.9, ROOM.x1 - 0.033, 0.55, mid, RIGHT), side(ROOM.x1 - ROOM.x0, 0.9, 0, 0.55, ROOM.z1 - 0.033, FRONT)]),
    };
  });
  return (
    <group>
      <mesh geometry={strips} material={MAT.ledSoft} />
      <mesh geometry={pools}>
        <meshBasicMaterial map={pool} transparent opacity={0.19} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </mesh>
      <mesh geometry={wash}>
        <meshBasicMaterial map={rise} transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Building services along one long wall: conduit, brackets, vents, junction boxes.
 *  Real depth for a walking visitor to pass, all within 7 cm of the wall. */
function wallServices(wall: number, into: 1 | -1, boxes: [number, number][]) {
  const at = (d: number) => wall + into * d;
  const PIPE = '#3c484c';
  const lights: BufferGeometry[] = [];
  const box = (z: number, y: number) => {
    lights.push(...[0, 1, 2].map((i) => cube(0.004, 0.012, 0.012, at(0.066), y + 0.055, z - 0.03 + i * 0.03)));
    return [
      soft(0.06, 0.2, 0.15, at(0.033), y, z, '#1b2528', 0.006),
      cube(0.004, 0.05, 0.1, at(0.065), y - 0.03, z, '#3a464a'),
      ...[-1, 1].flatMap((s) => [-1, 1].map((t) => post(0.005, 0.005, 0.004, 0, 0, 0, STEEL, 8).rotateZ(Math.PI / 2).translate(at(0.065), y + s * 0.086, z + t * 0.062))),
      // The drop up to the conduit.
      painted(new CylinderGeometry(0.009, 0.009, 2.62 - y - 0.1, 10).translate(at(0.04), (2.62 + y + 0.1) / 2, z), PIPE),
    ];
  };
  const vent = (z: number) => [
    soft(0.014, 0.46, 0.86, at(0.012), 0.58, z, '#20292c', 0.004),
    ...Array.from({ length: 14 }, (_, i) => cube(0.02, 0.012, 0.78, at(0.024), 0.39 + i * 0.03, z, '#0a0e0f')),
  ];
  const parts = [
    ...[2.62, 2.7].map((y) => painted(new CylinderGeometry(0.017, 0.017, 4.5, 12).rotateX(Math.PI / 2).translate(at(0.052), y, 3.45), PIPE)),
    ...Array.from({ length: 8 }, (_, i) => soft(0.05, 0.17, 0.026, at(0.04), 2.66, 1.3 + i * 0.62, CHARCOAL, 0.004)),
    ...boxes.flatMap(([z, y]) => box(z, y)),
    ...vent(2.05),
    ...vent(5.25),
  ];
  return { parts, lights };
}

function WallKit() {
  const { services, lamps } = useGeometries(() => {
    const left = wallServices(ROOM.x0, 1, [
      [3.25, 2.1],
      [5.2, 2.36],
    ]);
    const right = wallServices(ROOM.x1, -1, [
      [3.1, 2.36],
      [5.2, 2.36],
    ]);
    return { services: solid([...left.parts, ...right.parts]), lamps: solid([...left.lights, ...right.lights], { colour: false }) };
  });
  return (
    <Unmirrored>
      <mesh geometry={services} material={MAT.satin} />
      <mesh geometry={lamps} material={MAT.piping} />
    </Unmirrored>
  );
}

/** A framed wall screen, facing into the room from a long wall. */
function WallScreen({ wall, z, y, size, map }: { wall: 'left' | 'right'; z: number; y: number; size: [number, number]; map: Texture }) {
  const glow = useBreathingScreen(1.02, 0.02, 0.9);
  const { frame } = useGeometries(() => ({ frame: solid([soft(size[0] + 0.05, size[1] + 0.05, 0.03, 0, 0, 0.015, INK, 0.006)]) }));
  const left = wall === 'left';
  return (
    <group position={[left ? ROOM.x0 + 0.03 : ROOM.x1 - 0.03, y, z]} rotation={[0, left ? Math.PI / 2 : -Math.PI / 2, 0]}>
      <mesh geometry={frame} material={MAT.painted} />
      <mesh position={[0, 0, 0.031]}>
        <planeGeometry args={size} />
        <meshBasicMaterial ref={glow} map={map} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Nithesh's own games, on the wall by the arcade. */
function GamesBoard() {
  const board = useCanvasTexture(
    1536,
    1024,
    (ctx) => {
      const [w, h] = [768, 512];
      ctx.scale(2, 2);
      ctx.fillStyle = '#020807';
      ctx.fillRect(0, 0, w, h);
      panelChrome(ctx, w, h, 'MY GAMES');
      myGames.forEach((g, i) => {
        const y = 92 + i * 74;
        ctx.fillStyle = i === 0 ? 'rgba(46,255,176,0.12)' : 'rgba(255,255,255,0.03)';
        ctx.beginPath();
        ctx.roundRect(32, y, w - 64, 62, 10);
        ctx.fill();
        ctx.fillStyle = `hsl(${g.hue} 80% 50%)`;
        ctx.beginPath();
        ctx.roundRect(46, y + 11, 40, 40, 8);
        ctx.fill();
        ctx.textAlign = 'left';
        ctx.fillStyle = '#eafff6';
        ctx.font = `700 30px ${FONTS.sans()}`;
        ctx.fillText(g.title, 104, y + 32);
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(207,233,220,0.6)';
        ctx.font = `500 21px ${FONTS.mono()}`;
        ctx.fillText(g.genre, w - 52, y + 32);
      });
    },
    [],
  );
  return <WallScreen wall="left" z={1.85} y={1.6} size={[1.14, 0.76]} map={board} />;
}

/** The setup behind the games, on the wall above the planter. */
function SetupBoard() {
  const board = useCanvasTexture(
    1536,
    920,
    (ctx) => {
      const [w, h] = [768, 460];
      ctx.scale(2, 2);
      ctx.fillStyle = '#020807';
      ctx.fillRect(0, 0, w, h);
      panelChrome(ctx, w, h, 'MY SETUP');
      myApps.forEach((app, i) => {
        const y = 128 + i * 82;
        ctx.fillStyle = '#2effb0';
        ctx.beginPath();
        ctx.roundRect(42, y - 11, 22, 22, 6);
        ctx.fill();
        ctx.textAlign = 'left';
        ctx.fillStyle = '#eafff6';
        ctx.font = `700 32px ${FONTS.sans()}`;
        ctx.fillText(app, 90, y);
      });
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(46,255,176,0.75)';
      ctx.font = `700 22px ${FONTS.sci()}`;
      ['GAMER', 'DEVELOPER', 'CREATOR'].forEach((t, i) => ctx.fillText(t, w - 44, 170 + i * 82));
    },
    [],
  );
  return <WallScreen wall="right" z={2.95} y={1.72} size={[1.02, 0.61]} map={board} />;
}

/** A wall trough of plants below the setup board. Same model as the shelf, so no new download. */
function Planter() {
  const { trough } = useGeometries(() => ({
    trough: solid([soft(0.2, 0.15, 1.0, ROOM.x1 - 0.12, 0.92, 2.95, '#1b2528', 0.012), cube(0.15, 0.02, 0.94, ROOM.x1 - 0.12, 0.99, 2.95, '#0b0806'), ...[-0.34, 0.34].map((d) => cube(0.1, 0.05, 0.05, ROOM.x1 - 0.05, 0.84, 2.95 + d, STEEL))]),
  }));
  return (
    <group>
      <mesh geometry={trough} material={MAT.painted} />
      {[-0.32, 0, 0.32].map((d, i) => (
        <DeskModel key={d} url="/models/room/calathea_orbifolia_01.glb" position={[ROOM.x1 - 0.13, 0.99, 2.95 + d]} rotation={[0, i * 2.1, 0]} scale={1.15} />
      ))}
    </group>
  );
}

/** Slim wall lights down both long walls, each washing the panel above it. */
function Sconces() {
  const wash = useCanvasTexture(
    128,
    256,
    (ctx, w, h) => {
      // An ellipse that dies out before every edge of the card.
      ctx.translate(w / 2, h * 0.6);
      ctx.scale(1, (h * 0.39) / (w / 2));
      const g = ctx.createRadialGradient(0, 0, 1, 0, 0, w / 2);
      g.addColorStop(0, 'rgba(255,214,160,0.34)');
      g.addColorStop(0.45, 'rgba(255,190,120,0.09)');
      g.addColorStop(1, 'rgba(255,190,120,0)');
      ctx.fillStyle = g;
      ctx.fillRect(-w, -h, w * 2, h * 2);
    },
    [],
  );
  const { shells, lens, glow } = useGeometries(() => {
    const spots: [number, number, number][] = [
      [ROOM.x0 + 0.04, 1.7, Math.PI / 2],
      [ROOM.x0 + 0.04, 3.75, Math.PI / 2],
      [ROOM.x1 - 0.04, 2.45, -Math.PI / 2],
      [ROOM.x1 - 0.04, 3.75, -Math.PI / 2],
    ];
    const at = (g: BufferGeometry, x: number, z: number, turn: number) => g.rotateY(turn).translate(x, 2.25, z);
    return {
      shells: solid(spots.map(([x, z, turn]) => at(soft(0.1, 0.18, 0.05, 0, 0, 0.03, CHARCOAL, 0.012), x, z, turn))),
      lens: solid(spots.map(([x, z, turn]) => at(cube(0.07, 0.006, 0.03, 0, 0.09, 0.03), x, z, turn)), { colour: false }),
      glow: mergeGeometries(spots.map(([x, z, turn]) => at(new PlaneGeometry(0.62, 1.1).translate(0, 0.14, 0.012), x, z, turn))),
    };
  });
  return (
    <group>
      <mesh geometry={shells} material={MAT.painted} />
      <mesh geometry={lens} material={LAMP} />
      <mesh geometry={glow}>
        <meshBasicMaterial map={wash} transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false} side={DoubleSide} />
      </mesh>
    </group>
  );
}
