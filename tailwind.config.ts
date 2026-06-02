import type { Config } from 'tailwindcss';
import { palette } from './src/lib/palette';

/**
 * Tailwind colour layer is a thin pass-through over src/lib/palette.ts.
 * Both name styles exist — the new neutral-first names AND the legacy aliases —
 * so old class usage keeps working while new code can use the canonical names.
 *
 * Legacy aliases now point at NEUTRAL targets where the old name implied a
 * non-emerald colour, so existing `text-text-primary` etc. snap to ivory/bone
 * automatically without component churn.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Canonical palette names — prefer these going forward.
        void: palette.void,
        graphite: palette.graphite,
        steel: palette.steel,
        ivory: palette.ivory,
        bone: palette.bone,

        'amber-key': palette.amberKey,
        'amber-deep': palette.amberDeep,
        'gold-accent': palette.goldAccent,

        'teal-haze': palette.tealHaze,
        'azure-rim': palette.azureRim,

        'emerald-hot': palette.emeraldHot,
        'emerald-mid': palette.emeraldMid,
        'emerald-dim': palette.emeraldDim,
        'emerald-glow': palette.emeraldGlow,

        'violet-spark': palette.violetSpark,

        // Legacy aliases (re-pointed to neutral targets where appropriate).
        'bg-void': palette.void,
        'bg-deep': palette.graphite,
        'accent-emerald': palette.emeraldMid,
        'accent-neon': palette.emeraldHot,
        'accent-gold': palette.goldAccent,
        'text-primary': palette.ivory,
        'text-muted': palette.bone,
        'terminal-grn': palette.emeraldHot,

        // V8.0 NavPill utilities.
        'night-base': palette.nightBase,
        'signal-mint': palette.signalMint,
        'champagne-gold': palette.champagneGold,

        // V9.0 neon-green dashboard utilities.
        'bg-base': palette.bgBase,
        'neon-green': palette.neonGreen,
        'neon-bright': palette.neonBright,
        'neon-dim': palette.neonDim,
        'text-prim': palette.textPrimary,
        'text-sec': palette.textSecondary,
        'text-mono': palette.textMono,
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        sans: ['var(--font-sans)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
        sci: ['var(--font-display-sci)', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};

export default config;
