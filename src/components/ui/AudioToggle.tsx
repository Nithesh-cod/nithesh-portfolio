'use client';

import { play, unlock } from '@/lib/audio';
import { usePortfolioStore } from '@/lib/store';

/**
 * Neutral chrome shell + functional emerald dot for state.
 */
export function AudioToggle() {
  const enabled = usePortfolioStore((s) => s.audioEnabled);
  const toggle = usePortfolioStore((s) => s.toggleAudio);

  return (
    <button
      type="button"
      onClick={() => {
        unlock();
        toggle();
        play(enabled ? 'click_secondary' : 'click_primary');
      }}
      aria-pressed={enabled}
      aria-label={enabled ? 'Mute audio' : 'Enable audio'}
      className="group flex items-center gap-2 rounded-full border border-emerald-mid/40 bg-graphite/70 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-bone backdrop-blur transition hover:border-emerald-mid hover:text-ivory"
    >
      <span
        aria-hidden
        className={`inline-block h-1.5 w-1.5 rounded-full ${
          enabled ? 'bg-emerald-hot shadow-[0_0_8px_#34F5A4]' : 'bg-bone/60'
        }`}
      />
      {enabled ? 'Sound on' : 'Sound off'}
    </button>
  );
}
