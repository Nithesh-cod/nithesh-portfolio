import { Howl, Howler } from 'howler';

export type SpriteId =
  | 'click_primary'
  | 'click_secondary'
  | 'hover'
  | 'transition'
  | 'startup';

/* Sprite layout. Authoring guidance in /public/audio/README.md. */
const SPRITE_MAP: Record<SpriteId, [number, number]> = {
  click_primary: [0, 80],
  click_secondary: [100, 60],
  hover: [200, 80],
  transition: [300, 600],
  startup: [1000, 1200],
};

let uiSprite: Howl | null = null;
let ambient: Howl | null = null;
let unlocked = false;
let musicWanted = false;
let reducedMotion = false;
let initialised = false;
let warnedMissing = false;

function warnMissing(kind: 'ui' | 'ambient') {
  if (warnedMissing) return;
  warnedMissing = true;
  // eslint-disable-next-line no-console
  console.warn(
    `[audio] /public/audio/${kind}.mp3 not found — audio is disabled. ` +
      `See /public/audio/README.md for drop-in instructions.`,
  );
}

/**
 * Idempotent. Safe to call from useEffect on mount.
 * Loads the UI sprite + ambient bed; both fail silently if the files are missing.
 */
export function initAudio(): void {
  if (initialised || typeof window === 'undefined') return;
  initialised = true;

  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  reducedMotion = mq.matches;
  mq.addEventListener('change', (e) => {
    reducedMotion = e.matches;
    if (reducedMotion) {
      ambient?.fade(ambient.volume(), 0, 600);
    }
  });

  uiSprite = new Howl({
    src: ['/audio/ui.mp3'],
    sprite: SPRITE_MAP,
    volume: 0.7,
    preload: true,
    // Decoded sprites use the WebAudio path, but Howler still keeps an HTML5
    // pool — explicit pool:5 matches the library default and keeps the
    // "Audio pool exhausted" warning from firing if hover briefly overlaps.
    pool: 5,
    onloaderror: () => {
      uiSprite = null;
      warnMissing('ui');
    },
  });

  ambient = new Howl({
    src: ['/audio/ambient.mp3'],
    loop: true,
    html5: true, // stream — large file, don't decode the whole thing into memory
    volume: 0,
    preload: true,
    pool: 2,
    onloaderror: () => {
      ambient = null;
      warnMissing('ambient');
    },
  });
}

/**
 * Resume the WebAudio context — call from the first user gesture (the audio toggle
 * click). Modern browsers require a user gesture before audio can start.
 */
export function unlock(): void {
  if (unlocked) return;
  unlocked = true;
  const ctx = Howler.ctx;
  if (ctx && ctx.state === 'suspended') {
    void ctx.resume();
  }
}

/**
 * Toggle the ambient bed. Honours prefers-reduced-motion (forces off).
 * Fades 1.5s in, 0.8s out.
 */
export function setMusicEnabled(on: boolean): void {
  musicWanted = on;
  if (!ambient) return;
  const effective = on && !reducedMotion;
  if (effective) {
    if (!ambient.playing()) ambient.play();
    ambient.fade(ambient.volume(), 0.5, 1500);
  } else {
    ambient.fade(ambient.volume(), 0, 800);
  }
}

/**
 * Fire a UI sprite. No-ops cleanly if audio is locked, the file is missing,
 * or the user prefers reduced motion.
 */
export function play(id: SpriteId): void {
  if (!unlocked || reducedMotion || !uiSprite) return;
  uiSprite.play(id);
}

/** Used by tests / introspection; not part of the runtime path. */
export function audioStatus(): {
  unlocked: boolean;
  musicWanted: boolean;
  reducedMotion: boolean;
  hasSprite: boolean;
  hasAmbient: boolean;
} {
  return {
    unlocked,
    musicWanted,
    reducedMotion,
    hasSprite: uiSprite !== null,
    hasAmbient: ambient !== null,
  };
}
