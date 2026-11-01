'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Home, LayoutGrid, Mic, Settings } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { NRLogo } from '@/components/jarvis/NRLogo';
import { useShell } from '@/components/jarvis/shellStore';
import { useLaunchApp } from '@/components/jarvis/useLaunchApp';
import { useNotes } from '@/components/jarvis/useNotes';
import { play } from '@/lib/audio';
import { DUR, EASE } from '@/lib/jarvis/motion';
import { useOS } from '@/lib/jarvis/osStore';

function greetingFor(hour: number) {
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const NAV_ITEMS = ['home', 'apps', 'voice', 'notifications', 'settings'] as const;

function NavItem({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={active ? 'is-active' : undefined} aria-current={active ? 'true' : undefined} onClick={onClick}>
      {children}
    </button>
  );
}

export function OSSidebar() {
  const launch = useLaunchApp();
  const panel = useShell((s) => s.panel);
  const togglePanel = useShell((s) => s.togglePanel);
  const closePanel = useShell((s) => s.closePanel);
  const frontWindow = useOS((s) => {
    const visible = s.windows.filter((w) => !w.minimized);
    return visible.length ? visible.reduce((a, b) => (b.z > a.z ? b : a)).id : null;
  });
  const { unread } = useNotes();
  const [greeting, setGreeting] = useState('Welcome');

  useEffect(() => setGreeting(greetingFor(new Date().getHours())), []);

  const active = panel === 'launcher' ? 'apps' : panel === 'notifications' ? 'notifications' : frontWindow === 'settings' ? 'settings' : frontWindow === 'jarvis' ? 'voice' : frontWindow ? null : 'home';

  // Home shows the desktop. Windows go to the dock rather than being closed, so
  // nothing open is lost by coming back here.
  const showDesktop = () => {
    play('click_secondary');
    closePanel();
    const { windows, minimize } = useOS.getState();
    windows.forEach((w) => minimize(w.id));
  };

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

      <nav className="jos-nav" aria-label="JARVIS" style={{ ['--nav-index' as string]: active ? NAV_ITEMS.indexOf(active) : 0 }}>
        {/* Always mounted and moved by CSS. A motion element mounting here while
            the OS exits (the active item changes as it leaves) would never report
            done, and AnimatePresence would keep the OS on screen for good. */}
        <span className={active ? 'jos-nav-glow' : 'jos-nav-glow is-off'} aria-hidden />
        <NavItem active={active === 'home'} onClick={showDesktop}>
          <Home size={19} /> Home
        </NavItem>
        <NavItem
          active={active === 'apps'}
          onClick={() => {
            play('click_secondary');
            togglePanel('launcher');
          }}
        >
          <LayoutGrid size={19} /> Apps
        </NavItem>
        <NavItem active={active === 'voice'} onClick={() => launch('jarvis', { voice: true })}>
          <Mic size={19} /> Voice Assistant
        </NavItem>
        <NavItem
          active={active === 'notifications'}
          onClick={() => {
            play('click_secondary');
            togglePanel('notifications');
          }}
        >
          <Bell size={19} /> Notifications
          <AnimatePresence>
            {unread > 0 && (
              <motion.em
                key={unread}
                aria-label={`${unread} unread`}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1, transition: { duration: DUR.quick, ease: EASE } }}
                exit={{ scale: 0.4, opacity: 0, transition: { duration: DUR.quick, ease: EASE } }}
              >
                {unread}
              </motion.em>
            )}
          </AnimatePresence>
        </NavItem>
        <NavItem active={active === 'settings'} onClick={() => launch('settings')}>
          <Settings size={19} /> Settings
        </NavItem>
      </nav>

      <blockquote className="jos-quote">
        “The best version of you is still loading…”
        <cite>— JARVIS</cite>
      </blockquote>
    </aside>
  );
}
