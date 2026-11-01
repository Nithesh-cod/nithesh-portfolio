import { create } from 'zustand';
import { usePortfolioStore } from '@/lib/store';

/* Room ↔ JARVIS hand-off. "Boot" asks the camera to fly into the centre
 * monitor; the rig switches the world to JARVIS when it arrives. If the 3D
 * room isn't running (still loading, WebGL off), boot happens immediately. */

type RoomStore = {
  ready: boolean;
  booting: boolean;
  hover: boolean;
  /** Camera has finished moving; with JARVIS open the room can stop rendering. */
  settled: boolean;
  setSettled: (b: boolean) => void;
  setReady: (b: boolean) => void;
  setHover: (b: boolean) => void;
  requestBoot: () => void;
  finishBoot: () => void;
};

export const useRoom = create<RoomStore>((set, get) => ({
  ready: false,
  booting: false,
  hover: false,
  settled: false,
  setSettled: (b) => get().settled !== b && set({ settled: b }),
  setReady: (b) => set({ ready: b }),
  setHover: (b) => set({ hover: b }),
  requestBoot: () => {
    if (get().booting) return;
    if (!get().ready) {
      usePortfolioStore.getState().setWorld('jarvis');
      return;
    }
    set({ booting: true });
  },
  finishBoot: () => {
    set({ booting: false });
    usePortfolioStore.getState().setWorld('jarvis');
  },
}));
