'use client';

import { Html } from '@react-three/drei';
import { useState } from 'react';
import {
  ArrowRight,
  BrainCircuit,
  Cloud,
  Database,
  Download,
  Layout,
  Sparkles as SparklesIcon,
  TerminalSquare,
  TrendingUp,
  Users,
} from 'lucide-react';
import { usePortfolioStore } from '@/lib/store';
import { play } from '@/lib/audio';
import { PanelHeader } from '@/components/canvas/PanelHeader';

/* ──────────────────────────────────────────────────────────────────── *
 * V11.1 — every wall + floating HUD panel is now a styled DOM card    *
 * mounted via drei <Html transform>. CSS lives in globals.css under   *
 * the v11-* classes. Positions mirror the reference image.            *
 * ──────────────────────────────────────────────────────────────────── */

const HTML_DISTANCE_FACTOR = 2.4; // shrinks the DOM so it reads as in-scene

/* ─────────────────────────── LEFT-WALL STACK ──────────────────────── */

function CoreExpertisePanel() {
  return (
    <Html
      transform
      occlude={false}
      position={[-5.5, 3.0, 0.5]}
      rotation={[0, 0.35, 0]}
      distanceFactor={HTML_DISTANCE_FACTOR}
      style={{ pointerEvents: 'auto' }}
    >
      <div className="v11-card" style={{ width: 270 }}>
        <PanelHeader>CORE EXPERTISE</PanelHeader>
        <ExpertiseRow icon={<Layout size={16} />} title="FRONTEND" sub="React, Next.js, TypeScript" />
        <ExpertiseRow icon={<TerminalSquare size={16} />} title="BACKEND" sub="Node.js, Python, Express" />
        <ExpertiseRow icon={<Database size={16} />} title="DATABASE" sub="MongoDB, PostgreSQL" />
        <ExpertiseRow icon={<Cloud size={16} />} title="CLOUD & DEVOPS" sub="AWS, Docker, Kubernetes" />
        <ExpertiseRow icon={<BrainCircuit size={16} />} title="AI & AUTOMATION" sub="OpenAI, LangChain, n8n" accent="warm" />
        <CtaButton label="VIEW FULL STACK" />
      </div>
    </Html>
  );
}

function ExpertiseRow({
  icon,
  title,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  accent?: 'warm' | 'cool';
}) {
  const iconClass =
    accent === 'warm' ? 'v11-row-icon v11-row-icon--warm' :
    accent === 'cool' ? 'v11-row-icon v11-row-icon--cool' :
    'v11-row-icon';
  return (
    <div className="v11-row">
      <div className={iconClass}>{icon}</div>
      <div className="v11-row-text">
        <span className="v11-row-title">{title}</span>
        <span className="v11-row-sub">{sub}</span>
      </div>
    </div>
  );
}

/* ─────────────────────────── FRONT-LEFT FLOATING ──────────────────── */

function AboutMePanel() {
  const openResume = usePortfolioStore((s) => s.openResume);
  return (
    <Html
      transform
      occlude={false}
      position={[-3.5, 2.4, 1.0]}
      rotation={[0, 0.30, 0]}
      distanceFactor={HTML_DISTANCE_FACTOR}
      style={{ pointerEvents: 'auto' }}
    >
      <div className="v11-card" style={{ width: 230 }}>
        <PanelHeader>ABOUT ME</PanelHeader>
        <p className="v11-body">
          I build intelligent and scalable digital solutions that solve real-world problems using modern technologies and creative thinking.
        </p>
        <button
          type="button"
          className="v11-button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            play('click_primary');
            openResume();
          }}
        >
          <Download size={12} /> DOWNLOAD RESUME
        </button>
      </div>
    </Html>
  );
}

function AchievementsPanel() {
  return (
    <Html
      transform
      occlude={false}
      position={[-3.5, 0.5, 1.0]}
      rotation={[0, 0.30, 0]}
      distanceFactor={HTML_DISTANCE_FACTOR}
      style={{ pointerEvents: 'auto' }}
    >
      <div className="v11-card" style={{ width: 230 }}>
        <PanelHeader>ACHIEVEMENTS</PanelHeader>
        <ul className="v11-list">
          <li>15+ SUCCESSFUL PROJECTS</li>
          <li>5+ HACKATHON AWARDS</li>
          <li>OPEN SOURCE CONTRIBUTOR</li>
          <li>1K+ HOURS OF SYSTEM DESIGN</li>
        </ul>
        <CtaButton label="VIEW ALL WORK" />
      </div>
    </Html>
  );
}

/* ─────────────────────────── FRONT-RIGHT FLOATING ─────────────────── */

