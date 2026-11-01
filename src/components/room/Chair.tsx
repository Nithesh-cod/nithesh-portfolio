'use client';

import { BoxGeometry, CylinderGeometry, ExtrudeGeometry, Matrix4, Path, RepeatWrapping, Shape, SphereGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { drawNR, useCanvasTexture } from '@/components/room/canvasTex';
import type { Vec3 } from '@/components/room/layout';
import { MAT } from '@/components/room/materials';
import { ball, cube, cushion, painted, pillow, post, solid, tube, useGeometries } from '@/components/room/shapes';

/* Racing bucket chair. Local space: seat faces -z (towards the desk), backrest
 * at +z. The whole shell is one merged mesh, so the extra padding costs less
 * than the handful of boxes it replaced. */

const HIDE = '#2a3236';
const SHADOW = '#14191b';
const STEEL = '#59666b';
const TYRE = '#0b0e0f';

const BACK_TILT = 0.15;
const BACK_ROOT: Vec3 = [0, 0.52, 0.255];

/** Control points up the right edge of the backrest, from hip to crown. */
const BACK_EDGE: [number, number, number, number, number, number][] = [
  [0.1, 0, 0.19, 0, 0.215, 0.05],
  [0.235, 0.1, 0.245, 0.15, 0.24, 0.2],
  [0.235, 0.27, 0.2, 0.34, 0.205, 0.42],
  [0.21, 0.5, 0.255, 0.58, 0.255, 0.66],
  [0.255, 0.72, 0.2, 0.74, 0.16, 0.77],
  [0.135, 0.8, 0.15, 0.88, 0.12, 0.91],
  [0.09, 0.935, 0.04, 0.935, 0, 0.935],
];

/** Backrest outline, scaled about its middle by k. */
function backOutline(k = 1) {
  const p = (x: number, y: number): [number, number] => [x * k, 0.46 + (y - 0.46) * k];
  const s = new Shape();
  s.moveTo(...p(0, 0));
  BACK_EDGE.forEach(([a, b, c, d, e, f]) => s.bezierCurveTo(...p(a, b), ...p(c, d), ...p(e, f)));
  [...BACK_EDGE].reverse().forEach(([a, b, c, d], i, all) => {
    const next = all[i + 1];
    s.bezierCurveTo(...p(-c, d), ...p(-a, b), ...p(next ? -next[4] : 0, next ? next[5] : 0));
  });
  return s;
}

/** One tapered leg of the five-star base, dropping towards the caster. */
function starLeg(a: number) {
  const g = new BoxGeometry(0.064, 0.036, 0.33, 1, 1, 6).translate(0, 0, 0.175);
  const pos = g.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const t = pos.getZ(i) / 0.34;
    pos.setX(i, pos.getX(i) * (1 - 0.5 * t));
    pos.setY(i, pos.getY(i) * (1 - 0.3 * t) + 0.128 - 0.056 * t * t);
  }
  g.computeVertexNormals();
  return painted(g.rotateY(a), STEEL);
}

function caster(a: number) {
  const swivel = a * 2.3;
  const place = (g: BoxGeometry | CylinderGeometry | SphereGeometry) => g.rotateY(swivel).translate(Math.sin(a) * 0.335, 0, Math.cos(a) * 0.335);
  return [
    ...[-1, 1].map((s) => painted(place(new CylinderGeometry(0.031, 0.031, 0.018, 20).rotateZ(Math.PI / 2).translate(s * 0.014, 0.031, 0)), TYRE)),
    painted(place(new SphereGeometry(0.032, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.05, 0.9, 1.25).translate(0, 0.036, 0)), SHADOW),
    painted(place(new CylinderGeometry(0.009, 0.009, 0.05, 8).translate(0, 0.08, 0)), STEEL),
  ];
}

