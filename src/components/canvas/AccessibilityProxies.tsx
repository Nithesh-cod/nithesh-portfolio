'use client';

import { Html } from '@react-three/drei';
import { play } from '@/lib/audio';
import { usePortfolioStore, type ProxyId } from '@/lib/store';
import { stations, CRT_POS, CONTACT_POS, CERT_WALL_POS, content, waypoints, type Project } from '@/lib/content';

/**
 * Invisible focusable buttons positioned at each interactive 3D object.
 * Tab cycles them in scene order (consoles → CRT → contact). Activating one
 * fires the same handler as a click on the 3D object, so keyboard parity is total.
 *
 * `pointerEvents: 'none'` on the wrapper keeps them out of pointer hit-testing
 * (the meshes themselves handle pointer events); the inner button re-enables it
 * for keyboard focus + activation.
 */
export function AccessibilityProxies() {
  const openProject = usePortfolioStore((s) => s.openProject);

  return (
    <>
      {stations.map((s) => (
        <Proxy
          key={s.slug}
          position={[s.position[0], s.position[1] + 0.6, s.position[2]]}
          label={`${s.label} · Open details`}
          onActivate={() => {
            play('click_primary');
            openProject(s.slug, s.slug);
          }}
        />
      ))}

      <Proxy
        position={[CERT_WALL_POS[0], CERT_WALL_POS[1] + 0.6, CERT_WALL_POS[2]]}
        label="View certifications"
        onActivate={() => {
          play('transition');
          if (typeof window === 'undefined') return;
          const idx = waypoints.findIndex((w) => w.id === 'certifications');
          if (idx < 0) return;
          const els = document.querySelectorAll<HTMLElement>('[data-waypoint]');
          els[idx]?.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      <Proxy
        position={[CRT_POS[0], CRT_POS[1] + 0.6, CRT_POS[2]]}
        label="CRT · Activate terminal (M4)"
        onActivate={() => {
          play('startup');
          // eslint-disable-next-line no-console
          console.info('[crt] activated via keyboard');
        }}
      />
      <Proxy
        position={[CONTACT_POS[0], CONTACT_POS[1] + 0.6, CONTACT_POS[2]]}
        label="Contact terminal · Download résumé"
        onActivate={() => {
          play('click_primary');
          if (typeof window !== 'undefined') {
            window.open(content.contact.resumeUrl, '_blank', 'noopener,noreferrer');
          }
        }}
      />
    </>
  );
}

type ProxyProps = {
  position: [number, number, number];
  label: string;
  onActivate: () => void;
};

function Proxy({ position, label, onActivate }: ProxyProps) {
  return (
    <Html position={position} center occlude={false} pointerEvents="none">
      <button
        type="button"
        aria-label={label}
        onClick={onActivate}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onActivate();
          }
        }}
        className="sr-only-focusable"
        // Inline style here covers the case where Tailwind hasn't injected the helper yet;
        // visually hidden but focusable + pointer-event-active.
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0,0,0,0)',
          whiteSpace: 'nowrap',
          border: 0,
          pointerEvents: 'auto',
        }}
      >
        {label}
      </button>
    </Html>
  );
}

/** Map a Project slug to a stable ProxyId — exported for focus-restoration consumers. */
export function proxyIdForProject(slug: Project['slug']): ProxyId {
  return slug;
}
