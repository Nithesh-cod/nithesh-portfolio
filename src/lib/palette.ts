/**
 * V7.0 — refined elegant palette. Discipline over variety: deep nights +
 * glass + a single champagne-gold accent + one signal-mint live-data tint.
 *
 * Composition target:
 *   70 %  deep nights (background + chassis)
 *   20 %  glass transmission surfaces
 *    7 %  champagne-gold (frame edges, accents)
 *    3 %  signal-mint (live screens only)
 *
 * Coral, lilac, azure, magenta — REMOVED. Restraint is the elegance.
 *
 * Legacy V2/V3/V4/V5 token names are kept as aliases mapping to the new
 * V7 values, so old components compile while we migrate to canonical names.
 */
export const palette = {
  // ── V7.0 canonical tokens ─────────────────────────────────────────

  // Backgrounds — warm-cool balanced, never pure black.
  nightBase: '#0A0E1A',
  nightMid:  '#131829',
  nightWarm: '#1A1A2A',

  // Glass tint values (used by transmission materials).
  glassIce:   '#E8F0FF',
  glassFrost: '#FFFFFF',
  glassEdge:  '#E8F0FF',

  // Premium accent — singular signature.
  champagneGold: '#C9A961',
  champagneDeep: '#8A6E3D',

  // The ONE "live data" tint.
  signalMint: '#7FE8B8',

  // Neutral text — warm + cool whites.
  ivoryWarm: '#F0EAD8',
  pearlCool: '#C8D0E0',

  // Lighting colours.
  lightWarm: '#FFD9A8',
  lightCool: '#9CB5DD',

  // ── V10.2 — Apple Vision Pro / JARVIS palette refresh ───────────
  // Cooler glass tint, cleaner text whites, gold accent for featured
  // featured certs. Tokens preserve V9 names so existing components
  // pick up the new values automatically.
  bgBase:        '#050505', // was #050810 — pure dark surface
  bgPanel:       'rgba(13, 13, 13, 0.65)',
  neonGreen:     '#00FF88', // primary green (unchanged)
  neonBright:    '#33FFAA', // glass-border tint (was #4DFFAA)
  neonDim:       '#00CC66', // secondary green (was #00AA55)
  textPrimary:   '#F5F5F5', // clean off-white (was #DDFFEE)
  textSecondary: '#B8B8B8', // neutral mid-grey (was #88CCAA)
  textMono:      '#00FF88',
  accentGold:    '#FFD700', // gold accent (used for featured cert)
  darkSurface:   '#0D0D0D',
  glassBorder:   '#33FFAA',

  // ── Legacy aliases (re-pointed) ───────────────────────────────────
  // Same hex values as V7 canonical tokens above, but available under the
  // names existing components import. Ensures the whole scene picks up
  // the new palette without per-file rewrites.
  void:       '#0A0E1A',
  graphite:   '#131829',
  steel:      '#1A1A2A',
  ivory:      '#F0EAD8',
  bone:       '#C8D0E0',

  amberKey:   '#FFD9A8',
  amberDeep:  '#8A6E3D',
  goldAccent: '#C9A961',

  tealHaze:   '#131829',
  azureRim:   '#9CB5DD',

  // Emerald aliases now point at signal-mint (the new "live data" tint).
  emeraldHot:  '#7FE8B8',
  emeraldMid:  '#7FE8B8',
  emeraldDim:  '#1A1A2A',
  emeraldGlow: '#7FE8B8',
  terminalGrn: '#7FE8B8',

  // V2.x cert-rack violet stripe — now keys to champagne-gold (we lost
  // the "1 % violet pop" rule in favour of palette discipline).
  violetSpark: '#C9A961',

  // V4.0 alias set — keep so any straggler components compile.
  nightDeep:   '#0A0E1A',
  nightBlue:   '#131829',
  nightViolet: '#1A1A2A',
  slateDeep:   '#0A0E1A',
  slateMid:    '#131829',
  slateLight:  '#1A1A2A',
  boneWarm:    '#F0EAD8',
  boneCool:    '#C8D0E0',
  accentMint:  '#7FE8B8',
  accentCoral: '#C9A961',   // collapsed onto gold per V7 restraint
  accentAzure: '#9CB5DD',
  accentLilac: '#9CB5DD',   // collapsed onto cool fill
} as const;

export type PaletteKey = keyof typeof palette;
