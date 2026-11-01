'use client';

/* Browser speech for JARVIS AI: Web Speech recognition in, speechSynthesis out,
 * plus a shared signal the orb reads every frame (no React re-renders). */

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

/** Read by the orb each frame. `level` is 0–1. */
export const orbSignal: { state: OrbState; level: number } = { state: 'idle', level: 0 };

type RecognitionResultEvent = { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> };
type RecognitionErrorEvent = { error: string };
export type Recognizer = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: RecognitionResultEvent) => void) | null;
  onerror: ((e: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
};

export function createRecognizer(lang = 'en-IN'): Recognizer | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognizer; webkitSpeechRecognition?: new () => Recognizer };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const r = new Ctor();
  r.lang = lang;
  r.interimResults = true;
  r.continuous = false;
  return r;
}

export const canListen = () =>
  typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

/** Live microphone loudness into orbSignal while listening. Returns a stop function. */
export async function trackMicLevel(): Promise<() => void> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    let raf = 0;
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const v of data) sum += ((v - 128) / 128) ** 2;
      orbSignal.level = Math.min(1, Math.sqrt(sum / data.length) * 4);
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(raf);
      stream.getTracks().forEach((t) => t.stop());
      void ctx.close();
      orbSignal.level = 0;
    };
  } catch {
    return () => undefined;
  }
}

const TAMIL_SCRIPT = /[\u0B80-\u0BFF]/;

let chosen: SpeechSynthesisVoice | null | undefined;
function pickVoice(): SpeechSynthesisVoice | null {
  if (chosen !== undefined && chosen !== null) return chosen;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const prefs = [/UK English Male/i, /Ryan/i, /Daniel/i, /George/i, /Thomas/i, /en-GB/i, /en-IN/i, /^en/i];
  for (const p of prefs) {
    const v = voices.find((x) => p.test(x.name) || p.test(x.lang));
    if (v) return (chosen = v);
  }
  return (chosen = voices[0] ?? null);
}

/** Speak text in a calm British-ish voice; word boundaries pulse the orb. */
export function speak(text: string, onEnd?: () => void): void {
  if (!canSpeak()) return onEnd?.();
  const synth = window.speechSynthesis;
  synth.cancel();
  const tamil = TAMIL_SCRIPT.test(text);
  const voice = tamil ? (synth.getVoices().find((v) => v.lang.toLowerCase().startsWith('ta')) ?? null) : pickVoice();
  // No Tamil voice on this device: an English voice would only garble it.
  if (tamil && !voice) return onEnd?.();
  const u = new SpeechSynthesisUtterance(text.replace(/[*_#`>]/g, '').slice(0, 1200));
  if (voice) u.voice = voice;
  u.rate = 1.04;
  u.pitch = 0.92;
  u.onstart = () => (orbSignal.state = 'speaking');
  u.onboundary = () => (orbSignal.level = 0.9);
  const done = () => {
    orbSignal.state = 'idle';
    orbSignal.level = 0;
    onEnd?.();
  };
  u.onend = done;
  u.onerror = done;
  synth.speak(u);
}

export function stopSpeaking(): void {
  if (canSpeak()) window.speechSynthesis.cancel();
  if (orbSignal.state === 'speaking') orbSignal.state = 'idle';
  orbSignal.level = 0;
}
