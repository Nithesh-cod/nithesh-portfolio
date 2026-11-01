'use client';

import { NRLogo } from '@/components/jarvis/NRLogo';
import { content } from '@/lib/content';
import { useDeviceInfo } from '@/lib/jarvis/device';

const STACK = ['Next.js 14', 'React 18', 'three.js', 'React Three Fiber', 'Framer Motion', 'GSAP', 'Zustand', 'JARVIS built-in AI', 'Claude Opus 5.5 (when connected)'];

const CREDITS: [string, string, string][] = [
  ['3D models', 'Poly Haven: plants, desk lamp, console, gamepad (CC0)', 'https://polyhaven.com/'],
  ['Weather data', 'Open-Meteo.com', 'https://open-meteo.com/'],
  ['Icons', 'Lucide (ISC licence)', 'https://lucide.dev/'],
  ['Fonts', 'Orbitron, Space Grotesk, Inter, JetBrains Mono (SIL OFL)', 'https://fonts.google.com/'],
];

/** System specs (yours, measured live) and credits. */
export function AboutApp() {
  const device = useDeviceInfo();
  const rows: [string, string][] = [
    ['CPU', device?.cores ? `${device.cores} threads` : '—'],
    ['Memory', device?.memoryGB ? `${device.memoryGB} GB+ (browser-reported)` : '—'],
    ['GPU', device?.gpu ?? '—'],
    ['Display', device?.screen ?? '—'],
    ['Network', device?.network ?? (device?.online ? 'Online' : '—')],
  ];

  return (
    <div className="app-about">
      <header>
        <NRLogo size={64} />
        <div>
          <h3>JARVIS OS</h3>
          <p>Version 1.0 · designed and built by {content.hero.name}</p>
        </div>
      </header>

      <section>
        <h4>Your device</h4>
        <dl className="app-pc-props">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h4>Built with</h4>
        <div className="app-chips">
          {STACK.map((s) => (
            <em key={s}>{s}</em>
          ))}
        </div>
      </section>

      <section>
        <h4>Credits</h4>
        <ul className="app-credits">
          {CREDITS.map(([what, who, url]) => (
            <li key={what}>
              <span>{what}</span>
              <a href={url} target="_blank" rel="noopener noreferrer">
                {who}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
