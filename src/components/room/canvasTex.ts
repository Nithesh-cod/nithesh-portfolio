'use client';

import { useEffect, useMemo, useRef } from 'react';
import { CanvasTexture, SRGBColorSpace } from 'three';

/* Every word in the gaming room (screens, neon, widgets, logos) is drawn on a
 * 2D canvas with the site's own next/font faces, then used as a texture. No
 * CDN fonts, crisp at any distance, and cheap to update (the clock redraws
 * once a second, nothing else redraws unless its data changes). */

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

/** Resolved family list for a next/font CSS variable, e.g. "--font-display-sci". */
export function cssFont(variable: string, fallback = 'sans-serif'): string {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return v ? `${v}, ${fallback}` : fallback;
}

export const FONTS = {
  sci: () => cssFont('--font-display-sci', 'sans-serif'),
  display: () => cssFont('--font-display', 'sans-serif'),
  sans: () => cssFont('--font-sans', 'sans-serif'),
  mono: () => cssFont('--font-mono', 'monospace'),
};

/**
 * A texture painted by `draw`. Repaints when `deps` change, every `interval`
 * ms if given, and once the web fonts finish loading.
 */
export function useCanvasTexture(width: number, height: number, draw: Draw, deps: readonly unknown[], interval?: number) {
  const drawRef = useRef(draw);
  drawRef.current = draw;

  const { tex, ctx } = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const t = new CanvasTexture(canvas);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 8;
    return { tex: t, ctx: canvas.getContext('2d')! };
  }, [width, height]);

  useEffect(() => {
    const paint = () => {
      ctx.save();
      ctx.clearRect(0, 0, width, height);
      drawRef.current(ctx, width, height);
      ctx.restore();
      tex.needsUpdate = true;
    };
    paint();
    let alive = true;
    void document.fonts?.ready.then(() => alive && paint());
    const id = interval ? window.setInterval(paint, interval) : 0;
    return () => {
      alive = false;
      if (id) window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, tex, width, height, interval, ...deps]);

  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

/** Seeded 0..1 generator, so procedural art repaints identically every time. */
export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Rounded-rect path helper. */
export function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Text with a neon glow (two passes: wide halo, then crisp core). */
export function glowText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  blur: number,
) {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = blur * 0.35;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#eafff6';
  ctx.globalAlpha = 0.55;
  ctx.fillText(text, x, y);
  ctx.globalAlpha = 1;
}

/** The NR hex emblem, centred at (cx, cy) with outer radius r. */
export function drawNR(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color = '#2effb0') {
  const hex = (rad: number) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + (i * Math.PI) / 3;
      const px = cx + Math.cos(a) * rad;
      const py = cy + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  };
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = r * 0.25;
  ctx.strokeStyle = color;
  ctx.lineWidth = r * 0.09;
  hex(r);
  ctx.stroke();
  ctx.lineWidth = r * 0.025;
  ctx.globalAlpha = 0.5;
  hex(r * 0.8);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.font = `900 ${Math.round(r * 0.72)}px ${FONTS.sci()}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  glowText(ctx, 'NR', cx, cy + r * 0.04, color, r * 0.2);
  ctx.restore();
}
