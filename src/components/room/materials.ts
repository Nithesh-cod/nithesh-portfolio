import { Color, MeshBasicMaterial, MeshStandardMaterial } from 'three';

/* Shared materials for the gaming room. One instance each keeps draw state
 * changes low. LED colours are pushed above 1.0 so only they cross the bloom
 * threshold; everything else stays crisp. */

export const GREEN = '#2effb0';

export const led = (hex = GREEN, power = 3.2) =>
  new MeshBasicMaterial({ color: new Color(hex).multiplyScalar(power), toneMapped: false });

export const MAT = {
  /** Soft-touch black for desk tops, cabinets, monitor bezels. */
  matte: new MeshStandardMaterial({ color: '#192022', roughness: 0.6, metalness: 0.2 }),
  /** Dark brushed gunmetal for legs, stands, PC frame. */
  metal: new MeshStandardMaterial({ color: '#3a4448', roughness: 0.34, metalness: 0.85 }),
  /** Bare wall: nearly black, it only shows in the seams between panels. */
  wall: new MeshStandardMaterial({ color: '#060b0b', roughness: 0.9, metalness: 0 }),
  wallPanel: new MeshStandardMaterial({ color: '#172726', roughness: 0.55, metalness: 0.25 }),
  /** Skirting, rails and pilasters: dark metal that catches a thin highlight. */
  trim: new MeshStandardMaterial({ color: '#1c2426', roughness: 0.36, metalness: 0.82 }),
  ceiling: new MeshStandardMaterial({ color: '#050808', roughness: 0.95, metalness: 0.0 }),
  /** Chair leather. */
  leather: new MeshStandardMaterial({ color: '#171b1d', roughness: 0.42, metalness: 0.08 }),
  /** Fabric for bed, rug base, headphone pads. */
  fabric: new MeshStandardMaterial({ color: '#172235', roughness: 0.95, metalness: 0.0 }),
  plastic: new MeshStandardMaterial({ color: '#1d2326', roughness: 0.4, metalness: 0.1 }),
  /** Merged models: colour comes from each part, see shapes.tsx. */
  painted: new MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.35 }),
  /** Merged soft furnishings. */
  cloth: new MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 }),
  /** Tempered glass. Plain alpha on purpose: three renders the whole scene an
   *  extra time for any material with transmission. */
  glass: new MeshStandardMaterial({
    color: '#9fdccb',
    roughness: 0.28,
    metalness: 0.2,
    transparent: true,
    opacity: 0.13,
    depthWrite: false,
  }),
  ledGreen: led(),
  ledSoft: led(GREEN, 1.6),
  /** Fine lit trim on furniture: below the bloom threshold, so it stays a thin line. */
  piping: led(GREEN, 0.85),
  ledCyan: led('#4de3ff', 2.4),
  ledWarm: led('#ffb35c', 2.4),
  ledMagenta: led('#ff4fd8', 2.2),
};
