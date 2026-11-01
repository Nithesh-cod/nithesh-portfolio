'use client';

import { BoxGeometry, CylinderGeometry, LatheGeometry, PlaneGeometry, SphereGeometry, TorusGeometry, Vector2, type BufferGeometry } from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { FONTS, drawNR, useCanvasTexture } from '@/components/room/canvasTex';
import type { Vec3 } from '@/components/room/layout';
import { MAT } from '@/components/room/materials';
import { ball, cube, painted, post, soft, solid, tube, useGeometries } from '@/components/room/shapes';

/* What sits on the desk: a full-size keyboard with printed legends, mouse,
 * headset on its stand, a pair of speakers and a macro pad. These get looked at
 * from half a metre, so each has its real parts rather than a rough stand-in. */

const SHELL = '#141a1d';
const COAL = '#0c1012';
const STEEL = '#5e6d73';

/* ─────────────────────────── keyboard ─────────────────────────── */

/** Key pitch: 19 mm, as on a real board. */
const U = 0.019;

/** A string is a 1u key, a number a gap in u, a tuple a wider key. */
type Row = (string | number | [string, number])[];

const ROWS: { z: number; keys: Row }[] = [
  { z: 0, keys: ['Esc', 1, 'F1', 'F2', 'F3', 'F4', 0.5, 'F5', 'F6', 'F7', 'F8', 0.5, 'F9', 'F10', 'F11', 'F12', 0.25, 'PrS', 'ScL', 'Pse'] },
  { z: 1.5, keys: ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', ['Bksp', 2], 0.25, 'Ins', 'Hm', 'PgU', 0.25, 'Num', '/', '*', '−'] },
  { z: 2.5, keys: [['Tab', 1.5], 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', ['\\', 1.5], 0.25, 'Del', 'End', 'PgD', 0.25, '7', '8', '9', '+'] },
  { z: 3.5, keys: [['Caps', 1.75], 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", ['Enter', 2.25], 3.5, '4', '5', '6', ' '] },
  { z: 4.5, keys: [['Shift', 2.25], 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '?', ['Shift', 2.75], 1.25, '▲', 1.25, '1', '2', '3', 'Ent'] },
  { z: 5.5, keys: [['Ctrl', 1.25], ['NR', 1.25], ['Alt', 1.25], [' ', 6.25], ['Alt', 1.25], ['Fn', 1.25], ['Mnu', 1.25], ['Ctrl', 1.25], 0.25, '◄', '▼', '►', 0.25, ['0', 2], '.', ' '] },
];

const ATLAS = 10;
const LABELS = [...new Set(ROWS.flatMap((r) => r.keys.flatMap((k) => (typeof k === 'number' ? [] : [typeof k === 'string' ? k : k[0]]))))];
/** The widest use of each legend, so the atlas can pre-squeeze it for its keycap. */
const WIDTH = new Map(ROWS.flatMap((r) => r.keys.flatMap((k): [string, number][] => (Array.isArray(k) ? [[k[0], k[1]]] : []))));

function keycap(x: number, z: number, width: number, cell: number) {
  const w = width * U - 0.0024;
  const d = U - 0.0024;
  const h = 0.0088;
  const g = new BoxGeometry(w, h, d);
  const pos = g.getAttribute('position');
  const uv = g.getAttribute('uv');
  const size = 1 / ATLAS;
  const cu = (cell % ATLAS) * size;
  const cv = 1 - (Math.floor(cell / ATLAS) + 1) * size;
  for (let i = 0; i < pos.count; i++) {
    // Tapered towards the top, like a sculpted cap.
    if (pos.getY(i) > 0) pos.setXYZ(i, pos.getX(i) - Math.sign(pos.getX(i)) * 0.0017, h / 2, pos.getZ(i) - Math.sign(pos.getZ(i)) * 0.0017);
    // Only the top face (vertices 8 to 11) carries a legend; the walls use a blank cell.
    uv.setXY(i, i >= 8 && i < 12 ? cu + uv.getX(i) * size : size * 0.5, i >= 8 && i < 12 ? cv + uv.getY(i) * size : 1 - size * 0.02);
  }
  g.computeVertexNormals();
  return g.translate(x, 0, z);
}

function buildKeyboard() {
  const caps: BufferGeometry[] = [];
  const left = (-22.5 * U) / 2;
  const top = (-5.5 * U) / 2;
  ROWS.forEach(({ z, keys }) => {
    let at = 0;
    keys.forEach((k) => {
      if (typeof k === 'number') {
        at += k;
        return;
      }
      const [label, width] = typeof k === 'string' ? [k, 1] : k;
      caps.push(keycap(left + (at + width / 2) * U, top + z * U, width, LABELS.indexOf(label)));
      at += width;
    });
  });
  const body = [
    soft(0.446, 0.02, 0.142, 0, -0.008, 0, SHELL, 0.008),
    cube(0.434, 0.002, 0.13, 0, 0.0025, 0, '#1f282c'),
    ...[-1, 1].map((s) => cube(0.05, 0.012, 0.012, s * 0.17, -0.019, -0.058, COAL)),
    // Cable away behind the monitors.
    tube(
      [
        [0.02, -0.008, -0.071],
        [0.03, -0.012, -0.11],
        [0.1, -0.015, -0.17],
        [0.14, -0.015, -0.32],
      ],
      0.0028,
      COAL,
      { sides: 6, segments: 24 },
    ),
  ];
  return { caps: mergeGeometries(caps), body: solid(body), under: new PlaneGeometry(0.428, 0.122).rotateX(-Math.PI / 2) };
}

export function Keyboard({ position }: { position: Vec3 }) {
  const { caps, body, under } = useGeometries(buildKeyboard);
  const legends = useCanvasTexture(
    1024,
    1024,
    (ctx, w) => {
      const cell = w / ATLAS;
      ctx.fillStyle = '#12181a';
      ctx.fillRect(0, 0, w, w);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#d6ffee';
      LABELS.forEach((label, i) => {
        const x = (i % ATLAS) * cell + cell / 2;
        const y = Math.floor(i / ATLAS) * cell + cell / 2;
        const wide = WIDTH.get(label) ?? 1;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1 / wide, 1);
        ctx.font = `600 ${label.length > 2 ? 26 : 38}px ${FONTS.sans()}`;
        ctx.fillText(label, 0, 0);
        ctx.restore();
      });
    },
    [],
  );
  return (
    <group position={position} rotation={[0.06, 0, 0]}>
      <mesh geometry={body} material={MAT.painted} />
      <mesh geometry={under} position={[0, 0.0042, 0]} material={MAT.underglow} />
      <mesh geometry={caps} position={[0, 0.0098, 0]}>
        <meshStandardMaterial map={legends} emissiveMap={legends} emissive="#2effb0" emissiveIntensity={1.1} roughness={0.42} metalness={0.1} />
      </mesh>
    </group>
  );
}

/* ─────────────────────────── mouse ─────────────────────────── */

function buildMouse() {
  const sphere = new SphereGeometry(1, 36, 24);
  sphere.deleteAttribute('uv');
  sphere.deleteAttribute('normal');
  const shell = mergeVertices(sphere);
  const pos = shell.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const t = (z + 1) / 2; // 0 at the nose, 1 under the palm
    const half = 0.03 + 0.007 * Math.sin(Math.PI * (0.1 + 0.85 * t)) - 0.004 * Math.sin(Math.PI * t) ** 8;
    const hump = 0.036 * Math.exp(-(((t - 0.64) / 0.46) ** 2));
    pos.setXYZ(i, x * half, y > 0 ? y * hump + 0.003 : y * 0.003 + 0.003, z * 0.062);
  }
  shell.computeVertexNormals();
  const parts = [
    painted(shell, SHELL),
    cube(0.0012, 0.002, 0.05, 0, 0.0245, -0.03, COAL),
    soft(0.003, 0.006, 0.018, -0.0352, 0.02, -0.002, STEEL, 0.001),
    soft(0.003, 0.006, 0.018, -0.0352, 0.02, 0.018, STEEL, 0.001),
    // Cable out of the nose.
    tube(
      [
        [0, 0.008, -0.062],
        [0.004, 0.006, -0.1],
        [-0.02, 0.003, -0.16],
        [-0.03, 0.003, -0.3],
      ],
      0.0018,
      COAL,
      { sides: 5, segments: 20 },
    ),
  ];
  const wheel = painted(new CylinderGeometry(0.0105, 0.0105, 0.008, 18).rotateZ(Math.PI / 2).translate(0, 0.0235, -0.033), COAL);
  const glow = solid([new TorusGeometry(0.0108, 0.0012, 6, 22).rotateY(Math.PI / 2).translate(0, 0.0235, -0.033), cube(0.01, 0.0012, 0.0016, 0, 0.0378, 0.026)], { colour: false });
  return { shell: solid([...parts, wheel]), glow };
}

export function Mouse({ position }: { position: Vec3 }) {
  const { shell, glow } = useGeometries(buildMouse);
  return (
    <group position={position} rotation={[0, 0.12, 0]}>
      <mesh geometry={shell} material={MAT.painted} />
      <mesh geometry={glow} material={MAT.piping} />
    </group>
  );
}

/* ─────────────────────────── headset ─────────────────────────── */

function buildHeadset() {
  const stand = [
    post(0.072, 0.08, 0.012, 0, 0.006, 0, SHELL, 40),
    painted(new TorusGeometry(0.066, 0.0018, 6, 48).rotateX(Math.PI / 2).translate(0, 0.0126, 0), STEEL),
    post(0.007, 0.01, 0.31, 0, 0.165, 0, STEEL, 16),
    tube(
      [
        [0, 0.31, 0],
        [0, 0.325, 0],
        [0.03, 0.335, 0],
        [0.05, 0.325, 0],
      ],
      0.006,
      STEEL,
      { sides: 8, segments: 14 },
    ),
  ];
  const y = 0.34;
  const band = [
    painted(new TorusGeometry(0.09, 0.0048, 8, 44, Math.PI).translate(0, y, 0), STEEL),
    painted(new TorusGeometry(0.081, 0.009, 10, 44, Math.PI * 0.86).rotateZ(Math.PI * 0.07).scale(1, 1, 1.5).translate(0, y, 0), COAL),
  ];
  const profile = [
    [0.0001, 0],
    [0.036, 0],
    [0.044, 0.006],
    [0.046, 0.022],
    [0.04, 0.034],
    [0.0001, 0.036],
  ].map(([r = 0, h = 0]) => new Vector2(r, h));
  const cups = [-1, 1].flatMap((s) => {
    const turn = (g: BufferGeometry) => g.rotateZ((-s * Math.PI) / 2).translate(s * 0.126, y - 0.054, 0);
    return [
      painted(turn(new LatheGeometry(profile, 32)), SHELL),
      painted(new TorusGeometry(0.031, 0.0125, 10, 32).rotateY(Math.PI / 2).translate(s * 0.124, y - 0.054, 0), COAL),
      painted(new CylinderGeometry(0.02, 0.02, 0.001, 22).rotateZ(Math.PI / 2).translate(s * 0.118, y - 0.054, 0), '#20292c'),
      // Yoke, and the slider up into the band.
      tube(
        [
          [s * 0.1, y - 0.006, 0],
          [s * 0.12, y - 0.018, 0],
          [s * 0.128, y - 0.034, 0],
        ],
        0.0032,
        STEEL,
        { sides: 6, segments: 10 },
      ),
    ];
  });
  // Fold-down mic on the left cup.
  const mic = tube(
    [
      [-0.15, y - 0.062, 0.02],
      [-0.156, y - 0.09, 0.05],
      [-0.145, y - 0.104, 0.09],
    ],
    0.0022,
    COAL,
    { sides: 5, segments: 14 },
  );
  const glow = solid(
    [-1, 1].map((s) => new TorusGeometry(0.033, 0.0016, 6, 40).rotateY(Math.PI / 2).translate(s * 0.163, y - 0.054, 0)),
    { colour: false },
  );
  return { gear: solid([...stand, ...band, ...cups, mic, ball(0.0052, -0.145, y - 0.105, 0.092, COAL)]), glow };
}

export function Headset({ position }: { position: Vec3 }) {
  const { gear, glow } = useGeometries(buildHeadset);
  return (
    <group position={position} rotation={[0, 0.5, 0]}>
      <mesh geometry={gear} material={MAT.painted} />
      <mesh geometry={glow} material={MAT.piping} />
    </group>
  );
}

/* ─────────────────────────── speakers ─────────────────────────── */

function buildSpeaker() {
  const cone = [
    [0.0001, 0.012],
    [0.018, 0.008],
    [0.03, 0.002],
    [0.038, 0.0006],
    [0.0415, 0.0035],
    [0.044, 0.0012],
    [0.05, 0],
  ].map(([r = 0, h = 0]) => new Vector2(r, h));
  const front = 0.0602;
  const parts = [
    soft(0.13, 0.22, 0.12, 0, 0.11, 0, SHELL, 0.012),
    cube(0.118, 0.208, 0.002, 0, 0.11, front - 0.0006, '#1b2428'),
    // Woofer, tweeter and their trim rings.
    painted(new LatheGeometry(cone, 32).rotateX(Math.PI / 2).translate(0, 0.075, front), COAL),
    post(0.0105, 0.0105, 0.004, 0, 0, 0, STEEL, 20).rotateX(Math.PI / 2).translate(0, 0.075, front + 0.009),
    painted(new TorusGeometry(0.018, 0.0028, 8, 26).translate(0, 0.165, front), STEEL),
    painted(new SphereGeometry(0.0145, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.5, 1).rotateX(Math.PI / 2).translate(0, 0.165, front), '#20292c'),
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sy) => post(0.0024, 0.0024, 0.002, 0, 0, 0, STEEL, 8).rotateX(Math.PI / 2).translate(sx * 0.05, 0.11 + sy * 0.094, front + 0.001))),
    ...[-1, 1].map((sx) => cube(0.02, 0.006, 0.08, sx * 0.04, 0.003, 0, COAL)),
  ];
  return { box: solid(parts), ring: solid([new TorusGeometry(0.0525, 0.0016, 6, 44).translate(0, 0.075, front + 0.001)], { colour: false }) };
}

