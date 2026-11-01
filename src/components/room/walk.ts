import { DESK, ROOM } from './layout';

/* First-person walking: the room's solid footprints, sliding collision, and the
 * shared input state. Collision is plain maths on rectangles, which is cheap
 * enough to run every frame and easy to test without a browser. */

export const EYE = 1.62;
export const RADIUS = 0.3;
export const WALK_SPEED = 2.1;
export const RUN_SPEED = 3.7;
export const WALK_FOV = 62;
/** How close to the desk (metres) "press E" becomes available. */
export const REACH = 1.15;

export type Box = { x0: number; x1: number; z0: number; z1: number };

const around = (x: number, z: number, w: number, d: number): Box => ({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });

export const DESK_BOX: Box = { x0: DESK.x0, x1: DESK.x1, z0: DESK.z - DESK.depth / 2, z1: DESK.z + DESK.depth / 2 };

/** Walkable floor: inside the walls, keeping the body clear of them. */
export const BOUNDS: Box = { x0: ROOM.x0 + RADIUS + 0.05, x1: ROOM.x1 - RADIUS - 0.05, z0: ROOM.z0 + RADIUS + 0.05, z1: ROOM.z1 - RADIUS - 0.35 };

export const OBSTACLES: readonly Box[] = [
  DESK_BOX,
  around(1.62, -1.3, 0.72, 0.72), // gaming chair
  { x0: 2.95, x1: ROOM.x1, z0: ROOM.z0, z1: ROOM.z0 + 2.15 }, // bed
  { x0: 2.28, x1: 2.95, z0: ROOM.z0, z1: ROOM.z0 + 0.51 }, // nightstand, against the bed
  { x0: ROOM.x0, x1: -3.15, z0: ROOM.z0, z1: ROOM.z0 + 0.33 }, // left shelves
  around(-3.4, -1.65, 0.8, 0.5), // hologram cabinet
  around(2.6, -0.14, 1.1, 1.05), // bean bag
  around(1.6, 0.62, 0.68, 0.68), // side table
  // Plants reach the wall so nobody is squeezed behind them.
  { x0: ROOM.x0, x1: -3.85, z0: 0.1, z1: 0.6 },
  { x0: 3.8, x1: ROOM.x1, z0: 0.3, z1: 0.8 },
  // The lounge end of the room.
  { x0: 1.45, x1: 3.75, z0: 2.975, z1: 3.925 }, // sofa
  { x0: 2.025, x1: 3.175, z0: 4.32, z1: 4.88 }, // coffee table
  { x0: 1.03, x1: 1.37, z0: 2.88, z1: 3.22 }, // floor lamp
  { x0: ROOM.x0, x1: -3.85, z0: 2.43, z1: 3.07 }, // arcade cabinet
  { x0: ROOM.x0, x1: -1.25, z0: 5.79, z1: ROOM.z1 }, // wardrobe
  { x0: 1.3, x1: ROOM.x1, z0: 5.94, z1: ROOM.z1 }, // media console, then the corner plant
  { x0: 3.9, x1: ROOM.x1, z0: 5.6, z1: ROOM.z1 },
  // The wall planter gets no box: it hangs below eye height, and one would close the path past the sofa.
];

const clampX = (x: number) => Math.min(BOUNDS.x1, Math.max(BOUNDS.x0, x));
const clampZ = (z: number) => Math.min(BOUNDS.z1, Math.max(BOUNDS.z0, z));

const blocked = (x: number, z: number) => OBSTACLES.some((b) => x > b.x0 - RADIUS && x < b.x1 + RADIUS && z > b.z0 - RADIUS && z < b.z1 + RADIUS);

/** One step. Each axis moves only if it stays clear, which is what slides you along furniture. */
export function slide(x: number, z: number, dx: number, dz: number): [number, number] {
  const nextX = clampX(x + dx);
  const nextZ = clampZ(z + dz);
  const px = blocked(nextX, z) ? x : nextX;
  return [px, blocked(px, nextZ) ? z : nextZ];
}

/** The closest place a visitor can stand, for a click that lands on furniture. */
export function nearestFree(x: number, z: number): [number, number] {
  const px = clampX(x);
  const pz = clampZ(z);
  if (!blocked(px, pz)) return [px, pz];
  for (let ring = 1; ring <= 40; ring++) {
    const r = ring * 0.08;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const cx = px + Math.cos(a) * r;
      const cz = pz + Math.sin(a) * r;
      if (cx === clampX(cx) && cz === clampZ(cz) && !blocked(cx, cz)) return [cx, cz];
    }
  }
  return [px, pz];
}