function buildChair() {
  const back = new Matrix4().makeRotationX(BACK_TILT).setPosition(...BACK_ROOT);
  const onBack = <T extends Parameters<typeof painted>[0]>(g: T) => g.applyMatrix4(back);

  // Backrest: bevelled shell with shoulder wings, harness slots and a separate rear panel.
  const outline = backOutline();
  [-0.075, 0.075].forEach((x) => {
    const slot = new Path();
    slot.absellipse(x, 0.72, 0.036, 0.021, 0, Math.PI * 2, false, 0);
    outline.holes.push(slot);
  });
  const shell = new ExtrudeGeometry(outline, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.026, bevelSize: 0.024, bevelSegments: 4, curveSegments: 14 }).translate(0, 0, -0.035);

  const wings = [-1, 1].flatMap((s) => {
    const edge: Vec3[] = [
      [s * 0.2, 0.03, -0.06],
      [s * 0.232, 0.2, -0.085],
      [s * 0.2, 0.42, -0.07],
      [s * 0.245, 0.64, -0.095],
      [s * 0.185, 0.76, -0.066],
    ];
    const first = edge[0] ?? [0, 0, 0];
    const last = edge[edge.length - 1] ?? [0, 0, 0];
    return [tube(edge, 0.046, HIDE, { sides: 12, segments: 44 }), ball(0.046, ...first, HIDE), ball(0.046, ...last, HIDE)];
  });

  // Neck pillow and lumbar cushion, strapped on the sitting side.
  const neckPad = pillow(0.27, 0.15, 0.1, '#20282b', 1.4).translate(0, 0.83, -0.095);
  const lumbar = pillow(0.31, 0.21, 0.12, '#20282b', 2.3).translate(0, 0.21, -0.1);
  const padding = [painted(shell, HIDE), ...wings, neckPad, lumbar].map(onBack);

  // Bucket seat: rounded pan, raised thigh bolsters and a soft front lip.
  const pan = new Shape();
  pan.moveTo(-0.2, -0.235);
  pan.quadraticCurveTo(0, -0.255, 0.2, -0.235);
  pan.quadraticCurveTo(0.235, -0.23, 0.245, -0.19);
  pan.lineTo(0.262, 0.21);
  pan.quadraticCurveTo(0.262, 0.26, 0.21, 0.27);
  pan.quadraticCurveTo(0, 0.295, -0.21, 0.27);
  pan.quadraticCurveTo(-0.262, 0.26, -0.262, 0.21);
  pan.lineTo(-0.245, -0.19);
  pan.quadraticCurveTo(-0.235, -0.23, -0.2, -0.235);
  const seat = new ExtrudeGeometry(pan, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.028, bevelSegments: 4, curveSegments: 10 }).rotateX(-Math.PI / 2).translate(0, 0.45, 0);
  const bolsters = [-1, 1].map((s) =>
    tube(
      [
        [s * 0.246, 0.545, 0.23],
        [s * 0.262, 0.572, 0.02],
        [s * 0.252, 0.6, -0.17],
        [s * 0.2, 0.58, -0.275],
      ],
      0.05,
      HIDE,
      { sides: 12, segments: 30 },
    ),
  );

  // Armrests: bracket, sleeve, post and a bevelled pad.
  const arms = [-1, 1].flatMap((s) => {
    const padShape = new Shape();
    padShape.absellipse(0, 0, 0.05, 0.145, 0, Math.PI * 2, false, 0);
    const pad = new ExtrudeGeometry(padShape, { depth: 0.016, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.008, bevelSegments: 2, curveSegments: 16 }).rotateX(-Math.PI / 2).translate(s * 0.335, 0.74, -0.02);
    return [
      painted(pad, SHADOW),
      cube(0.044, 0.1, 0.066, s * 0.335, 0.555, 0.04, SHADOW),
      cube(0.03, 0.19, 0.046, s * 0.335, 0.64, 0.04, STEEL),
      cube(0.1, 0.022, 0.056, s * 0.295, 0.495, 0.04, SHADOW),
      cube(0.016, 0.03, 0.02, s * 0.335, 0.61, 0.077, STEEL),
    ];
  });

  // Tilt mechanism, gas lift and base.
  const base = [
    cube(0.22, 0.042, 0.25, 0, 0.42, 0.01, SHADOW),
    tube([[0.11, 0.415, -0.05], [0.2, 0.41, -0.06], [0.29, 0.385, -0.05]], 0.0065, STEEL, { segments: 12 }),
    post(0.024, 0.024, 0.13, 0, 0.345, 0, STEEL, 16),
    post(0.034, 0.04, 0.17, 0, 0.21, 0, SHADOW, 16),
    post(0.046, 0.05, 0.012, 0, 0.3, 0, SHADOW, 16),
    post(0.058, 0.08, 0.052, 0, 0.13, 0, STEEL, 20),
    ...[0, 1, 2, 3, 4].flatMap((i) => {
      const a = (i * Math.PI * 2) / 5 + 0.3;
      return [starLeg(a), ...caster(a)];
    }),
  ];

  // Stitched channels across the seat, in place of a flat insert.
  const seatInsert = Array.from({ length: 6 }, (_, i) => cushion(0.32, 0.03, 0.068, i % 2 ? '#20282b' : '#1a2124', 0.012, 0.004).translate(0, 0.548, -0.17 + i * 0.07));

  const parts = [...padding, painted(seat, HIDE), ...bolsters, ...seatInsert, ...arms, ...base];

  // Rear panel, set into the shell, and the lit piping that follows its curve.
  const panelShape = (k: number, z: number) => onBack(new ExtrudeGeometry(backOutline(k), { depth: 0.006, bevelEnabled: false, curveSegments: 12 }).translate(0, 0, z));
  const panel = mergeGeometries([panelShape(0.76, 0.061), panelShape(0.62, -0.067)]);
  const rim = backOutline(0.86)
    .getPoints(8)
    .map((p): Vec3 => [p.x, p.y, 0.064]);
  const thigh = [-1, 1].map((s) =>
    tube(
      [
        [s * 0.3, 0.545, 0.18],
        [s * 0.313, 0.57, 0.02],
        [s * 0.3, 0.598, -0.17],
        [s * 0.245, 0.58, -0.27],
      ],
      0.004,
      HIDE,
      { sides: 5, segments: 24 },
    ),
  );
  const piping = solid([onBack(tube(rim.slice(0, -1), 0.0042, HIDE, { closed: true, sides: 5, segments: 160 })), ...thigh], { colour: false });

  return { shell: solid(parts), panel, piping };
}