export function Speakers({ at }: { at: Vec3[] }) {
  const { box, ring } = useGeometries(buildSpeaker);
  return (
    <>
      {at.map((position) => (
        <group key={position.join()} position={position}>
          <mesh geometry={box} material={MAT.painted} />
          <mesh geometry={ring} material={MAT.piping} />
        </group>
      ))}
    </>
  );
}

/* ─────────────────────────── macro pad ─────────────────────────── */

const PAD_ICONS = ['▶', '⏸', '♪', '⌂', '✉', '◉', 'NR', '⚙', '☾', '✦', '◧', '◨', '▲', '▼', '⏻'];

export function MacroPad({ position }: { position: Vec3 }) {
  const { base } = useGeometries(() => ({ base: solid([soft(0.128, 0.01, 0.088, 0, 0.03, 0, SHELL, 0.004).rotateX(0.5).translate(0, 0.01, 0), cube(0.09, 0.05, 0.012, 0, 0.018, -0.03, COAL), soft(0.1, 0.006, 0.07, 0, 0.003, 0, COAL, 0.002)]) }));
  const keys = useCanvasTexture(
    512,
    308,
    (ctx, w, h) => {
      const size = w / 5;
      ctx.fillStyle = '#05100d';
      ctx.fillRect(0, 0, w, h);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      PAD_ICONS.forEach((icon, i) => {
        const x = (i % 5) * size;
        const y = Math.floor(i / 5) * size;
        ctx.fillStyle = i % 4 === 0 ? '#0e4a39' : '#0a2c25';
        ctx.beginPath();
        ctx.roundRect(x + 6, y + 6, size - 12, size - 12, 12);
        ctx.fill();
        ctx.fillStyle = '#bff5e0';
        ctx.font = `600 ${icon.length > 1 ? 34 : 46}px ${FONTS.sans()}`;
        ctx.fillText(icon, x + size / 2, y + size / 2 + 2);
      });
    },
    [],
  );
  return (
    <group position={position} rotation={[0, 0.16, 0]}>
      <mesh geometry={base} material={MAT.painted} />
      <mesh position={[0, 0.0465, 0.0028]} rotation={[0.5 - Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.112, 0.068]} />
        <meshBasicMaterial map={keys} toneMapped={false} />
      </mesh>
    </group>
  );
}

