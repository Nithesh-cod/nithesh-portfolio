'use client';

import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Blocks,
  Building2,
  Car,
  Crosshair,
  Gamepad2,
  Pause,
  Pickaxe,
  Play,
  RotateCcw,
  Trophy,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { NeonBreakout, saveBest } from '@/components/jarvis/apps/NeonBreakout';
import { play } from '@/lib/audio';
import { myGames } from '@/lib/content';
import { useOS } from '@/lib/jarvis/osStore';

const GENRE_ICON: Record<string, LucideIcon> = {
  'Tactical shooter': Crosshair,
  'Open world': Building2,
  Racing: Car,
  'Action RPG': Zap,
  Sandbox: Pickaxe,
};

type ArcadeTab = 'library' | 'snake' | 'breakout';

const tabFrom = (payload?: Record<string, unknown>): ArcadeTab | null =>
  payload?.tab === 'snake' || payload?.tab === 'breakout' ? payload.tab : null;

/** Gaming hub: Nithesh's own library (designed title cards, no official art) + two playable games. */
export function Arcade({ payload }: { payload?: Record<string, unknown> }) {
  const [tab, setTab] = useState<ArcadeTab>(tabFrom(payload) ?? 'library');
  const [pick, setPick] = useState(0);

  // Launching a game while Arcade is already open switches to it.
  useEffect(() => {
    const next = tabFrom(payload);
    if (next) setTab(next);
  }, [payload]);

  const game = myGames[pick] ?? { title: 'Arcade', genre: '', hue: 160 };
  const Icon = GENRE_ICON[game.genre] ?? Gamepad2;

  return (
    <div className="app-arcade">
      <div className="app-toolbar">
        <div className="app-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'library'} onClick={() => setTab('library')}>
            <Gamepad2 size={14} /> My library
          </button>
          <button type="button" role="tab" aria-selected={tab === 'snake'} onClick={() => setTab('snake')}>
            <Zap size={14} /> Neon Snake
          </button>
          <button type="button" role="tab" aria-selected={tab === 'breakout'} onClick={() => setTab('breakout')}>
            <Blocks size={14} /> Neon Breakout
          </button>
        </div>
        <span className="app-arcade-note">Games I play on my PC · title cards designed here, not official art</span>
      </div>

      {tab === 'library' ? (
        <div className="app-arcade-lib">
          <article className="app-game-hero" style={{ '--hue': game.hue } as CSSProperties}>
            <Icon className="app-game-hero-glyph" size={160} strokeWidth={1} aria-hidden />
            <div>
              <span className="app-game-genre">{game.genre}</span>
              <h3>{game.title}</h3>
              <p>In my library · played on my gaming PC</p>
            </div>
          </article>

          <div className="app-game-grid" role="listbox" aria-label="Games">
            {myGames.map((g, i) => {
              const GIcon = GENRE_ICON[g.genre] ?? Gamepad2;
              return (
                <button
                  key={g.title}
                  type="button"
                  role="option"
                  aria-selected={i === pick}
                  className={`app-game-tile${i === pick ? ' is-sel' : ''}`}
                  style={{ '--hue': g.hue } as CSSProperties}
                  onClick={() => {
                    play('click_secondary');
                    setPick(i);
                  }}
                >
                  <GIcon size={22} aria-hidden />
                  <strong>{g.title}</strong>
                  <span>{g.genre}</span>
                </button>
              );
            })}
            <button
              type="button"
              className="app-game-tile is-playable"
              onClick={() => {
                play('click_primary');
                setTab('snake');
              }}
            >
              <Play size={22} aria-hidden />
              <strong>Neon Snake</strong>
              <span>Playable right here</span>
            </button>
            <button
              type="button"
              className="app-game-tile is-playable"
              onClick={() => {
                play('click_primary');
                setTab('breakout');
              }}
            >
              <Play size={22} aria-hidden />
              <strong>Neon Breakout</strong>
              <span>Playable right here</span>
            </button>
          </div>
        </div>
      ) : tab === 'snake' ? (
        <NeonSnake />
      ) : (
        <NeonBreakout />
      )}
    </div>
  );
}

/* ─────────────────────────────── Neon Snake ─────────────────────────────── */

