'use client';

import { usePortfolioStore } from '@/lib/store';

type Group = {
  id: string;
  label: string;
  position: readonly [number, number, number];
  lookAt: readonly [number, number, number];
};

// V10.0 — focus targets aligned to the museum-room layout.
const GROUPS: readonly Group[] = [
  { id: 'home',     label: 'HOME',     position: [0, 3.0, 11],   lookAt: [0, 1.5, 0] },
  { id: 'about',    label: 'ABOUT',    position: [0, 2.0, 4],    lookAt: [0, 1.6, 0] },
  { id: 'projects', label: 'PROJECTS', position: [0, 1.5, 7],    lookAt: [0, 1.0, 3.5] },
  { id: 'skills',   label: 'SKILLS',   position: [-3, 2.5, 0],   lookAt: [-7.8, 2.5, 0] },
  { id: 'certs',    label: 'CERTS',    position: [0, 2.5, -3],   lookAt: [0, 2.5, -7.7] },
  { id: 'contact',  label: 'CONTACT',  position: [-4, 1.5, 3],   lookAt: [-7.8, 1.2, 4] },
];

const RESET = { position: [0, 3.0, 11] as const, lookAt: [0, 1.5, 0] as const };

export function NavPill() {
  const focusOn = usePortfolioStore((s) => s.focusOn);
  return (
    <div className="pointer-events-auto fixed bottom-[88px] left-1/2 z-30 -translate-x-1/2">
      <div className="flex items-center gap-1 rounded-full border border-neon-green/30 bg-bg-base/65 px-2 py-1.5 shadow-[0_4px_30px_rgba(0,0,0,0.45)] backdrop-blur-[14px]">
        <button
          type="button"
          onClick={() => focusOn(RESET.position, RESET.lookAt)}
          className="rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-text-sec transition hover:bg-white/5 hover:text-neon-bright"
          aria-label="Reset view"
        >
          ⟳ RESET
        </button>
        <span aria-hidden className="mx-0.5 h-3 w-px bg-neon-green/25" />
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
              className="block h-1.5 w-1.5 rounded-full bg-text-sec/50 transition group-hover:bg-neon-bright group-hover:shadow-[0_0_8px_#00FF88]"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
