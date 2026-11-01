'use client';

import { BoxGeometry, BufferAttribute, CylinderGeometry, LatheGeometry, SphereGeometry, TorusGeometry, Vector2, type BufferGeometry } from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { drawNR, FONTS, glowText, useCanvasTexture } from '@/components/room/canvasTex';
import type { Vec3 } from '@/components/room/layout';
import { MAT } from '@/components/room/materials';
import { NO_MIRROR, painted, pillow, post, solid, tube, Unmirrored, useGeometries } from '@/components/room/shapes';

/* What sits between the camera and the desk: a bean bag at the foot of the bed
 * and a round glass side table with a mug and a stack of books. */

export function Foreground() {
  return (
    <group>
      <BeanBag position={[2.6, 0, -0.14]} />
      <SideTable position={[1.6, 0, 0.62]} />
    </group>
  );
}

/* ─────────────────────────── bean bag ─────────────────────────── */

const BAG = { r: 0.6, h: 0.68 } as const;
const PANELS = 6;

/** A point on the bag's surface: a slumped teardrop, hollowed where someone sits. */
function bagPoint(x: number, y: number, z: number): { p: Vec3; crease: number } {
  const a = Math.atan2(z, x);
  const seam = Math.abs(Math.cos((a * PANELS) / 2)) ** 26;
  const slump = 1 + 0.06 * Math.sin(3 * a + 0.7) + 0.03 * Math.sin(7 * a + 2.1);
  // Wide and heavy low down, narrowing to the gathered top.
  const lift = (y + 1) / 2;
  const spread = (y < 0 ? 1 + 0.1 * (1 - y * y) : 1 - 0.24 * y * y) * slump * (1 - 0.03 * seam);
  const px = x * BAG.r * spread;
  const pz = z * BAG.r * spread;
  const hollow = 0.2 * Math.exp(-((px - 0.08) ** 2 + (pz + 0.1) ** 2) / 0.09);
  const gather = lift * lift;
  const wrinkle = (0.016 * Math.sin(a * 13 + y * 5) + 0.009 * Math.sin(a * 23 - y * 7)) * (0.35 + gather) + 0.012 * Math.sin(a * 5 + y * 9 + 1.2) * (1 - gather);
  const py = Math.max(0.004, (y < 0 ? 0.13 * (1 + y) : 0.13 + (BAG.h - 0.13) * y ** 1.25) - hollow * Math.max(0, y) + wrinkle);
  const pinch = Math.max(0, Math.sin(a * 13 + y * 5)) * 0.3 * (0.35 + gather);
  return { p: [px, py, pz], crease: Math.max(seam, pinch, 0.55 * Math.exp(-((1 - lift) * 7))) };
}

/** The cushion sits in the hollow, leaning back with its crest towards the room. */
const CUSHION = { at: [-0.06, 0.59, 0.1] as Vec3, tilt: -0.46, turn: -0.42 };

function buildBag() {
  const sphere = new SphereGeometry(1, 96, 64);
  sphere.deleteAttribute('uv');
  sphere.deleteAttribute('normal');
  const g = mergeVertices(sphere);
  const pos = g.getAttribute('position');
  const rgb = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const { p, crease } = bagPoint(pos.getX(i), pos.getY(i), pos.getZ(i));
    pos.setXYZ(i, ...p);
    // Fabric darkens in the seams and where it meets the floor.
    const shade = (1 - 0.5 * crease) * (0.5 + 0.5 * Math.min(1, p[1] / 0.2));
    rgb.set([0.085 * shade, 0.125 * shade, 0.21 * shade], i * 3);
  }
  g.setAttribute('color', new BufferAttribute(rgb, 3));
  g.computeVertexNormals();

  // Lit piping down two of the panel seams.
  const seam = (a: number) =>
    tube(
      Array.from({ length: 12 }, (_, i): Vec3 => {
        const y = -0.2 + i * 0.1;
        const r = Math.sqrt(1 - y * y);
        const { p } = bagPoint(r * Math.cos(a), y, r * Math.sin(a));
        return [p[0], p[1] + 0.004, p[2]];
      }),
      0.0034,
      '#000',
      { sides: 5, segments: 60 },
    );
  const seamAt = (k: number) => ((2 * k + 1) * Math.PI) / PANELS;

  return {
    bag: g,
    piping: solid([seam(seamAt(1)), seam(seamAt(2))], { colour: false }),
    cushion: pillow(0.4, 0.4, 0.17, '#40557a', 2.2).rotateX(CUSHION.tilt).rotateY(CUSHION.turn).translate(...CUSHION.at),
  };
}

