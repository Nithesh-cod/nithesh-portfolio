'use client';

import { useEffect, useState } from 'react';
import { content } from '@/lib/content';

/* Nithesh's latest public pushes, read straight from GitHub by the visitor's
 * browser. Unauthenticated calls are capped at 60 an hour per IP, so one result
 * is shared by every widget and kept for half an hour. Any failure returns null
 * and whatever depends on this data stays off screen. */

export type RepoPush = { name: string; url: string; language: string | null; pushedAt: number };

type Repo = { name: string; html_url: string; language: string | null; pushed_at: string; fork: boolean; archived: boolean };

const CACHE_KEY = 'jarvis-github-activity';
const CACHE_MS = 30 * 60 * 1000;
const SHOWN = 3;

let pending: Promise<RepoPush[] | null> | null = null;
let latest: RepoPush[] | null = null;

function readCache(): RepoPush[] | null {
  if (latest) return latest;
  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as { at: number; pushes: RepoPush[] };
    return Date.now() - saved.at < CACHE_MS ? saved.pushes : null;
  } catch {
    return null;
  }
}

async function fetchPushes(): Promise<RepoPush[] | null> {
  const user = (content.contact.github ?? '').split('/').filter(Boolean).pop();
  if (!user) return null;
  try {
    const res = await fetch(`https://api.github.com/users/${user}/repos?per_page=20&sort=pushed`, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const pushes = ((await res.json()) as Repo[])
      .filter((r) => !r.fork && !r.archived)
      .slice(0, SHOWN)
      .map((r) => ({ name: r.name, url: r.html_url, language: r.language, pushedAt: Date.parse(r.pushed_at) }));
    if (pushes.length === 0) return null;
    latest = pushes;
    try {
      window.sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), pushes }));
    } catch {
      // Storage blocked: the next visit fetches again.
    }
    return pushes;
  } catch {
    return null;
  }
}

export function useGithubActivity(): RepoPush[] | null {
  const [pushes, setPushes] = useState<RepoPush[] | null>(readCache);

  useEffect(() => {
    if (pushes) return;
    let live = true;
    pending ??= fetchPushes();
    void pending.then((result) => {
      if (live) setPushes(result);
    });
    return () => {
      live = false;
    };
  }, [pushes]);

  return pushes;
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31536000],
  ['month', 2592000],
  ['week', 604800],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
];

/** "3 weeks ago" from a real timestamp. */
export function timeAgo(at: number): string {
  const seconds = (Date.now() - at) / 1000;
  const format = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  for (const [unit, size] of UNITS) {
    if (seconds >= size) return format.format(-Math.floor(seconds / size), unit);
  }
  return 'just now';
}
