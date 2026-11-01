'use client';

import { useEffect, useRef, useState } from 'react';
import { APPS } from '@/components/jarvis/apps/registry';
import { useLaunchApp } from '@/components/jarvis/useLaunchApp';
import { play } from '@/lib/audio';
import { allProjects, certificateGroups, content, skillCategories } from '@/lib/content';
import { useDeviceInfo } from '@/lib/jarvis/device';
import { useOS, type AppId } from '@/lib/jarvis/osStore';
import { useWeather } from '@/lib/jarvis/weather';

type Line = { id: number; text: string; kind: 'in' | 'out' | 'err' | 'ok' };

const PROMPT = 'guest@jarvis:~$';
const OPENABLE: AppId[] = (Object.keys(APPS) as AppId[]).filter((id) => id !== 'teach');

const HELP = `Commands
  help              this list
  about             short bio
  projects          every project, with links
  skills            grouped tech stack
  certs             certificates
  contact           how to reach Nithesh
  neofetch          your system, JARVIS style
  weather           live Coimbatore weather
  date              current time in Coimbatore
  ls                list drives
  cat <file>        about.txt · skills.json
  open <app>        ${OPENABLE.join(' · ')}
  sudo hire-me      open Mail
  history · clear · exit`;

// Plain ASCII so every glyph is exactly one monospace cell wide.
const NR_ART = [
  ' _   _ ____  ',
  '| \\ | |  _ \\ ',
  '|  \\| | |_) |',
  '| |\\  |  _ < ',
  '|_| \\_|_| \\_\\',
];

const started = typeof performance !== 'undefined' ? performance.now() : 0;

