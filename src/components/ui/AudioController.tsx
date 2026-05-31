'use client';

import { useEffect } from 'react';
import { initAudio, setMusicEnabled } from '@/lib/audio';
import { usePortfolioStore } from '@/lib/store';

/**
 * Bridges Zustand → Howler side-effects. Mounted once near the root.
 * - initAudio() registers Howls (no-op if files missing).
 * - audioEnabled flips drive setMusicEnabled (fades in/out the ambient bed).
 */
export function AudioController() {
  const enabled = usePortfolioStore((s) => s.audioEnabled);

  useEffect(() => {
    initAudio();
  }, []);

  useEffect(() => {
    setMusicEnabled(enabled);
  }, [enabled]);

  return null;
}
