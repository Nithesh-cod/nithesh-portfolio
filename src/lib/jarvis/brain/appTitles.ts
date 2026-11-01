import type { ToolApp } from '../tools';

/** Display names, kept here so the server-side brain needn't load the icon registry. */
export const APP_TITLES: Record<ToolApp, string> = {
  thispc: 'This PC',
  museum: 'the Museum',
  resume: 'Resume',
  arcade: 'the Arcade',
  terminal: 'Terminal',
  mail: 'Mail',
  certificates: 'Certificates',
  settings: 'Settings',
  music: 'Music',
  about: 'About System',
};
