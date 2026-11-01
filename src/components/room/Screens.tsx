'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Color, type MeshBasicMaterial } from 'three';
import { drawNR, FONTS, glowText, rr, seeded, useCanvasTexture } from '@/components/room/canvasTex';
import { myApps, myGames } from '@/lib/content';
import { useFps } from '@/lib/jarvis/device';

/* What the three desk monitors show. Only real data: Nithesh's own games and
 * apps, and the visitor's measured frame rate. */

const BG = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#04110e');
  g.addColorStop(1, '#020807');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(46,255,176,0.06)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
};

/** Left monitor: games library + setup. */
export function useGamesScreen() {
  return useCanvasTexture(
    880,
    520,
    (ctx, w, h) => {
      BG(ctx, w, h);
      ctx.font = `700 30px ${FONTS.sci()}`;
      ctx.textBaseline = 'middle';
      glowText(ctx, 'GAMING HUB', 40, 52, '#2effb0', 12);
      ctx.font = `500 20px ${FONTS.mono()}`;
      ctx.fillStyle = 'rgba(207,233,220,0.6)';
      ctx.fillText('MY GAMES', 40, 104);
      myGames.forEach((g, i) => {
        const y = 140 + i * 62;
        rr(ctx, 36, y, w - 72, 52, 10);
        ctx.fillStyle = i === 0 ? 'rgba(46,255,176,0.14)' : 'rgba(255,255,255,0.03)';
        ctx.fill();
        rr(ctx, 48, y + 8, 36, 36, 8);
        ctx.fillStyle = `hsl(${g.hue} 85% 52%)`;
        ctx.fill();
        ctx.font = `700 24px ${FONTS.sans()}`;
        ctx.fillStyle = '#eafff6';
        ctx.fillText(g.title, 100, y + 26);
        ctx.font = `500 18px ${FONTS.mono()}`;
        ctx.fillStyle = 'rgba(207,233,220,0.55)';
        ctx.textAlign = 'right';
        ctx.fillText(g.genre, w - 52, y + 26);
        ctx.textAlign = 'left';
      });
      ctx.font = `500 18px ${FONTS.mono()}`;
      ctx.fillStyle = 'rgba(46,255,176,0.7)';
      ctx.fillText(`SETUP · ${myApps.join(' · ')}`, 40, h - 34);
    },
    [],
  );
}

