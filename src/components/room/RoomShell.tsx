'use client';

import { MeshReflectorMaterial, useTexture } from '@react-three/drei';
import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { AdditiveBlending, Color, DoubleSide, InstancedMesh, Object3D, PlaneGeometry, RepeatWrapping, SRGBColorSpace, Shape, type Material, type MeshStandardMaterial, type Texture, type WebGLProgramParametersWithUniforms } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { drawNR, FONTS, glowText, seeded, useCanvasTexture } from '@/components/room/canvasTex';
import { DESK, ROOM, type Vec3 } from '@/components/room/layout';
import { MAT } from '@/components/room/materials';
import { NO_MIRROR, post, solid, useGeometries } from '@/components/room/shapes';

const W = ROOM.x1 - ROOM.x0;
const D = ROOM.z1 - ROOM.z0;
const H = ROOM.h;
const CX = (ROOM.x0 + ROOM.x1) / 2;
const CZ = (ROOM.z0 + ROOM.z1) / 2;

/** Window opening in the back wall, above the bed (x range, sill/head heights). */
export const WINDOW = { x0: 2.4, x1: 4.45, y0: 1.18, y1: 2.78 } as const;

/** Thin glowing bar between two points on an axis-aligned line. */
export function LedBar({ from, to, thick = 0.018, mat = MAT.ledGreen }: { from: Vec3; to: Vec3; thick?: number; mat?: typeof MAT.ledGreen }) {
  const size: Vec3 = [Math.abs(to[0] - from[0]) || thick, Math.abs(to[1] - from[1]) || thick, Math.abs(to[2] - from[2]) || thick];
  const pos: Vec3 = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2];
  return (
    <mesh position={pos} material={mat}>
      <boxGeometry args={size} />
    </mesh>
  );
}

export function RoomShell({ lowPerf }: { lowPerf: boolean }) {
  return (
    <group>
      <Floor lowPerf={lowPerf} />
      <Walls />
      <LedWash />
      <Suspense fallback={null}>
        <WindowView />
      </Suspense>
      <Ceiling />
      <Rug />
      {/* Floor skirting + crown LEDs around all four walls. */}
      <LedBar from={[ROOM.x0 + 0.02, 0.05, ROOM.z0 + 0.03]} to={[ROOM.x1 - 0.02, 0.05, ROOM.z0 + 0.03]} mat={MAT.ledSoft} />
      <LedBar from={[ROOM.x0 + 0.03, 0.05, ROOM.z0]} to={[ROOM.x0 + 0.03, 0.05, ROOM.z1]} mat={MAT.ledSoft} />
      <LedBar from={[ROOM.x1 - 0.03, 0.05, ROOM.z0]} to={[ROOM.x1 - 0.03, 0.05, ROOM.z1]} mat={MAT.ledSoft} />
      <LedBar from={[ROOM.x0, H - 0.08, ROOM.z0 + 0.04]} to={[ROOM.x1, H - 0.08, ROOM.z0 + 0.04]} thick={0.016} />
      <LedBar from={[ROOM.x0 + 0.04, H - 0.08, ROOM.z0]} to={[ROOM.x0 + 0.04, H - 0.08, ROOM.z1]} thick={0.012} mat={MAT.ledSoft} />
      <LedBar from={[ROOM.x1 - 0.04, H - 0.08, ROOM.z0]} to={[ROOM.x1 - 0.04, H - 0.08, ROOM.z1]} thick={0.012} mat={MAT.ledSoft} />
      <LedBar from={[ROOM.x0, H - 0.08, ROOM.z1 - 0.04]} to={[ROOM.x1, H - 0.08, ROOM.z1 - 0.04]} thick={0.012} mat={MAT.ledSoft} />
    </group>
  );
}

/* ─────────────────────────── floor ─────────────────────────── */

/* drei multiplies the mirror image into the albedo, so a dark tile can never
 * show one. Polished porcelain keeps its dark body and carries the reflection
 * on top as specular: stronger at grazing angles, cut by the grout, and
 * nudged per tile because no two tiles are laid perfectly flat. */
