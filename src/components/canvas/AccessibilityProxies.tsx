'use client';

import { Html } from '@react-three/drei';
import { play } from '@/lib/audio';
import { usePortfolioStore, type ProxyId } from '@/lib/store';
import { content, stations, arcPodiums, type Project } from '@/lib/content';

/**
 * V8.0 — invisible focusable buttons positioned at each gallery exhibit so
 * keyboard users hit the same store actions as click-on-3D. Positions
 * mirror the V8 layout (project consoles + arcPodiums grid).
 */
export function AccessibilityProxies() {
  const openProject = usePortfolioStore((s) => s.openProject);
  const openSkillCategory = usePortfolioStore((s) => s.openSkillCategory);
  const openTerminal = usePortfolioStore((s) => s.openTerminal);
  const openResume = usePortfolioStore((s) => s.openResume);

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

      {/* Skill podiums + CRT + Contact — positions come from arcPodiums
          which V8 maps to the new flanking grid. */}
      {arcPodiums.map((p) => {
        if (p.kind === 'crt') {
          return (
            <Proxy
              key="crt"
              position={[p.position[0], p.position[1] + 0.6, p.position[2]]}
              label="Activate terminal"
              onActivate={() => { play('startup'); openTerminal(); }}
            />
          );
        }
        if (p.kind === 'contact') {
          return (
            <Proxy
              key="contact"
              position={[p.position[0], p.position[1] + 0.6, p.position[2]]}
              label="Open résumé"
              onActivate={() => {
                play('click_primary');
                openResume();
                if (typeof window !== 'undefined') {
                  window.open(content.contact.resumeUrl, '_blank', 'noopener,noreferrer');
                }
              }}
            />
          );
        }
        return (
          <Proxy
            key={p.id}
            position={[p.position[0], p.position[1] + 0.6, p.position[2]]}
            label={`${p.title} · View details`}
            onActivate={() => {
              play('click_primary');
              openSkillCategory(p.id as Parameters<typeof openSkillCategory>[0]);
            }}
          />
        );
      })}

      <Proxy
        position={[5.5, 2.7, -1.5]}
        label="View certifications"
        onActivate={() => {
          play('click_primary');
          usePortfolioStore.getState().openCertificate('front-end-web-dev');
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

export function proxyIdForProject(slug: Project['slug']): ProxyId {
  return slug;
}
