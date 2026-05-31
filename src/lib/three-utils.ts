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
