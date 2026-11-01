'use client';

import { RoundedBox } from '@react-three/drei';
import { BufferAttribute, PlaneGeometry, RepeatWrapping } from 'three';
import { FONTS, glowText, seeded, useCanvasTexture } from '@/components/room/canvasTex';
import { ROOM, type Vec3 } from '@/components/room/layout';
import { MAT } from '@/components/room/materials';
import { LedBar } from '@/components/room/RoomShell';
import { cube, NO_MIRROR, pillow, solid, tube, Unmirrored, useGeometries } from '@/components/room/shapes';
import { useClock } from '@/lib/jarvis/device';

/* Bed against the back wall under the window: channel-tufted headboard, quilted
 * mattress, a duvet with real folds that hangs over the edges, and plump
 * pillows. The nightstand clock shows real Coimbatore time. */

const BED = { x0: 2.95, x1: 4.45, z0: ROOM.z0 + 0.05, z1: ROOM.z0 + 2.15 } as const;
const BX = (BED.x0 + BED.x1) / 2;
const BZ = (BED.z0 + BED.z1) / 2;
const BW = BED.x1 - BED.x0;
const BL = BED.z1 - BED.z0;

const MATTRESS_TOP = 0.47;
/** Where the duvet starts, just below the pillows. */
const DUVET_HEAD = BED.z0 + 0.6;
const HANG = 0.09;
const COVER_LEN = BED.z1 - DUVET_HEAD;

const TRIM = '#5b6e86';

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/** Cloth running over an edge: flat to `edge`, round a quarter circle, then straight down. */
function over(s: number, edge: number, r: number): [number, number] {
  if (s <= edge) return [s, 0];
  const t = s - edge;
  const arc = (Math.PI * r) / 2;
  if (t < arc) return [edge + r * Math.sin(t / r), r * (1 - Math.cos(t / r))];
  return [edge + r, r + t - arc];
}

type Crease = { x: number; z: number; dx: number; dz: number; len: number; bend: number; amp: number; width: number };

/** Long creases dragged across the cover, as if someone just got up. */
const CREASES: Crease[] = (() => {
  const rnd = seeded(31);
  return Array.from({ length: 16 }, (_, i) => {
    const a = (i % 2 ? 0.45 : -0.6) + (rnd() - 0.5) * 0.9;
    return {
      x: (rnd() - 0.5) * BW,
      z: rnd() * COVER_LEN,
      dx: Math.cos(a),
      dz: Math.sin(a),
      len: 0.5 + rnd() * 0.9,
      bend: (rnd() - 0.5) * 0.24,
      amp: (rnd() > 0.28 ? 1 : -0.7) * (0.022 + rnd() * 0.03),
      width: 0.03 + rnd() * 0.05,
    };
  });
})();

function foldHeight(x: number, z: number) {
  let h = 0.016 * Math.sin(x * 4.2 + 1.3) * Math.sin(z * 3.1 + 0.4) + 0.008 * Math.sin(x * 9 + z * 7);
  for (const c of CREASES) {
    const along = (x - c.x) * c.dx + (z - c.z) * c.dz;
    if (along < 0 || along > c.len) continue;
    const t = along / c.len;
    const across = (x - c.x) * -c.dz + (z - c.z) * c.dx - c.bend * t * t;
    h += c.amp * Math.sin(Math.PI * t) ** 0.7 * Math.exp(-((across / c.width) ** 2));
  }
  return h;
}

