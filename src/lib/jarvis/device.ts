'use client';

import { useEffect, useState } from 'react';

/* Real readings about the visitor's own device, from standard browser APIs.
 * Anything a browser doesn't expose comes back as null and the UI shows "—". */

type NavigatorExtras = Navigator & {
  deviceMemory?: number;
  connection?: { effectiveType?: string; downlink?: number };
  getBattery?: () => Promise<{ level: number; charging: boolean; addEventListener: (t: string, cb: () => void) => void }>;
};

let gpuCache: string | null | undefined;

/** "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Laptop GPU (0x…) Direct3D11 …)" → "NVIDIA GeForce RTX 3060 Laptop GPU" */
function tidyGpu(raw: string): string {
  const angle = raw.match(/ANGLE \([^,]+,\s*([^,]+?)\s*(\(0x[0-9a-f]+\))?\s*(Direct3D|OpenGL|Vulkan|Metal|,|\))/i);
  return (angle?.[1] ?? raw).replace(/\s+/g, ' ').trim();
}

export function readGpuName(): string | null {
  if (gpuCache !== undefined) return gpuCache;
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return (gpuCache = null);
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const raw = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    gpuCache = raw ? tidyGpu(String(raw)) : null;
  } catch {
    gpuCache = null;
  }
  return gpuCache;
}

export type DeviceInfo = {
  cores: number | null;
  memoryGB: number | null;
  gpu: string | null;
  network: string | null;
  online: boolean;
  screen: string;
};

export function useDeviceInfo(): DeviceInfo | null {
  const [info, setInfo] = useState<DeviceInfo | null>(null);
  useEffect(() => {
    const nav = navigator as NavigatorExtras;
    const read = (): DeviceInfo => ({
      cores: nav.hardwareConcurrency || null,
      memoryGB: nav.deviceMemory ?? null,
      gpu: readGpuName(),
      network: nav.connection?.effectiveType
        ? `${nav.connection.effectiveType.toUpperCase()}${nav.connection.downlink ? ` · ${nav.connection.downlink} Mbps` : ''}`
        : null,
      online: nav.onLine,
      screen: `${window.screen.width}×${window.screen.height} @${window.devicePixelRatio}x`,
    });
    setInfo(read());
    const refresh = () => setInfo(read());
    window.addEventListener('online', refresh);
    window.addEventListener('offline', refresh);
    return () => {
      window.removeEventListener('online', refresh);
      window.removeEventListener('offline', refresh);
    };
  }, []);
  return info;
}

/** Measured frames per second, updated twice a second. */
export function useFps(): number | null {
  const [fps, setFps] = useState<number | null>(null);
  useEffect(() => {
    let frames = 0;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      frames++;
      if (now - last >= 500) {
        setFps(Math.round((frames * 1000) / (now - last)));
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return fps;
}

export function useBattery(): { level: number; charging: boolean } | null {
  const [battery, setBattery] = useState<{ level: number; charging: boolean } | null>(null);
  useEffect(() => {
    const nav = navigator as NavigatorExtras;
    if (!nav.getBattery) return;
    let alive = true;
    nav
      .getBattery()
      .then((b) => {
        const update = () => alive && setBattery({ level: b.level, charging: b.charging });
        update();
        b.addEventListener('levelchange', update);
        b.addEventListener('chargingchange', update);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return battery;
}

/** Wall clock in a fixed time zone (Coimbatore = Asia/Kolkata). */
export function useClock(timeZone = 'Asia/Kolkata'): { time: string; date: string } | null {
  const [now, setNow] = useState<{ time: string; date: string } | null>(null);
  useEffect(() => {
    const timeFmt = new Intl.DateTimeFormat('en-IN', { timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    const dateFmt = new Intl.DateTimeFormat('en-IN', { timeZone, weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
    const tick = () => {
      const d = new Date();
      setNow({ time: timeFmt.format(d).toUpperCase(), date: dateFmt.format(d).toUpperCase() });
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [timeZone]);
  return now;
}
