'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { content } from '@/lib/content';
import { play } from '@/lib/audio';

type Line = { id: number; text: string; kind: 'in' | 'out' | 'err' };

const PROMPT = 'nithesh@lab:~$ ';
const HELP = [
  'help          list available commands',
  'about         one-line bio',
  'projects      shipped work + URLs',
  'skills        grouped tech stack',
  'contact       reach me',
  'whoami        guest',
  'clear         wipe output',
  'matrix        rain for 5 seconds',
  'sudo hire-me  open mail to me',
].join('\n');

/**
 * Press ` (Backquote) anywhere to toggle the terminal. Esc closes.
 * Focus is trapped on the input while open; restored to the prior element on close.
 * Commands are pure data — easy to extend in MM_COMMANDS below.
 */
export function Terminal() {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>([
    {
      id: 0,
      kind: 'out',
      text: "Type 'help' and press Enter. Press Esc to close.",
    },
  ]);
  const [input, setInput] = useState('');
  const [matrix, setMatrix] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const nextId = useRef(1);

  const COMMANDS = useMemo<Record<string, () => string | 'CLEAR' | 'MATRIX' | 'HIRE'>>(
    () => ({
      help: () => HELP,
      about: () => content.about,
      whoami: () => 'guest',
      projects: () =>
        content.projects
          .map((p) => `${p.name.padEnd(16)} ${p.url}\n  ${p.stack.join(' · ')}`)
          .join('\n\n'),
      skills: () =>
        Object.entries(content.skills)
          .map(([k, v]) => `${k.padEnd(14)} ${v.join(' · ')}`)
          .join('\n'),
      contact: () =>
        [
          `email     ${content.contact.email}`,
          `linkedin  ${content.contact.linkedin}`,
          `github    ${content.contact.github ?? '(coming soon)'}`,
        ].join('\n'),
      clear: () => 'CLEAR',
      matrix: () => 'MATRIX',
      'sudo hire-me': () => 'HIRE',
    }),
    [],
  );

  /* ── Global ` toggle + Esc close ─────────────────────────────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Backquote' && !e.repeat) {
        e.preventDefault();
        setOpen((v) => {
          if (!v) {
            restoreFocusRef.current = (document.activeElement as HTMLElement) ?? null;
            play('transition');
          }
          return !v;
        });
      } else if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    } else {
      restoreFocusRef.current?.focus?.();
    }
  }, [open]);

  const pushLine = (text: string, kind: Line['kind']) => {
    setLines((prev) => [...prev, { id: nextId.current++, text, kind }]);
  };

  const handleSubmit = useCallback(
    (raw: string) => {
      const cmd = raw.trim().toLowerCase();
      pushLine(`${PROMPT}${raw}`, 'in');
      setInput('');
      if (!cmd) return;
      const action = COMMANDS[cmd];
      if (!action) {
        pushLine(`command not found: ${cmd}. Try 'help'.`, 'err');
        play('click_secondary');
        return;
      }
      const result = action();
      play('click_primary');
      if (result === 'CLEAR') {
        setLines([]);
        return;
      }
      if (result === 'MATRIX') {
        setMatrix(true);
        window.setTimeout(() => setMatrix(false), 5000);
        return;
      }
      if (result === 'HIRE') {
        window.location.href = `mailto:${content.contact.email}`;
        return;
      }
      pushLine(result, 'out');
    },
    [COMMANDS],
  );

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="terminal"
          role="dialog"
          aria-modal="true"
          aria-label="Terminal"
          className="fixed inset-0 z-[75] flex flex-col bg-void/95 font-mono text-terminal-grn backdrop-blur-md"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <div className="border-b border-emerald-mid/40 px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-bone">
            terminal — press ` or Esc to close
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 text-[13px] leading-relaxed">
            {lines.map((l) => (
              <pre
                key={l.id}
                className={`whitespace-pre-wrap break-words ${
                  l.kind === 'err' ? 'text-amber-key' : ''
                }`}
              >
                {l.text}
              </pre>
            ))}
            {matrix ? <MatrixRain /> : null}
          </div>

          <form
            className="flex items-center gap-2 border-t border-emerald-mid/40 px-4 py-3"
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(input);
            }}
          >
            <span aria-hidden>{PROMPT}</span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              spellCheck={false}
              autoComplete="off"
              aria-label="Terminal input"
              className="flex-1 bg-transparent text-terminal-grn caret-terminal-grn focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Tab') e.preventDefault(); // trap focus
              }}
            />
          </form>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** Pure-CSS matrix rain — 24 columns of dropping katakana glyphs, 5s lifecycle. */
function MatrixRain() {
  const cols = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const glyphs = '0123456789ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂ';
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-12 bottom-16 overflow-hidden">
      {cols.map((c) => {
        const left = (c / cols.length) * 100;
        const delay = (c * 0.13) % 1.2;
        const dur = 2 + (c % 4) * 0.4;
        const chars = Array.from({ length: 30 }, () =>
          glyphs[Math.floor(Math.random() * glyphs.length)],
        );
        return (
          <div
            key={c}
            className="absolute top-0 flex flex-col gap-1 text-[14px] text-terminal-grn opacity-70"
            style={{
              left: `${left}%`,
              animation: `mxfall ${dur}s linear ${delay}s infinite`,
            }}
          >
            {chars.map((g, i) => (
              <span key={i} style={{ opacity: 1 - i / chars.length }}>
                {g}
              </span>
            ))}
          </div>
        );
      })}
      <style>{`@keyframes mxfall { 0% { transform: translateY(-100%); } 100% { transform: translateY(110vh); } }`}</style>
    </div>
  );
}
