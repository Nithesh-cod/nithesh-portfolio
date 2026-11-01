'use client';

import { useMemo } from 'react';

const SKY_W = 1600;
const SKY_H = 540;
const FLOOR_Y = 531; // 59% of the 900-tall room drawing: keep in step with --jos-horizon.
const WINDOW_TILES = 4;
const NEON = ['#2effb0', '#4de3ff', '#2effb0', '#2effb0', '#ff5cc8', '#4de3ff'];
const WINDOW_TINTS = ['#9dffdc', '#5cffc4', '#4de3ff', '#9dffdc', '#2effb0', '#d6fff0', '#ffd27a', '#ff7ad1'];

/** Repeatable 0..1 stream, so the server and client draw the same skyline. */
function stream(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

type Tower = { x: number; y: number; w: number; tile: number; neon: string | null; spire: number; crown: number; slant: number };

function towerRow(seed: number, [minW, maxW]: [number, number], [minH, maxH]: [number, number], neonChance: number) {
  const r = stream(seed);
  const row: Tower[] = [];
  for (let x = -30, i = 0; x < SKY_W; i += 1) {
    const w = Math.round(minW + r() * (maxW - minW));
    const h = Math.round(minH + Math.pow(r(), 1.5) * (maxH - minH));
    const neon = r() < neonChance ? NEON[i % NEON.length]! : null;
    const spire = r() < 0.3 ? Math.round(18 + r() * 46) : 0;
    const crown = r() < 0.45 ? Math.round(14 + r() * 40) : 0;
    row.push({ x, y: SKY_H - h, w, tile: i % WINDOW_TILES, neon, spire, crown, slant: 0 });
    x += Math.round(w * (0.8 + r() * 0.5));
  }
  return row;
}

function windowTile(seed: number) {
  const r = stream(seed);
  const lit: { x: number; y: number; fill: string; opacity: number }[] = [];
  for (let col = 0; col < 8; col += 1) {
    for (let row = 0; row < 9; row += 1) {
      if (r() > 0.42) continue;
      lit.push({
        x: col * 8 + 2,
        y: row * 8 + 2,
        fill: WINDOW_TINTS[Math.floor(r() * WINDOW_TINTS.length)]!,
        opacity: Number((0.22 + r() * 0.6).toFixed(2)),
      });
    }
  }
  return lit;
}

const FAR_ROW = towerRow(11, [26, 54], [150, 280], 0.1);
const MID_ROW = towerRow(47, [44, 92], [130, 290], 0.3);

/** Hand-placed towers that clear the card line, so the strip above the cards
 *  reads as a skyline; the photo's own city carries the gaps between them. */
const HERO_ROW: Tower[] = (
  [
    [292, 44, 322, '#4de3ff', 26, 30, 0],
    [348, 34, 288, '#2effb0', 0, 0, 22],
    [446, 54, 348, '#2effb0', 22, 22, 0],
    [516, 36, 306, '#ff5cc8', 0, 40, 0],
    [856, 42, 318, '#4de3ff', 0, 0, 26],
    [916, 58, 352, '#2effb0', 24, 18, 0],
    [1006, 36, 298, '#ff5cc8', 0, 34, 0],
    [1092, 52, 338, '#4de3ff', 0, 30, 18],
    [1158, 42, 300, '#2effb0', 0, 0, 0],
    [1226, 56, 356, '#2effb0', 22, 16, 0],
  ] as const
).map(([x, w, h, neon, crown, spire, slant], i) => ({ x, y: SKY_H - h, w, tile: i % WINDOW_TILES, neon, spire, crown, slant }));

/** Each neon edge throws a long streak down the wet floor. */
const STREAK_COLOURS = ['#2effb0', '#4de3ff', '#ff5cc8', '#ffb45c'];
const STREAKS = [...HERO_ROW, ...MID_ROW.filter((t) => t.neon)].map((t, i) => ({
  x: t.x + Math.round(t.w / 2),
  w: Math.max(4, Math.round(t.w * 0.16)),
  h: 120 + Math.round((SKY_H - t.y) * 0.5),
  colour: i % 4 === 3 ? '#ffb45c' : (t.neon as string),
}));
const TILES = Array.from({ length: WINDOW_TILES }, (_, i) => windowTile(i * 73 + 5));

/** One compound path per fill: a pattern fill per tower made the skyline the
 *  most expensive thing on first paint. */
function TowerRow({ row, scale }: { row: Tower[]; scale: 'far' | 'mid' }) {
  const bodies = row.map((t) => {
    const top = t.y - t.crown;
    const crown = t.crown ? `M${t.x + t.w * 0.2} ${top}h${t.w * 0.6}v${t.crown + 1}h${-t.w * 0.6}Z` : '';
    const spire = t.spire ? `M${t.x + t.w / 2 - 0.75} ${top - t.spire}h1.5v${t.spire + t.slant}h-1.5Z` : '';
    return `${spire}${crown}M${t.x} ${t.y + t.slant}L${t.x + t.w} ${t.y}V${SKY_H}H${t.x}Z`;
  });
  const beacons = row
    .filter((t) => t.spire)
    .map((t) => `M${t.x + t.w / 2 - 1.5} ${t.y - t.crown - t.spire - 1.5}h3v3h-3Z`);
  return (
    <g>
      <path d={bodies.join('')} fill={`url(#jos-tower-${scale})`} />
      {scale === 'mid' && <path d={beacons.join('')} fill="#ff7ad1" />}
      {TILES.map((_, tile) => (
        <path
          key={tile}
          d={row
            .filter((t) => t.tile === tile)
            .map((t) => `M${t.x + 2} ${t.y + 4 + t.slant}h${t.w - 4}V${SKY_H}h${4 - t.w}Z`)
            .join('')}
          fill={`url(#jos-win-${scale}-${tile})`}
          opacity={scale === 'far' ? 0.5 : 0.72}
        />
      ))}
      {STREAK_COLOURS.map((neon) => (
        <path
          key={neon}
          d={row
            .filter((t) => t.neon === neon)
            .map((t) => `M${t.x} ${SKY_H}V${t.y + t.slant}L${t.x + t.w} ${t.y}`)
            .join('')}
          fill="none"
          stroke={neon}
          strokeWidth={1.5}
          opacity={0.62}
        />
      ))}
    </g>
  );
}

function Skyline() {
  return (
    <svg className="jos-wall-skyline" viewBox={`0 0 ${SKY_W} ${SKY_H}`} preserveAspectRatio="xMidYMax slice">
      <defs>
        <linearGradient id="jos-tower-far" gradientUnits="userSpaceOnUse" x1="0" y1="100" x2="0" y2={SKY_H}>
          <stop offset="0%" stopColor="#0d2f38" />
          <stop offset="100%" stopColor="#0a2a2c" />
        </linearGradient>
        <linearGradient id="jos-tower-mid" gradientUnits="userSpaceOnUse" x1="0" y1="100" x2="0" y2={SKY_H}>
          <stop offset="0%" stopColor="#0a2329" />
          <stop offset="100%" stopColor="#04141a" />
        </linearGradient>
        {TILES.map((tile, i) =>
          (['far', 'mid'] as const).map((scale) => (
            <pattern
              key={scale}
              id={`jos-win-${scale}-${i}`}
              width={64}
              height={72}
              patternUnits="userSpaceOnUse"
              patternTransform={scale === 'far' ? 'scale(0.34)' : 'scale(0.5)'}
            >
              {tile.map((c) => (
                <rect key={`${c.x}-${c.y}`} x={c.x} y={c.y} width={4} height={5} fill={c.fill} opacity={c.opacity} />
              ))}
            </pattern>
          )),
        )}
      </defs>
      <g opacity={0.55}>
        <TowerRow row={FAR_ROW} scale="far" />
      </g>
      <TowerRow row={MID_ROW} scale="mid" />
      <TowerRow row={HERO_ROW} scale="mid" />
    </svg>
  );
}

/** Window wall, ceiling ring and floor lines. Stretched to the viewport so the
 *  horizon stays on the same percentage as the skyline and the floor. */
function RoomLines() {
  const mullions = [160, 400, 640, 960, 1200, 1440];
  const fanFeet = [-900, -420, -40, 300, 620, 980, 1300, 1640, 2020, 2500];
  return (
    <svg className="jos-wall-room" viewBox="0 0 1600 900" preserveAspectRatio="none">
      <defs>
        <linearGradient id="jos-soffit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#031210" />
          <stop offset="100%" stopColor="#020b0b" />
        </linearGradient>
        {STREAK_COLOURS.map((c) => (
          <linearGradient key={c} id={`jos-streak-${c.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c} stopOpacity={0.46} />
            <stop offset="100%" stopColor={c} stopOpacity={0} />
          </linearGradient>
        ))}
        <radialGradient id="jos-ring-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(46,255,176,0.42)" />
          <stop offset="65%" stopColor="rgba(46,255,176,0.1)" />
          <stop offset="100%" stopColor="rgba(46,255,176,0)" />
        </radialGradient>
      </defs>

      {mullions.map((x) => (
        <g key={x}>
          <rect x={x - 5} y={96} width={10} height={FLOOR_Y - 96} fill="#020b0c" />
          <rect x={x + 5} y={96} width={1.2} height={FLOOR_Y - 96} fill="rgba(46,255,176,0.42)" />
        </g>
      ))}

      <path d="M0 0H1600V136Q800 92 0 136Z" fill="url(#jos-soffit)" />
      <path d="M0 136Q800 92 1600 136" fill="none" stroke="rgba(46,255,176,0.6)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      <path d="M270 113l96-8M1234 105l96 8M452 100l72-4M1076 96l72 4" fill="none" stroke="#7dffd0" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />

      <ellipse cx="800" cy="112" rx="340" ry="46" fill="url(#jos-ring-glow)" />
      <ellipse cx="800" cy="112" rx="240" ry="25" fill="#03120f" />
      <ellipse cx="800" cy="112" rx="240" ry="25" fill="none" stroke="rgba(46,255,176,0.3)" strokeWidth="13" vectorEffect="non-scaling-stroke" />
      <ellipse cx="800" cy="112" rx="240" ry="25" fill="none" stroke="#c8ffec" strokeWidth="3.2" vectorEffect="non-scaling-stroke" />
      <ellipse cx="800" cy="112" rx="196" ry="18" fill="none" stroke="rgba(46,255,176,0.75)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      <ellipse cx="800" cy="112" rx="150" ry="12" fill="none" stroke="#7dffd0" strokeWidth="2.2" vectorEffect="non-scaling-stroke" />

      {STREAKS.map((s) => (
        <g key={`${s.x}-${s.h}`} fill={`url(#jos-streak-${s.colour.slice(1)})`}>
          <rect x={s.x - s.w} y={FLOOR_Y} width={s.w * 3} height={s.h * 0.8} opacity={0.3} />
          <rect x={s.x} y={FLOOR_Y} width={s.w} height={s.h} opacity={0.6} />
        </g>
      ))}

      <rect x="0" y={FLOOR_Y - 5} width="1600" height="5" fill="#020b0c" />
      <path d={`M0 ${FLOOR_Y}H1600`} fill="none" stroke="rgba(92,255,196,0.6)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />

      <g fill="none" stroke="rgba(46,255,176,0.17)" strokeWidth="1" vectorEffect="non-scaling-stroke">
        {fanFeet.map((foot) => (
          <path key={foot} d={`M${800 + (foot - 800) * 0.16} ${FLOOR_Y}L${foot} 900`} vectorEffect="non-scaling-stroke" />
        ))}
        {[552, 584, 632, 704, 812].map((y) => (
          <path key={y} d={`M0 ${y}H1600`} vectorEffect="non-scaling-stroke" />
        ))}
      </g>
      <path d="M120 742L560 548M1480 742L1040 548" fill="none" stroke="rgba(46,255,176,0.2)" strokeWidth="8" vectorEffect="non-scaling-stroke" />
      <path d="M120 742L560 548M1480 742L1040 548" fill="none" stroke="rgba(125,255,208,0.7)" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** The penthouse behind the desktop: a graded night-city photo with drawn towers
 *  in front, the photo mirrored into a wet floor, and drifting particles. CSS and
 *  SVG only, no extra WebGL. It is opaque, so the parked room no longer shows. */
export function Wallpaper() {
  const particles = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        left: `${(i * 37) % 100}%`,
        delay: `${((i * 1.7) % 12).toFixed(1)}s`,
        duration: `${10 + ((i * 3) % 9)}s`,
        size: `${1 + (i % 3)}px`,
      })),
    [],
  );

  return (
    <div className="jos-wall" aria-hidden>
      <div className="jos-wall-sky">
        <div className="jos-wall-photo" />
        <Skyline />
        <div className="jos-wall-haze" />
      </div>
      <div className="jos-wall-reflect">
        <div className="jos-wall-photo" />
      </div>
      <div className="jos-wall-floor" />
      <RoomLines />
      <div className="jos-wall-glow" />
      <div className="jos-particles">
        {particles.map((p, i) => (
          <i key={i} style={{ left: p.left, animationDelay: p.delay, animationDuration: p.duration, width: p.size, height: p.size }} />
        ))}
      </div>
      <div className="jos-wall-vignette" />
    </div>
  );
}
