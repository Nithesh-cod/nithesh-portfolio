import { create } from 'zustand';
import type { AppId, OSWindowState } from '@/lib/jarvis/osStore';

/* Desktop chrome that isn't a window: the launcher, notification centre and
 * command palette, plus what those and window snapping need to remember. */

export type ShellPanel = 'launcher' | 'notifications' | 'palette';
export type Rect = Pick<OSWindowState, 'x' | 'y' | 'w' | 'h'>;

export type NoteAction = { app: AppId; payload?: Record<string, unknown> } | { project: string } | { url: string };

/** Something that really happened while this tab was open. */
export type SessionNote = { id: string; tag: 'System' | 'Arcade'; title: string; body?: string; at: number; action?: NoteAction };

const NOTES_KEY = 'jarvis-notes';

function saveNotes(read: string[], dismissed: string[]) {
  try {
    window.localStorage.setItem(NOTES_KEY, JSON.stringify({ read, dismissed }));
  } catch {
    // Private mode / blocked storage: read state lasts this visit only.
  }
}

type ShellStore = {
  panel: ShellPanel | null;
  togglePanel: (panel: ShellPanel) => void;
  closePanel: () => void;

  /** Where a dragged window would land; drawn behind it at its z-index. */
  snapPreview: (Rect & { z: number }) | null;
  setSnapPreview: (preview: (Rect & { z: number }) | null) => void;
  /** Size to return to when a snapped window is dragged away. */
  restoreRects: Partial<Record<AppId, Rect>>;
  rememberRect: (id: AppId, rect: Rect) => void;
  forgetRect: (id: AppId) => void;

  sessionNotes: SessionNote[];
  toast: SessionNote | null;
  /** Adds to the notification centre and shows a toast. */
  pushNote: (note: Omit<SessionNote, 'id' | 'at'>) => void;
  clearToast: () => void;

  read: string[];
  dismissed: string[];
  hydrateNotes: () => void;
  markRead: (ids: string[]) => void;
  dismiss: (ids: string[]) => void;
};

export const useShell = create<ShellStore>((set, get) => ({
  panel: null,
  togglePanel: (panel) => set({ panel: get().panel === panel ? null : panel }),
  closePanel: () => set({ panel: null }),

  snapPreview: null,
  setSnapPreview: (snapPreview) => set({ snapPreview }),
  restoreRects: {},
  rememberRect: (id, rect) => set({ restoreRects: { ...get().restoreRects, [id]: rect } }),
  forgetRect: (id) => {
    const { [id]: _gone, ...rest } = get().restoreRects;
    set({ restoreRects: rest });
  },

  sessionNotes: [],
  toast: null,
  pushNote: (note) => {
    const at = Date.now();
    const full: SessionNote = { ...note, id: `session-${at}-${get().sessionNotes.length}`, at };
    set({ sessionNotes: [full, ...get().sessionNotes], toast: full });
  },
  clearToast: () => set({ toast: null }),

  read: [],
  dismissed: [],
  hydrateNotes: () => {
    try {
      const raw = window.localStorage.getItem(NOTES_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { read?: string[]; dismissed?: string[] };
      set({ read: saved.read ?? [], dismissed: saved.dismissed ?? [] });
    } catch {
      // Unreadable or blocked storage: everything just counts as unread.
    }
  },
  markRead: (ids) => {
    const { read, dismissed } = get();
    const next = Array.from(new Set([...read, ...ids]));
    if (next.length === read.length) return;
    saveNotes(next, dismissed);
    set({ read: next });
  },
  dismiss: (ids) => {
    const { read, dismissed } = get();
    const next = Array.from(new Set([...dismissed, ...ids]));
    saveNotes(read, next);
    set({ dismissed: next });
  },
}));
