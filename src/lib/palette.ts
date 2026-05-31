/**
 * Single source of truth for the portfolio's colour palette.
 *
 * Composition target:
 *   70%  neutrals  (void / graphite / steel / ivory / bone)
 *   15%  warm      (amber-key / amber-deep / gold-accent)
 *   10%  cool      (teal-haze / azure-rim)
 *    5%  emerald   (accent only — screens, rims, hover state, dimmed grid)
 *    1%  violet    (single pop somewhere in the scene)
 *
 * NEVER apply emerald to chassis, skin, suit, floor base, or skybox.
 */
export const palette = {
  // Neutrals — dominant
  void: '#07090C',
  graphite: '#14181D',
  steel: '#2A3038',
  ivory: '#E8E6E1',
  bone: '#B8B5AE',

  // Warm — break the cool dominance
  amberKey: '#E8A14A',
  amberDeep: '#6B3E1F',
  goldAccent: '#C9A961',

  // Cool — atmosphere
  tealHaze: '#2C5566',
  azureRim: '#4A7C90',

  // Emerald — accent only
  emeraldHot: '#34F5A4',
  emeraldMid: '#10B981',
  emeraldDim: '#1A4D3A',

  // Spot violet — one tiny pop
  violetSpark: '#9D7FE8',
} as const;

export type PaletteKey = keyof typeof palette;
