'use client';

import { motion } from 'framer-motion';
import {
  Award,
  CornerDownLeft,
  Download,
  Gamepad2,
  LayoutDashboard,
  Maximize2,
  PanelLeft,
  PanelRight,
  Power,
  RotateCcw,
  Search,
  Volume2,
  VolumeX,
  Waves,
  XSquare,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { APPS } from '@/components/jarvis/apps/registry';
import { useShell } from '@/components/jarvis/shellStore';
import { useLaunchApp } from '@/components/jarvis/useLaunchApp';
import { useOverlay } from '@/components/jarvis/useOverlay';
import { snapWindow } from '@/components/jarvis/windowSnap';
import { ProjectIcon } from '@/components/ui/ProjectIcons';
import { play } from '@/lib/audio';
import { allProjects, certGroupLabel, certificateGroups, content } from '@/lib/content';
import { DUR, EASE_IN, EASE_OUT } from '@/lib/jarvis/motion';
import { useOS, type AppId } from '@/lib/jarvis/osStore';
import { usePortfolioStore } from '@/lib/store';

type Group = 'Apps' | 'Actions' | 'Projects' | 'Certificates';

type Entry = {
  id: string;
  group: Group;
  title: string;
  sub: string;
  keywords?: string;
  Icon?: LucideIcon | ComponentType<{ size?: number }>;
  project?: string;
  run: () => void;
};

const GROUPS: readonly Group[] = ['Apps', 'Actions', 'Projects', 'Certificates'];
const EMPTY_LIMIT: Record<Group, number> = { Apps: 6, Actions: 4, Projects: 3, Certificates: 2 };
const SEARCH_LIMIT = 6;

/** 0 means no match. Whole-title and word-start hits outrank loose ones. */
function score(entry: Entry, query: string): number {
  const title = entry.title.toLowerCase();
  const haystack = `${title} ${entry.sub} ${entry.keywords ?? ''}`.toLowerCase();
  if (title === query) return 100;
  if (title.startsWith(query)) return 80;
  if (title.split(/[\s\-:·]+/).some((word) => word.startsWith(query))) return 60;
  if (title.includes(query)) return 50;
  if (query.split(/\s+/).every((word) => haystack.includes(word))) return 30;
  let at = 0;
  for (const char of title) if (char === query[at]) at += 1;
  return at === query.length && query.length >= 3 ? 10 : 0;
}

function Highlight({ text, query }: { text: string; query: string }) {
  const at = query ? text.toLowerCase().indexOf(query) : -1;
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark>{text.slice(at, at + query.length)}</mark>
      {text.slice(at + query.length)}
    </>
  );
}

