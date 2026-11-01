'use client';

import { type ThreeEvent } from '@react-three/fiber';
import { useState, type ReactNode } from 'react';
import {
  BASE_TOP,
  FloatingExhibit,
  HoloMaterial,
  HoloProjector,
  PodiumBase,
  Vitrine,
  type PodiumHandlers,
} from '@/components/canvas/Podium';
import { play } from '@/lib/audio';
import type { Project } from '@/lib/content';
import { usePortfolioStore } from '@/lib/store';
import { noRaycast } from '@/lib/three-utils';

type Props = {
  slug: Project['slug'];
  label: string;
  subtitle: string;
  position: readonly [number, number, number];
  /** Angle (rad) the station yaws so its engraved front faces the camera. */
  yaw?: number;
  iconKind: 'leaf' | 'box' | 'globe';
  phase?: number;
  /** Uniform multiplier on the entire station (1.0 = baseline). */
  scale?: number;
  /** `vitrine` = glass display case; `hologram` = open projector. */
  variant?: 'vitrine' | 'hologram';
};

/** A project exhibit: turned gunmetal podium + a hologram of the project's
 *  icon, either inside a glass vitrine or above an open projector. The whole
 *  piece is the click target for the project's detail modal. */
export function ProjectStation({
  slug,
  label,
  subtitle,
  position,
  yaw = 0,
  iconKind,
  phase = 0,
  scale = 1,
  variant = 'hologram',
}: Props) {
  const [hovered, setHovered] = useState(false);
  const openProject = usePortfolioStore((s) => s.openProject);
  const setCursor = usePortfolioStore((s) => s.setCursorState);
  const lowPerf = usePortfolioStore((s) => s.perfMode === 'low');

  const handlers: PodiumHandlers = {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setHovered(true);
      setCursor('interactive');
      play('hover');
    },
    onPointerOut: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setHovered(false);
      setCursor('idle');
    },
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      play('click_primary');
      openProject(slug, slug);
    },
  };

  return (
    <group position={position as [number, number, number]} rotation={[0, yaw, 0]} scale={scale}>
      <PodiumBase name={label} subtitle={subtitle} hovered={hovered} lowPerf={lowPerf} handlers={handlers} />

      {variant === 'vitrine' ? (
        <Vitrine lowPerf={lowPerf} hovered={hovered}>
          <HoloProjector height={0.62} topRadius={0.42} hovered={hovered} />
          <FloatingExhibit y={BASE_TOP + 0.48} phase={phase} hovered={hovered}>
            <HoloIcon kind={iconKind} scale={0.8} />
          </FloatingExhibit>
        </Vitrine>
      ) : (
        <>
          <HoloProjector height={0.95} topRadius={0.58} hovered={hovered} />
          <FloatingExhibit y={BASE_TOP + 0.82} phase={phase} hovered={hovered}>
            <HoloIcon kind={iconKind} scale={1} />
          </FloatingExhibit>
        </>
      )}

      {/* Invisible hit volume so clicking the display itself also opens the project. */}
      <mesh position={[0, BASE_TOP + 0.5, 0]} visible={false} {...handlers}>
        <cylinderGeometry args={[0.6, 0.6, 1.0, 16]} />
      </mesh>
    </group>
  );
}

/** Solid fresnel hologram with a wireframe lattice laid over it. */
function HoloShape({
  children,
  position,
  rotation,
}: {
  children: ReactNode;
  position?: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh raycast={noRaycast}>
        {children}
        <HoloMaterial intensity={0.75} />
      </mesh>
      <mesh raycast={noRaycast} scale={1.012}>
        {children}
        <HoloMaterial intensity={0.95} wireframe />
      </mesh>
    </group>
  );
}

function HoloIcon({ kind, scale }: { kind: 'leaf' | 'box' | 'globe'; scale: number }) {
  if (kind === 'box') {
    // Smart Canteen — stacked serving trays on a spindle.
    return (
      <group scale={scale}>
        {[
          [-0.18, 0.62, 0.42],
          [-0.06, 0.55, 0.38],
          [0.06, 0.48, 0.33],
          [0.18, 0.41, 0.28],
        ].map(([y, w, d]) => (
          <HoloShape key={y} position={[0, y!, 0]}>
            <boxGeometry args={[w!, 0.045, d!]} />
          </HoloShape>
        ))}
        <HoloShape>
          <cylinderGeometry args={[0.02, 0.02, 0.46, 10]} />
        </HoloShape>
      </group>
    );
  }
  if (kind === 'globe') {
    // TestAI — scanning globe with an inner lattice and an orbit ring.
    return (
      <group scale={scale}>
        <HoloShape>
          <sphereGeometry args={[0.34, 24, 16]} />
        </HoloShape>
        <HoloShape rotation={[Math.PI / 5, 0, Math.PI / 7]}>
          <octahedronGeometry args={[0.2, 1]} />
        </HoloShape>
        <HoloShape rotation={[Math.PI / 2.4, 0, 0]}>
          <torusGeometry args={[0.44, 0.006, 6, 96]} />
        </HoloShape>
      </group>
    );
  }
  // CropAI — faceted organic form with a counter-rotated core.
  return (
    <group scale={scale}>
      <HoloShape>
        <icosahedronGeometry args={[0.34, 1]} />
      </HoloShape>
      <HoloShape rotation={[0.6, 0.4, 0]}>
        <icosahedronGeometry args={[0.18, 0]} />
      </HoloShape>
    </group>
  );
}
