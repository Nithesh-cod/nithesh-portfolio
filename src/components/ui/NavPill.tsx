'use client';

import { usePortfolioStore } from '@/lib/store';

type Group = {
  id: string;
  label: string;
  position: readonly [number, number, number];
  lookAt: readonly [number, number, number];
};

// V8.0 nav targets — aligned to the new "everything visible from entrance"
// layout.
const GROUPS: readonly Group[] = [
  { id: 'portrait',     label: 'PORTRAIT',     position: [0, 1.6, 4.5],     lookAt: [0, 1.5, -2] },
  { id: 'projects',     label: 'PROJECTS',     position: [0, 1.3, 3.0],     lookAt: [0, 0.7, -0.5] },
  { id: 'skills',       label: 'SKILLS',       position: [0, 1.6, 5.0],     lookAt: [0, 1.2, 0] },
  { id: 'certificates', label: 'CERTIFICATES', position: [3.5, 2.0, 1.5],   lookAt: [5.5, 1.5, -1.5] },
  { id: 'terminal',     label: 'TERMINAL',     position: [-2.5, 1.4, 3.5],  lookAt: [-5, 0.9, 1.5] },
  { id: 'contact',      label: 'CONTACT',      position: [2.5, 1.4, 3.5],   lookAt: [5, 0.9, 1.5] },
];

const RESET = {
  position: [0, 1.7, 7] as const,
  lookAt: [0, 1.2, 0] as const,
};

export function NavPill() {
  const focusOn = usePortfolioStore((s) => s.focusOn);

  return (
    <div className="pointer-events-auto fixed bottom-6 left-1/2 z-30 -translate-x-1/2">
      <div className="flex items-center gap-1 rounded-full border border-gold-accent/30 bg-night-base/60 px-2 py-1.5 shadow-[0_4px_30px_rgba(0,0,0,0.45)] backdrop-blur-[14px]">
        <button
          type="button"
          onClick={() => focusOn(RESET.position, RESET.lookAt)}
          className="rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-bone transition hover:bg-white/5 hover:text-ivory"
          aria-label="Reset view"
        >
          ⟳ RESET
        </button>
        <span aria-hidden className="mx-0.5 h-3 w-px bg-gold-accent/25" />
        {GROUPS.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => focusOn(g.position, g.lookAt)}
            className="group rounded-full px-2 py-1.5 transition hover:bg-white/5"
            aria-label={g.label}
            title={g.label}
          >
            <span
              aria-hidden
              className="block h-1.5 w-1.5 rounded-full bg-bone/50 transition group-hover:bg-gold-accent group-hover:shadow-[0_0_8px_#C9A961]"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
