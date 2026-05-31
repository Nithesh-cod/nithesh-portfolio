import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google';
import '@/styles/globals.css';
import { content } from '@/lib/content';

const display = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-display',
  display: 'swap',
});

const sans = Inter({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-sans',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

const siteUrl = 'https://nithesh.dev'; // TODO: replace once deployed

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: `${content.hero.name} — ${content.hero.tagline}`,
  description: content.hero.headline,
  authors: [{ name: content.hero.name }],
  keywords: [
    'Nithesh Ramachandran',
    'AI engineer',
    'front-end developer',
    'Next.js',
    'Three.js',
    'portfolio',
    'Coimbatore',
  ],
  openGraph: {
    title: `${content.hero.name} — ${content.hero.tagline}`,
    description: content.hero.headline,
    type: 'website',
    url: siteUrl,
    siteName: content.hero.name,
    locale: 'en_US',
    // OG image is auto-discovered from src/app/opengraph-image.tsx
  },
  twitter: {
    card: 'summary_large_image',
    title: `${content.hero.name} — ${content.hero.tagline}`,
    description: content.hero.headline,
    creator: '@nithesh',
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [{ url: '/favicon.ico', sizes: '32x32', type: 'image/x-icon' }],
    shortcut: '/favicon.ico',
    // apple-touch-icon auto-discovered from src/app/apple-icon.tsx
  },
  alternates: { canonical: siteUrl },
};

export const viewport: Viewport = {
  themeColor: '#07090C',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  );
}
