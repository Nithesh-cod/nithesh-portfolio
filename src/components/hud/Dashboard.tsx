'use client';

import { useEffect, useState } from 'react';
import { content, taglineRoles } from '@/lib/content';

/* ───────────────────────────────────────────────────────────────────── *
 * V10.1 — only the top wordmark/clock/status bar stays as DOM.        *
 * Every content panel (LeftRail, RightRail, CapsuleOverlays,          *
 * ServicesStrip) is now mounted INSIDE the 3D scene via RoomPanels.   *
 * ───────────────────────────────────────────────────────────────────── */

export function TopBar() {
  return (
    <>
      <div className="v12-top-header">
        <div className="v12-logo-hex">NR</div>
        <div className="v12-name-block">
          <div className="v12-name">{content.hero.name.toUpperCase()}</div>
          <div className="v12-subtitle">
            {taglineRoles.map((role, i) => (
              <span key={role}>
                {role.toUpperCase()}
                {i < taglineRoles.length - 1 && <span className="divider">·</span>}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="v12-top-status">
        <Clock />
        <div className="v12-status-pill">
          <span className="v12-status-dot" aria-hidden />
          SYSTEM ONLINE
        </div>
      </div>
    </>
  );
}

function Clock() {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const hh = String(d.getUTCHours()).padStart(2, '0');
      const mm = String(d.getUTCMinutes()).padStart(2, '0');
      const ss = String(d.getUTCSeconds()).padStart(2, '0');
      setNow(`${hh}:${mm}:${ss} UTC`);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <span className="v12-clock hidden tabular-nums sm:inline">
      {now ?? '—:—:— UTC'}
    </span>
  );
}