function PhilosophyPanel() {
  return (
    <Html
      transform
      occlude={false}
      position={[3.5, 2.4, 1.0]}
      rotation={[0, -0.30, 0]}
      distanceFactor={HTML_DISTANCE_FACTOR}
      style={{ pointerEvents: 'auto' }}
    >
      <div className="v11-card" style={{ width: 250 }}>
        <PanelHeader>MY PHILOSOPHY</PanelHeader>
        <ExpertiseRow icon={<SparklesIcon size={16} />} title="INNOVATE" sub="Think Different. Build Better." accent="warm" />
        <ExpertiseRow icon={<Users size={16} />} title="COLLABORATE" sub="Great Teams Create Magic." accent="cool" />
        <ExpertiseRow icon={<TrendingUp size={16} />} title="ELEVATE" sub="Continuous Learning Always." />
        <div
          style={{
            fontFamily: '"Allura", "Brush Script MT", cursive',
            fontSize: 22,
            color: 'var(--v11-text-dim)',
            textAlign: 'right',
            margin: '8px 4px 0',
            opacity: 0.8,
            transform: 'rotate(-2deg)',
          }}
        >
          ~Nithesh
        </div>
        <CtaButton label="LET'S CONNECT" />
      </div>
    </Html>
  );
}

/* ─────────────────────────── RIGHT-WALL STACK ─────────────────────── */

function TechStackPanel() {
  const bars = [
    { label: 'JAVASCRIPT / TYPESCRIPT', value: 95 },
    { label: 'REACT / NEXT.JS', value: 90 },
    { label: 'NODE.JS / PYTHON', value: 85 },
    { label: 'CLOUD (AWS)', value: 80 },
    { label: 'MONGODB / POSTGRESQL', value: 85 },
  ];
  return (
    <Html
      transform
      occlude={false}
      position={[5.5, 2.5, -0.5]}
      rotation={[0, -0.50, 0]}
      distanceFactor={HTML_DISTANCE_FACTOR}
      style={{ pointerEvents: 'auto' }}
    >
      <div className="v11-card" style={{ width: 270 }}>
        <PanelHeader>TECH STACK</PanelHeader>
        {bars.map((b, i) => (
          <TechBar key={b.label} {...b} delay={0.15 + i * 0.10} />
        ))}
        <CtaButton label="VIEW ALL SKILLS" />
      </div>
    </Html>
  );
}

function TechBar({ label, value, delay }: { label: string; value: number; delay: number }) {
  return (
    <div className="v11-bar">
      <div className="v11-bar-head">
        <span>{label}</span>
        <span className="val">{value}%</span>
      </div>
      <div className="v11-bar-track">
        <div
          className="v11-bar-fill"
          style={{ width: `${value}%`, animationDelay: `${delay}s` }}
        />
      </div>
    </div>
  );
}

function SystemOverviewPanel() {
  return (
    <Html
      transform
      occlude={false}
      position={[5.5, 0.8, -0.5]}
      rotation={[0, -0.50, 0]}
      distanceFactor={HTML_DISTANCE_FACTOR}
      style={{ pointerEvents: 'auto' }}
    >
      <div className="v11-card" style={{ width: 250 }}>
        <PanelHeader>SYSTEM OVERVIEW</PanelHeader>
        <div className="v11-gauges">
          <CircleGauge pct={75} value="15+" label="PROJECTS" />
          <CircleGauge pct={60} value="3+ YRS" label="EXPERIENCE" />
          <CircleGauge pct={99} value="99.9%" label="UPTIME" />
        </div>
      </div>
    </Html>
  );
}

function CircleGauge({ pct, value, label }: { pct: number; value: string; label: string }) {
  const r = 25;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <div className="v11-gauge">
      <svg viewBox="0 0 60 60">
        <circle cx="30" cy="30" r={r} stroke="rgba(0,255,157,0.15)" strokeWidth="3" fill="none" />
        <circle
          cx="30"
          cy="30"
          r={r}
          stroke="#00FF9D"
          strokeWidth="3"
          fill="none"
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
          transform="rotate(-90 30 30)"
          style={{ filter: 'drop-shadow(0 0 4px #00FF9D)' }}
        />
      </svg>
      <span className="v11-gauge-val">{value}</span>
      <span className="v11-gauge-lab">{label}</span>
    </div>
  );
}

/* ─────────────────────────── SHARED CTA BUTTON ────────────────────── */

function CtaButton({ label }: { label: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      className="v11-button"
      style={{ opacity: hovered ? 1 : 0.92 }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        play('click_primary');
      }}
    >
      {label}
      <ArrowRight size={12} />
    </button>
  );
}

/* ─────────────────────────── EXPORT MOUNT ─────────────────────────── */

export function RoomPanels() {
  return (
    <group>
      {/* Left side. */}
      <CoreExpertisePanel />
      <AboutMePanel />
      <AchievementsPanel />

      {/* Right side. */}
      <PhilosophyPanel />
      <TechStackPanel />
      <SystemOverviewPanel />
    </group>
  );
}