const TILE_TILT = /* glsl */ `
  vec4 new_vUv = my_vUv;
  vec2 tileId = floor(vMapUv);
  vec2 tileHash = fract(sin(vec2(dot(tileId, vec2(127.1, 311.7)), dot(tileId, vec2(269.5, 183.3)))) * 43758.5453);
  new_vUv.xy += (tileHash - 0.5) * 0.003 * new_vUv.w;
`;
const TILE_SPECULAR = /* glsl */ `
  vec2 tileEdge = abs(fract(vMapUv) - 0.5);
  float groutAA = fwidth(vMapUv.x) + fwidth(vMapUv.y);
  float tileBody = 1.0 - smoothstep(0.494 - groutAA, 0.494 + groutAA, max(tileEdge.x, tileEdge.y));
  float fresnel = mirror + (1.0 - mirror) * pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 5.0);
  totalEmissiveRadiance += clamp(newMerge.rgb, 0.0, 1.6) * mixStrength * fresnel * tileBody * (0.8 + 0.4 * tileHash.y);
`;

function glossTile(material: MeshStandardMaterial | null) {
  if (!material) return;
  const compile = material.onBeforeCompile.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    compile(shader, renderer);
    shader.fragmentShader = shader.fragmentShader
      .replace('vec4 new_vUv = my_vUv;', TILE_TILT)
      .replace('diffuseColor.rgb = diffuseColor.rgb * ((1.0 - min(1.0, mirror)) + newMerge.rgb * mixStrength);', TILE_SPECULAR);
  };
}

function Floor({ lowPerf }: { lowPerf: boolean }) {
  // Large dark porcelain tiles: soft mottling, a bevel, then the grout line.
  const tiles = useCanvasTexture(
    512,
    512,
    (ctx, w, h) => {
      const rnd = seeded(3);
      // Phones have no mirror to carry the floor, so their tile body stays lighter.
      ctx.fillStyle = lowPerf ? '#1b2223' : '#0f1516';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) {
        const r = 30 + rnd() * 90;
        const x = rnd() * w;
        const y = rnd() * h;
        const c = ctx.createRadialGradient(x, y, 0, x, y, r);
        c.addColorStop(0, rnd() > 0.5 ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.05)');
        c.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = c;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      ctx.strokeStyle = 'rgba(190,225,214,0.1)';
      ctx.lineWidth = 2;
      ctx.strokeRect(7, 7, w - 14, h - 14);
      ctx.strokeStyle = '#040606';
      ctx.lineWidth = 6;
      ctx.strokeRect(0, 0, w, h);
    },
    [lowPerf],
  );
  tiles.wrapS = tiles.wrapT = RepeatWrapping;
  tiles.repeat.set(W / 0.9, D / 0.9);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[CX, 0, CZ]}>
      <planeGeometry args={[W, D]} />
      {lowPerf ? (
        <PaintedGloss tiles={tiles} />
      ) : (
        <MeshReflectorMaterial
          ref={glossTile}
          map={tiles}
          resolution={768}
          blur={[420, 140]}
          mixBlur={1.75}
          mixStrength={2.4}
          mixContrast={1}
          mirror={0.12}
          depthScale={0}
          roughness={0.45}
          metalness={0}
          envMapIntensity={0.3}
        />
      )}
    </mesh>
  );
}

/** Phones skip the mirror pass, so its rough shape is painted in instead: the
 *  desk and bed strips smeared towards the viewer. Static, no extra render. */
function PaintedGloss({ tiles }: { tiles: Texture }) {
  const streaks = useCanvasTexture(
    512,
    512,
    (ctx, w, h) => {
      const rnd = seeded(8);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      const smear = (x0: number, x1: number, z: number, reach: number, strength: number) => {
        const y = ((z - ROOM.z0) / D) * h;
        for (let i = 0; i < 70; i++) {
          const x = ((x0 + rnd() * (x1 - x0) - ROOM.x0) / W) * w;
          const len = ((reach * (0.4 + rnd() * 0.6)) / D) * h;
          const g = ctx.createLinearGradient(0, y, 0, y + len);
          g.addColorStop(0, `rgba(46,255,176,${strength * (0.4 + rnd() * 0.6)})`);
          g.addColorStop(1, 'rgba(46,255,176,0)');
          ctx.fillStyle = g;
          ctx.fillRect(x, y, 2 + rnd() * 5, len);
        }
      };
      smear(DESK.x0, DESK.x1, DESK.z + DESK.depth / 2, 3, 0.5);
      smear(2.95, 4.45, ROOM.z0 + 2.15, 1.8, 0.4);
    },
    [],
  );
  return <meshStandardMaterial map={tiles} emissiveMap={streaks} emissive="#ffffff" emissiveIntensity={0.8} roughness={0.32} metalness={0.4} />;
}

