'use client';

import { ArrowRight } from 'lucide-react';
import { content } from '@/lib/content';

/* V11.0 — bottom DOM ticker. Mirrors the reference image: a
 * status line scrolling left + a GET IN TOUCH button anchored
 * right. Sits above the very-bottom edge with backdrop blur. */

const ITEMS = [
  'LATEST  •  Building the future, one line of code at a time',
  'Open for opportunities and collaborations',
  "Let's build something amazing together",
] as const;

export function BottomTicker() {
  const repeated = [...ITEMS, ...ITEMS, ...ITEMS]; // long enough for seamless wrap

  return (
    <div className="pointer-events-auto fixed bottom-0 left-0 right-0 z-30 flex items-center gap-6 border-t border-neon-green/30 bg-bg-base/65 px-6 py-3 backdrop-blur-[14px]">
      {/* Marquee. */}
      <div className="relative flex-1 overflow-hidden">
        <div className="ticker-track flex w-max items-center gap-10 whitespace-nowrap font-mono text-[11px] tracking-[0.20em] text-text-sec">
          {repeated.map((line, i) => (
            <span key={`${line}-${i}`} className="flex items-center gap-10">
              <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-neon-bright shadow-[0_0_8px_#33FFAA]" />
              <span className={i % ITEMS.length === 0 ? 'text-neon-bright' : 'text-text-prim'}>
                {line}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* GET IN TOUCH CTA. */}
      <a
        href={`mailto:${content.contact.email}`}
        className="group flex items-center gap-2 rounded-sm border border-neon-green/60 bg-[rgba(0,255,136,0.08)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-neon-bright transition hover:bg-[rgba(0,255,136,0.16)]"
      >
        GET IN TOUCH
        <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
      </a>
    </div>
  );
}
