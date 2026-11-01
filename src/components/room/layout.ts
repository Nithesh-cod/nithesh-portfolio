/* Gaming room layout, in metres. Origin = floor centre; back wall at -z,
 * camera looks in from +z. */

export type Vec3 = [number, number, number];

/** z1 runs past the camera so no pose ever sees outside the room. */
export const ROOM = { x0: -4.6, x1: 4.6, z0: -3.4, z1: 6.4, h: 3.1 } as const;

export const DESK = { x0: -2.95, x1: 1.55, z: -2.92, depth: 0.86, top: 0.76 } as const;
export const DESK_CX = (DESK.x0 + DESK.x1) / 2;

/** Centre monitor screen centre — the camera flies here to boot JARVIS. */
export const SCREEN: Vec3 = [-0.9, 1.27, -3.0];

export const PC: Vec3 = [1.08, DESK.top + 0.29, -2.98];

export type Pose = { pos: Vec3; look: Vec3; fov: number };

export const POSES: Record<'base' | 'baseNarrow' | 'monitor', Pose> = {
  base: { pos: [0.15, 1.7, 3.05], look: [0.0, 0.98, -2.4], fov: 53 },
  /** Portrait / phone: further back and wider so the desk still fits. */
  baseNarrow: { pos: [-0.35, 1.45, 5.4], look: [-0.45, 0.88, -2.6], fov: 62 },
  monitor: { pos: [SCREEN[0], SCREEN[1] + 0.01, SCREEN[2] + 0.92], look: SCREEN, fov: 40 },
};