/* ─────────────────────────── walls ─────────────────────────── */

function Walls() {
  return (
    <group>
      {/* back wall, built around the window opening */}
      <group position={[0, 0, ROOM.z0]}>
        <WallPiece x0={ROOM.x0} x1={WINDOW.x0} y0={0} y1={H} />
        <WallPiece x0={WINDOW.x1} x1={ROOM.x1} y0={0} y1={H} />
        <WallPiece x0={WINDOW.x0} x1={WINDOW.x1} y0={0} y1={WINDOW.y0} />
        <WallPiece x0={WINDOW.x0} x1={WINDOW.x1} y0={WINDOW.y1} y1={H} />
      </group>
      {/* left */}
      <mesh position={[ROOM.x0, H / 2, CZ]} rotation={[0, Math.PI / 2, 0]} material={MAT.wall}>
        <planeGeometry args={[D, H]} />
      </mesh>
      {/* right */}
      <mesh position={[ROOM.x1, H / 2, CZ]} rotation={[0, -Math.PI / 2, 0]} material={MAT.wall}>
        <planeGeometry args={[D, H]} />
      </mesh>
      {/* front, closing the room behind the start view */}
      <mesh position={[CX, H / 2, ROOM.z1]} rotation={[0, Math.PI, 0]} material={MAT.wall}>
        <planeGeometry args={[W, H]} />
      </mesh>

      <WallCladding />
      <Bars list={TRIM} material={MAT.trim} />
      <Bars list={CEILING_TRIM} material={MAT.matte} />
      {/* LED reveals either side of the desk bay. */}
      {[-3.05, 0.3].map((x) => (
        <LedBar key={x} from={[x, 0.7, ROOM.z0 + 0.04]} to={[x, 2.74, ROOM.z0 + 0.04]} thick={0.01} mat={MAT.ledSoft} />
      ))}
      {/* Left wall light column. */}
      <LedBar from={[ROOM.x0 + 0.02, 0.1, -1.55]} to={[ROOM.x0 + 0.02, H - 0.15, -1.55]} thick={0.014} mat={MAT.ledSoft} />
    </group>
  );
}

function WallPiece({ x0, x1, y0, y1 }: { x0: number; x1: number; y0: number; y1: number }) {
  if (x1 - x0 <= 0 || y1 - y0 <= 0) return null;
  return (
    <mesh position={[(x0 + x1) / 2, (y0 + y1) / 2, 0]} material={MAT.wall}>
      <planeGeometry args={[x1 - x0, y1 - y0]} />
    </mesh>
  );
}

/* Metal cladding over the bare wall: panels stand slightly proud with dark
 * reveals between them, each a touch lighter or darker than its neighbours.
 * One instanced mesh per material, so the reflection pass stays cheap. */

type Slab = { p: Vec3; s: Vec3; tone: number };

const SEAM = 0.016;
const SIDE_MID = (ROOM.z0 + ROOM.z1) / 2;
const SIDE_LEN = ROOM.z1 - ROOM.z0;
/** Row breaks up the wall; the rails in WallTrim sit on these. */
const RAILS = [0.98, 2.02] as const;
// Panel counts differ per row so the seams never line up.
const ROWS = [
  { v0: 0.12, v1: RAILS[0], back: 6, leftNear: 2, leftFar: 7, right: 9, front: 7 },
  { v0: RAILS[0], v1: RAILS[1], back: 8, leftNear: 1, leftFar: 8, right: 10, front: 9 },
  { v0: RAILS[1], v1: H - 0.12, back: 5, leftNear: 2, leftFar: 6, right: 8, front: 6 },
];

