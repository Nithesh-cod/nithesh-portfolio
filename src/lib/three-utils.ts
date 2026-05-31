import type { Object3D } from 'three';

/**
 * No-op raycast. Pass as `raycast={noRaycast}` on any drei <Text> (or any other
 * mesh) that you want to be visually present but never absorb pointer events.
 *
 * Why this exists: TypeScript strict rejects `raycast={null}` because the prop
 * type is `RaycastFunction | undefined`. A function that does nothing is the
 * equivalent — the raycaster runs but never appends an intersection, so React
 * Three Fiber never delivers a click/hover to this object.
 */
export function noRaycast(): void {}

/**
 * Ref callback that sets `obj.raycast = noRaycast` directly on the underlying
 * three.js instance. Use this for components where the `raycast={…}` prop
 * doesn't reliably propagate (drei <Text> wraps troika-three-text and can in
 * some versions override its own raycast after R3F sets the prop):
 *
 *   <Text ref={disableRaycast} … />
 *
 * Belt-and-suspenders with the `raycast={noRaycast}` prop; one of the two
 * will land regardless of drei version.
 */
export const disableRaycast = (obj: Object3D | null): void => {
  if (obj) obj.raycast = noRaycast;
};
