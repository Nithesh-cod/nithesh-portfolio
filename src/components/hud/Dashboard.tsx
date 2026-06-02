'use client';

import { useEffect, useState } from 'react';
import {
  Award,
  BarChart3,
  BrainCircuit,
  Briefcase,
  Cloud,
  CloudCog,
  Code2,
  Cpu,
  Download,
  Folder,
  FolderGit2,
  GitBranch,
  Globe,
  Home,
  LineChart,
  Mail,
  Palette,
  Shield,
  ShieldCheck,
  Sparkles as SparklesIcon,
  User,
} from 'lucide-react';
import {
  achievements,
  certificateGroups,
  content,
  coreExpertise,
  liveFeed,
  metrics,
  navItems,
  philosophy,
  services,
  systemStatus,
  taglineRoles,
  techStack,
} from '@/lib/content';
import { usePortfolioStore } from '@/lib/store';

/* ─────────────────────────── icon lookup ─────────────────────────── */
// Lucide icons are typed as ForwardRefExoticComponent which doesn't fit a
// generic React.ComponentType — use any here to keep the lookup simple.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ICONS: Record<string, any> = {
  Home, User, FolderGit2, Folder, Sparkles: SparklesIcon, Briefcase, Award, Mail,
  Code2, BrainCircuit, Cloud, Shield, BarChart3, Palette,
  Cpu, Globe, CloudCog, LineChart, ShieldCheck,
};
function Icon({ name, ...rest }: { name: string; className?: string; size?: number }) {
  const Cmp = ICONS[name] ?? Home;
  return <Cmp {...rest} />;
}

/* ───────────────────────────── Top bar ───────────────────────────── */
export function TopBar() {
  return (
    <div className="pointer-events-auto fixed left-0 right-0 top-0 z-40 flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-3">
        {/* NR hex logo. */}
        <div className="flex h-10 w-10 items-center justify-center border border-neon-green/60 bg-bg-base/70 font-mono text-[12px] font-bold tracking-tight text-neon-bright [clip-path:polygon(25%_0%,75%_0%,100%_50%,75%_100%,25%_100%,0%_50%)]">
          NR
        </div>
        <div className="leading-tight">
          <div className="font-sans text-[15px] font-bold tracking-[0.2em] text-neon-bright">
            {content.hero.name.toUpperCase()}
          </div>
          <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-text-sec">
            {taglineRoles.join('  |  ')}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Clock />
        <div className="flex items-center gap-2 rounded-sm border border-neon-green/60 bg-[rgba(0,255,136,0.06)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-neon-bright">
          <span aria-hidden className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-neon-bright shadow-[0_0_8px_#4DFFAA]" />
          SYSTEM ONLINE
        </div>
      </div>
    </div>
  );
}

function Clock() {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const hh = String(d.getUTCHours()).padStart(2, '0');
      const mm = String(d.getUTCMinutes()).padStart(2, '0');
      const ss = String(d.getUTCSeconds()).padStart(2, '0');
      setNow(`${hh}:${mm}:${ss} UTC`);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <span className="hidden font-mono text-[11px] tabular-nums tracking-[0.15em] text-text-sec sm:inline">
      {now ?? '—:—:— UTC'}
    </span>
  );
}

/* ───────────────────────────── Panel shell ─────────────────────────
 * V9.3 — `hud-panel` class brings glass + scanline + perspective.
 * The `tilt` prop selects which side-tilt transform variant to apply.
 */
function Panel({
  title,
  subtitle,
  children,
  className = '',
  tilt = 'left',
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  tilt?: 'left' | 'right' | 'center' | 'bottom';
}) {
  return (
    <div className={`hud-panel hud-panel--${tilt} ${className}`}>
      {title && (
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.22em] text-neon-bright">
            {title}
          </h3>
          {subtitle && <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-text-sec">{subtitle}</span>}
        </div>
      )}
      {children}
    </div>
  );
}