const SLABS: Slab[] = (() => {
  const rnd = seeded(21);
  const out: Slab[] = [];
  const row = (wall: 'back' | 'front' | 'left' | 'right', u0: number, u1: number, v0: number, v1: number, n: number) => {
    const pitch = (u1 - u0) / n;
    for (let i = 0; i < n; i++) {
      const u = u0 + pitch * (i + 0.5);
      const proud = rnd() > 0.65 ? 0.024 : 0.014;
      const farEnd = wall === 'front' || (wall !== 'back' && u > 1);
      const tone = (0.7 + rnd() * 0.6) * (farEnd ? 1.5 : 1);
      const v = (v0 + v1) / 2;
      const [len, tall] = [pitch - SEAM, v1 - v0 - SEAM];
      if (wall === 'back') out.push({ p: [u, v, ROOM.z0 + proud / 2], s: [len, tall, proud], tone });
      else if (wall === 'front') out.push({ p: [u, v, ROOM.z1 - proud / 2], s: [len, tall, proud], tone });
      else out.push({ p: [wall === 'left' ? ROOM.x0 + proud / 2 : ROOM.x1 - proud / 2, v, u], s: [proud, tall, len], tone });
    }
  };
  ROWS.forEach(({ v0, v1, back, leftNear, leftFar, right, front }) => {
    row('back', ROOM.x0, WINDOW.x0 - 0.06, v0, v1, back);
    row('front', ROOM.x0, ROOM.x1, v0, v1, front);
    row('left', ROOM.z0, -1.55, v0, v1, leftNear);
    row('left', -1.55, ROOM.z1, v0, v1, leftFar);
    row('right', ROOM.z0, ROOM.z1, v0, v1, right);
  });
  row('back', WINDOW.x1 + 0.06, ROOM.x1, 0.12, H - 0.12, 1);
  row('back', WINDOW.x0 - 0.06, WINDOW.x1 + 0.06, 0.12, WINDOW.y0 - 0.06, 3);
  row('back', WINDOW.x0 - 0.06, WINDOW.x1 + 0.06, WINDOW.y1 + 0.08, H - 0.12, 3);
  return out;
})();

const horizontal = (y: number, tall: number, proud: number): [Vec3, Vec3][] => [
  [[CX, y, ROOM.z0 + proud / 2], [W, tall, proud]],
  [[CX, y, ROOM.z1 - proud / 2], [W, tall, proud]],
  [[ROOM.x0 + proud / 2, y, SIDE_MID], [proud, tall, SIDE_LEN]],
  [[ROOM.x1 - proud / 2, y, SIDE_MID], [proud, tall, SIDE_LEN]],
];

/** [position, size] of every skirting, rail, pilaster and window-casing bar. */
const TRIM: [Vec3, Vec3][] = [
  ...horizontal(0.06, 0.12, 0.024),
  ...horizontal(H - 0.05, 0.1, 0.03),
  ...horizontal(RAILS[0], 0.03, 0.032),
  [[(ROOM.x0 + WINDOW.x0) / 2, RAILS[1], ROOM.z0 + 0.01], [WINDOW.x0 - ROOM.x0, 0.016, 0.02]],
  [[ROOM.x0 + 0.01, RAILS[1], (1.1 + ROOM.z1) / 2], [0.02, 0.016, ROOM.z1 - 1.1]],
  [[ROOM.x1 - 0.01, RAILS[1], (1.1 + ROOM.z1) / 2], [0.02, 0.016, ROOM.z1 - 1.1]],
  [[CX, RAILS[1], ROOM.z1 - 0.01], [W, 0.016, 0.02]],
  // Pilasters carry the two LED reveals behind the desk.
  ...[-3.05, 0.3].map((x): [Vec3, Vec3] => [[x, H / 2, ROOM.z0 + 0.015], [0.09, H, 0.03]]),
  ...[-1.55, 1.1, 3.75].map((z): [Vec3, Vec3] => [[ROOM.x0 + 0.015, H / 2, z], [0.03, H, 0.09]]),
  ...[-1.55, 1.1, 3.75].map((z): [Vec3, Vec3] => [[ROOM.x1 - 0.015, H / 2, z], [0.03, H, 0.09]]),
  [[1.0, H / 2, ROOM.z1 - 0.015], [0.09, H, 0.03]],
  // Deep window casing.
  ...[WINDOW.x0 - 0.045, WINDOW.x1 + 0.045].map((x): [Vec3, Vec3] => [[x, (WINDOW.y0 + WINDOW.y1) / 2, ROOM.z0 + 0.025], [0.09, WINDOW.y1 - WINDOW.y0 + 0.16, 0.05]]),
  [[(WINDOW.x0 + WINDOW.x1) / 2, WINDOW.y1 + 0.05, ROOM.z0 + 0.025], [WINDOW.x1 - WINDOW.x0 + 0.18, 0.1, 0.05]],
];

