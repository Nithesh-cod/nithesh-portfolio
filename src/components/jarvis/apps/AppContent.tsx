'use client';

import { AboutApp } from '@/components/jarvis/apps/AboutApp';
import { Arcade } from '@/components/jarvis/apps/Arcade';
import { CertificatesApp } from '@/components/jarvis/apps/CertificatesApp';
import { JarvisAI } from '@/components/jarvis/apps/JarvisAI';
import { MailApp } from '@/components/jarvis/apps/MailApp';
import { More } from '@/components/jarvis/apps/More';
import { MusicApp } from '@/components/jarvis/apps/MusicApp';
import { ResumeApp } from '@/components/jarvis/apps/ResumeApp';
import { SettingsApp } from '@/components/jarvis/apps/SettingsApp';
import { TeachApp } from '@/components/jarvis/apps/TeachApp';
import { TerminalApp } from '@/components/jarvis/apps/TerminalApp';
import { ThisPC } from '@/components/jarvis/apps/ThisPC';
import { APPS } from '@/components/jarvis/apps/registry';
import type { AppId } from '@/lib/jarvis/osStore';

/** Routes a window to its app. */
export function AppContent({ id, payload }: { id: AppId; payload?: Record<string, unknown> }) {
  switch (id) {
    case 'thispc':
      return <ThisPC />;
    case 'resume':
      return <ResumeApp />;
    case 'jarvis':
      return <JarvisAI payload={payload} />;
    case 'arcade':
      return <Arcade payload={payload} />;
    case 'more':
      return <More />;
    case 'terminal':
      return <TerminalApp />;
    case 'mail':
      return <MailApp />;
    case 'certificates':
      return <CertificatesApp />;
    case 'settings':
      return <SettingsApp />;
    case 'music':
      return <MusicApp />;
    case 'about':
      return <AboutApp />;
    case 'teach':
      return <TeachApp />;
    default:
      return (
        <div className="app-empty">
          <p>{APPS[id].title} is being installed…</p>
        </div>
      );
  }
}
