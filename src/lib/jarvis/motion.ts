/* JARVIS OS motion identity — one "Premium" personality everywhere.
 * Signature curve for ~80% of motion, decelerate for entrances, accelerate
 * for exits; three durations; staggers kept under 500 ms in total. */

export const EASE = [0.4, 0, 0.2, 1] as const;
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_IN = [0.4, 0, 1, 1] as const;

export const DUR = { quick: 0.18, standard: 0.4, slow: 0.7 } as const;

export const STAGGER = 0.06;
