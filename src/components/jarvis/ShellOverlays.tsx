'use client';

import { AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { AppLauncher } from '@/components/jarvis/AppLauncher';
import { CommandPalette } from '@/components/jarvis/CommandPalette';
import { NotificationCenter, Toast } from '@/components/jarvis/NotificationCenter';
import { useShell } from '@/components/jarvis/shellStore';
import { play } from '@/lib/audio';

/** Everything that floats over the desktop, and the keys and events that feed it. */
export function ShellOverlays() {
  const panel = useShell((s) => s.panel);
  const togglePanel = useShell((s) => s.togglePanel);
  const hydrateNotes = useShell((s) => s.hydrateNotes);
  const pushNote = useShell((s) => s.pushNote);

  useEffect(hydrateNotes, [hydrateNotes]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'k' || !(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey) return;
      e.preventDefault();
      play('click_secondary');
      togglePanel('palette');
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [togglePanel]);

  useEffect(() => {
    const offline = () => pushNote({ tag: 'System', title: 'You went offline', body: 'Live weather and GitHub data will pause.' });
    const online = () => pushNote({ tag: 'System', title: 'Back online' });
    window.addEventListener('offline', offline);
    window.addEventListener('online', online);
    return () => {
      window.removeEventListener('offline', offline);
      window.removeEventListener('online', online);
    };
  }, [pushNote]);

  return (
    <>
      <AnimatePresence>
        {panel === 'launcher' && <AppLauncher key="launcher" />}
        {panel === 'notifications' && <NotificationCenter key="notifications" />}
        {panel === 'palette' && <CommandPalette key="palette" />}
      </AnimatePresence>
      <Toast />
    </>
  );
}
