'use client';

import { Disc3, Pause, Play, Volume2 } from 'lucide-react';
import { unlock } from '@/lib/audio';
import { useOS } from '@/lib/jarvis/osStore';
import { usePortfolioStore } from '@/lib/store';

const BARS = 18;

/** Plays the site's own ambient track. The bars are decorative, not a live analyser. */
export function MusicApp() {
  const playing = usePortfolioStore((s) => s.audioEnabled);
  const setPlaying = usePortfolioStore((s) => s.setAudioEnabled);
  const volume = useOS((s) => s.settings.musicVolume);
  const update = useOS((s) => s.updateSettings);

  return (
    <div className={`app-music${playing ? ' is-playing' : ''}`}>
      <div className="app-music-disc" aria-hidden>
        <Disc3 size={92} strokeWidth={1.1} />
      </div>
      <div className="app-music-meta">
        <span>Now playing</span>
        <strong>Room Ambience</strong>
        <em>JARVIS OS · ambient loop</em>
      </div>
      <div className="app-music-bars" aria-hidden>
        {Array.from({ length: BARS }, (_, i) => (
          <i key={i} style={{ animationDelay: `${(i * 97) % 700}ms` }} />
        ))}
      </div>
      <div className="app-music-ctrl">
        <button
          type="button"
          className="app-music-play"
          aria-label={playing ? 'Pause' : 'Play'}
          onClick={() => {
            unlock();
            setPlaying(!playing);
          }}
        >
          {playing ? <Pause size={22} /> : <Play size={22} />}
        </button>
        <label className="app-music-vol">
          <Volume2 size={15} aria-hidden />
          <input
            className="app-range"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            aria-label="Volume"
            onChange={(e) => update({ musicVolume: Number(e.target.value) })}
          />
        </label>
      </div>
    </div>
  );
}