/* ─────────────────────────── notebook ─────────────────────────── */

export function Notebook({ position }: { position: Vec3 }) {
  const { book } = useGeometries(() => ({
    book: solid([
      soft(0.15, 0.014, 0.21, 0, 0.007, 0, '#143b33', 0.003),
      cube(0.142, 0.0108, 0.202, 0.003, 0.007, 0, '#b6c2bb'),
      cube(0.006, 0.0146, 0.211, 0.058, 0.0072, 0, COAL),
      painted(new CylinderGeometry(0.0042, 0.0042, 0.14, 10).rotateZ(Math.PI / 2).rotateY(0.5).translate(0.1, 0.0042, 0.03), STEEL),
      painted(new CylinderGeometry(0.0001, 0.0042, 0.012, 10).rotateZ(-Math.PI / 2).rotateY(0.5).translate(0.1 + 0.0675, 0.0042, 0.03 - 0.0373), COAL),
    ]),
  }));
  const emblem = useCanvasTexture(128, 128, (ctx, w, h) => drawNR(ctx, w / 2, h / 2, 48), []);
  return (
    <group position={position} rotation={[0, 0.14, 0]}>
      <mesh geometry={book} material={MAT.painted} />
      <mesh position={[-0.01, 0.0143, -0.05]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.05, 0.05]} />
        <meshBasicMaterial map={emblem} transparent toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  );
}
