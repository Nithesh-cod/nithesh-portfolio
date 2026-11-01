'use client';

import { Html } from '@react-three/drei';
import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  Bot,
  BrainCircuit,
  Braces,
  Briefcase,
  ChevronRight,
  CircleCheck,
  Code2,
  Cpu,
  Database,
  FileDown,
  FolderGit2,
  Globe2,
  Layout,
  Lightbulb,
  Mail,
  MessageSquareCode,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TerminalSquare,
  Trophy,
  User,
  Users,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { GitHubIcon, LinkedInIcon } from '@/components/ui/BrandIcons';
import { ProjectIcon } from '@/components/ui/ProjectIcons';
import { play } from '@/lib/audio';
import {
  aboutShort,
  certTiles,
  content,
  expertiseAreas,
  expertiseToSkillTab,
  journey,
  panelProjectIds,
  projectById,
  stats,
  type CertTileIcon,
} from '@/lib/content';
import { usePortfolioStore } from '@/lib/store';

/* In-room HUD cards for the oval hall. Each is a DOM card mounted with
 * drei <Html transform>, placed along the oval and yawed toward the avatar.
 * DF sets world size: 1 CSS px = DF / 400 world units. */

const DF = 3.3;

type Placement = { pos: [number, number, number]; yaw: number };

const LAYOUT = {
  ideas:     { pos: [-9.4, 3.0, -1.0], yaw: 1.05 },
  core:      { pos: [-6.8, 3.15, -0.9], yaw: 0.66 },
  about:     { pos: [-3.2, 3.6, 0.9], yaw: 0.32 },
  journey:   { pos: [-2.9, 1.35, 2.4], yaw: 0.3 },
  links:     { pos: [3.2, 3.6, 0.9], yaw: -0.32 },
  projects:  { pos: [6.8, 3.15, -0.9], yaw: -0.66 },
  certs:     { pos: [9.6, 3.2, -0.6], yaw: -1.15 },
  certified: { pos: [7.4, 0.85, 1.9], yaw: -0.75 },
} as const satisfies Record<string, Placement>;

/** Floor rods under the free-standing cards (read by PanelStands). */
export const PANEL_STANDS: readonly { x: number; z: number; topY: number }[] = [
  { x: LAYOUT.links.pos[0], z: LAYOUT.links.pos[2], topY: 2.75 },
  { x: LAYOUT.certified.pos[0], z: LAYOUT.certified.pos[2], topY: 0.35 },
];

export function RoomPanels() {
  return (
    <group>
      <IdeasPanel />
      <CoreCompetenciesPanel />
      <AboutPanel />
      <JourneyPanel />
      <QuickLinksPanel />
      <ProjectsPanel />
      <CertificationsPanel />
      <CertifiedPanel />
    </group>
  );
}

/* ─────────────────────────────── chrome ─────────────────────────────── */

function Card({
  at,
  width,
  title,
  icon,
  interactive = true,
  children,
}: {
  at: Placement;
  width: number;
  title?: string;
  icon?: ReactNode;
  interactive?: boolean;
  children: ReactNode;
}) {
  return (
    <Html
      transform
      occlude={false}
      position={at.pos}
      rotation={[0, at.yaw, 0]}
      distanceFactor={DF}
      style={{ pointerEvents: interactive ? 'auto' : 'none' }}
    >
      <section className="hud-card" style={{ width }}>
        {title && (
          <header className="hud-card-head">
            {icon}
            <span>{title}</span>
          </header>
        )}
        {children}
      </section>
    </Html>
  );
}

/** Stops the canvas (OrbitControls) from treating a panel click as a drag. */
const stop = (e: React.PointerEvent) => e.stopPropagation();

function CardButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="hud-btn"
      onPointerDown={stop}
      onClick={(e) => {
        e.stopPropagation();
        play('click_primary');
        onClick();
      }}
    >
      {label}
      <ArrowRight size={13} />
    </button>
  );
}

function Row({
  icon,
  title,
  sub,
  onClick,
  href,
  chevron,
}: {
  icon: ReactNode;
  title: string;
  sub: string;
  onClick?: () => void;
  href?: string;
  chevron?: boolean;
}) {
  const body = (
    <>
      <span className="hud-icon">{icon}</span>
      <span className="hud-row-text">
        <span className="hud-row-title">{title}</span>
        <span className="hud-row-sub">{sub}</span>
      </span>
      {chevron && <ChevronRight size={15} className="hud-chev" />}
    </>
  );
  if (href) {
    const external = href.startsWith('http');
    return (
      <a
        className="hud-row"
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        onPointerDown={stop}
        onClick={() => play('click_primary')}
      >
        {body}
      </a>
    );
  }
  if (onClick) {
    return (
      <button
        type="button"
        className="hud-row"
        onPointerDown={stop}
        onClick={(e) => {
          e.stopPropagation();
          play('click_primary');
          onClick();
        }}
      >
        {body}
      </button>
    );
  }
  return <div className="hud-row">{body}</div>;
}

/* ─────────────────────────────── panels ─────────────────────────────── */

function IdeasPanel() {
  const steps = [
    { icon: <Lightbulb size={18} />, label: 'IDEAS' },
    { icon: <Code2 size={18} />, label: 'CODE' },
    { icon: <Globe2 size={18} />, label: 'REAL WORLD' },
  ];
  return (
    <Card at={LAYOUT.ideas} width={170} interactive={false}>
      <div className="hud-flow">
        {steps.map((s, i) => (
          <div key={s.label} className="hud-flow-item">
            {i > 0 && <ArrowDown size={16} className="hud-flow-arrow" />}
            <div className="hud-flow-step">
              <span className="hud-icon">{s.icon}</span>
              <span>{s.label}</span>
            </div>
          </div>
        ))}
        <BarChart3 size={34} className="hud-flow-chart" />
      </div>
    </Card>
  );
}

