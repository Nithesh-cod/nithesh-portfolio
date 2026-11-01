import { CatmullRomCurve3, Vector3 } from 'three';

/**
 * Proving slice: 3 stops along a camera path.
 *   t=0.0  → Arrival (avatar + title)
 *   t=0.5  → Projects district (arc centre, lower camera)
 *   t=1.0  → Certifications (behind, looking back at cert rack)
 *
 * Each stop owns a camera pose (cameraPos + lookAt) and an accent colour
 * that will later drive scene-wide lighting/palette lerps.
 */
export type Stop = {
  slug: 'arrival' | 'projects' | 'certs';
  cameraPos: readonly [number, number, number];
  lookAt: readonly [number, number, number];
  accent: string;
};

export const STOPS: readonly Stop[] = [
  { slug: 'arrival',  cameraPos: [0, 3.0, 12], lookAt: [0, 1.5,  0], accent: '#2EFFB0' },
  { slug: 'projects', cameraPos: [0, 2.2,  8], lookAt: [0, 1.0,  4.5], accent: '#FFCC66' },
  { slug: 'certs',    cameraPos: [0, 3.2,  3], lookAt: [0, 1.8, -6], accent: '#6BB8FF' },
] as const;

const camPoints = STOPS.map((s) => new Vector3(s.cameraPos[0], s.cameraPos[1], s.cameraPos[2]));
const lookPoints = STOPS.map((s) => new Vector3(s.lookAt[0], s.lookAt[1], s.lookAt[2]));

export const cameraCurve = new CatmullRomCurve3(camPoints, false, 'catmullrom', 0.3);
export const lookAtCurve = new CatmullRomCurve3(lookPoints, false, 'catmullrom', 0.3);

const _cam = new Vector3();
const _look = new Vector3();

/**
 * Pose at normalized t∈[0..1] along the curve. Returned Vector3s are
 * module-level scratch — consumers must copy/lerp them before the next call.
 */
export function getPoseAtT(t: number) {
  const u = Math.min(1, Math.max(0, t));
  cameraCurve.getPointAt(u, _cam);
  lookAtCurve.getPointAt(u, _look);
  return { camera: _cam, lookAt: _look };
}