/** Distance from a point to a rectangle's edge; 0 when inside. */
export function distanceTo(b: Box, x: number, z: number): number {
  const dx = Math.max(b.x0 - x, 0, x - b.x1);
  const dz = Math.max(b.z0 - z, 0, z - b.z1);
  return Math.hypot(dx, dz);
}

/* ── input ──────────────────────────────────────────────────────────────── */

const FORWARD = new Set(['KeyW', 'ArrowUp']);
const BACK = new Set(['KeyS', 'ArrowDown']);
const LEFT = new Set(['KeyA', 'ArrowLeft']);
const RIGHT = new Set(['KeyD', 'ArrowRight']);
const RUN = new Set(['ShiftLeft', 'ShiftRight']);
const MOVE_KEYS = new Set([...FORWARD, ...BACK, ...LEFT, ...RIGHT]);

const DRAG_THRESHOLD = 6;

const held = new Set<string>();
const stick = { x: 0, y: 0 };
const look = { x: 0, y: 0 };
let boot = false;
let finger: number | null = null;
let lastX = 0;
let lastY = 0;
let travelled = 0;
let dragged = false;

const anyHeld = (keys: Set<string>) => [...keys].some((k) => held.has(k));

/** Strafe (-1 left … 1 right), forward (-1 back … 1 forward), and whether to run. */
export function readDrive(): { strafe: number; forward: number; run: boolean } {
  const strafe = (anyHeld(RIGHT) ? 1 : 0) - (anyHeld(LEFT) ? 1 : 0) + stick.x;
  const forward = (anyHeld(FORWARD) ? 1 : 0) - (anyHeld(BACK) ? 1 : 0) + stick.y;
  return { strafe: Math.max(-1, Math.min(1, strafe)), forward: Math.max(-1, Math.min(1, forward)), run: anyHeld(RUN) };
}

/** Look movement since the last call, in pixels. */
export function takeLook(): { x: number; y: number } {
  const out = { ...look };
  look.x = 0;
  look.y = 0;
  return out;
}

export function takeBootKey(): boolean {
  const pressed = boot;
  boot = false;
  return pressed;
}

export const setStick = (x: number, y: number) => {
  stick.x = x;
  stick.y = y;
};

/** True while a pointer gesture was a look-around, so its release isn't a click. */
export const wasDrag = () => dragged;

const typing = (target: EventTarget | null) => target instanceof HTMLElement && !!target.closest('input, textarea, select, [contenteditable="true"]');

/** Binds keyboard and drag-to-look. `active` says whether the room has control. */
export function bindWalkInput(canvas: HTMLElement, active: () => boolean): () => void {
  const down = (e: KeyboardEvent) => {
    if (!active() || typing(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === 'KeyE') {
      boot = true;
      return;
    }
    if (MOVE_KEYS.has(e.code) || RUN.has(e.code)) {
      held.add(e.code);
      if (MOVE_KEYS.has(e.code)) e.preventDefault();
    }
  };
  const up = (e: KeyboardEvent) => held.delete(e.code);
  const clear = () => {
    held.clear();
    finger = null;
  };
  const pointerDown = (e: PointerEvent) => {
    if (e.button !== 0 || finger !== null) return;
    finger = e.pointerId;
    lastX = e.clientX;
    lastY = e.clientY;
    travelled = 0;
    dragged = false;
    canvas.setPointerCapture?.(e.pointerId);
  };
  const pointerMove = (e: PointerEvent) => {
    if (e.pointerId !== finger || !active()) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    travelled += Math.abs(dx) + Math.abs(dy);
    if (travelled < DRAG_THRESHOLD) return;
    dragged = true;
    look.x += dx;
    look.y += dy;
  };
  const pointerUp = (e: PointerEvent) => {
    if (e.pointerId !== finger) return;
    finger = null;
    // The click for this release fires next; forget the drag only after it.
    window.setTimeout(() => {
      dragged = false;
    }, 0);
  };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', clear);
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerUp);
  return () => {
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
    window.removeEventListener('blur', clear);
    canvas.removeEventListener('pointerdown', pointerDown);
    canvas.removeEventListener('pointermove', pointerMove);
    canvas.removeEventListener('pointerup', pointerUp);
    canvas.removeEventListener('pointercancel', pointerUp);
    clear();
  };
}