/** Ceiling: long beams, cross ribs, and the dropped frame over the lounge end. */
const CEILING_TRIM: [Vec3, Vec3][] = [
  ...[-3.1, 2.9].map((x): [Vec3, Vec3] => [[x, H - 0.02, SIDE_MID], [0.1, 0.04, SIDE_LEN]]),
  ...[2.1, 3.6, 5.1].map((z): [Vec3, Vec3] => [[CX, H - 0.016, z], [W, 0.03, 0.05]]),
  ...[-2.1, 2.3].map((x): [Vec3, Vec3] => [[x, H - 0.07, 3.85], [0.14, 0.14, 3.1]]),
  ...[2.3, 5.4].map((z): [Vec3, Vec3] => [[0.1, H - 0.07, z], [4.54, 0.14, 0.14]]),
];

/** Hex bolts at each panel's corners. Geometry, so they stay round on any panel shape. */
function buildBolts() {
  const INSET = 0.05;
  return {
    bolts: solid(
      SLABS.flatMap(({ p, s }) => {
        const depth = s[2] <= s[0] ? 2 : 0;
        const across = depth === 2 ? 0 : 2;
        const inward = -Math.sign(p[depth]);
        return [-1, 1].flatMap((a) =>
          [-1, 1].map((b) => {
            const head = post(0.009, 0.012, 0.005, 0, 0, 0, '#59666b', 6);
            if (depth === 2) head.rotateX((inward * Math.PI) / 2);
            else head.rotateZ((-inward * Math.PI) / 2);
            const at: Vec3 = [0, p[1] + b * (s[1] / 2 - INSET), 0];
            at[across] = p[across] + a * (s[across] / 2 - INSET);
            at[depth] = p[depth] + inward * (s[depth] / 2 + 0.002);
            return head.translate(...at);
          }),
        );
      }),
    ),
  };
}

function WallCladding() {
  const ref = useRef<InstancedMesh>(null);
  const { bolts } = useGeometries(buildBolts);
  // Brushed grain and a folded edge. One grey canvas feeds map and roughness.
  const metal = useCanvasTexture(
    1024,
    1024,
    (ctx, w, h) => {
      const rnd = seeded(5);
      ctx.fillStyle = '#b4b4b4';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) {
        ctx.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.016)' : 'rgba(0,0,0,0.02)';
        ctx.fillRect(rnd() * w - 40, rnd() * h, 40 + rnd() * 120, 1);
      }
      ctx.strokeStyle = '#3a3a3a';
      ctx.lineWidth = 26;
      ctx.strokeRect(0, 0, w, h);
      ctx.strokeStyle = '#f2f2f2';
      ctx.lineWidth = 4;
      ctx.strokeRect(16, 16, w - 32, h - 32);
      // An inset groove round the panel face.
      ctx.strokeStyle = '#4a4a4a';
      ctx.lineWidth = 5;
      ctx.strokeRect(70, 70, w - 140, h - 140);
      ctx.strokeStyle = '#e4e4e4';
      ctx.lineWidth = 2;
      ctx.strokeRect(75, 75, w - 150, h - 150);
    },
    [],
  );
  // Fine perforation on a 12 cm tile, mapped in world space so it never stretches
  // with a panel. It keeps walls crisp up close and averages away with distance.
  const mesh = useCanvasTexture(
    128,
    128,
    (ctx, w, h) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#000000';
      const pitch = w / 8;
      for (let row = 0; row < 8; row++) {
        for (let col = -1; col < 9; col++) {
          ctx.beginPath();
          ctx.arc((col + 0.5 + (row % 2) * 0.5) * pitch, (row + 0.5) * pitch, pitch * 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },
    [],
  );
  mesh.wrapS = mesh.wrapT = RepeatWrapping;
  const perforate = useCallback(
    (shader: WebGLProgramParametersWithUniforms) => {
      shader.uniforms.wallMesh = { value: mesh };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWallPos;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWallPos = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform sampler2D wallMesh;\nvarying vec3 vWallPos;')
        .replace(
          '#include <map_fragment>',
          `#include <map_fragment>
          vec3 wallAxis = abs(normalize(cross(dFdx(vWallPos), dFdy(vWallPos))));
          float wallHoles = texture2D(wallMesh, (wallAxis.x > wallAxis.z ? vWallPos.zy : vWallPos.xy) * 8.33).g;
          diffuseColor.rgb *= 0.5 + 0.62 * wallHoles;`,
        );
    },
    [mesh],
  );
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const o = new Object3D();
    const c = new Color();
    SLABS.forEach(({ p, s, tone }, i) => {
      o.position.set(...p);
      o.scale.set(...s);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
      mesh.setColorAt(i, c.setScalar(tone));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, []);
  return (
    <>
      <instancedMesh ref={ref} args={[undefined, undefined, SLABS.length]} frustumCulled={false}>
        <boxGeometry />
        <meshStandardMaterial map={metal} roughnessMap={metal} color="#222d2b" roughness={1} metalness={0.42} envMapIntensity={0.8} onBeforeCompile={perforate} />
      </instancedMesh>
      <mesh geometry={bolts} material={MAT.painted} layers={NO_MIRROR} frustumCulled={false} />
    </>
  );
}

function Bars({ list, material }: { list: [Vec3, Vec3][]; material: Material }) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const o = new Object3D();
    list.forEach(([p, s], i) => {
      o.position.set(...p);
      o.scale.set(...s);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [list]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, list.length]} frustumCulled={false} material={material}>
      <boxGeometry />
    </instancedMesh>
  );
}