function BeanBag({ position }: { position: Vec3 }) {
  const { bag, piping, cushion } = useGeometries(buildBag);
  const crest = useCanvasTexture(256, 256, (ctx, w, h) => drawNR(ctx, w / 2, h / 2, 96), []);
  return (
    <group position={position}>
      <mesh geometry={bag} material={MAT.cloth} />
      <mesh geometry={piping} material={MAT.piping} layers={NO_MIRROR} />
      <mesh geometry={cushion} material={MAT.cloth} />
      <group position={CUSHION.at} rotation={[CUSHION.tilt, CUSHION.turn, 0, 'YXZ']}>
        <mesh position={[0, 0, 0.092]} layers={NO_MIRROR}>
          <planeGeometry args={[0.2, 0.2]} />
          <meshBasicMaterial map={crest} transparent toneMapped={false} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

/* ─────────────────────────── side table ─────────────────────────── */

const TABLE = { r: 0.3, h: 0.5 } as const;
const STEM = '#39464b';

/** Turned profile from the floor plate up the stem to the top. */
const PEDESTAL: [number, number][] = [
  [0.0001, 0],
  [0.2, 0],
  [0.205, 0.012],
  [0.19, 0.02],
  [0.05, 0.05],
  [0.026, 0.11],
  [0.022, 0.3],
  [0.03, 0.44],
  [0.1, TABLE.h - 0.016],
  [0.0001, TABLE.h - 0.012],
];

const BOOKS = [
  { w: 0.25, d: 0.18, h: 0.034, turn: 0, cover: '#1d6a54' },
  { w: 0.24, d: 0.175, h: 0.03, turn: 0.02, cover: '#2c3e58' },
  { w: 0.23, d: 0.17, h: 0.026, turn: -0.02, cover: '#17584a' },
] as const;

function buildTable() {
  const bookParts: BufferGeometry[] = [];
  let y = 0;
  BOOKS.forEach(({ w, d, h, turn, cover }) => {
    const mid = y + h / 2;
    bookParts.push(
      painted(new BoxGeometry(w, 0.004, d).translate(0, h / 2 - 0.002, 0).rotateY(turn).translate(0, mid, 0), cover),
      painted(new BoxGeometry(w, 0.004, d).translate(0, -h / 2 + 0.002, 0).rotateY(turn).translate(0, mid, 0), cover),
      painted(new BoxGeometry(w, h, 0.005).translate(0, 0, d / 2 - 0.0025).rotateY(turn).translate(0, mid, 0), cover),
      painted(new BoxGeometry(w - 0.012, h - 0.008, d - 0.012).rotateY(turn).translate(0, mid, -0.002), '#a8b4ae'),
    );
    y += h;
  });

  return {
    top: new CylinderGeometry(TABLE.r, TABLE.r, 0.012, 72),
    frame: solid([painted(new LatheGeometry(PEDESTAL.map(([r, h]) => new Vector2(r, h)), 48), STEM), painted(new TorusGeometry(TABLE.r, 0.008, 10, 96).rotateX(Math.PI / 2).translate(0, TABLE.h, 0), STEM)]),
    glow: solid([new TorusGeometry(TABLE.r - 0.018, 0.0036, 8, 96).rotateX(Math.PI / 2).translate(0, TABLE.h - 0.012, 0), new TorusGeometry(0.2, 0.0034, 8, 64).rotateX(Math.PI / 2).translate(0, 0.016, 0)], { colour: false }),
    books: solid(bookParts),
  };
}

/** A real wall and a coffee surface, because a walking visitor looks down into it. */
function buildMug() {
  const wall = [
    [0.0001, 0],
    [0.036, 0],
    [0.041, 0.005],
    [0.043, 0.094],
    [0.0412, 0.1],
    [0.0385, 0.097],
    [0.037, 0.082],
    [0.0001, 0.082],
  ].map(([r = 0, h = 0]) => new Vector2(r, h));
  return {
    mug: solid([
      painted(new LatheGeometry(wall, 40), '#141a1c'),
      painted(new TorusGeometry(0.024, 0.0062, 10, 22, Math.PI).rotateZ(-Math.PI / 2).translate(0.042, 0.05, 0), '#141a1c'),
      post(0.0355, 0.0355, 0.001, 0, 0.0825, 0, '#1a0d06', 28),
    ]),
  };
}

export function Mug({ position, turn = 0 }: { position: Vec3; turn?: number }) {
  const { mug } = useGeometries(buildMug);
  const logo = useCanvasTexture(256, 256, (ctx, w, h) => drawNR(ctx, w / 2, h / 2, 96), []);
  return (
    <group position={position} rotation={[0, turn, 0]}>
      <mesh geometry={mug} material={MAT.painted} />
      {/* The crest wraps the side of the mug. */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.0436, 0.0436, 0.06, 18, 1, true, -0.7, 1.4]} />
        <meshBasicMaterial map={logo} transparent toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

function SideTable({ position }: { position: Vec3 }) {
  const { top, frame, glow, books } = useGeometries(buildTable);
  const titles = useCanvasTexture(
    512,
    180,
    (ctx, w) => {
      ctx.clearRect(0, 0, w, 180);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.font = `700 30px ${FONTS.sci()}`;
      // Top of the stack first, matching the books' heights.
      [
        ['LIFE', 34],
        ['GAMING', 90],
        ['TECH & AI', 150],
      ].forEach(([t, y]) => glowText(ctx, String(t), 44, Number(y), '#bff5e0', 3));
    },
    [],
  );
  const stack = BOOKS.reduce((sum, b) => sum + b.h, 0);
  return (
    <group position={position}>
      <mesh geometry={frame} material={MAT.metal} />
      <mesh geometry={glow} material={MAT.piping} layers={NO_MIRROR} />
      <Unmirrored>
        <mesh geometry={top} position={[0, TABLE.h, 0]} material={MAT.glass} />
        <group position={[-0.07, TABLE.h + 0.006, 0.02]} rotation={[0, -0.5, 0]}>
          <mesh geometry={books} material={MAT.painted} />
          <mesh position={[0, stack / 2, 0.0945]}>
            <planeGeometry args={[0.235, stack]} />
            <meshBasicMaterial map={titles} transparent toneMapped={false} depthWrite={false} />
          </mesh>
        </group>
        <Mug position={[0.13, TABLE.h + 0.006, -0.1]} turn={-0.35} />
      </Unmirrored>
    </group>
  );
}
