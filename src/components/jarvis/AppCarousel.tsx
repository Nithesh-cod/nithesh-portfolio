'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useEffect, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { APPS, HERO_APPS } from '@/components/jarvis/apps/registry';
import { useLaunchApp } from '@/components/jarvis/useLaunchApp';
import { play } from '@/lib/audio';
import { DUR, EASE_OUT, STAGGER } from '@/lib/jarvis/motion';
import { useOS, type AppId } from '@/lib/jarvis/osStore';

const CENTER = (HERO_APPS.length - 1) / 2;

const HOT = '#e9fff5';
const LINE = '#9dffdc';
const INK = '#04231a';
const FILL = 'url(#jos-glyph-fill)';
const GLASS = 'url(#jos-glyph-glass)';

/** Filled duotone hero icons, drawn on a 64 grid. Neutral marks, no brand art. */
const GLYPHS: Partial<Record<AppId, ReactNode>> = {
  thispc: (
    <>
      <rect x="5" y="8" width="54" height="37" rx="5" fill={GLASS} stroke={LINE} strokeWidth="2.6" />
      <rect x="10.5" y="13.5" width="43" height="26" rx="2" fill={FILL} />
      <path d="M18 20.5l7 6-7 6" fill="none" stroke={INK} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M29 33h12" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />
      <path d="M26 45h12l2 8H24z" fill={FILL} />
      <rect x="16" y="53" width="32" height="4" rx="2" fill={HOT} />
    </>
  ),
  museum: (
    <>
      <rect x="20" y="7" width="38" height="30" rx="3.5" transform="rotate(9 39 22)" fill={GLASS} stroke={LINE} strokeWidth="2.4" />
      <g transform="rotate(-5 28 36)">
        <rect x="6" y="18" width="44" height="36" rx="3.5" fill={INK} stroke={HOT} strokeWidth="2.6" />
        <path d="M11 49l11-14 7 8 5-5 11 11z" fill={FILL} />
        <circle cx="37" cy="27" r="3.6" fill={HOT} />
      </g>
    </>
  ),
  resume: (
    <>
      <path
        d="M15 4h25l13 13v40a3.5 3.5 0 0 1-3.5 3.5H15a3.5 3.5 0 0 1-3.5-3.5V7.5a3.5 3.5 0 0 1 3.5-3.5z"
        fill={FILL}
        stroke={LINE}
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <path d="M40 4v9.5a3.5 3.5 0 0 0 3.5 3.5H53z" fill={INK} stroke={HOT} strokeWidth="1.6" strokeLinejoin="round" />
      <text x="18" y="29" className="jos-glyph-text">
        CV
      </text>
      <rect x="18" y="35" width="28" height="3.2" rx="1.6" fill={INK} />
      <rect x="18" y="42" width="28" height="3.2" rx="1.6" fill={INK} />
      <rect x="18" y="49" width="19" height="3.2" rx="1.6" fill={INK} />
    </>
  ),
  jarvis: (
    <>
      <circle cx="32" cy="32" r="28" fill={GLASS} stroke={LINE} strokeWidth="2.6" />
      <path d="M32 19v-5" stroke={HOT} strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="32" cy="12.5" r="2.8" fill={HOT} />
      <rect x="13.5" y="27" width="4" height="11" rx="2" fill={LINE} />
      <rect x="46.5" y="27" width="4" height="11" rx="2" fill={LINE} />
      <rect x="17" y="19" width="30" height="27" rx="8" fill={FILL} />
      <rect x="21" y="26" width="22" height="10" rx="5" fill={INK} />
      <circle cx="27" cy="31" r="2.5" fill={HOT} />
      <circle cx="37" cy="31" r="2.5" fill={HOT} />
      <path d="M27 41h10" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
    </>
  ),
  arcade: (
    <>
      <path
        d="M19 15h26c8 0 12.5 5.5 14.5 13.5l2.6 11.3C63.5 46 60.7 50 56.1 50c-3.4 0-5.6-2-7.6-5L46 39H18l-2.5 6c-2 3-4.2 5-7.6 5-4.6 0-7.4-4-6-10.2l2.6-11.3C6.5 20.5 11 15 19 15z"
        fill={FILL}
        stroke={LINE}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M20 21v12M14 27h12" stroke={INK} strokeWidth="3.8" strokeLinecap="round" />
      <circle cx="42" cy="24" r="3.2" fill={INK} />
      <circle cx="49" cy="30" r="3.2" fill={INK} />
    </>
  ),
  more: (
    <>
      {[
        [7, 7],
        [35, 7],
        [7, 35],
        [35, 35],
      ].map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="22" height="22" rx="6" fill={FILL} stroke={LINE} strokeWidth="2.2" />
      ))}
    </>
  ),
};