/** Ctrl+K: search apps, projects and certificates, and run desktop actions. */
export function CommandPalette() {
  const closePanel = useShell((s) => s.closePanel);
  const launch = useLaunchApp();
  const openProject = usePortfolioStore((s) => s.openProject);
  const openCertificate = usePortfolioStore((s) => s.openCertificate);
  const setWorld = usePortfolioStore((s) => s.setWorld);
  const sound = useOS((s) => s.settings.sound);
  const reduceMotion = useOS((s) => s.settings.reduceMotion);
  const front = useOS((s) => {
    const visible = s.windows.filter((w) => !w.minimized);
    return visible.length ? visible.reduce((a, b) => (b.z > a.z ? b : a)).id : null;
  });

  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  useOverlay(rootRef, closePanel);

  const entries = useMemo<Entry[]>(() => {
    const os = useOS.getState;
    const appIds = (Object.keys(APPS) as AppId[]).filter((id) => id !== 'teach');
    const list: Entry[] = appIds.map((id) => ({
      id: `app-${id}`,
      group: 'Apps',
      title: APPS[id].title,
      sub: APPS[id].subtitle,
      Icon: APPS[id].Icon,
      run: () => launch(id),
    }));

    const actions: Omit<Entry, 'group' | 'id'>[] = [
      { title: 'Play Neon Snake', sub: 'Arcade', keywords: 'game', Icon: Zap, run: () => launch('arcade', { tab: 'snake' }) },
      { title: 'Play Neon Breakout', sub: 'Arcade', keywords: 'game bricks', Icon: Gamepad2, run: () => launch('arcade', { tab: 'breakout' }) },
      {
        title: 'Download resume',
        sub: 'PDF',
        keywords: 'cv',
        Icon: Download,
        run: () => {
          play('click_primary');
          const link = document.createElement('a');
          link.href = content.contact.resumeUrl;
          link.download = '';
          link.click();
        },
      },
      {
        title: 'Show desktop',
        sub: 'Minimise every window',
        keywords: 'home hide',
        Icon: LayoutDashboard,
        run: () => os().windows.forEach((w) => os().minimize(w.id)),
      },
      { title: 'Close all windows', sub: 'Desktop', keywords: 'quit', Icon: XSquare, run: () => os().closeAll() },
      {
        title: sound ? 'Turn UI sounds off' : 'Turn UI sounds on',
        sub: 'Settings',
        keywords: 'audio mute',
        Icon: sound ? VolumeX : Volume2,
        run: () => os().updateSettings({ sound: !sound }),
      },
      {
        title: reduceMotion ? 'Turn reduce motion off' : 'Turn reduce motion on',
        sub: 'Settings',
        keywords: 'animation accessibility',
        Icon: Waves,
        run: () => os().updateSettings({ reduceMotion: !reduceMotion }),
      },
      { title: 'Replay boot sequence', sub: 'Settings', keywords: 'restart', Icon: RotateCcw, run: () => os().replayBoot() },
      {
        title: 'Shut down',
        sub: 'Back to the gaming room',
        keywords: 'power exit room',
        Icon: Power,
        run: () => {
          play('click_secondary');
          os().closeAll();
          setWorld('room');
        },
      },
    ];
    if (front) {
      const name = APPS[front].title;
      actions.unshift(
        { title: `Snap ${name} left`, sub: 'Window', keywords: 'half', Icon: PanelLeft, run: () => snapWindow(front, 'left') },
        { title: `Snap ${name} right`, sub: 'Window', keywords: 'half', Icon: PanelRight, run: () => snapWindow(front, 'right') },
        { title: `Maximise ${name}`, sub: 'Window', keywords: 'full', Icon: Maximize2, run: () => snapWindow(front, 'max') },
      );
    }
    list.push(...actions.map((a) => ({ ...a, id: `action-${a.title}`, group: 'Actions' as const })));

    list.push(
      ...allProjects.map((p) => ({
        id: `project-${p.id}`,
        group: 'Projects' as const,
        title: p.name,
        sub: p.tagline,
        keywords: p.stack.join(' '),
        project: p.id,
        run: () => {
          play('click_primary');
          openProject(p.id);
        },
      })),
    );
    list.push(
      ...certificateGroups.flatMap((g) =>
        g.certs.map((c) => ({
          id: `cert-${c.id}`,
          group: 'Certificates' as const,
          title: c.title,
          sub: `${certGroupLabel(g.heading)} · ${c.date}`,
          keywords: c.issuer,
          Icon: Award,
          run: () => {
            play('click_primary');
            openCertificate(c.id);
          },
        })),
      ),
    );
    return list;
  }, [launch, openProject, openCertificate, setWorld, sound, reduceMotion, front]);

  const q = query.trim().toLowerCase();
  const groups = useMemo(() => {
    const found = GROUPS.map((group) => {
      const inGroup = entries.filter((e) => e.group === group);
      if (!q) return { group, items: inGroup.slice(0, EMPTY_LIMIT[group]), best: 0 };
      const hits = inGroup
        .map((entry) => ({ entry, rank: score(entry, q) }))
        .filter((hit) => hit.rank > 0)
        .sort((a, b) => b.rank - a.rank)
        .slice(0, SEARCH_LIMIT);
      return { group, items: hits.map((hit) => hit.entry), best: hits[0]?.rank ?? 0 };
    }).filter((g) => g.items.length > 0);
    // The group holding the best match goes first, so Enter takes the best match.
    return q ? found.sort((a, b) => b.best - a.best) : found;
  }, [entries, q]);
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const active = flat[Math.min(cursor, flat.length - 1)];

  useEffect(() => setCursor(0), [q]);

  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [cursor, flat]);

  const choose = (entry: Entry | undefined) => {
    if (!entry) return;
    closePanel();
    entry.run();
  };

  return (
    <motion.div
      className="jos-overlay jos-palette-scrim"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: DUR.quick } }}
      exit={{ opacity: 0, transition: { duration: DUR.quick, ease: EASE_IN } }}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) closePanel();
      }}
    >
      <motion.div
        className="jos-palette"
        ref={rootRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        initial={{ opacity: 0, scale: 0.97, y: -12 }}
        animate={{ opacity: 1, scale: 1, y: 0, transition: { duration: DUR.standard, ease: EASE_OUT } }}
        exit={{ opacity: 0, scale: 0.98, transition: { duration: DUR.quick, ease: EASE_IN } }}
      >
        <label className="jos-palette-input">
          <Search size={18} aria-hidden />
          <input
            autoFocus
            type="text"
            role="combobox"
            aria-expanded
            aria-controls="jos-palette-list"
            aria-activedescendant={active ? `palette-${active.id}` : undefined}
            aria-label="Search apps, projects, certificates and actions"
            placeholder="Search apps, projects, certificates…"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                const step = e.key === 'ArrowDown' ? 1 : -1;
                setCursor((c) => (c + step + flat.length) % Math.max(flat.length, 1));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                choose(active);
              }
            }}
          />
          <kbd>Esc</kbd>
        </label>

        <div className="jos-palette-list" id="jos-palette-list" ref={listRef} role="listbox" aria-label="Results">
          {flat.length === 0 && <p className="jos-palette-none">Nothing matches “{query}”.</p>}
          {groups.map(({ group, items }) => (
            <div key={group} role="group" aria-label={group}>
              <h3>{group}</h3>
              {items.map((entry) => {
                const Icon = entry.Icon;
                const isActive = entry === active;
                return (
                  <button
                    key={entry.id}
                    id={`palette-${entry.id}`}
                    type="button"
                    role="option"
                    tabIndex={-1}
                    aria-selected={isActive}
                    className="jos-palette-item"
                    onPointerMove={() => setCursor(flat.indexOf(entry))}
                    onClick={() => choose(entry)}
                  >
                    <span className="jos-palette-icon">{entry.project ? <ProjectIcon id={entry.project} size={17} /> : Icon && <Icon size={17} />}</span>
                    <strong>
                      <Highlight text={entry.title} query={q} />
                    </strong>
                    <span>{entry.sub}</span>
                    {isActive && <CornerDownLeft className="jos-palette-enter" size={14} aria-hidden />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <footer className="jos-palette-foot">
          <span>↑↓ to move</span>
          <span>Enter to open</span>
          <span>Esc to close</span>
          <span>
            {flat.length} result{flat.length === 1 ? '' : 's'}
          </span>
        </footer>
      </motion.div>
    </motion.div>
  );
}
