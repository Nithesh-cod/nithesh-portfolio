'use client';

/* V12.2 — shared header element for every HUD card.
 *
 *   <PanelHeader>CORE EXPERTISE</PanelHeader>
 *
 * Renders the bracketed Orbitron header used across all v11-cards.
 * Extracted from RoomPanels.tsx so any new panel (or any modal that
 * wants the same look) can mount it in one line. */

export function PanelHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="v11-card-header">
      <span className="bracket">[</span>
      <span>{children}</span>
      <span className="bracket">]</span>
    </div>
  );
}
