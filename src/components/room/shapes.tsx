'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import {
  BoxGeometry,
  BufferAttribute,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  SphereGeometry,
  TubeGeometry,
  Vector3,
  type BufferGeometry,
  type Group,
  type Mesh,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Vec3 } from '@/components/room/layout';

/* Building blocks for the room's procedural models. A model is many small
 * painted parts merged into one geometry per material, so a detailed object
 * still costs only a draw call or two. */

/** Layer the floor mirror's camera doesn't render. Small dark items can't be
 *  seen in the blurred reflection, so skipping them there saves the draw. */
export const NO_MIRROR = 1;

/** Marks every mesh inside as unmirrored. Lights stay on the default layer. */
export function Unmirrored({ children }: { children: ReactNode }) {
  const ref = useRef<Group>(null);
  useLayoutEffect(() => {
    ref.current?.traverse((o) => {
      if ((o as Mesh).isMesh) o.layers.set(NO_MIRROR);
    });
  });
  return <group ref={ref}>{children}</group>;
}

/** Geometry built once on mount and disposed with the component. */
export function useGeometries<T extends Record<string, BufferGeometry>>(build: () => T) {
  const [parts] = useState(build);
  useEffect(
    () => () => {
      Object.values(parts).forEach((g) => g.dispose());
    },
    [parts],
  );
  return parts;
}

/** Bakes a flat vertex colour into a part. */
export function painted<T extends BufferGeometry>(g: T, hex: string) {
  const c = new Color(hex);
  const n = g.getAttribute('position').count;
  const rgb = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) rgb.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new BufferAttribute(rgb, 3));
  return g;
}

const STEEL = '#5a6a70';

export const cube = (w: number, h: number, d: number, x: number, y: number, z: number, hex = STEEL, tilt = 0) =>
  painted(new BoxGeometry(w, h, d).rotateZ(tilt).translate(x, y, z), hex);
export const post = (r0: number, r1: number, h: number, x: number, y: number, z: number, hex = STEEL, sides = 10) =>
  painted(new CylinderGeometry(r0, r1, h, sides).translate(x, y, z), hex);
export const ball = (r: number, x: number, y: number, z: number, hex = STEEL) => painted(new SphereGeometry(r, 10, 8).translate(x, y, z), hex);

/** A box with softened edges, for parts that get seen up close. */
export const soft = (w: number, h: number, d: number, x: number, y: number, z: number, hex = STEEL, radius = 0.004, tilt = 0) =>
  painted(new RoundedBoxGeometry(w, h, d, 1, radius).rotateZ(tilt).translate(x, y, z), hex);

/** Upholstered block: rounded all round, smooth across its seams, crowned on top. */
export function cushion(w: number, h: number, d: number, hex: string, radius = 0.05, crown = 0.02) {
  const box = new RoundedBoxGeometry(w, h, d, 4, radius);
  box.deleteAttribute('uv');
  box.deleteAttribute('normal');
  const g = mergeVertices(box, 1e-4);
  const pos = g.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const nx = (pos.getX(i) * 2) / w;
    const nz = (pos.getZ(i) * 2) / d;
    if (pos.getY(i) > 0) pos.setY(i, pos.getY(i) + crown * (1 - nx * nx) * (1 - nz * nz));
  }
  g.computeVertexNormals();
  return painted(g, hex);
}

/** A round bar through the given points. */
export function tube(points: Vec3[], radius: number, hex = STEEL, { closed = false, sides = 8, segments = 36 } = {}) {
  const curve = new CatmullRomCurve3(
    points.map((p) => new Vector3(...p)),
    closed,
  );
  return painted(new TubeGeometry(curve, segments, radius, sides, closed), hex);
}

/** Merges parts into one mesh. Extruded and indexed parts mix freely. */
export function solid(parts: BufferGeometry[], { colour = true } = {}) {
  return mergeGeometries(
    parts.map((part) => {
      const g = part.index ? part.toNonIndexed() : part;
      g.deleteAttribute('uv');
      if (!colour) g.deleteAttribute('color');
      return g;
    }),
  );
}

/** Soft cushion: a squared-off lens with a slight unevenness, smooth across its seams. */
export function pillow(w: number, h: number, d: number, hex: string, seed = 1) {
  const sphere = new SphereGeometry(1, 30, 22);
  sphere.deleteAttribute('uv');
  sphere.deleteAttribute('normal');
  const g = mergeVertices(sphere);
  const pos = g.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const bx = Math.sign(x) * Math.abs(x) ** 0.6;
    const by = Math.sign(y) * Math.abs(y) ** 0.6;
    const lump = 1 + 0.1 * Math.sin(bx * 2.6 + seed) * Math.cos(by * 2.2 + seed * 1.7);
    pos.setXYZ(i, (bx * w) / 2, (by * h) / 2, (z * d * lump) / 2);
  }
  g.computeVertexNormals();
  return painted(g, hex);
}