/* ───────────────────────────── Left rail ─────────────────────────── */
export function LeftRail() {
  const openResume = usePortfolioStore((s) => s.openResume);
  return (
    <aside className="hud-rail pointer-events-auto fixed left-4 top-[88px] z-30 hidden w-[210px] flex-col gap-3 lg:flex">
      {/* Navigation menu. */}
      <Panel className="!p-2">
        <ul className="flex flex-col gap-1">
          {navItems.map((n, i) => (
            <li key={n.id}>
              <button
                type="button"
                className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left transition hover:bg-neon-green/8 ${i === 0 ? 'border-l-2 border-neon-green bg-neon-green/8' : ''}`}
              >
                <Icon name={n.icon} size={14} className="text-neon-bright" />
                <div className="leading-tight">
                  <div className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-text-prim">
                    {n.label}
                  </div>
                  <div className="font-sans text-[9px] text-text-sec">{n.subtitle}</div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </Panel>

      {/* Core expertise. */}
      <Panel title="CORE EXPERTISE">
        <div className="grid grid-cols-3 gap-1.5">
          {coreExpertise.map((e) => (
            <div
              key={e.title}
              className="flex flex-col items-center gap-1 border border-neon-green/25 bg-bg-base/40 p-2 text-center transition hover:border-neon-green/70 [clip-path:polygon(15%_0%,85%_0%,100%_50%,85%_100%,15%_100%,0%_50%)]"
              title={e.title}
            >
              <Icon name={e.icon} size={16} className="text-neon-green" />
              <div className="font-mono text-[7px] uppercase leading-[1.1] tracking-[0.1em] text-text-prim">
                {e.title}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Tech stack. */}
      <Panel title="TECH STACK">
        <div className="grid grid-cols-4 gap-1.5">
          {techStack.map((tech) => (
            <div
              key={tech}
              className="flex flex-col items-center gap-1 rounded-sm border border-neon-green/20 bg-bg-base/40 p-1.5 transition hover:border-neon-green/60"
              title={tech}
            >
              <div className="h-4 w-4 rounded-sm bg-neon-green/15 ring-1 ring-neon-green/40" />
              <span className="font-mono text-[7px] uppercase tracking-[0.06em] text-text-sec">{tech}</span>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="mt-2 w-full text-left font-mono text-[9px] uppercase tracking-[0.22em] text-neon-bright transition hover:text-neon-green"
        >
          VIEW ALL SKILLS →
        </button>
      </Panel>

      {/* Current status + resume. */}
      <Panel title="CURRENT STATUS">
        <ul className="space-y-1.5 font-sans text-[10px] text-text-prim">
          <li className="flex items-center gap-2">
            <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-neon-bright shadow-[0_0_6px_#4DFFAA]" />
            Available for new opportunities
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-neon-bright shadow-[0_0_6px_#4DFFAA]" />
            Open to collaborate
          </li>
        </ul>
        <button
          type="button"
          onClick={openResume}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-sm border border-neon-green/50 bg-[rgba(0,255,136,0.08)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-neon-bright transition hover:bg-[rgba(0,255,136,0.14)]"
        >
          <Download size={12} />
          DOWNLOAD RESUME
        </button>
      </Panel>

      {/* Contact links. */}
      <Panel title="GET IN TOUCH">
        <ul className="space-y-1.5 font-mono text-[10px] text-text-prim">
          <li className="flex items-center gap-2">
            <Mail size={12} className="text-neon-green" />
            <a href={`mailto:${content.contact.email}`} className="hover:text-neon-bright">{content.contact.email}</a>
          </li>
          <li className="flex items-center gap-2">
            <GitBranch size={12} className="text-neon-green" />
            <a href={content.contact.linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-neon-bright">
              linkedin.com/in/nithesh-r
            </a>
          </li>
          <li className="flex items-center gap-2">
            <GitBranch size={12} className="text-neon-green" />
            <span className="text-text-sec">github.com/…</span>
          </li>
        </ul>
      </Panel>
    </aside>
  );
}

/* ───────────────────────────── Right rail ────────────────────────── */
export function RightRail() {
  const openCertificate = usePortfolioStore((s) => s.openCertificate);
  const certs = certificateGroups.flatMap((g) => g.certs).slice(0, 12);

  return (
    <aside className="hud-rail pointer-events-auto fixed right-4 top-[88px] z-30 hidden w-[260px] flex-col gap-3 lg:flex">
      {/* System overview. */}
      <Panel title="SYSTEM OVERVIEW" tilt="right">
        <ul className="space-y-1 font-mono text-[10px]">
          {[
            { label: 'PROJECTS COMPLETED',  value: '25+' },
            { label: 'USERS IMPACTED',      value: '3.2K+' },
            { label: 'UPTIME',              value: '99%' },
            { label: 'COUNTRIES REACHED',   value: '12+' },
          ].map((row) => (
            <li key={row.label} className="flex items-center justify-between">
              <span className="uppercase tracking-[0.15em] text-text-sec">{row.label}</span>
              <span className="text-neon-bright">{row.value}</span>
            </li>
          ))}
        </ul>
      </Panel>

      {/* Project metrics (gauges). */}
      <Panel title="PROJECT METRICS" tilt="right">
        <div className="grid grid-cols-3 gap-2">
          {metrics.map((m) => (
            <RingGauge key={m.label} pct={m.ringPct} value={m.value} label={m.label} />
          ))}
        </div>
      </Panel>

      {/* Live feed. */}
      <Panel title="LIVE FEED" tilt="right">
        <ul className="space-y-1 font-mono text-[10px]">
          {liveFeed.map((row) => (
            <li key={row.event} className="flex items-center gap-2">
              <span className="text-text-sec">{row.ago}</span>
              <span className="text-text-prim">{row.event}</span>
            </li>
          ))}
        </ul>
      </Panel>

      {/* Credentials vault. */}
      <Panel title="CREDENTIALS VAULT" subtitle="CERTS · ACHIEVEMENTS" tilt="right">
        <div className="grid grid-cols-3 gap-1.5">
          {certs.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => openCertificate(c.id)}
              className="cert-card aspect-[3/4] rounded-sm border border-neon-green/40 bg-bg-base/50 p-1 transition hover:border-neon-bright hover:shadow-[0_0_12px_rgba(77,255,170,0.4)]"
              style={{ ['--cert-index' as string]: i }}
              title={c.title}
            >
              <div
                className="h-full w-full rounded-sm bg-cover bg-center opacity-90"
                style={{ backgroundImage: `url(${c.image})` }}
              />
            </button>
          ))}
        </div>
        <div className="mt-2 text-center font-mono text-[8px] uppercase tracking-[0.22em] text-text-sec">
          CONTINUOUSLY LEARNING — FOREVER GROWING
        </div>
      </Panel>

      {/* Philosophy. */}
      <Panel title="MY PHILOSOPHY" tilt="right">
        <blockquote className="font-sans text-[11px] italic leading-snug text-text-prim">
          <span className="mr-1 font-serif text-base text-neon-green">“</span>
          {philosophy}
          <span className="ml-1 font-serif text-base text-neon-green">”</span>
        </blockquote>
        <div className="mt-2 text-right font-mono text-[9px] uppercase tracking-[0.18em] text-text-sec">
          — {content.hero.name}
        </div>
      </Panel>
    </aside>
  );
}

function RingGauge({ pct, value, label }: { pct: number; value: string; label: string }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="54" height="54" viewBox="0 0 54 54">
        <circle cx="27" cy="27" r={r} stroke="rgba(0,255,136,0.15)" strokeWidth="3" fill="none" />
        <circle
          cx="27"
          cy="27"
          r={r}
          stroke="#00FF88"
          strokeWidth="3"
          fill="none"
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
          transform="rotate(-90 27 27)"
          style={{ filter: 'drop-shadow(0 0 4px #00FF88)' }}
        />
        <text
          x="27"
          y="31"
          textAnchor="middle"
          className="fill-neon-bright"
          style={{ font: '600 11px ui-sans-serif, system-ui' }}
        >
          {value}
        </text>
      </svg>
      <div className="text-center font-mono text-[7px] uppercase leading-tight tracking-[0.12em] text-text-sec">
        {label}
      </div>
    </div>
  );
}

/* ───────────────────────── Achievements + status (near capsule) ──── */
export function CapsuleOverlays() {
  return (
    <>
      {/* Left of capsule — achievements + about. */}
      <div className="pointer-events-auto fixed left-[240px] top-[120px] z-20 hidden w-[180px] flex-col gap-3 lg:flex">
        <Panel title="ACHIEVEMENTS">
          <ul className="space-y-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-text-prim">
            {achievements.map((a) => (
              <li key={a} className="flex items-center gap-1.5">
                <span aria-hidden className="inline-block h-1 w-1 rounded-full bg-neon-bright" />
                {a}
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="ABOUT ME">
          <p className="font-sans text-[10px] leading-snug text-text-prim">
            Passionate developer and problem solver, building intelligent solutions that create real-world impact through cutting-edge technologies.
          </p>
        </Panel>
      </div>

      {/* Right of capsule — system status. */}
      <div className="pointer-events-auto fixed right-[280px] top-[120px] z-20 hidden w-[180px] flex-col gap-3 lg:flex">
        <Panel title="SYSTEM STATUS" tilt="right">
          <ul className="space-y-1.5 font-mono text-[10px]">
            {systemStatus.map((s) => (
              <li key={s.label} className="flex items-center justify-between">
                <span className="uppercase tracking-[0.15em] text-text-sec">{s.label}</span>
                <span className="status-value text-neon-bright">{s.value}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

/* ───────────────────────── Bottom services strip ─────────────────── */
export function ServicesStrip() {
  return (
    <div className="hud-panel hud-panel--bottom pointer-events-auto fixed bottom-2 left-2 right-2 z-30 !rounded-none border-t border-neon-green/30 !px-4 !py-3">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-2">
        <h3 className="text-center font-mono text-[11px] uppercase tracking-[0.32em] text-neon-bright">
          SERVICES I OFFER
        </h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {services.map((s) => (
            <div key={s.title} className="flex flex-col items-center text-center">
              <div className="mb-1 flex h-8 w-8 items-center justify-center rounded-sm bg-neon-green/10 ring-1 ring-neon-green/40">
                <Icon name={s.icon} size={14} className="text-neon-bright" />
              </div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-text-prim">
                {s.title}
              </div>
              <div className="font-sans text-[8px] leading-snug text-text-sec">{s.lines[0]}</div>
              <div className="font-sans text-[8px] leading-snug text-text-sec">{s.lines[1]}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
