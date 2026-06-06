'use client';

import { ArrowRight } from 'lucide-react';

/* V13.0 — GET IN TOUCH now opens WhatsApp with a pre-filled message
 * to Nithesh's number instead of a mailto link. */

const LINES = [
  'Building the future, one line of code at a time',
  'Open for opportunities and collaborations',
  "Let's build something amazing together",
] as const;

const WHATSAPP_NUMBER = '919786359161'; // 91 + 9786359161
const WHATSAPP_MESSAGE =
  'Hi Nithesh! I came across your portfolio and would love to connect.';

function handleGetInTouch() {
  if (typeof window === 'undefined') return;
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function BottomTicker() {
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

      <button
        type="button"
        onClick={handleGetInTouch}
        className="v11-ticker-cta"
        aria-label="Get in touch via WhatsApp"
      >
        GET IN TOUCH
        <ArrowRight size={12} />
      </button>
    </div>
  );
}
