'use client';

import { Heart, Pause, Play, RotateCcw, Trophy } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { useShell } from '@/components/jarvis/shellStore';
import { play } from '@/lib/audio';
import { useOS } from '@/lib/jarvis/osStore';

/* Played on a 600x400 field that CSS scales to fit the window. */
const FIELD_W = 600;
const FIELD_H = 400;
const COLS = 10;
const ROWS = 5;
const WALL_GAP = 12;
const BRICK_GAP = 5;
const BRICK_H = 18;
const BRICK_TOP = 40;
const BRICK_W = (FIELD_W - WALL_GAP * 2 - BRICK_GAP * (COLS - 1)) / COLS;
const PADDLE_W = 92;
const PADDLE_H = 11;
const PADDLE_Y = FIELD_H - 28;
const PADDLE_SPEED = 560;
const BALL_R = 6;
const BALL_SPEED = 300;
const LEVEL_SPEEDUP = 36;
const MAX_BOUNCE = Math.PI / 3;
const LIVES = 3;
const MAX_STEP = 1 / 30;
const BEST_KEY = 'jarvis-breakout-best';

type Phase = 'ready' | 'playing' | 'paused' | 'over';
type Brick = { x: number; y: number; row: number; alive: boolean };

/** Top rows are harder to reach, so they score more. */
const brickScore = (row: number) => (ROWS - row) * 10;
const brickHue = (row: number) => 160 + row * 26;

/** Saves a new high score and announces it. True when it was a new best. */
export function saveBest(key: string, game: string, score: number): boolean {
  if (score <= readBest(key)) return false;
  try {
    window.localStorage.setItem(key, String(score));
  } catch {
    // Storage blocked: best score lasts this visit only.
  }
  useShell.getState().pushNote({ tag: 'Arcade', title: `New best in ${game}`, body: `${score} points`, action: { app: 'arcade' } });
  return true;
}

function readBest(key: string): number {
  try {
    return Number(window.localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}

/** A new wall each level: every third level leaves gaps in a checker pattern. */
function buildWall(level: number): Brick[] {
  const wall: Brick[] = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (level % 3 === 0 && (row + col) % 2 === 1) continue;
      if (level % 3 === 2 && row % 2 === 1 && col % 3 === 1) continue;
      wall.push({ x: WALL_GAP + col * (BRICK_W + BRICK_GAP), y: BRICK_TOP + row * (BRICK_H + BRICK_GAP), row, alive: true });
    }
  }
  return wall;
}