const COLS = 24;
const ROWS = 16;
const BEST_KEY = 'jarvis-snake-best';
type Vec = { x: number; y: number };
type Phase = 'ready' | 'playing' | 'paused' | 'over';

const UP: Vec = { x: 0, y: -1 };
const DOWN: Vec = { x: 0, y: 1 };
const LEFT: Vec = { x: -1, y: 0 };
const RIGHT: Vec = { x: 1, y: 0 };
const KEYS: Record<string, Vec> = { ArrowUp: UP, ArrowDown: DOWN, ArrowLeft: LEFT, ArrowRight: RIGHT, w: UP, s: DOWN, a: LEFT, d: RIGHT };

function readBest(): number {
  try {
    return Number(window.localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function NeonSnake() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const game = useRef({
    snake: [] as Vec[],
    dir: { x: 1, y: 0 } as Vec,
    queue: [] as Vec[],
    food: { x: 16, y: 8 } as Vec,
    eaten: 0,
  });
  const [phase, setPhase] = useState<Phase>('ready');
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const docked = useOS((s) => s.windows.some((w) => w.id === 'arcade' && w.minimized));
  const dockedRef = useRef(docked);
  dockedRef.current = docked;

  useEffect(() => setBest(readBest()), []);

  // A game left running in the dock would just lose.
  useEffect(() => {
    if (docked) setPhase((p) => (p === 'playing' ? 'paused' : p));
  }, [docked]);

  const placeFood = () => {
    const g = game.current;
    for (;;) {
      const f = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
      if (!g.snake.some((s) => s.x === f.x && s.y === f.y)) return (g.food = f);
    }
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cell = w / COLS;
    ctx.clearRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = 'rgba(46,255,176,0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 1; x < COLS; x++) {
      ctx.moveTo(x * cell + 0.5, 0);
      ctx.lineTo(x * cell + 0.5, h);
    }
    for (let y = 1; y < ROWS; y++) {
      ctx.moveTo(0, y * cell + 0.5);
      ctx.lineTo(w, y * cell + 0.5);
    }
    ctx.stroke();

    const g = game.current;
    // Food: pulsing magenta orb
    const pulse = 0.75 + Math.sin(performance.now() / 160) * 0.18;
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#ff3df2';
    ctx.fillStyle = '#ff6af5';
    ctx.beginPath();
    ctx.arc((g.food.x + 0.5) * cell, (g.food.y + 0.5) * cell, cell * 0.32 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Snake: head bright, tail fades
    ctx.shadowColor = '#2effb0';
    g.snake.forEach((s, i) => {
      const t = 1 - i / Math.max(g.snake.length, 1);
      ctx.shadowBlur = i === 0 ? 20 : 10;
      ctx.fillStyle = i === 0 ? '#c9ffe9' : `rgba(46,255,176,${0.35 + t * 0.65})`;
      const pad = i === 0 ? 1.5 : 2.5;
      ctx.beginPath();
      ctx.roundRect(s.x * cell + pad, s.y * cell + pad, cell - pad * 2, cell - pad * 2, cell * 0.28);
      ctx.fill();
    });
    ctx.shadowBlur = 0;
  }, []);

  const reset = () => {
    const g = game.current;
    g.snake = [
      { x: 6, y: 8 },
      { x: 5, y: 8 },
      { x: 4, y: 8 },
    ];
    g.dir = { x: 1, y: 0 };
    g.queue = [];
    g.eaten = 0;
    placeFood();
    setScore(0);
  };

  const start = () => {
    if (phase === 'over' || phase === 'ready') reset();
    play('click_primary');
    setPhase('playing');
    boardRef.current?.focus();
  };

  const turn = (d: Vec) => {
    const g = game.current;
    const last = g.queue[g.queue.length - 1] ?? g.dir;
    if (last.x + d.x === 0 && last.y + d.y === 0) return; // no reversing into yourself
    if (last.x === d.x && last.y === d.y) return;
    if (g.queue.length < 3) g.queue.push(d);
  };

  // Game loop: speeds up every 4 orbs.
  useEffect(() => {
    if (phase !== 'playing') return;
    let timer = 0;
    const tick = () => {
      const g = game.current;
      g.dir = g.queue.shift() ?? g.dir;
      const first = g.snake[0];
      if (!first) return;
      const head = { x: first.x + g.dir.x, y: first.y + g.dir.y };
      const hitWall = head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS;
      const hitSelf = g.snake.slice(0, -1).some((s) => s.x === head.x && s.y === head.y);
      if (hitWall || hitSelf) {
        play('transition');
        setPhase('over');
        const final = g.eaten * 10;
        if (saveBest(BEST_KEY, 'Neon Snake', final)) setBest(final);
        draw();
        return;
      }
      g.snake.unshift(head);
      if (head.x === g.food.x && head.y === g.food.y) {
        g.eaten++;
        setScore(g.eaten * 10);
        play('hover');
        placeFood();
      } else {
        g.snake.pop();
      }
      draw();
      timer = window.setTimeout(tick, Math.max(62, 135 - Math.floor(g.eaten / 4) * 9));
    };
    timer = window.setTimeout(tick, 135);
    return () => window.clearTimeout(timer);
  }, [phase, draw]);

  // Idle animation (food pulse) + first paint + resize.
  useEffect(() => {
    if (!game.current.snake.length) reset();
    let raf = 0;
    const loop = () => {
      if (!dockedRef.current) draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draw]);

  const onKey = (e: React.KeyboardEvent) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const dir = KEYS[key];
    if (dir) {
      e.preventDefault();
      if (phase === 'ready' || phase === 'over') start();
      turn(dir);
    } else if (key === ' ' || key === 'Enter') {
      e.preventDefault();
      if (phase === 'playing') setPhase('paused');
      else start();
    }
  };

  const swipe = useRef<Vec | null>(null);

  return (
    <div className="app-snake">
      <div className="app-snake-hud">
        <span>
          Score <b>{score}</b>
        </span>
        <span>
          <Trophy size={14} /> Best <b>{best}</b>
        </span>
        <div className="app-actions">
          {phase === 'playing' ? (
            <button type="button" className="app-btn" onClick={() => setPhase('paused')}>
              <Pause size={14} /> Pause
            </button>
          ) : (
            <button type="button" className="app-btn app-btn--primary" onClick={start}>
              {phase === 'over' ? <RotateCcw size={14} /> : <Play size={14} />}
              {phase === 'paused' ? 'Resume' : phase === 'over' ? 'Play again' : 'Start'}
            </button>
          )}
        </div>
      </div>

      <div
        ref={boardRef}
        className="app-snake-board"
        tabIndex={0}
        role="application"
        aria-label="Neon Snake board. Arrow keys or W A S D to steer, Space to pause."
        onKeyDown={onKey}
        onPointerDown={(e) => (swipe.current = { x: e.clientX, y: e.clientY })}
        onPointerUp={(e) => {
          const s = swipe.current;
          swipe.current = null;
          if (!s) return;
          const dx = e.clientX - s.x;
          const dy = e.clientY - s.y;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
          if (phase !== 'playing') start();
          turn(Math.abs(dx) > Math.abs(dy) ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) });
        }}
      >
        <canvas ref={canvasRef} />
        {phase !== 'playing' && (
          <div className="app-snake-overlay">
            <strong>{phase === 'over' ? 'Game over' : phase === 'paused' ? 'Paused' : 'Neon Snake'}</strong>
            <span>
              {phase === 'over'
                ? `You scored ${score}. ${score > 0 && score >= best ? 'New best!' : ''}`
                : 'Arrow keys / WASD to steer · Space to pause · swipe on touch'}
            </span>
          </div>
        )}
      </div>

      <div className="app-snake-pad" aria-label="Touch controls">
        <button type="button" aria-label="Up" onClick={() => (phase === 'playing' ? turn(UP) : start())}>
          <ArrowUp size={18} />
        </button>
        <button type="button" aria-label="Left" onClick={() => (phase === 'playing' ? turn(LEFT) : start())}>
          <ArrowLeft size={18} />
        </button>
        <button type="button" aria-label="Down" onClick={() => (phase === 'playing' ? turn(DOWN) : start())}>
          <ArrowDown size={18} />
        </button>
        <button type="button" aria-label="Right" onClick={() => (phase === 'playing' ? turn(RIGHT) : start())}>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