/** Grid draped over the mattress, with its creases shaded into the vertex colours. */
function cloth(nx: number, nz: number, zStart: number, length: number, surface: (x: number, z: number, u: number, v: number) => number, tint: [number, number, number], minShade: number) {
  const g = new PlaneGeometry(1, 1, nx, nz);
  const pos = g.getAttribute('position');
  const uv = g.getAttribute('uv');
  const rgb = new Float32Array(pos.count * 3);
  const spanX = BW + 0.1 + HANG * 2;
  for (let i = 0; i < pos.count; i++) {
    const u = uv.getX(i);
    const v = uv.getY(i);
    const sx = (u - 0.5) * spanX;
    const sz = (1 - v) * length;
    const [ox, dropX] = over(Math.abs(sx), BW / 2 - 0.03, 0.08);
    const [oz, dropZ] = zStart === DUVET_HEAD ? over(sz, COVER_LEN - 0.03, 0.08) : [sz, 0];
    const hung = clamp01((dropX + dropZ) / 0.09);
    const lift = surface(sx, sz, u, v);
    // Hanging cloth falls in soft pleats rather than a flat curtain.
    const pleat = hung * 0.014;
    const x = BX + Math.sign(sx) * (ox + pleat * (1 + Math.sin(v * 44 + u * 3)));
    const z = zStart + oz + pleat * Math.sin(u * 38) * (dropZ > 0 ? 1 : 0);
    pos.setXYZ(i, x, MATTRESS_TOP + lift * (1 - 0.75 * hung) - dropX - dropZ, z);
    const shade = (minShade + (1 - minShade) * clamp01((lift + 0.012) / 0.05)) * (1 - 0.2 * hung);
    rgb.set([tint[0] * shade, tint[1] * shade, tint[2] * shade], i * 3);
  }
  g.setAttribute('color', new BufferAttribute(rgb, 3));
  g.computeVertexNormals();
  return g;
}

function buildBed() {
  const duvet = cloth(76, 88, DUVET_HEAD, COVER_LEN + HANG, (x, z) => 0.05 + foldHeight(x, z) * (0.55 + 0.45 * clamp01(z / 0.5)), [1, 1, 1], 0.36);
  // The cover turned back at the top: a soft roll over the duvet, showing its lining.
  const cuff = cloth(44, 12, DUVET_HEAD - 0.07, 0.36, (x, z) => 0.058 + 0.045 * Math.sin(Math.PI * clamp01(z / 0.36)) ** 0.6 + 0.006 * Math.sin(x * 11 + z * 6), [0.075, 0.1, 0.16], 0.6);

  // Channel-tufted headboard panels.
  const channels = Array.from({ length: 11 }, (_, i) => {
    const pitch = (BW + 0.1) / 11;
    const x = BED.x0 - 0.05 + pitch * (i + 0.5);
    // Flattened in depth, so neighbouring channels read as stitched-down pads.
    return tube(
      [
        [x, 0.18, 0],
        [x, 0.62, 0.012],
        [x, 1.02, 0],
      ],
      pitch * 0.5,
      '#141e2b',
      { sides: 10, segments: 6 },
    )
      .scale(1, 1, 0.42)
      .translate(0, 0, BED.z0 + 0.08);
  });

  const pillows = [
    pillow(0.68, 0.46, 0.2, '#30486b', 1.2).rotateX(-0.42).translate(BX - 0.37, 0.67, BED.z0 + 0.27),
    pillow(0.68, 0.46, 0.2, '#37527a', 2.6).rotateX(-0.36).rotateY(0.05).translate(BX + 0.37, 0.67, BED.z0 + 0.27),
    pillow(0.6, 0.4, 0.2, '#263a57', 3.1).rotateX(-0.62).rotateY(-0.08).translate(BX - 0.2, 0.635, BED.z0 + 0.5),
    pillow(0.5, 0.36, 0.2, '#1a2329', 0.7).rotateX(-0.6).rotateY(0.1).translate(BX + 0.14, 0.64, BED.z0 + 0.52),
  ];

  // Piping along the mattress border, kept to its flat band.
  const edgePiping = [0.415, 0.325].flatMap((y) => [
    cube(0.007, 0.007, BL - 0.2, BED.x0 + 0.021, y, BZ + 0.01, TRIM),
    cube(0.007, 0.007, BL - 0.2, BED.x1 - 0.021, y, BZ + 0.01, TRIM),
    cube(BW - 0.14, 0.007, 0.007, BX, y, BED.z1 - 0.029, TRIM),
  ]);

  return {
    duvet,
    upholstery: solid([...channels, cube(BW + 0.1, 0.92, 0.05, BX, 0.6, BED.z0 + 0.03, '#0d141c'), ...pillows, cuff, ...edgePiping]),
  };
}