const PED_CX = 220;
const TIERS = [
  { cy: 118, rx: 205, ry: 42, wall: 30 },
  { cy: 84, rx: 150, ry: 30, wall: 22 },
  { cy: 56, rx: 100, ry: 20, wall: 16 },
];
const wallPath = ({ cy, rx, ry, wall }: (typeof TIERS)[number]) =>
  `M${PED_CX - rx} ${cy}v${wall}a${rx} ${ry} 0 0 0 ${rx * 2} 0v${-wall}a${rx} ${ry} 0 0 1 ${-rx * 2} 0z`;
const footPath = ({ cy, rx, ry, wall }: (typeof TIERS)[number]) => `M${PED_CX - rx} ${cy + wall}a${rx} ${ry} 0 0 0 ${rx * 2} 0`;

/** Three-tier dais. Each rim is a wide faint stroke under a thin hot one, so it
 *  glows without an SVG filter, and only the two dashed rings repaint. */
function Pedestal() {
  return (
    <svg className="jos-ped" viewBox="0 0 440 204">
      <defs>
        <linearGradient id="jos-ped-wall" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#031512" />
          <stop offset="28%" stopColor="#0a3a2c" />
          <stop offset="50%" stopColor="#1c8062" />
          <stop offset="72%" stopColor="#0a3a2c" />
          <stop offset="100%" stopColor="#031512" />
        </linearGradient>
        <radialGradient id="jos-ped-top" cx="50%" cy="46%" r="52%">
          <stop offset="0%" stopColor="#0f4a39" />
          <stop offset="68%" stopColor="#07261e" />
          <stop offset="100%" stopColor="#031410" />
        </radialGradient>
        <radialGradient id="jos-ped-hot" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="22%" stopColor="#b8ffe6" />
          <stop offset="55%" stopColor="rgba(46,255,176,0.55)" />
          <stop offset="100%" stopColor="rgba(46,255,176,0)" />
        </radialGradient>
        <radialGradient id="jos-ped-spill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(46,255,176,0.42)" />
          <stop offset="60%" stopColor="rgba(46,255,176,0.14)" />
          <stop offset="100%" stopColor="rgba(46,255,176,0)" />
        </radialGradient>
      </defs>

      <ellipse cx={PED_CX} cy={152} rx={220} ry={52} fill="url(#jos-ped-spill)" />
      <ellipse cx={PED_CX} cy={152} rx={216} ry={46} fill="#020c0a" />
      <ellipse cx={PED_CX} cy={152} rx={216} ry={46} fill="none" stroke="rgba(46,255,176,0.3)" strokeWidth="7" />
      <ellipse cx={PED_CX} cy={152} rx={216} ry={46} fill="none" stroke="#7dffd0" strokeWidth="1.8" />

      {TIERS.map((tier) => (
        <g key={tier.cy}>
          <path d={wallPath(tier)} fill="url(#jos-ped-wall)" />
          <path
            d={footPath(tier)}
            transform={`translate(0 ${-tier.wall / 2})`}
            fill="none"
            stroke="rgba(2,20,16,0.65)"
            strokeWidth={tier.wall * 0.8}
            strokeDasharray="1.6 34"
          />
          <path d={footPath(tier)} fill="none" stroke="rgba(46,255,176,0.3)" strokeWidth="5" />
          <path d={footPath(tier)} fill="none" stroke="#7dffd0" strokeWidth="1.6" />
          <ellipse cx={PED_CX} cy={tier.cy} rx={tier.rx} ry={tier.ry} fill="url(#jos-ped-top)" />
          <ellipse cx={PED_CX} cy={tier.cy} rx={tier.rx} ry={tier.ry} fill="none" stroke="rgba(46,255,176,0.34)" strokeWidth="6" />
          <ellipse cx={PED_CX} cy={tier.cy} rx={tier.rx} ry={tier.ry} fill="none" stroke="#a8ffe0" strokeWidth="1.8" />
        </g>
      ))}

      <ellipse className="jos-ped-flow" cx={PED_CX} cy={118} rx={178} ry={36.5} fill="none" stroke="rgba(92,255,196,0.75)" strokeWidth="2" pathLength={360} />
      <ellipse className="jos-ped-flow is-rev" cx={PED_CX} cy={56} rx={84} ry={16.5} fill="none" stroke="#c8ffec" strokeWidth="2" pathLength={360} />
      <ellipse cx={PED_CX} cy={56} rx={60} ry={11.5} fill="none" stroke="rgba(46,255,176,0.8)" strokeWidth="1.4" />
      <ellipse cx={PED_CX} cy={56} rx={40} ry={7.8} fill="url(#jos-ped-hot)" />

      <text x={PED_CX} y={180} textAnchor="middle" className="jos-ped-text">
        JARVIS
      </text>
    </svg>
  );
}

