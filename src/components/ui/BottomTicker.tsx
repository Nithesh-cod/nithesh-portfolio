'use client';

import { ArrowRight } from 'lucide-react';
import { content } from '@/lib/content';

/* V11.1 — bottom ticker rebuilt with the v11-* class system. Static
 * LATEST: header + scrolling marquee separated by bullet dots + a
 * green "GET IN TOUCH →" mailto CTA pinned right. */

const LINES = [
  'Building the future, one line of code at a time',
  'Open for opportunities and collaborations',
  "Let's build something amazing together",
] as const;

export function BottomTicker() {
  // Triple the content so the CSS marquee loop reads as seamless.
  const stream = [...LINES, ...LINES, ...LINES];

  return (
    <div className="v11-ticker">
      <div className="v11-ticker-left">
        <span className="v11-ticker-pulse" aria-hidden />
        LATEST:
      </div>

      <div className="v11-ticker-content">
        <span className="ticker-track inline-flex w-max gap-0">
          {stream.map((line, i) => (
            <span key={`${line}-${i}`} className="whitespace-nowrap">
              {line}
              <span className="v11-ticker-sep">•</span>
            </span>
          ))}
        </span>
      </div>

      <a
        href={`mailto:${content.contact.email}`}
        className="v11-ticker-cta"
      >
        GET IN TOUCH
        <ArrowRight size={12} />
      </a>
    </div>
  );
}
