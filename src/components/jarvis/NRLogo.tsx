/** NR hex emblem used across JARVIS OS. `draw` animates the outline being traced. */
export function NRLogo({ size = 40, draw = false, className }: { size?: number; draw?: boolean; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-hidden
    >
      <defs>
        <filter id="nr-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <polygon
        className={draw ? 'nr-hex nr-hex--draw' : 'nr-hex'}
        points="50,4 90,27 90,73 50,96 10,73 10,27"
        fill="rgba(46,255,176,0.08)"
        stroke="#2EFFB0"
        strokeWidth="4"
        filter="url(#nr-glow)"
      />
      <polygon points="50,15 80,32 80,68 50,85 20,68 20,32" fill="none" stroke="rgba(46,255,176,0.35)" strokeWidth="1.5" />
      <text
        x="50"
        y="60"
        textAnchor="middle"
        fontFamily="var(--font-display-sci), Orbitron, sans-serif"
        fontWeight="900"
        fontSize="30"
        fill="#ECFFF6"
        filter="url(#nr-glow)"
        className={draw ? 'nr-text nr-text--draw' : 'nr-text'}
      >
        NR
      </text>
    </svg>
  );
}
