'use client';

import { useCallback } from 'react';
import { APPS } from '@/components/jarvis/apps/registry';
import { play } from '@/lib/audio';
import { useOS, type AppId } from '@/lib/jarvis/osStore';
import { usePortfolioStore } from '@/lib/store';

/** Opens an app window — or, for Museum, leaves the OS for the 3D hall. */
export function useLaunchApp() {
  const open = useOS((s) => s.open);
  const setWorld = usePortfolioStore((s) => s.setWorld);
  return useCallback(
    (id: AppId, payload?: Record<string, unknown>) => {
      play('click_primary');
      if (id === 'museum') {
        play('transition');
        setWorld('museum');
        return;
      }
      open(id, APPS[id].size, payload);
    },
    [open, setWorld],
  );
}
