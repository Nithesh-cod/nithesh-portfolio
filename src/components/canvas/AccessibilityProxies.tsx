'use client';

import { Html } from '@react-three/drei';
import { play } from '@/lib/audio';
import { usePortfolioStore, type ProxyId } from '@/lib/store';
import { stations, RACK_POS, ARC_CENTER, arcPodiums, content, waypoints, type Project } from '@/lib/content';

// V2.5: CRT lives at the LEFT end of the arc, Contact at the RIGHT.
// arcPodiums is statically 7 entries — fall back to a sensible default for the
// strict-undefined index check rather than disable noUncheckedIndexedAccess.
const ARC_CRT_POS = arcPodiums[0]?.position ?? ([-3.2, 0, -1.5] as const);
const ARC_CONTACT_POS = arcPodiums[arcPodiums.length - 1]?.position ?? ([3.2, 0, -1.5] as const);

/**
 * Invisible focusable buttons positioned at each interactive 3D object.
 * Tab cycles them in scene order (consoles → CRT → contact). Activating one
 * fires the same handler as a click on the 3D object, so keyboard parity is total.
 *
 * `pointerEvents: 'none'` on the wrapper keeps them out of pointer hit-testing
 * (the meshes themselves handle pointer events); the inner button re-enables it
 * for keyboard focus + activation.
 */
function scrollToWaypoint(id: string) {
  play('transition');
  if (typeof window === 'undefined') return;
  const idx = waypoints.findIndex((w) => w.id === id);
  if (idx < 0) return;
  const els = document.querySelectorAll<HTMLElement>('[data-waypoint]');
  els[idx]?.scrollIntoView({ behavior: 'smooth' });
}

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
        position={[RACK_POS[0], RACK_POS[1] + 0.6, RACK_POS[2]]}
        label="View certifications"
        onActivate={() => scrollToWaypoint('certifications')}
      />

      <Proxy
        position={[ARC_CENTER[0], 2.0, ARC_CENTER[2]]}
        label="View skills"
        onActivate={() => scrollToWaypoint('skills')}
      />

      <Proxy
        position={[ARC_CRT_POS[0], ARC_CRT_POS[1] + 1.0, ARC_CRT_POS[2]]}
        label="CRT · Activate terminal"
        onActivate={() => {
          play('startup');
          usePortfolioStore.getState().openTerminal();
        }}
      />
      <Proxy
        position={[ARC_CONTACT_POS[0], ARC_CONTACT_POS[1] + 1.0, ARC_CONTACT_POS[2]]}
        label="Contact terminal · Open résumé"
        onActivate={() => {
          play('click_primary');
          usePortfolioStore.getState().openResume();
          if (typeof window !== 'undefined') {
            // Belt-and-braces — also open the PDF as a fallback.
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