/** Six app cards on a shallow arc; the stage slides to sit under the selected one. */
export function AppCarousel({ delay = 0 }: { delay?: number }) {
  const launch = useLaunchApp();
  const anyWindowOpen = useOS((s) => s.windows.some((w) => !w.minimized));
  const [selected, setSelected] = useState(2);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (anyWindowOpen || document.querySelector('[aria-modal="true"]')) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'ArrowRight') {
        setSelected((i) => Math.min(HERO_APPS.length - 1, i + 1));
        play('hover');
      } else if (e.key === 'ArrowLeft') {
        setSelected((i) => Math.max(0, i - 1));
        play('hover');
      } else if (e.key === 'Enter' && document.activeElement === document.body) {
        launch(HERO_APPS[selected]!);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [anyWindowOpen, selected, launch]);

  const tilt = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    e.currentTarget.style.setProperty('--tilt-x', `${(-py * 8).toFixed(2)}deg`);
    e.currentTarget.style.setProperty('--tilt-y', `${(px * 10).toFixed(2)}deg`);
  };
  const untilt = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.currentTarget.style.setProperty('--tilt-x', '0deg');
    e.currentTarget.style.setProperty('--tilt-y', '0deg');
  };

  return (
    <div
      className="jos-carousel"
      style={{ ['--sel-offset' as string]: selected - CENTER, ['--card-count' as string]: HERO_APPS.length }}
    >
      <svg className="jos-glyph-defs" width="0" height="0" aria-hidden>
        <defs>
          <linearGradient id="jos-glyph-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d6ffee" />
            <stop offset="55%" stopColor="#2effb0" />
            <stop offset="100%" stopColor="#0fa776" />
          </linearGradient>
          <linearGradient id="jos-glyph-glass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(46,255,176,0.36)" />
            <stop offset="100%" stopColor="rgba(46,255,176,0.06)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="jos-arc" role="list">
        {HERO_APPS.map((id, i) => {
          const app = APPS[id];
          const d = i - CENTER;
          const isSel = i === selected;
          const glyph = GLYPHS[id];
          return (
            <motion.div
              key={id}
              role="listitem"
              className={isSel ? 'jos-card-slot is-sel' : 'jos-card-slot'}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0, transition: { delay: delay + i * STAGGER, duration: DUR.slow, ease: EASE_OUT } }}
              style={{ ['--arc-ry' as string]: `${(d * -7).toFixed(1)}deg`, ['--arc-z' as string]: `${(-(d * d) * 12).toFixed(0)}px` }}
            >
              <button
                type="button"
                className={isSel ? 'jos-card is-sel' : 'jos-card'}
                onPointerEnter={() => {
                  if (!isSel) play('hover');
                  setSelected(i);
                }}
                onPointerMove={tilt}
                onPointerLeave={untilt}
                onFocus={() => setSelected(i)}
                onClick={() => launch(id)}
                aria-label={`Open ${app.title}`}
              >
                <span className="jos-card-frame" />
                <span className="jos-card-glass" />
                <span className="jos-card-icon">
                  {glyph ? (
                    <svg viewBox="0 0 64 64" width={70} height={70}>
                      {glyph}
                    </svg>
                  ) : (
                    <app.Icon size={56} strokeWidth={1.35} />
                  )}
                </span>
                <strong>{app.title}</strong>
                <span className="jos-card-sub">{app.subtitle}</span>
                <span className="jos-card-open">
                  OPEN <ArrowRight size={14} />
                </span>
              </button>
            </motion.div>
          );
        })}
      </div>
      <div className="jos-stage" aria-hidden>
        <span className="jos-stage-reflect" />
        <Pedestal />
        <span className="jos-stage-beam" />
      </div>
    </div>
  );
}
