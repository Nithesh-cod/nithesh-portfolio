'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Home, LayoutGrid, Mic, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NRLogo } from '@/components/jarvis/NRLogo';
import { useLaunchApp } from '@/components/jarvis/useLaunchApp';
import { play } from '@/lib/audio';
import { tickerLines } from '@/lib/content';
import { DUR, EASE, EASE_IN } from '@/lib/jarvis/motion';
import { useOS } from '@/lib/jarvis/osStore';

function greetingFor(hour: number) {
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function OSSidebar() {
  const launch = useLaunchApp();
  const closeAll = useOS((s) => s.closeAll);
  const [greeting, setGreeting] = useState('Welcome');
  const [notesOpen, setNotesOpen] = useState(false);

  useEffect(() => setGreeting(greetingFor(new Date().getHours())), []);

  return (
    <aside className="jos-side">
      <div className="jos-greet">
        <span className="jos-greet-ring">
          <NRLogo size={46} />
        </span>
        <div>
          <small>{greeting},</small>
          <strong>Guest</strong>
          <span>You&apos;re on Nithesh&apos;s system.</span>
        </div>
      </div>

      <nav className="jos-nav" aria-label="JARVIS">
        <button
          type="button"
          className="is-active"
          onClick={() => {
            play('click_secondary');
            closeAll();
          }}
        >
          <Home size={19} /> Home
        </button>
        <button type="button" onClick={() => launch('more')}>
          <LayoutGrid size={19} /> Apps
        </button>
        <button type="button" onClick={() => launch('jarvis', { voice: true })}>
          <Mic size={19} /> Voice Assistant
        </button>
        <div className="jos-nav-notes">
          <button
            type="button"
            aria-expanded={notesOpen}
            onClick={() => {
              play('click_secondary');
              setNotesOpen((o) => !o);
            }}
          >
            <Bell size={19} /> Notifications <em>{tickerLines.length}</em>
          </button>
          <AnimatePresence>
            {notesOpen && (
              <motion.ul
                className="jos-notes"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0, transition: { duration: DUR.standard, ease: EASE } }}
                exit={{ opacity: 0, y: -4, transition: { duration: DUR.quick, ease: EASE_IN } }}
              >
                {tickerLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
        <button type="button" onClick={() => launch('settings')}>
          <Settings size={19} /> Settings
        </button>
      </nav>

      <blockquote className="jos-quote">
        “The best version of you is still loading…”
        <cite>— JARVIS</cite>
      </blockquote>
    </aside>
  );
}
