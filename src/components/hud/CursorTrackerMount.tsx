'use client';

import { useCursorTracker } from '@/lib/use-cursor-tracker';

/**
 * V9.3 — tiny client component whose only job is to mount the cursor
 * tracker hook. Keeps page.tsx server-renderable.
 */
export function CursorTrackerMount() {
  useCursorTracker();
  return null;
}