/** In-window terminal. Commands only print real data from content.ts or the visitor's browser. */
export function TerminalApp() {
  const [lines, setLines] = useState<Line[]>([
    { id: 0, kind: 'ok', text: 'JARVIS OS terminal · type "help" and press Enter. Tab completes, ↑/↓ recalls.' },
  ]);
  const [input, setInput] = useState('');
  const [past, setPast] = useState<string[]>([]);
  const [recall, setRecall] = useState(-1);
  const nextId = useRef(1);
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const launch = useLaunchApp();
  const close = useOS((s) => s.close);
  const device = useDeviceInfo();
  const weather = useWeather();

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [lines]);
  useEffect(() => inputRef.current?.focus(), []);

  const print = (text: string, kind: Line['kind'] = 'out') =>
    setLines((prev) => [...prev, { id: nextId.current++, text, kind }]);

  const run = (raw: string): void => {
    const cmd = raw.trim();
    const [name = '', ...rest] = cmd.split(/\s+/);
    const arg = rest.join(' ').toLowerCase();
    switch (name.toLowerCase()) {
      case '':
        return;
      case 'help':
        return print(HELP);
      case 'about':
        return print(content.about);
      case 'whoami':
        return print('guest — welcome to Nithesh’s system.');
      case 'projects':
        return print(
          allProjects
            .map((p) => `${p.name.padEnd(22)}${p.status ? `[${p.status}] ` : ''}${p.url ?? p.repo ?? ''}\n  ${p.stack.join(' · ')}`)
            .join('\n'),
        );
      case 'skills':
        return print(skillCategories.map((c) => `${c.title.padEnd(18)}${c.items.join(' · ')}`).join('\n'));
      case 'certs':
        return print(
          certificateGroups
            .map((g) => `${g.heading}\n${g.certs.map((c) => `  ${c.title} — ${c.date}`).join('\n')}`)
            .join('\n'),
        );
      case 'contact':
        return print(
          [
            `email     ${content.contact.email}`,
            `phone     ${content.contact.phone}`,
            `linkedin  ${content.contact.linkedin}`,
            `github    ${content.contact.github ?? '—'}`,
          ].join('\n'),
        );
      case 'ls':
        return print('C:/Projects/      D:/Certificates/      Documents/      Media/\n(open thispc to browse them)');
      case 'cat':
        if (arg === 'about.txt') return print(content.about);
        if (arg === 'skills.json')
          return print(JSON.stringify(Object.fromEntries(skillCategories.map((c) => [c.title.toLowerCase(), c.items])), null, 2));
        return print(`cat: ${arg || '(nothing)'}: no such file. Try about.txt or skills.json`, 'err');
      case 'date':
        return print(
          new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'long' }).format(new Date()),
        );
      case 'weather':
        return print(
          weather
            ? `Coimbatore · ${weather.tempC}°C · ${weather.label} (Open-Meteo, live)`
            : 'Weather is still loading (or the Open-Meteo request was blocked).',
          weather ? 'out' : 'err',
        );
      case 'neofetch': {
        const up = Math.round((performance.now() - started) / 1000);
        const info = [
          `guest@jarvis`,
          `────────────`,
          `OS        JARVIS OS 1.0 (web)`,
          `Owner     ${content.hero.name}`,
          `Uptime    ${Math.floor(up / 60)}m ${up % 60}s`,
          `CPU       ${device?.cores ?? '—'} threads`,
          `Memory    ${device?.memoryGB ? `${device.memoryGB} GB+` : '—'}`,
          `GPU       ${device?.gpu ?? '—'}`,
          `Display   ${device?.screen ?? '—'}`,
          `Network   ${device?.network ?? (device?.online ? 'online' : '—')}`,
          `AI        JARVIS built-in AI`,
        ];
        return print(info.map((l, i) => `${(NR_ART[i] ?? ' '.repeat(13)).padEnd(16)}${l}`).join('\n'), 'ok');
      }
      case 'open': {
        const id = arg.replace(/\s+/g, '') as AppId;
        if (!OPENABLE.includes(id)) return print(`open: unknown app "${arg}". Apps: ${OPENABLE.join(', ')}`, 'err');
        launch(id);
        return print(`opening ${APPS[id].title}…`, 'ok');
      }
      case 'sudo':
        if (arg === 'hire-me') {
          launch('mail');
          return print('permission granted. Opening Mail…', 'ok');
        }
        if (arg === 'teach') {
          launch('teach');
          return print('password required.', 'ok');
        }
        return print('sudo: only "hire-me" is allowed here 😉', 'err');
      case 'history':
        return print(past.map((p, i) => `${String(i + 1).padStart(3)}  ${p}`).join('\n') || '(empty)');
      case 'clear':
        return setLines([]);
      case 'exit':
        return close('terminal');
      case 'echo':
        return print(rest.join(' '));
      default:
        play('click_secondary');
        return print(`command not found: ${name}. Type "help".`, 'err');
    }
  };

  const complete = () => {
    const words = ['help', 'about', 'projects', 'skills', 'certs', 'contact', 'neofetch', 'weather', 'date', 'ls', 'cat', 'open', 'sudo hire-me', 'history', 'clear', 'exit'];
    const [head, tail] = input.split(/\s+(.*)/);
    if (tail !== undefined) {
      const pool = head === 'open' ? OPENABLE : head === 'cat' ? ['about.txt', 'skills.json'] : [];
      const hit = pool.find((w) => w.startsWith(tail));
      if (hit) setInput(`${head} ${hit}`);
      return;
    }
    const hit = words.find((w) => w.startsWith(input));
    if (hit) setInput(hit);
  };

  return (
    <div className="app-term" onClick={() => inputRef.current?.focus()}>
      <div ref={scroller} className="app-term-out" role="log" aria-live="polite">
        {lines.map((l) => (
          <pre key={l.id} className={`app-term-line is-${l.kind}`}>
            {l.text}
          </pre>
        ))}
      </div>
      <form
        className="app-term-in"
        onSubmit={(e) => {
          e.preventDefault();
          print(`${PROMPT} ${input}`, 'in');
          if (input.trim()) setPast((p) => [...p, input.trim()]);
          setRecall(-1);
          run(input);
          setInput('');
        }}
      >
        <label htmlFor="jarvis-term-input">{PROMPT}</label>
        <input
          id="jarvis-term-input"
          ref={inputRef}
          value={input}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Tab') {
              e.preventDefault();
              complete();
            } else if (e.key === 'ArrowUp' && past.length) {
              e.preventDefault();
              const i = recall < 0 ? past.length - 1 : Math.max(0, recall - 1);
              setRecall(i);
              setInput(past[i] ?? '');
            } else if (e.key === 'ArrowDown' && recall >= 0) {
              e.preventDefault();
              const i = recall + 1;
              if (i >= past.length) {
                setRecall(-1);
                setInput('');
              } else {
                setRecall(i);
                setInput(past[i] ?? '');
              }
            }
          }}
        />
      </form>
    </div>
  );
}
