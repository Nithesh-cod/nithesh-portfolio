'use client';

import { Billboard, Text } from '@react-three/drei';
import { type ThreeEvent } from '@react-three/fiber';
import { useRef, useState } from 'react';
import { FrontSide } from 'three';
import { SKILL_ARC_POS, content, waypoints } from '@/lib/content';
import { palette } from '@/lib/palette';
import { play } from '@/lib/audio';
import { disableRaycast, noRaycast } from '@/lib/three-utils';
import { usePortfolioStore } from '@/lib/store';

const PODIUM_RADIUS = 0.35;
const PODIUM_HEIGHT = 0.4;
// V1.9 tightening: 2.6 / 155° → 2.2 / 130° so extremes sit inside the ~31° half-FOV.
const ARC_RADIUS = 2.2;
const ARC_SPAN = Math.PI * 0.72; // ~130°

const SKILLS_WP_IDX = waypoints.findIndex((w) => w.id === 'skills');

/**
 * 5 podiums in a 130° arc. V2.0 replaces the previous Object.entries(content.skills)
 * iteration with hand-curated, smaller content per the spec — and the LAST podium
 * is the CONTACT podium (LinkedIn / Email / Open Resume), clickable.
 */

type PodiumDef =
  | {
      kind: 'skill';
      heading: string;
      items: readonly string[];
    }
  | {
      kind: 'contact';
      heading: string;
      links: readonly { label: string; onActivate: () => void }[];
    };

export function SkillPodiums() {
  const section = usePortfolioStore((s) => s.section);
  const openResume = usePortfolioStore((s) => s.openResume);

  // Gate: render only near the skills waypoint (±1 step) to avoid bleeding
  // across other zones AND to keep the podium cylinders out of click rays.
  if (Math.abs(section - SKILLS_WP_IDX) > 1) return null;

  const podiums: readonly PodiumDef[] = [
    { kind: 'skill', heading: 'FRONT-END', items: ['React', 'Next.js', 'Tailwind'] },
    { kind: 'skill', heading: 'AI / GEN AI', items: ['LLM APIs', 'Embeddings', 'RAG'] },
    { kind: 'skill', heading: 'LANGUAGES', items: ['JavaScript', 'TypeScript', 'Python'] },
    { kind: 'skill', heading: 'DEPLOY', items: ['Git', 'Vercel', 'Netlify'] },
    {
      kind: 'contact',
      heading: 'CONTACT',
      links: [
        {
          label: `LinkedIn  /in/${content.contact.linkedin.split('/in/')[1] ?? 'nithesh'}`,
          onActivate: () => window.open(content.contact.linkedin, '_blank', 'noopener,noreferrer'),
        },
        {
          label: `Email     ${content.contact.email}`,
          onActivate: () => {
            window.location.href = `mailto:${content.contact.email}`;
          },
        },
        {
          label: 'OPEN RESUME →',
          onActivate: () => openResume(),
        },
      ],
    },
  ];

  const n = podiums.length;

  return (
    <group position={SKILL_ARC_POS}>
      {podiums.map((p, i) => {
        const t = n === 1 ? 0 : i / (n - 1);
        const angle = -ARC_SPAN / 2 + t * ARC_SPAN;
        const x = Math.sin(angle) * ARC_RADIUS;
        const z = Math.cos(angle) * ARC_RADIUS;
        return <Podium key={p.heading} position={[x, 0, z]} def={p} />;
      })}
    </group>
  );
}

function Podium({ position, def }: { position: [number, number, number]; def: PodiumDef }) {
  const [hovered, setHovered] = useState(false);
  const setCursor = usePortfolioStore((s) => s.setCursorState);
  const lastHoverAt = useRef(0);

  const handleOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    setCursor('interactive');
    const now = performance.now();
    if (now - lastHoverAt.current < 150) return;
    lastHoverAt.current = now;
    play('hover');
  };
  const handleOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(false);
    setCursor('idle');
  };

  return (
    <group position={position} onPointerOver={handleOver} onPointerOut={handleOut}>
      <mesh castShadow receiveShadow position={[0, PODIUM_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[PODIUM_RADIUS, PODIUM_RADIUS, PODIUM_HEIGHT, 24]} />
        <meshStandardMaterial color={palette.graphite} roughness={0.4} metalness={0.85} side={FrontSide} />
      </mesh>
      <mesh position={[0, PODIUM_HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[PODIUM_RADIUS - 0.005, 0.012, 12, 48]} />
        <meshStandardMaterial
          color={palette.goldAccent}
          emissive={palette.goldAccent}
          emissiveIntensity={hovered ? 0.55 : 0.22}
          metalness={0.95}
          roughness={0.25}
        />
      </mesh>
      <mesh position={[0, PODIUM_HEIGHT + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[PODIUM_RADIUS - 0.01, 24]} />
        <meshStandardMaterial color={palette.void} roughness={0.7} metalness={0.4} />
      </mesh>

      <Billboard position={[0, PODIUM_HEIGHT + 0.28, 0]}>
        <Text
          raycast={noRaycast}
          ref={disableRaycast}
          fontSize={0.1}
          color={palette.goldAccent}
          anchorX="center"
          anchorY="bottom"
          letterSpacing={0.18}
          outlineWidth={0.002}
          outlineColor={palette.void}
        >
          {def.heading}
        </Text>
        {def.kind === 'skill' ? (
          <Text
            raycast={noRaycast}
            ref={disableRaycast}
            position={[0, -0.06, 0]}
            fontSize={0.06}
            color={palette.bone}
            anchorX="center"
            anchorY="top"
            maxWidth={1.0}
            textAlign="center"
            lineHeight={1.4}
            letterSpacing={0.02}
          >
            {def.items.join('\n')}
          </Text>
        ) : (
          <ContactLines links={def.links} />
        )}
      </Billboard>
    </group>
  );
}

/**
 * The CONTACT podium's three link rows. Each line is a separate <Text> mesh
 * with its OWN onClick (raycast must be left ENABLED on these — they are
 * meant to absorb pointer events). Hover brightens the line.
 */
function ContactLines({ links }: { links: readonly { label: string; onActivate: () => void }[] }) {
  return (
    <group position={[0, -0.06, 0]}>
      {links.map((l, i) => (
        <ContactLine key={l.label} text={l.label} y={-i * 0.08} onActivate={l.onActivate} />
      ))}
    </group>
  );
}

function ContactLine({
  text,
  y,
  onActivate,
}: {
  text: string;
  y: number;
  onActivate: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const setCursor = usePortfolioStore((s) => s.setCursorState);
  return (
    <Text
      position={[0, y, 0]}
      fontSize={0.058}
      color={hovered ? palette.emeraldGlow : palette.bone}
      anchorX="center"
      anchorY="top"
      maxWidth={1.4}
      letterSpacing={0.02}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        setCursor('interactive');
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        setCursor('idle');
      }}
      onClick={(e) => {
        e.stopPropagation();
        play('click_primary');
        onActivate();
      }}
    >
      {text}
    </Text>
  );
}
