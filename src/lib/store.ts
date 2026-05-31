import { create } from 'zustand';
import type { Project } from '@/lib/content';

export type PerfMode = 'low' | 'medium' | 'cinematic';
export type CursorState = 'idle' | 'interactive' | 'pressed';
export type ProxyId = Project['slug'] | 'crt' | 'contact';

type PortfolioStore = {
  section: number;
  audioEnabled: boolean;
  perfMode: PerfMode;

  // Modal + focus state — drives the GSAP camera tween and pauses the scroll curve.
  modalOpen: boolean;
  activeProject: Project['slug'] | null;

  // Cursor reticle state — set by 3D-object hover/down handlers, read by Cursor.tsx.
  cursorState: CursorState;

  // Focus restoration target for accessibility — the proxy that opened the modal,
  // so we can return focus to it on close.
  lastProxyFocus: ProxyId | null;

  setSection: (n: number) => void;
  toggleAudio: () => void;
  setAudioEnabled: (b: boolean) => void;
  setPerfMode: (m: PerfMode) => void;

  openProject: (slug: Project['slug'], proxyId?: ProxyId) => void;
  closeProject: () => void;
  setCursorState: (s: CursorState) => void;

  /** Certificate lightbox — null when closed; cert id when open. */
  lightboxCertId: string | null;
  openCertificate: (id: string) => void;
  closeCertificate: () => void;

  /** Resume viewer overlay — PDF iframe + download button. */
  resumeOpen: boolean;
  openResume: () => void;
  closeResume: () => void;
};

export const usePortfolioStore = create<PortfolioStore>((set) => ({
  section: 0,
  audioEnabled: false,
  // Default 'medium' (was 'cinematic'): DoF is mounted ONLY at 'cinematic',
  // and an always-mounted DoF allocates a depth texture that conflicts with
  // EffectComposer's ping-pong on real Chrome. PerfMonitor downgrades from
  // here, never up — so without an explicit user opt-in we never hit DoF.
  perfMode: 'medium',
  modalOpen: false,
  activeProject: null,
  cursorState: 'idle',
  lastProxyFocus: null,

  setSection: (n) => set({ section: n }),
  toggleAudio: () => set((s) => ({ audioEnabled: !s.audioEnabled })),
  setAudioEnabled: (b) => set({ audioEnabled: b }),
  setPerfMode: (m) => set({ perfMode: m }),

  openProject: (slug, proxyId) =>
    set({ modalOpen: true, activeProject: slug, lastProxyFocus: proxyId ?? slug }),
  closeProject: () => set({ modalOpen: false, activeProject: null }),
  setCursorState: (s) => set({ cursorState: s }),

  lightboxCertId: null,
  openCertificate: (id) => set({ lightboxCertId: id }),
  closeCertificate: () => set({ lightboxCertId: null }),

  resumeOpen: false,
  openResume: () => set({ resumeOpen: true }),
  closeResume: () => set({ resumeOpen: false }),
}));