export function Bedroom() {
  const { duvet, upholstery } = useGeometries(buildBed);

  const cover = useCanvasTexture(
    512,
    512,
    (ctx, w, h) => {
      const rnd = seeded(12);
      ctx.fillStyle = '#26395a';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(46,255,176,0.2)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 26; i++) {
        const x = rnd() * w;
        const y = rnd() * h;
        const run = 30 + rnd() * 70;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + run, y);
        ctx.lineTo(x + run + 14, y + 14);
        ctx.lineTo(x + run + 14, y + 40);
        ctx.stroke();
      }
    },
    [],
  );
  cover.wrapS = cover.wrapT = RepeatWrapping;
  cover.repeat.set(2.4, 2.6);

  // Tick stitching down the mattress border.
  const ticking = useCanvasTexture(
    256,
    64,
    (ctx, w, h) => {
      ctx.fillStyle = '#1e2b3e';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(170,195,215,0.3)';
      ctx.lineWidth = 2;
      for (let x = 0; x < w; x += 12) {
        ctx.beginPath();
        ctx.moveTo(x, 14);
        ctx.lineTo(x + 6, h - 14);
        ctx.stroke();
      }
    },
    [],
  );
  ticking.wrapS = RepeatWrapping;
  ticking.repeat.set(6, 1);

  const pillowText = useCanvasTexture(
    512,
    320,
    (ctx, w) => {
      ctx.clearRect(0, 0, w, 320);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 64px ${FONTS.sci()}`;
      ['GOOD', 'VIBES', 'ONLY'].forEach((t, i) => glowText(ctx, t, w / 2, 76 + i * 84, '#2effb0', 12));
    },
    [],
  );

  return (
    <group>
      {/* Frame with underglow. */}
      <RoundedBox args={[BW, 0.26, BL]} radius={0.03} position={[BX, 0.15, BZ]} material={MAT.matte} />
      <LedBar from={[BED.x0 - 0.005, 0.03, BED.z0 + 0.1]} to={[BED.x0 - 0.005, 0.03, BED.z1 - 0.02]} />
      <LedBar from={[BED.x0, 0.03, BED.z1 + 0.005]} to={[BED.x1 - 0.1, 0.03, BED.z1 + 0.005]} />
      <LedBar from={[BED.x0 - 0.05, 1.08, BED.z0 + 0.1]} to={[BED.x1 + 0.05, 1.08, BED.z0 + 0.1]} mat={MAT.ledSoft} />
      <RoundedBox args={[BW - 0.04, 0.2, BL - 0.08]} radius={0.05} smoothness={3} position={[BX, 0.37, BZ + 0.01]}>
        <meshStandardMaterial map={ticking} roughness={0.9} />
      </RoundedBox>
      <mesh geometry={upholstery} material={MAT.cloth} />
      <mesh geometry={duvet}>
        <meshStandardMaterial map={cover} vertexColors roughness={0.88} />
      </mesh>
      {/* The accent pillow's lettering, lying on its front face. */}
      <group position={[BX + 0.14, 0.64, BED.z0 + 0.52]} rotation={[-0.6, 0.1, 0]}>
        <mesh position={[0, 0, 0.108]} layers={NO_MIRROR}>
          <planeGeometry args={[0.34, 0.21]} />
          <meshBasicMaterial map={pillowText} transparent toneMapped={false} depthWrite={false} />
        </mesh>
      </group>
      <Nightstand />
    </group>
  );
}

function Nightstand() {
  const now = useClock('Asia/Kolkata');
  const hhmm = now?.time.slice(0, 5) ?? '--:--';
  const face = useCanvasTexture(
    256,
    128,
    (ctx, w, h) => {
      ctx.fillStyle = '#020807';
      ctx.fillRect(0, 0, w, h);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 70px ${FONTS.sci()}`;
      glowText(ctx, hhmm, w / 2, h / 2 + 4, '#2effb0', 14);
    },
    [hhmm],
  );
  const x = BED.x0 - 0.42;
  const z = ROOM.z0 + 0.3;
  const clockAt: Vec3 = [0.06, 0.55, 0.06];
  return (
    <group position={[x, 0, z]}>
      <RoundedBox args={[0.5, 0.5, 0.42]} radius={0.02} position={[0, 0.25, 0]} material={MAT.matte} />
      <LedBar from={[-0.24, 0.49, 0.212]} to={[0.24, 0.49, 0.212]} thick={0.008} />
      <Unmirrored>
        <group position={clockAt} rotation={[0, -0.4, 0]}>
          <RoundedBox args={[0.16, 0.08, 0.06]} radius={0.012} material={MAT.plastic} />
          <mesh position={[0, 0, 0.031]}>
            <planeGeometry args={[0.13, 0.065]} />
            <meshBasicMaterial map={face} toneMapped={false} />
          </mesh>
        </group>
      </Unmirrored>
    </group>
  );
}