/** The crown strips light nothing by themselves, so each gets a soft wash fading
 *  down the wall. One additive mesh, far cheaper than another point light. */
function LedWash() {
  const fade = useCanvasTexture(
    4,
    128,
    (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(46,255,176,0.17)');
      g.addColorStop(0.3, 'rgba(46,255,176,0.05)');
      g.addColorStop(1, 'rgba(46,255,176,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
    [],
  );
  const strips = useMemo(() => {
    const reach = 0.6;
    const y = H - 0.09 - reach / 2;
    return mergeGeometries([
      new PlaneGeometry(WINDOW.x0 - ROOM.x0, reach).translate((ROOM.x0 + WINDOW.x0) / 2, y, ROOM.z0 + 0.034),
      // Above the window the wash has to stop short of the glass.
      new PlaneGeometry(ROOM.x1 - WINDOW.x0, 0.2).translate((WINDOW.x0 + ROOM.x1) / 2, H - 0.19, ROOM.z0 + 0.034),
      new PlaneGeometry(SIDE_LEN, reach).rotateY(Math.PI / 2).translate(ROOM.x0 + 0.034, y, SIDE_MID),
      new PlaneGeometry(SIDE_LEN, reach).rotateY(-Math.PI / 2).translate(ROOM.x1 - 0.034, y, SIDE_MID),
      new PlaneGeometry(W, reach).rotateY(Math.PI).translate(CX, y, ROOM.z1 - 0.034),
    ]);
  }, []);
  useEffect(() => () => strips.dispose(), [strips]);
  return (
    <mesh geometry={strips}>
      <meshBasicMaterial map={fade} transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
    </mesh>
  );
}

/* ─────────────────────────── window ─────────────────────────── */

function WindowView() {
  const city = useTexture('/city-backdrop.jpg', (t) => {
    const tex = (Array.isArray(t) ? t[0] : t) as Texture | undefined;
    if (tex) tex.colorSpace = SRGBColorSpace;
  }) as Texture;
  const wx = WINDOW.x1 - WINDOW.x0;
  const wy = WINDOW.y1 - WINDOW.y0;
  const xc = (WINDOW.x0 + WINDOW.x1) / 2;
  const yc = (WINDOW.y0 + WINDOW.y1) / 2;

  return (
    <group>
      {/* City backdrop a few metres outside, for parallax. */}
      <mesh position={[xc - 0.4, 2.1, ROOM.z0 - 3.2]}>
        <planeGeometry args={[9, 4.6]} />
        <meshBasicMaterial map={city} color="#c4d6ff" toneMapped={false} fog={false} />
      </mesh>
      <NearSkyline x={xc - 0.2} />
      {/* Glass with a faint tint. */}
      <mesh position={[xc, yc, ROOM.z0 - 0.02]}>
        <planeGeometry args={[wx, wy]} />
        <meshBasicMaterial color="#5a7a90" transparent opacity={0.1} depthWrite={false} />
      </mesh>
      {/* Frame + mullions. */}
      <group position={[0, 0, ROOM.z0 + 0.01]}>
        {[WINDOW.x0, WINDOW.x1, xc].map((x) => (
          <mesh key={x} position={[x, yc, 0]} material={MAT.metal}>
            <boxGeometry args={[0.05, wy, 0.08]} />
          </mesh>
        ))}
        {[WINDOW.y0, WINDOW.y1].map((y) => (
          <mesh key={y} position={[xc, y, 0]} material={MAT.metal}>
            <boxGeometry args={[wx + 0.05, 0.06, 0.1]} />
          </mesh>
        ))}
        {/* Half-raised blinds. */}
        {Array.from({ length: 7 }, (_, i) => (
          <mesh key={i} position={[xc, WINDOW.y1 - 0.06 - i * 0.045, 0.03]} rotation={[0.4, 0, 0]} material={MAT.plastic}>
            <boxGeometry args={[wx - 0.06, 0.04, 0.005]} />
          </mesh>
        ))}
        <LedBar from={[WINDOW.x0, WINDOW.y0 - 0.045, 0.05]} to={[WINDOW.x1, WINDOW.y0 - 0.045, 0.05]} thick={0.012} mat={MAT.ledSoft} />
      </group>
    </group>
  );
}

/** Procedural towers just outside the glass: the backdrop photo goes soft up close. */
function NearSkyline({ x }: { x: number }) {
  const towers = useCanvasTexture(
    2048,
    852,
    (ctx, w, h) => {
      const rnd = seeded(52);
      ctx.clearRect(0, 0, w, h);
      // Far to near: each layer is darker, and its windows are a little larger.
      [
        { base: '#101c2c', pitch: 6, reach: 0.62, lit: 0.34 },
        { base: '#0a1421', pitch: 7, reach: 0.5, lit: 0.3 },
        { base: '#060c15', pitch: 9, reach: 0.34, lit: 0.26 },
      ].forEach(({ base, pitch, reach, lit }) => {
        for (let tx = -30; tx < w; ) {
          const bw = 60 + rnd() * 150;
          const bh = h * (0.16 + rnd() * reach);
          const y = h - bh;
          ctx.fillStyle = base;
          ctx.fillRect(tx, y, bw, bh);
          // A few floors are dark as a block, as offices are at night.
          for (let wy = y + 8; wy < h; wy += pitch + 2) {
            const floor = rnd() > 0.12 ? lit : 0.04;
            for (let wx = tx + 5; wx < tx + bw - 5; wx += pitch) {
              if (rnd() > floor) continue;
              const tone = rnd();
              ctx.fillStyle = tone > 0.8 ? 'rgba(255,196,120,0.62)' : tone > 0.62 ? 'rgba(120,235,255,0.42)' : 'rgba(170,205,235,0.24)';
              ctx.fillRect(wx, wy, pitch - 3, pitch - 2);
            }
          }
          if (rnd() > 0.7) {
            ctx.fillStyle = base;
            ctx.fillRect(tx + bw / 2 - 1, y - 40, 2, 40);
            ctx.fillStyle = '#ff4fd8';
            ctx.fillRect(tx + bw / 2 - 2, y - 43, 4, 4);
          }
          // The odd neon band round a roofline.
          if (rnd() > 0.78) {
            ctx.fillStyle = ['#ff4fd8', '#4de3ff', '#2effb0'][Math.floor(rnd() * 3)] ?? '#2effb0';
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 12;
            ctx.fillRect(tx + 4, y + 4, bw - 8, 3);
            ctx.shadowBlur = 0;
          }
          tx += bw + 4 + rnd() * 30;
        }
      });
    },
    [],
  );
  return (
    <mesh position={[x, 0.95, ROOM.z0 - 1.5]}>
      <planeGeometry args={[6.4, 2.66]} />
      <meshBasicMaterial map={towers} transparent toneMapped={false} fog={false} depthWrite={false} />
    </mesh>
  );
}

/* ─────────────────────────── ceiling ─────────────────────────── */

function octagon(r: number) {
  const s = new Shape();
  for (let i = 0; i < 8; i++) {
    const a = Math.PI / 8 + (i * Math.PI) / 4;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  s.closePath();
  return s;
}

function Ceiling() {
  const ring = useMemo(() => {
    const outer = octagon(2.3);
    outer.holes.push(octagon(1.95));
    return outer;
  }, []);
  const cove = useMemo(() => {
    const outer = octagon(1.97);
    outer.holes.push(octagon(1.93));
    return outer;
  }, []);
  const emblem = useCanvasTexture(512, 512, (ctx, w, h) => drawNR(ctx, w / 2, h / 2, 170), []);
  const cz = -1.2;

  return (
    <group>
      <mesh position={[CX, H, CZ]} rotation={[Math.PI / 2, 0, 0]} material={MAT.ceiling}>
        <planeGeometry args={[W, D]} />
      </mesh>
      <group position={[-0.2, H - 0.12, cz]} rotation={[Math.PI / 2, 0, Math.PI / 8]}>
        <mesh material={MAT.ceiling}>
          <extrudeGeometry args={[ring, { depth: 0.1, bevelEnabled: false }]} />
        </mesh>
        <mesh position={[0, 0, 0.11]} material={MAT.ledGreen}>
          <shapeGeometry args={[cove]} />
        </mesh>
      </group>
      <mesh position={[-0.2, H - 0.02, cz]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.3, 1.3]} />
        <meshBasicMaterial map={emblem} transparent toneMapped={false} side={DoubleSide} depthWrite={false} color="#9fffd9" />
      </mesh>
      {/* Recessed downlights around the tray. */}
      <LoungeCove />
      {[-3.6, 3.2].flatMap((x) =>
        [-2.4, 0.2, 2.2, 4.6].map((z) => (
          <mesh key={`${x}${z}`} position={[x, H - 0.005, z]} rotation={[Math.PI / 2, 0, 0]} material={MAT.ledWarm}>
            <circleGeometry args={[0.05, 20]} />
          </mesh>
        )),
      )}
    </group>
  );
}

/** The thin lit reveal inside the lounge's dropped ceiling frame. */
function LoungeCove() {
  const strip = useMemo(() => {
    const y = H - 0.145;
    const bar = (w: number, d: number, x: number, z: number) => new PlaneGeometry(w, d).rotateX(Math.PI / 2).translate(x, y, z);
    return mergeGeometries([bar(4.1, 0.012, 0.1, 2.42), bar(4.1, 0.012, 0.1, 5.28), bar(0.012, 2.88, -1.98, 3.85), bar(0.012, 2.88, 2.18, 3.85)]);
  }, []);
  useEffect(() => () => strip.dispose(), [strip]);
  return <mesh geometry={strip} material={MAT.ledSoft} />;
}

/* ─────────────────────────── rug ─────────────────────────── */

function Rug() {
  const tex = useCanvasTexture(
    1024,
    704,
    (ctx, w, h) => {
      ctx.fillStyle = '#07090a';
      ctx.fillRect(0, 0, w, h);
      // Shag noise.
      for (let i = 0; i < 9000; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(40,60,55,0.25)' : 'rgba(0,0,0,0.35)';
        ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
      }
      ctx.strokeStyle = 'rgba(46,255,176,0.55)';
      ctx.lineWidth = 6;
      ctx.strokeRect(36, 36, w - 72, h - 72);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(46,255,176,0.3)';
      ctx.strokeRect(58, 58, w - 116, h - 116);
      // Big outlined hex + NR in the middle.
      ctx.globalAlpha = 0.55;
      drawNR(ctx, w / 2, h / 2, 170, '#1fbf86');
      ctx.globalAlpha = 1;
      ctx.font = `700 26px ${FONTS.sci()}`;
      ctx.textAlign = 'center';
      glowText(ctx, 'LEVEL UP · BUILD · EXPLORE', w / 2, h - 96, 'rgba(46,255,176,0.6)', 6);
    },
    [],
  );
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0.04]} position={[-0.75, 0.005, -1.3]}>
      <boxGeometry args={[2.9, 2.0, 0.01]} />
      <meshStandardMaterial map={tex} roughness={1} metalness={0} />
    </mesh>
  );
}
