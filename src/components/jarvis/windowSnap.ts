import { useShell, type Rect } from '@/components/jarvis/shellStore';
import { useOS, type AppId } from '@/lib/jarvis/osStore';

export const TOP_SAFE = 70;
export const BOTTOM_SAFE = 96;

const SIDE_MARGIN = 12;
const GAP = 8;
const EDGE = 24;
const CORNER = 96;

export type SnapZone = 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'max';

/** The zone under the pointer while dragging a window, if any. */
export function zoneAt(x: number, y: number): SnapZone | null {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const left = x <= EDGE;
  if (left || x >= vw - EDGE) {
    const side = left ? 'left' : 'right';
    if (y < TOP_SAFE + CORNER) return `top-${side}`;
    if (y > vh - BOTTOM_SAFE - CORNER) return `bottom-${side}`;
    return side;
  }
  return y <= EDGE ? 'max' : null;
}

export function zoneRect(zone: SnapZone): Rect {
  const w = window.innerWidth - SIDE_MARGIN * 2;
  const h = window.innerHeight - TOP_SAFE - BOTTOM_SAFE;
  if (zone === 'max') return { x: SIDE_MARGIN, y: TOP_SAFE, w, h };
  const halfW = (w - GAP) / 2;
  const halfH = (h - GAP) / 2;
  return {
    x: zone.endsWith('right') ? SIDE_MARGIN + halfW + GAP : SIDE_MARGIN,
    y: zone.startsWith('bottom') ? TOP_SAFE + halfH + GAP : TOP_SAFE,
    w: halfW,
    h: zone === 'left' || zone === 'right' ? h : halfH,
  };
}

export function snapWindow(id: AppId, zone: SnapZone) {
  const os = useOS.getState();
  const win = os.windows.find((w) => w.id === id);
  if (!win) return;
  if (zone === 'max') {
    if (!win.maximized) os.toggleMaximize(id);
    return;
  }
  const shell = useShell.getState();
  if (!shell.restoreRects[id]) shell.rememberRect(id, { x: win.x, y: win.y, w: win.w, h: win.h });
  if (win.maximized) os.toggleMaximize(id);
  os.setRect(id, zoneRect(zone));
}
