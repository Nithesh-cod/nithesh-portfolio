'use client';

import { motion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { APPS, APP_GROUPS } from '@/components/jarvis/apps/registry';
import { useShell } from '@/components/jarvis/shellStore';
import { useLaunchApp } from '@/components/jarvis/useLaunchApp';
import { useOverlay } from '@/components/jarvis/useOverlay';
import { DUR, EASE_IN, EASE_OUT } from '@/lib/jarvis/motion';
import { useOS, type AppId } from '@/lib/jarvis/osStore';

const TILE_STAGGER = 0.02;

/** Next tile in a direction, by where the tiles really are on screen. */
function neighbour(tiles: HTMLElement[], from: HTMLElement, key: string): HTMLElement | null {
  const index = tiles.indexOf(from);
  if (key === 'ArrowLeft') return tiles[index - 1] ?? null;
  if (key === 'ArrowRight') return tiles[index + 1] ?? null;
  const box = from.getBoundingClientRect();
  const down = key === 'ArrowDown';
  const rows = tiles
    .map((el) => ({ el, box: el.getBoundingClientRect() }))
    .filter((t) => (down ? t.box.top > box.top + 4 : t.box.top < box.top - 4));
  if (rows.length === 0) return null;
  const rowTop = down ? Math.min(...rows.map((t) => t.box.top)) : Math.max(...rows.map((t) => t.box.top));
  return rows
    .filter((t) => Math.abs(t.box.top - rowTop) < 4)
    .reduce((a, b) => (Math.abs(b.box.left - box.left) < Math.abs(a.box.left - box.left) ? b : a)).el;
}

/** Every app, grouped and searchable, over the whole desktop. */
export function AppLauncher() {
  const closePanel = useShell((s) => s.closePanel);
  const launch = useLaunchApp();
  const windows = useOS((s) => s.windows);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useOverlay(rootRef, closePanel);

  useEffect(() => inputRef.current?.focus({ preventScroll: true }), []);

  const q = query.trim().toLowerCase();
  const groups = APP_GROUPS.map((g) => ({
    title: g.title,
    apps: g.apps.filter((id) => !q || `${APPS[id].title} ${APPS[id].subtitle}`.toLowerCase().includes(q)),
  })).filter((g) => g.apps.length > 0);
  const matches = groups.flatMap((g) => g.apps);

  const start = (id: AppId) => {
    closePanel();
    launch(id);
  };

  const tiles = () => Array.from(rootRef.current?.querySelectorAll<HTMLElement>('.jos-launcher-tile') ?? []);

  const onTileKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!e.key.startsWith('Arrow')) return;
    e.preventDefault();
    const next = neighbour(tiles(), e.currentTarget, e.key);
    if (next) next.focus();
    else if (e.key === 'ArrowUp') inputRef.current?.focus();
  };

  let tileIndex = -1;

  return (
    <motion.div
      className="jos-overlay jos-launcher"
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="All apps"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: DUR.quick } }}
      exit={{ opacity: 0, transition: { duration: DUR.quick, ease: EASE_IN } }}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) closePanel();
      }}
    >
      <motion.div
        className="jos-launcher-inner"
        initial={{ opacity: 0, scale: 0.97, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0, transition: { duration: DUR.standard, ease: EASE_OUT } }}
        exit={{ opacity: 0, scale: 0.98, transition: { duration: DUR.quick, ease: EASE_IN } }}
      >
        <header className="jos-launcher-head">
          <h2>All apps</h2>
          <label className="jos-launcher-search">
            <Search size={16} aria-hidden />
            <input
              ref={inputRef}
              type="search"
              placeholder="Search apps"
              aria-label="Search apps"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                const first = matches[0];
                if (e.key === 'Enter' && first) start(first);
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  tiles()[0]?.focus();
                }
              }}
            />
          </label>
          <button type="button" className="jos-icon-btn" aria-label="Close all apps" onClick={closePanel}>
            <X size={18} />
          </button>
        </header>

        {groups.length === 0 && <p className="jos-launcher-none">No app matches “{query}”.</p>}
        <div className="jos-launcher-groups">
          {groups.map((group) => (
            <section key={group.title} aria-label={group.title}>
              <h3>{group.title}</h3>
              <div className="jos-launcher-grid">
                {group.apps.map((id) => {
                  const { title, subtitle, Icon } = APPS[id];
                  const win = windows.find((w) => w.id === id);
                  tileIndex += 1;
                  return (
                    <motion.button
                      key={id}
                      type="button"
                      className="jos-launcher-tile"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0, transition: { delay: tileIndex * TILE_STAGGER, duration: DUR.standard, ease: EASE_OUT } }}
                      onClick={() => start(id)}
                      onKeyDown={onTileKey}
                    >
                      <span className="jos-launcher-icon">
                        <Icon size={28} strokeWidth={1.5} />
                      </span>
                      <strong>{title}</strong>
                      <span>{subtitle}</span>
                      {win && <em>{win.minimized ? 'Minimised' : 'Open'}</em>}
                    </motion.button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