const EXPERTISE_ICONS = {
  ai: <BrainCircuit size={17} />,
  frontend: <Layout size={17} />,
  backend: <TerminalSquare size={17} />,
  data: <Database size={17} />,
  mobile: <Smartphone size={17} />,
} as const;

function CoreCompetenciesPanel() {
  const openSkill = usePortfolioStore((s) => s.openSkillCategory);
  const openFullStack = usePortfolioStore((s) => s.openFullStack);
  return (
    <Card at={LAYOUT.core} width={310} title="Core Competencies" icon={<Cpu size={17} />}>
      {expertiseAreas.map((a) => (
        <Row
          key={a.id}
          icon={EXPERTISE_ICONS[a.id]}
          title={a.title}
          sub={a.short}
          onClick={() => openSkill(expertiseToSkillTab[a.id])}
        />
      ))}
      <CardButton label="Build › Deploy › Impact" onClick={openFullStack} />
    </Card>
  );
}

function AboutPanel() {
  const openResume = usePortfolioStore((s) => s.openResume);
  return (
    <Card at={LAYOUT.about} width={270} title="About Me" icon={<User size={17} />}>
      <p className="hud-body">{aboutShort}</p>
      <CardButton label="Explore More" onClick={openResume} />
    </Card>
  );
}

function JourneyPanel() {
  const openResume = usePortfolioStore((s) => s.openResume);
  return (
    <Card at={LAYOUT.journey} width={250} title="My Journey" icon={<Users size={17} />}>
      <ul className="hud-check">
        {journey.map((j) => (
          <li key={j}>
            <CircleCheck size={15} />
            {j}
          </li>
        ))}
      </ul>
      <CardButton label="More" onClick={openResume} />
    </Card>
  );
}

function QuickLinksPanel() {
  const openResume = usePortfolioStore((s) => s.openResume);
  const openContact = usePortfolioStore((s) => s.openContact);
  return (
    <Card at={LAYOUT.links} width={250} title="Quick Links" icon={<ArrowRight size={17} />}>
      <Row icon={<FileDown size={17} />} title="Resume" sub="View & download" onClick={openResume} />
      {content.contact.github && (
        <Row icon={<GitHubIcon size={16} />} title="GitHub" sub="Nithesh-cod" href={content.contact.github} />
      )}
      <Row icon={<LinkedInIcon size={16} />} title="LinkedIn" sub="Connect" href={content.contact.linkedin} />
      <Row icon={<Mail size={17} />} title="Email" sub={content.contact.email} href={`mailto:${content.contact.email}`} />
      <CardButton label="Let's Connect" onClick={openContact} />
    </Card>
  );
}

function ProjectsPanel() {
  const openProject = usePortfolioStore((s) => s.openProject);
  const openGallery = usePortfolioStore((s) => s.openProjectsGallery);
  return (
    <Card at={LAYOUT.projects} width={290} title="Projects" icon={<FolderGit2 size={17} />}>
      {panelProjectIds.map((id) => {
        const p = projectById(id);
        if (!p) return null;
        return (
          <Row
            key={id}
            icon={<ProjectIcon id={id} />}
            title={p.name}
            sub={p.short}
            onClick={() => openProject(id)}
            chevron
          />
        );
      })}
      <CardButton label="View All Projects" onClick={openGallery} />
    </Card>
  );
}

const CERT_ICONS: Record<CertTileIcon, ReactNode> = {
  sparkles: <Sparkles size={20} />,
  message: <MessageSquareCode size={20} />,
  bot: <Bot size={20} />,
  cpu: <Cpu size={20} />,
  code: <Code2 size={20} />,
  braces: <Braces size={20} />,
  python: <TerminalSquare size={20} />,
  trophy: <Trophy size={20} />,
  briefcase: <Briefcase size={20} />,
};

function CertificationsPanel() {
  const openCertificate = usePortfolioStore((s) => s.openCertificate);
  const openGallery = usePortfolioStore((s) => s.openProjectsGallery);
  const openResume = usePortfolioStore((s) => s.openResume);
  const openAllCerts = usePortfolioStore((s) => s.openAllCerts);
  return (
    <Card at={LAYOUT.certs} width={310} title="Certifications & Achievements" icon={<Trophy size={17} />}>
      <div className="hud-tiles">
        {certTiles.map((t) => (
          <button
            key={t.label}
            type="button"
            className="hud-tile"
            onPointerDown={stop}
            onClick={(e) => {
              e.stopPropagation();
              play('click_primary');
              if (t.certId) openCertificate(t.certId);
              else if (t.action === 'gallery') openGallery();
              else openResume();
            }}
          >
            {CERT_ICONS[t.icon]}
            <span>{t.label}</span>
          </button>
        ))}
      </div>
      <CardButton label="See All" onClick={openAllCerts} />
    </Card>
  );
}

function CertifiedPanel() {
  return (
    <Card at={LAYOUT.certified} width={220} title="Certified" icon={<ShieldCheck size={17} />} interactive={false}>
      <div className="hud-stat"><b>{stats.projects}</b><span>PROJECTS</span></div>
      <div className="hud-stat"><b>{stats.certificates}</b><span>CERTIFICATIONS</span></div>
      <div className="hud-stat"><b>{stats.liveApps}</b><span>LIVE APPS</span></div>
    </Card>
  );
}
