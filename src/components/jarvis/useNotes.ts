'use client';

import { useCallback, useMemo } from 'react';
import { useShell, type NoteAction } from '@/components/jarvis/shellStore';
import { timeAgo, useGithubActivity } from '@/components/jarvis/useGithubActivity';
import { useLaunchApp } from '@/components/jarvis/useLaunchApp';
import { play } from '@/lib/audio';
import { allProjects, tickerLines } from '@/lib/content';
import { usePortfolioStore } from '@/lib/store';

export type OSNote = {
  id: string;
  tag: 'System' | 'Arcade' | 'GitHub' | 'Portfolio';
  title: string;
  body?: string;
  /** When it happened. Portfolio lines have no date, so they show none. */
  when?: string;
  action?: NoteAction;
  read: boolean;
};

function portfolioAction(line: string): NoteAction | undefined {
  const project = allProjects.find((p) => line.toLowerCase().includes(p.name.toLowerCase()));
  if (project) return { project: project.id };
  return /internship/i.test(line) ? { app: 'mail' } : undefined;
}

/** Everything in the notification centre, newest kind first. All of it is real:
 *  this tab's own events, public GitHub pushes and the portfolio's own lines. */
export function useNotes() {
  const session = useShell((s) => s.sessionNotes);
  const read = useShell((s) => s.read);
  const dismissed = useShell((s) => s.dismissed);
  const pushes = useGithubActivity();

  return useMemo(() => {
    const seen = new Set(read);
    const hidden = new Set(dismissed);
    const all: Omit<OSNote, 'read'>[] = [
      ...session.map((n) => ({ ...n, when: timeAgo(n.at) })),
      ...(pushes ?? []).map((p) => ({
        id: `github-${p.name}-${p.pushedAt}`,
        tag: 'GitHub' as const,
        title: `Pushed to ${p.name}`,
        body: p.language ?? undefined,
        when: timeAgo(p.pushedAt),
        action: { url: p.url },
      })),
      ...tickerLines.map((line) => ({ id: `line-${line}`, tag: 'Portfolio' as const, title: line, action: portfolioAction(line) })),
    ];
    const notes: OSNote[] = all.filter((n) => !hidden.has(n.id)).map((n) => ({ ...n, read: seen.has(n.id) }));
    return { notes, unread: notes.filter((n) => !n.read).length };
  }, [session, pushes, read, dismissed]);
}

export function useRunNote() {
  const launch = useLaunchApp();
  const openProject = usePortfolioStore((s) => s.openProject);
  return useCallback(
    (action: NoteAction) => {
      if ('app' in action) return launch(action.app, action.payload);
      play('click_primary');
      if ('project' in action) return openProject(action.project);
      window.open(action.url, '_blank', 'noopener,noreferrer');
    },
    [launch, openProject],
  );
}
