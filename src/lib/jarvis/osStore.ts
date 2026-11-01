import { create } from 'zustand';

export type AppId =
  | 'thispc'
  | 'museum'
  | 'resume'
  | 'jarvis'
  | 'arcade'
  | 'more'
  | 'terminal'
  | 'mail'
  | 'certificates'
  | 'settings'
  | 'music'
  | 'about'
  | 'teach';

export type OSWindowState = {
  id: AppId;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  minimized: boolean;
  maximized: boolean;
  /** Free-form launch data, e.g. a prefilled JARVIS question. */
  payload?: Record<string, unknown>;
};

export type OSSettings = {
  sound: boolean;
  musicVolume: number;
  reduceMotion: boolean;
  voiceReplies: boolean;
  /** 'performance' drops the museum's mirror floor, bloom and holograms. */
  graphics: 'quality' | 'performance';
};

const SETTINGS_KEY = 'jarvis-settings';
const DEFAULT_SETTINGS: OSSettings = { sound: true, musicVolume: 0.5, reduceMotion: false, voiceReplies: true, graphics: 'quality' };

function loadSettings(): OSSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<OSSettings>) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(s: OSSettings) {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // Private mode / blocked storage: settings just don't persist.
  }
}

type OSStore = {
  windows: OSWindowState[];
  zTop: number;
  booted: boolean;
  /** Bumped by Settings → "Replay boot"; JarvisOS re-runs the boot sequence. */
  bootNonce: number;
  settings: OSSettings;
  settingsLoaded: boolean;

  open: (id: AppId, size: [number, number], payload?: Record<string, unknown>) => void;
  close: (id: AppId) => void;
  focus: (id: AppId) => void;
  minimize: (id: AppId) => void;
  toggleMaximize: (id: AppId) => void;
  setRect: (id: AppId, rect: Partial<Pick<OSWindowState, 'x' | 'y' | 'w' | 'h'>>) => void;
  closeAll: () => void;
  /** Mark a launch payload as handled so a remount doesn't replay it. */
  clearPayload: (id: AppId) => void;
  setBooted: (b: boolean) => void;
  replayBoot: () => void;
  hydrateSettings: () => void;
  updateSettings: (patch: Partial<OSSettings>) => void;
};

export const useOS = create<OSStore>((set, get) => ({
  windows: [],
  zTop: 10,
  booted: false,
  bootNonce: 0,
  settings: DEFAULT_SETTINGS,
  settingsLoaded: false,

  open: (id, [w, h], payload) => {
    const { windows, zTop } = get();
    const existing = windows.find((win) => win.id === id);
    const z = zTop + 1;
    if (existing) {
      set({
        zTop: z,
        windows: windows.map((win) =>
          win.id === id ? { ...win, z, minimized: false, payload: payload ?? win.payload } : win,
        ),
      });
      return;
    }
    // Cascade new windows from the centre of the viewport.
    const vw = typeof window === 'undefined' ? 1440 : window.innerWidth;
    const vh = typeof window === 'undefined' ? 900 : window.innerHeight;
    const width = Math.min(w, vw - 32);
    const height = Math.min(h, vh - 140);
    const step = (windows.length % 5) * 28;
    set({
      zTop: z,
      windows: [
        ...windows,
        {
          id,
          w: width,
          h: height,
          x: Math.max(16, (vw - width) / 2 + step),
          y: Math.max(72, (vh - height) / 2 - 20 + step),
          z,
          minimized: false,
          maximized: vw < 768,
          payload,
        },
      ],
    });
  },
  close: (id) => set({ windows: get().windows.filter((win) => win.id !== id) }),
  focus: (id) => {
    const z = get().zTop + 1;
    set({ zTop: z, windows: get().windows.map((win) => (win.id === id ? { ...win, z, minimized: false } : win)) });
  },
  minimize: (id) => set({ windows: get().windows.map((win) => (win.id === id ? { ...win, minimized: true } : win)) }),
  toggleMaximize: (id) =>
    set({ windows: get().windows.map((win) => (win.id === id ? { ...win, maximized: !win.maximized } : win)) }),
  setRect: (id, rect) => set({ windows: get().windows.map((win) => (win.id === id ? { ...win, ...rect } : win)) }),
  closeAll: () => set({ windows: [] }),
  clearPayload: (id) => set({ windows: get().windows.map((win) => (win.id === id ? { ...win, payload: undefined } : win)) }),
  setBooted: (b) => set({ booted: b }),
  replayBoot: () => set({ windows: [], bootNonce: get().bootNonce + 1 }),
  hydrateSettings: () => {
    if (get().settingsLoaded) return;
    set({ settings: loadSettings(), settingsLoaded: true });
  },
  updateSettings: (patch) => {
    const next = { ...get().settings, ...patch };
    saveSettings(next);
    set({ settings: next });
  },
}));
