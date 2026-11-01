'use client';

import { Activity, Bot, Cpu, ExternalLink, Gauge, Monitor, Network, TerminalSquare } from 'lucide-react';
import type { ReactNode } from 'react';
import { NRLogo } from '@/components/jarvis/NRLogo';
import { useLaunchApp } from '@/components/jarvis/useLaunchApp';
import { GitHubIcon, LinkedInIcon } from '@/components/ui/BrandIcons';
import { content, myApps } from '@/lib/content';
import { useDeviceInfo, useFps } from '@/lib/jarvis/device';

function Row({ icon, label, value, pct }: { icon: ReactNode; label: string; value: string; pct?: number }) {
  return (
    <div className="jos-stat">
      <span className="jos-stat-icon">{icon}</span>
      <div className="jos-stat-main">
        <div className="jos-stat-line">
          <span>{label}</span>
          <b title={value}>{value}</b>
        </div>
        {pct !== undefined && (
          <span className="jos-stat-bar">
            <i style={{ width: `${Math.max(4, Math.min(100, pct))}%` }} />
          </span>
        )}
      </div>
    </div>
  );
}

/** Live readings of the visitor's own device (not invented numbers), plus quick links. */
export function StatusPanel() {
  const fps = useFps();
  const device = useDeviceInfo();
  const launch = useLaunchApp();
  const stable = fps === null || fps >= 40;

  return (
    <aside className="jos-right">
      <section className="jos-panel">
        <header className="jos-online">
          <NRLogo size={52} />
          <div>
            <strong>JARVIS ONLINE</strong>
            <span className={stable ? 'is-ok' : 'is-warn'}>{stable ? 'SYSTEMS STABLE' : 'PERFORMANCE LOW'}</span>
            <svg className="jos-pulse" viewBox="0 0 120 20" aria-hidden>
              <polyline points="0,10 30,10 38,3 46,17 54,10 120,10" />
            </svg>
          </div>
        </header>
        <p className="jos-panel-note">Your device, measured live</p>
        <Row icon={<Gauge size={16} />} label="Frame rate" value={fps ? `${fps} FPS` : '—'} pct={fps ? (fps / 60) * 100 : 0} />
        <Row icon={<Cpu size={16} />} label="CPU threads" value={device?.cores ? String(device.cores) : '—'} />
        <Row icon={<Activity size={16} />} label="Memory" value={device?.memoryGB ? `${device.memoryGB} GB+` : '—'} />
        <Row icon={<Monitor size={16} />} label="GPU" value={device?.gpu ?? '—'} />
        <Row icon={<Network size={16} />} label="Network" value={device ? (device.online ? (device.network ?? 'Online') : 'Offline') : '—'} />
      </section>

      <section className="jos-panel">
        <h3 className="jos-panel-head">QUICK ACCESS</h3>
        <button type="button" className="jos-quick" onClick={() => launch('thispc')}>
          <Monitor size={17} /> This PC
        </button>
        <button type="button" className="jos-quick" onClick={() => launch('jarvis')}>
          <Bot size={17} /> JARVIS AI
        </button>
        <button type="button" className="jos-quick" onClick={() => launch('terminal')}>
          <TerminalSquare size={17} /> Terminal
        </button>
        {content.contact.github && (
          <a className="jos-quick" href={content.contact.github} target="_blank" rel="noopener noreferrer">
            <GitHubIcon size={16} /> GitHub <ExternalLink size={12} className="jos-quick-ext" />
          </a>
        )}
        <a className="jos-quick" href={content.contact.linkedin} target="_blank" rel="noopener noreferrer">
          <LinkedInIcon size={16} /> LinkedIn <ExternalLink size={12} className="jos-quick-ext" />
        </a>
        <div className="jos-setup">
          <span>My setup</span>
          <div>
            {myApps.map((a) => (
              <em key={a}>{a}</em>
            ))}
          </div>
        </div>
        <p className="jos-panel-quote">“Better tools, bigger dreams.”</p>
      </section>
    </aside>
  );
}
