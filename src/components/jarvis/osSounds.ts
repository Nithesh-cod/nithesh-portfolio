import { Howler } from 'howler';
import { audioStatus } from '@/lib/audio';
import { useOS } from '@/lib/jarvis/osStore';

/* Short synth tones for window events. ui.mp3 has no open or close sprite, and
 * these go through Howler's master gain, so they follow the same volume, mute
 * and unlock rules as every other UI sound. */

export type OSSound = 'open' | 'close' | 'minimise' | 'restore' | 'snap';

/** Each tone: [start Hz, end Hz, delay s, length s]. */
const TONES: Record<OSSound, [number, number, number, number][]> = {
  open: [
    [420, 620, 0, 0.09],
    [620, 880, 0.06, 0.11],
  ],
  close: [
    [620, 420, 0, 0.08],
    [420, 300, 0.05, 0.1],
  ],
  minimise: [[560, 240, 0, 0.14]],
  restore: [[240, 560, 0, 0.14]],
  snap: [[880, 880, 0, 0.05]],
};

const PEAK_GAIN = 0.07;

export function osSound(id: OSSound) {
  const { unlocked, reducedMotion } = audioStatus();
  const ctx = Howler.ctx;
  if (!unlocked || reducedMotion || !ctx || !useOS.getState().settings.sound) return;
  const now = ctx.currentTime;
  for (const [from, to, delay, length] of TONES[id]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = now + delay;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(to, start + length);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(PEAK_GAIN, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    osc.connect(gain).connect(Howler.masterGain ?? ctx.destination);
    osc.start(start);
    osc.stop(start + length + 0.02);
  }
}
