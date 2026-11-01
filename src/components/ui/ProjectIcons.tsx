import {
  Atom,
  BarChart3,
  Bot,
  Box,
  Cloud,
  Code2,
  Cpu,
  Database,
  FileText,
  Globe2,
  Layers,
  Leaf,
  Mail,
  Mic,
  QrCode,
  Scan,
  ScanFace,
  ShieldCheck,
  Smartphone,
  TerminalSquare,
  TrendingUp,
  Trophy,
  User,
  UtensilsCrossed,
  Wrench,
  Zap,
  CircleCheck,
} from 'lucide-react';
import type { FeatureIcon } from '@/lib/content';

type IconProps = { size?: number };

const BY_PROJECT: Record<string, (p: IconProps) => JSX.Element> = {
  cropai: (p) => <Leaf {...p} />,
  'smart-canteen': (p) => <UtensilsCrossed {...p} />,
  testai: (p) => <Bot {...p} />,
  qurious: (p) => <Atom {...p} />,
  deepguard: (p) => <ScanFace {...p} />,
  'ramji-electronics': (p) => <Smartphone {...p} />,
  'techfest-symposium': (p) => <Trophy {...p} />,
  voxelspeak: (p) => <Box {...p} />,
  'stock-price-prediction': (p) => <TrendingUp {...p} />,
  jarvis: (p) => <Cpu {...p} />,
  portfolio: (p) => <Globe2 {...p} />,
  thozhan: (p) => <Mic {...p} />,
};

export function ProjectIcon({ id, size = 17 }: { id: string; size?: number }) {
  const Icon = BY_PROJECT[id];
  return Icon ? <Icon size={size} /> : <Code2 size={size} />;
}

const BY_FEATURE: Record<FeatureIcon, (p: IconProps) => JSX.Element> = {
  scan: (p) => <Scan {...p} />,
  chart: (p) => <BarChart3 {...p} />,
  globe: (p) => <Globe2 {...p} />,
  phone: (p) => <Smartphone {...p} />,
  qr: (p) => <QrCode {...p} />,
  cloud: (p) => <Cloud {...p} />,
  bot: (p) => <Bot {...p} />,
  wrench: (p) => <Wrench {...p} />,
  atom: (p) => <Atom {...p} />,
  check: (p) => <CircleCheck {...p} />,
  shield: (p) => <ShieldCheck {...p} />,
  mic: (p) => <Mic {...p} />,
  database: (p) => <Database {...p} />,
  file: (p) => <FileText {...p} />,
  cube: (p) => <Box {...p} />,
  layers: (p) => <Layers {...p} />,
  terminal: (p) => <TerminalSquare {...p} />,
  zap: (p) => <Zap {...p} />,
  mail: (p) => <Mail {...p} />,
  cpu: (p) => <Cpu {...p} />,
  user: (p) => <User {...p} />,
};

export function FeatureIconView({ icon, size = 20 }: { icon: FeatureIcon; size?: number }) {
  const Icon = BY_FEATURE[icon];
  return <Icon size={size} />;
}
