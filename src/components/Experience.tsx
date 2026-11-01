'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useRef } from 'react';
import { JarvisOS } from '@/components/jarvis/JarvisOS';
import { APPS } from '@/components/jarvis/apps/registry';
import { RoomStage } from '@/components/room/RoomStage';
import { CursorTrackerMount } from '@/components/hud/CursorTrackerMount';
import { TopBar } from '@/components/hud/Dashboard';
import { BottomTicker } from '@/components/ui/BottomTicker';
import { Loader } from '@/components/ui/Loader';
import { MovementPad } from '@/components/ui/MovementPad';
import { play, setMusicVolume, setUiSoundEnabled } from '@/lib/audio';
import { DUR } from '@/lib/jarvis/motion';
import { useOS, type AppId } from '@/lib/jarvis/osStore';
import { usePortfolioStore } from '@/lib/store';

const MuseumScene = dynamic(() => import('@/components/canvas/Scene').then((m) => m.Scene), {
  ssr: false,
  loading: () => <Loader />,
});

/** Switches between the gaming room (with JARVIS OS over it) and the museum. */
export function Experience() {
  const world = usePortfolioStore((s) => s.world);

  return (
    <>
      <WorldUrlSync />
      <OSSettingsBridge />
      <AnimatePresence mode="wait" initial={false}>
        {world === 'museum' ? (
          <motion.div
            key="museum"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: DUR.slow } }}
            exit={{ opacity: 0, transition: { duration: DUR.standard } }}
          >
            <MuseumWorld />
          </motion.div>
        ) : (
          <motion.div
            key="room"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: DUR.slow } }}
            exit={{ opacity: 0, transition: { duration: DUR.standard } }}
          >
            <RoomStage />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>{world === 'jarvis' && <JarvisOS key="jarvis" />}</AnimatePresence>
    </>
  );
}

function MuseumWorld() {
  const setWorld = usePortfolioStore((s) => s.setWorld);
  return (
    <>
      <div className="fixed inset-0 z-0 canvas-root">
        <MuseumScene />
      </div>
      <CursorTrackerMount />
      <TopBar />
      <MovementPad />
      <BottomTicker />
      <button
        type="button"
        className="museum-back"
        onClick={() => {
          play('transition');
          setWorld('jarvis');
        }}
      >
        <ArrowLeft size={15} /> Back to JARVIS
      </button>
    </>
  );
}

/** Loads saved JARVIS settings and applies them everywhere, museum included. */
function OSSettingsBridge() {
  const hydrate = useOS((s) => s.hydrateSettings);
  const settings = useOS((s) => s.settings);
  const loaded = useOS((s) => s.settingsLoaded);
  const setPerfMode = usePortfolioStore((s) => s.setPerfMode);

  useEffect(() => hydrate(), [hydrate]);
  useEffect(() => setUiSoundEnabled(settings.sound), [settings.sound]);
  useEffect(() => setMusicVolume(settings.musicVolume), [settings.musicVolume]);
  useEffect(() => {
    if (loaded) setPerfMode(settings.graphics === 'performance' ? 'low' : 'medium');
  }, [loaded, settings.graphics, setPerfMode]);

  return null;
}

/* `?app=jarvis` is the desktop itself, so the JARVIS AI window links as `?app=ai`. */
const toToken = (id: AppId) => (id === 'jarvis' ? 'ai' : id);
const fromToken = (t: string): AppId | null =>
  t === 'ai' ? 'jarvis' : t !== 'jarvis' && t in APPS ? (t as AppId) : null;

/** Keeps `?app=` in step with what's on screen, and honours it on first load. */
function WorldUrlSync() {
  const world = usePortfolioStore((s) => s.world);
  const setWorld = usePortfolioStore((s) => s.setWorld);
  const topApp = useOS((s) => {
    const visible = s.windows.filter((w) => !w.minimized);
    return visible.length ? visible.reduce((a, b) => (b.z > a.z ? b : a)).id : null;
  });
  const hydrated = useRef(false);

  useEffect(() => {
    const app = new URLSearchParams(window.location.search).get('app');
    const id = app ? fromToken(app) : null;
    if (app === 'museum') setWorld('museum');
    else if (app === 'jarvis') setWorld('jarvis');
    else if (id) {
      setWorld('jarvis');
      useOS.getState().open(id, APPS[id].size);
    }
    hydrated.current = true;
  }, [setWorld]);

  useEffect(() => {
    if (!hydrated.current) return;
    const params = new URLSearchParams(window.location.search);
    if (world === 'room') params.delete('app');
    else if (world === 'museum') params.set('app', 'museum');
    else params.set('app', topApp ? toToken(topApp) : 'jarvis');
    const qs = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
  }, [world, topApp]);

  return null;
}