export function Chair({ position, rotationY }: { position: Vec3; rotationY: number }) {
  const { shell, panel, piping } = useGeometries(buildChair);
  const crest = useCanvasTexture(256, 256, (ctx, w, h) => drawNR(ctx, w / 2, h / 2, 96), []);
  // Perforated diamond stitching, tiled across the rear panel.
  const quilt = useCanvasTexture(
    64,
    64,
    (ctx, w, h) => {
      ctx.fillStyle = '#242c2f';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#46604f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w, h / 2);
      ctx.lineTo(w / 2, h);
      ctx.lineTo(0, h / 2);
      ctx.closePath();
      ctx.stroke();
    },
    [],
  );
  quilt.wrapS = quilt.wrapT = RepeatWrapping;
  quilt.repeat.set(10, 10);

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh geometry={shell} material={MAT.painted} />
      <mesh geometry={panel}>
        <meshStandardMaterial map={quilt} roughness={0.5} metalness={0.15} />
      </mesh>
      <mesh geometry={piping} material={MAT.piping} />
      <group position={BACK_ROOT} rotation={[BACK_TILT, 0, 0]}>
        <mesh position={[0, 0.6, 0.0685]}>
          <planeGeometry args={[0.2, 0.2]} />
          <meshBasicMaterial map={crest} transparent toneMapped={false} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}