export function NeonBreakout() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const game = useRef({
    bricks: buildWall(1),
    paddleX: FIELD_W / 2,
    ball: { x: FIELD_W / 2, y: PADDLE_Y - BALL_R, vx: 0, vy: 0 },
    stuck: true,
    held: { left: false, right: false },
    level: 1,
    score: 0,
    lives: LIVES,
  });
  const [phase, setPhase] = useState<Phase>('ready');
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const [hud, setHud] = useState({ score: 0, lives: LIVES, level: 1, stuck: true });
  const [best, setBest] = useState(0);
  const docked = useOS((s) => s.windows.some((w) => w.id === 'arcade' && w.minimized));
  const dockedRef = useRef(docked);
  dockedRef.current = docked;

  useEffect(() => setBest(readBest(BEST_KEY)), []);

  useEffect(() => {
    if (docked) setPhase((p) => (p === 'playing' ? 'paused' : p));
  }, [docked]);

  const syncHud = () => {
    const { score, lives, level, stuck } = game.current;
    setHud({ score, lives, level, stuck });
  };

  const launchBall = () => {
    const g = game.current;
    if (!g.stuck) return;
    const speed = BALL_SPEED + (g.level - 1) * LEVEL_SPEEDUP;
    const angle = (Math.random() < 0.5 ? -1 : 1) * (0.25 + Math.random() * 0.45);
    g.ball.vx = Math.sin(angle) * speed;
    g.ball.vy = -Math.cos(angle) * speed;
    g.stuck = false;
    syncHud();
  };

  const start = () => {
    const g = game.current;
    if (phaseRef.current === 'ready' || phaseRef.current === 'over') {
      g.bricks = buildWall(1);
      g.level = 1;
      g.score = 0;
      g.lives = LIVES;
      g.stuck = true;
      syncHud();
    }
    play('click_primary');
    setPhase('playing');
    launchBall();
    boardRef.current?.focus();
  };

  const loseLife = () => {
    const g = game.current;
    g.lives -= 1;
    g.stuck = true;
    syncHud();
    play('transition');
    if (g.lives > 0) return;
    setPhase('over');
    if (saveBest(BEST_KEY, 'Neon Breakout', g.score)) setBest(g.score);
  };

  const step = useCallback((dt: number) => {
    const g = game.current;
    if (g.held.left) g.paddleX -= PADDLE_SPEED * dt;
    if (g.held.right) g.paddleX += PADDLE_SPEED * dt;
    g.paddleX = Math.min(FIELD_W - PADDLE_W / 2, Math.max(PADDLE_W / 2, g.paddleX));

    const b = g.ball;
    if (g.stuck) {
      b.x = g.paddleX;
      b.y = PADDLE_Y - BALL_R;
      return;
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    if (b.x < BALL_R || b.x > FIELD_W - BALL_R) {
      b.x = Math.min(FIELD_W - BALL_R, Math.max(BALL_R, b.x));
      b.vx = -b.vx;
    }
    if (b.y < BALL_R) {
      b.y = BALL_R;
      b.vy = Math.abs(b.vy);
    }

    // Paddle: where it lands sets the angle, which is what makes aiming possible.
    const reach = PADDLE_W / 2 + BALL_R;
    if (b.vy > 0 && b.y + BALL_R >= PADDLE_Y && b.y < PADDLE_Y + PADDLE_H && Math.abs(b.x - g.paddleX) <= reach) {
      const speed = Math.hypot(b.vx, b.vy);
      const angle = ((b.x - g.paddleX) / reach) * MAX_BOUNCE;
      b.vx = Math.sin(angle) * speed;
      b.vy = -Math.cos(angle) * speed;
      b.y = PADDLE_Y - BALL_R;
      play('click_secondary');
    }

    const hit = g.bricks.find((k) => k.alive && b.x + BALL_R > k.x && b.x - BALL_R < k.x + BRICK_W && b.y + BALL_R > k.y && b.y - BALL_R < k.y + BRICK_H);
    if (hit) {
      hit.alive = false;
      g.score += brickScore(hit.row) * g.level;
      const overlapX = Math.min(b.x + BALL_R - hit.x, hit.x + BRICK_W - (b.x - BALL_R));
      const overlapY = Math.min(b.y + BALL_R - hit.y, hit.y + BRICK_H - (b.y - BALL_R));
      if (overlapX < overlapY) b.vx = -b.vx;
      else b.vy = -b.vy;
      play('hover');
      if (g.bricks.every((k) => !k.alive)) {
        g.level += 1;
        g.bricks = buildWall(g.level);
        g.stuck = true;
        play('transition');
      }
      syncHud();
    }

    if (b.y > FIELD_H + BALL_R) loseLife();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const scale = (w / FIELD_W) * dpr;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, FIELD_W, FIELD_H);

    const g = game.current;
    for (const k of g.bricks) {
      if (!k.alive) continue;
      const hue = brickHue(k.row);
      ctx.shadowBlur = 10;
      ctx.shadowColor = `hsl(${hue} 100% 60%)`;
      ctx.fillStyle = `hsl(${hue} 90% 62%)`;
      ctx.beginPath();
      ctx.roundRect(k.x, k.y, BRICK_W, BRICK_H, 4);
      ctx.fill();
    }

    ctx.shadowBlur = 16;
    ctx.shadowColor = '#2effb0';
    ctx.fillStyle = '#c9ffe9';
    ctx.beginPath();
    ctx.roundRect(g.paddleX - PADDLE_W / 2, PADDLE_Y, PADDLE_W, PADDLE_H, 6);
    ctx.fill();

    ctx.shadowBlur = 18;
    ctx.shadowColor = '#ff3df2';
    ctx.fillStyle = '#ff9ff8';
    ctx.beginPath();
    ctx.arc(g.ball.x, g.ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(MAX_STEP, (now - last) / 1000);
      last = now;
      if (!dockedRef.current) {
        if (phaseRef.current === 'playing') step(dt);
        draw();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [step, draw]);

  const onKey = (e: KeyboardEvent, down: boolean) => {
    const held = game.current.held;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (key === 'ArrowLeft' || key === 'a') held.left = down;
    else if (key === 'ArrowRight' || key === 'd') held.right = down;
    else if ((key === ' ' || key === 'Enter') && down) {
      if (phase !== 'playing') start();
      else if (game.current.stuck) launchBall();
      else setPhase('paused');
    } else return;
    e.preventDefault();
  };

  const followPointer = (e: ReactPointerEvent) => {
    const box = canvasRef.current?.getBoundingClientRect();
    if (box) game.current.paddleX = ((e.clientX - box.left) / box.width) * FIELD_W;
  };

  const waiting = phase === 'playing' && hud.stuck;

  return (
    <div className="app-snake">
      <div className="app-snake-hud">
        <span>
          Score <b>{hud.score}</b>
        </span>
        <span>
          <Trophy size={14} /> Best <b>{best}</b>
        </span>
        <span>
          <Heart size={14} /> Lives <b>{hud.lives}</b>
        </span>
        <span>
          Level <b>{hud.level}</b>
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
        aria-label="Neon Breakout. Left and right arrows or the pointer move the paddle, Space launches and pauses."
        onKeyDown={(e) => onKey(e, true)}
        onKeyUp={(e) => onKey(e, false)}
        onPointerMove={followPointer}
        onPointerDown={(e) => {
          followPointer(e);
          if (phase !== 'playing') start();
          else launchBall();
        }}
      >
        <canvas ref={canvasRef} />
        {(phase !== 'playing' || waiting) && (
          <div className="app-snake-overlay">
            <strong>{phase === 'over' ? 'Game over' : phase === 'paused' ? 'Paused' : phase === 'ready' ? 'Neon Breakout' : `Level ${hud.level}`}</strong>
            <span>
              {phase === 'over'
                ? `You scored ${hud.score}. ${hud.score > 0 && hud.score >= best ? 'New best!' : ''}`
                : waiting
                  ? 'Space or tap to launch'
                  : 'Arrow keys, A and D, or the pointer move the paddle · Space launches and pauses'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