/** Original wallpaper: a hooded figure before a neon skyline, in the room's green. */
function paintHeroArt(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const rnd = seeded(14);
  const cx = w / 2;
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#02100f');
  sky.addColorStop(0.5, '#07382f');
  sky.addColorStop(1, '#010605');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  const core = ctx.createRadialGradient(cx, h * 0.3, 10, cx, h * 0.3, w * 0.5);
  core.addColorStop(0, 'rgba(120,255,214,0.6)');
  core.addColorStop(0.4, 'rgba(46,255,176,0.2)');
  core.addColorStop(1, 'rgba(46,255,176,0)');
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, w, h);

  // Light shafts fanning out from behind the hood.
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2;
    const spread = 0.02 + rnd() * 0.05;
    const reach = w * (0.5 + rnd() * 0.5);
    ctx.fillStyle = `rgba(46,255,176,${0.03 + rnd() * 0.07})`;
    ctx.beginPath();
    ctx.moveTo(cx, h * 0.3);
    ctx.lineTo(cx + Math.cos(a - spread) * reach, h * 0.3 + Math.sin(a - spread) * reach);
    ctx.lineTo(cx + Math.cos(a + spread) * reach, h * 0.3 + Math.sin(a + spread) * reach);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';

  // Three skyline layers, far to near; towers rise towards the edges to frame the figure.
  ['#07463a', '#042b25', '#021412'].forEach((fill, l) => {
    const ground = h * (0.74 + l * 0.08);
    for (let x = -20; x < w; ) {
      const bw = 26 + rnd() * 46;
      const edge = Math.abs(x + bw / 2 - cx) / cx;
      const bh = (60 + rnd() * 90 + edge * edge * 200) * (1 - l * 0.12);
      ctx.fillStyle = fill;
      ctx.fillRect(x, ground - bh, bw, h - ground + bh);
      if (rnd() > 0.6) ctx.fillRect(x + bw / 2, ground - bh - 26, 2, 26);
      for (let wy = ground - bh + 8; wy < ground; wy += 11) {
        for (let wx = x + 5; wx < x + bw - 6; wx += 9) {
          if (rnd() > 0.72) continue;
          ctx.fillStyle = rnd() > 0.93 ? 'rgba(255,190,110,0.7)' : `rgba(120,255,214,${0.14 + (2 - l) * 0.1})`;
          ctx.fillRect(wx, wy, 4, 5);
        }
      }
      x += bw + 2;
    }
  });

  // Hooded figure, rim-lit from behind.
  const top = h * 0.05;
  const cloak = new Path2D();
  cloak.moveTo(cx, top);
  cloak.bezierCurveTo(cx + 66, top + 8, cx + 104, top + 86, cx + 96, top + 158);
  cloak.bezierCurveTo(cx + 170, top + 196, cx + 280, top + 236, cx + 340, h);
  cloak.lineTo(cx - 340, h);
  cloak.bezierCurveTo(cx - 280, top + 236, cx - 170, top + 196, cx - 96, top + 158);
  cloak.bezierCurveTo(cx - 104, top + 86, cx - 66, top + 8, cx, top);
  const fill = ctx.createLinearGradient(0, top, 0, h);
  fill.addColorStop(0, '#04110f');
  fill.addColorStop(1, '#010504');
  ctx.save();
  ctx.shadowColor = '#2effb0';
  ctx.shadowBlur = 22;
  ctx.strokeStyle = 'rgba(120,255,214,0.75)';
  ctx.lineWidth = 2.5;
  ctx.stroke(cloak);
  ctx.restore();
  ctx.fillStyle = fill;
  ctx.fill(cloak);
  // Shadowed face, two narrow eyes.
  ctx.fillStyle = '#000202';
  ctx.beginPath();
  ctx.ellipse(cx, top + 104, 54, 66, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.shadowColor = '#2effb0';
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#b4ffe6';
  [-1, 1].forEach((s) => {
    ctx.beginPath();
    ctx.ellipse(cx + s * 21, top + 100, 12, 3, s * 0.18, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  // Energy streaks across the shoulders.
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 16; i++) {
    const x = rnd() * w;
    const y = h * (0.3 + rnd() * 0.42);
    const len = 50 + rnd() * 170;
    const g = ctx.createLinearGradient(x, y, x + len, y - len * 0.42);
    g.addColorStop(0, 'rgba(46,255,176,0)');
    g.addColorStop(1, `rgba(150,255,226,${0.2 + rnd() * 0.35})`);
    ctx.strokeStyle = g;
    ctx.lineWidth = 1 + rnd() * 1.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y - len * 0.42);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';

  // Settle the lower half so the name and the boot prompt stay the brightest things.
  const shade = ctx.createLinearGradient(0, h * 0.42, 0, h);
  shade.addColorStop(0, 'rgba(1,8,7,0)');
  shade.addColorStop(0.3, 'rgba(1,8,7,0.62)');
  shade.addColorStop(1, 'rgba(1,8,7,0.88)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, h * 0.42, w, h * 0.58);
}

/** Centre monitor: name card + boot prompt. */
export function useHeroScreen() {
  return useCanvasTexture(
    1024,
    590,
    (ctx, w, h) => {
      paintHeroArt(ctx, w, h);
      drawNR(ctx, 62, 62, 40);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `900 92px ${FONTS.sci()}`;
      glowText(ctx, 'NITHESH R', w / 2, h * 0.56, '#2effb0', 26);
      ctx.font = `500 26px ${FONTS.mono()}`;
      ctx.fillStyle = '#cfe9dc';
      ctx.fillText('GAMER  ·  DEVELOPER  ·  CREATOR', w / 2, h * 0.67);
      ctx.font = `500 18px ${FONTS.mono()}`;
      ctx.fillStyle = 'rgba(46,255,176,0.8)';
      ctx.fillText('LEVEL UP   |   BUILD   |   EXPLORE', w / 2, h * 0.735);
      rr(ctx, w / 2 - 250, h * 0.79, 500, 76, 38);
      ctx.fillStyle = 'rgba(2,20,16,0.94)';
      ctx.fill();
      ctx.strokeStyle = '#2effb0';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.font = `700 30px ${FONTS.sci()}`;
      glowText(ctx, '⏻  CLICK TO BOOT JARVIS', w / 2, h * 0.79 + 39, '#2effb0', 8);
    },
    [],
  );
}

/** Right monitor: the visitor's live frame rate. */
export function useFpsScreen() {
  const fps = useFps();
  const history = useRef<number[]>([]);
  if (fps !== null) {
    history.current.push(fps);
    if (history.current.length > 48) history.current.shift();
  }
  return useCanvasTexture(
    880,
    520,
    (ctx, w, h) => {
      BG(ctx, w, h);
      ctx.textBaseline = 'middle';
      ctx.font = `700 30px ${FONTS.sci()}`;
      glowText(ctx, 'LIVE PERFORMANCE', 40, 52, '#2effb0', 12);
      ctx.font = `500 18px ${FONTS.mono()}`;
      ctx.fillStyle = 'rgba(207,233,220,0.6)';
      ctx.fillText('YOUR DEVICE · MEASURED NOW', 40, 96);
      const label = fps === null ? '--' : String(fps);
      ctx.font = `900 120px ${FONTS.sci()}`;
      const numW = ctx.measureText(label).width;
      glowText(ctx, label, 40, 196, '#eafff6', 18);
      ctx.font = `700 28px ${FONTS.sci()}`;
      ctx.fillStyle = '#2effb0';
      ctx.fillText('FPS', 40 + numW + 18, 222);
      // Sparkline.
      const pts = history.current;
      const top = 280;
      const bottom = h - 70;
      const max = Math.max(60, ...pts) * 1.1;
      ctx.strokeStyle = 'rgba(46,255,176,0.15)';
      ctx.strokeRect(40, top, w - 80, bottom - top);
      if (pts.length > 1) {
        ctx.beginPath();
        pts.forEach((v, i) => {
          const x = 40 + (i / 47) * (w - 80);
          const y = bottom - (v / max) * (bottom - top);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.shadowColor = '#2effb0';
        ctx.shadowBlur = 12;
        ctx.strokeStyle = '#2effb0';
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      ctx.font = `500 18px ${FONTS.mono()}`;
      ctx.fillStyle = 'rgba(207,233,220,0.6)';
      ctx.fillText('JARVIS OS · READY', 40, h - 34);
    },
    [fps],
  );
}

/** Basic screen material that gently "breathes" so the panels feel powered. */
export function useBreathingScreen(base = 1.15, amp = 0.08, speed = 1.3) {
  const mat = useRef<MeshBasicMaterial>(null);
  const tmp = useMemo(() => new Color(), []);
  useFrame(({ clock }) => {
    if (!mat.current) return;
    const k = base + Math.sin(clock.elapsedTime * speed) * amp;
    mat.current.color.copy(tmp.setScalar(k));
  });
  return mat;
}
