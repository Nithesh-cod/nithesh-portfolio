import {
  Award,
  BookOpenCheck,
  Bot,
  FileText,
  Gamepad2,
  Info,
  Landmark,
  LayoutGrid,
  Mail,
  Monitor,
  Music,
  Settings,
  TerminalSquare,
  type LucideIcon,
} from 'lucide-react';
import type { AppId } from '@/lib/jarvis/osStore';

export type AppMeta = {
  id: AppId;
  title: string;
  subtitle: string;
  Icon: LucideIcon;
  /** Default window size [w, h] in px. */
  size: [number, number];
};

export const APPS: Record<AppId, AppMeta> = {
  thispc: { id: 'thispc', title: 'This PC', subtitle: 'Projects, certificates and documents.', Icon: Monitor, size: [980, 620] },
  museum: { id: 'museum', title: 'Museum', subtitle: 'Walk the 3D exhibition hall.', Icon: Landmark, size: [0, 0] },
  resume: { id: 'resume', title: 'Resume', subtitle: 'View, download or ask about it.', Icon: FileText, size: [940, 720] },
  jarvis: { id: 'jarvis', title: 'JARVIS AI', subtitle: 'Ask anything about Nithesh. Voice ready.', Icon: Bot, size: [760, 640] },
  arcade: { id: 'arcade', title: 'Arcade', subtitle: 'My games, plus two you can play here.', Icon: Gamepad2, size: [900, 640] },
  more: { id: 'more', title: 'More', subtitle: 'Terminal, mail, settings and more.', Icon: LayoutGrid, size: [720, 400] },
  terminal: { id: 'terminal', title: 'Terminal', subtitle: 'Command line.', Icon: TerminalSquare, size: [720, 460] },
  mail: { id: 'mail', title: 'Mail', subtitle: 'Send Nithesh a message.', Icon: Mail, size: [560, 640] },
  certificates: { id: 'certificates', title: 'Certificates', subtitle: '12 Infosys Springboard certificates.', Icon: Award, size: [900, 620] },
  settings: { id: 'settings', title: 'Settings', subtitle: 'Sound, motion and voice.', Icon: Settings, size: [560, 620] },
  music: { id: 'music', title: 'Music', subtitle: 'Ambient room audio.', Icon: Music, size: [440, 440] },
  about: { id: 'about', title: 'About System', subtitle: 'Specs and credits.', Icon: Info, size: [580, 580] },
  // Not on the home screen, dock or More: opened with ?app=teach or "sudo teach".
  teach: { id: 'teach', title: 'Teach JARVIS', subtitle: 'Review what JARVIS couldn’t answer.', Icon: BookOpenCheck, size: [760, 640] },
};

export const HERO_APPS: readonly AppId[] = ['thispc', 'museum', 'resume', 'jarvis', 'arcade', 'more'];
export const DOCK_APPS: readonly AppId[] = ['thispc', 'museum', 'resume', 'jarvis', 'arcade', 'terminal', 'mail', 'settings', 'more'];
export const MORE_APPS: readonly AppId[] = ['terminal', 'mail', 'certificates', 'settings', 'music', 'about'];

/** The full launcher, by what each app is for. */
export const APP_GROUPS: readonly { title: string; apps: readonly AppId[] }[] = [
  { title: 'Portfolio', apps: ['resume', 'thispc', 'certificates', 'museum'] },
  { title: 'Assistant', apps: ['jarvis', 'mail'] },
  { title: 'Play', apps: ['arcade', 'music'] },
  { title: 'System', apps: ['terminal', 'settings', 'about'] },
];
