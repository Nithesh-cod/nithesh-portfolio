'use client';

import { Html, Text } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useRef } from 'react';
import { type Group } from 'three';
import { HUDPanel3D } from '@/components/canvas/HUDPanel3D';
import {
  achievements,
  coreExpertise,
  liveFeed,
  metrics,
  navItems,
  philosophy,
  systemStatus,
  techStack,
} from '@/lib/content';
import { palette } from '@/lib/palette';
import { usePortfolioStore } from '@/lib/store';
import { noRaycast, disableRaycast } from '@/lib/three-utils';
import { play } from '@/lib/audio';

/* ──────────────────────────────────────────────────────────────────────── *
 * V10.1 — every DOM HUD content panel reborn as a 3D in-room mesh.        *
 * Left wall: Navigation, Core Expertise, Tech Stack                       *
 * Right wall: System Status, Project Metrics, Live Feed                   *
 * Floating: About Me, Achievements, Current Status                        *
 * Floor strip (front): 6 services hexes                                   *
 * ──────────────────────────────────────────────────────────────────────── */

const ROOM_HALF = 8;
const WALL_X = ROOM_HALF - 0.2; // 7.8

// ─────────────────────────── LEFT WALL ───────────────────────────

/** Top of left wall — navigation menu (3D text rows). */
function LeftWallNav() {
  const focusOn = usePortfolioStore((s) => s.focusOn);
  // V10.0 nav target table — must mirror NavPill.
  const targets: Record<string, { p: [number, number, number]; l: [number, number, number] }> = {
    home:     { p: [0, 3.0, 11],  l: [0, 1.5, 0] },
    about:    { p: [0, 2.0, 4],   l: [0, 1.6, 0] },
    projects: { p: [0, 1.5, 7],   l: [0, 1.0, 3.5] },
    skills:   { p: [-3, 2.5, 0],  l: [-7.8, 2.5, 0] },
    certs:    { p: [0, 2.5, -3],  l: [0, 2.5, -7.7] },
    contact:  { p: [-4, 1.5, 3],  l: [-7.8, 1.2, 4] },
  };

  return (
    <HUDPanel3D
      position={[-WALL_X, 4.0, -3]}
      rotation={[0, Math.PI / 2, 0]}
      width={2.2}
      height={2.5}
      title="NAVIGATION"
    >
      {navItems.slice(0, 7).map((item, i) => {
        const y = 0.85 - i * 0.22;
        const id = item.id.toLowerCase();
        const target = targets[id];
        return (
          <group key={item.id} position={[0, y, 0]}>
            {/* Active accent left of HOME (first item). */}
            {i === 0 && (
              <mesh raycast={noRaycast} position={[-1.0, 0, 0.005]}>
                <boxGeometry args={[0.04, 0.18, 0.01]} />
                <meshStandardMaterial
                  color={palette.neonGreen}
                  emissive={palette.neonGreen}
                  emissiveIntensity={3.5}
                  toneMapped={false}
                />
              </mesh>
            )}
            <Text
              position={[-0.85, 0, 0.005]}
              fontSize={0.10}
              color={palette.textPrimary}
              anchorX="left"
              anchorY="middle"
              outlineWidth={0.002}
              outlineColor="#000"
              onClick={(e: ThreeEvent<MouseEvent>) => {
                e.stopPropagation();
                if (target) {
                  play('click_primary');
                  focusOn(target.p, target.l);
                }
              }}
            >
              {item.label}
            </Text>
            <Text
              raycast={noRaycast}
              ref={disableRaycast}
              position={[-0.85, -0.075, 0.005]}
              fontSize={0.04}
              color={palette.textSecondary}
              anchorX="left"
              anchorY="middle"
              letterSpacing={0.2}
            >
              {item.subtitle.toUpperCase()}
            </Text>
          </group>
        );
      })}
    </HUDPanel3D>
  );
}

/** Middle of left wall — Core Expertise hex grid. */
function LeftWallExpertise() {
  const openSkillCategory = usePortfolioStore((s) => s.openSkillCategory);
  // Map the 6 expertise tiles to the 5 valid SkillCategoryIds (UI/UX → frontend).
  const slugs: ('frontend' | 'ai' | 'platform' | 'tools' | 'languages' | 'frontend')[] = [
    'frontend', 'ai', 'platform', 'tools', 'languages', 'frontend',
  ];
  return (
    <HUDPanel3D
      position={[-WALL_X, 1.7, -3]}
      rotation={[0, Math.PI / 2, 0]}
      width={2.2}
      height={1.8}
      title="CORE EXPERTISE"
    >
      {coreExpertise.slice(0, 6).map((e, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = -0.65 + col * 0.65;
        const y = 0.30 - row * 0.55;
        return (
          <ExpertiseHex
            key={e.title}
            x={x}
            y={y}
            label={e.title}
            slug={slugs[i] ?? 'frontend'}
            onClick={openSkillCategory}
          />
        );
      })}
    </HUDPanel3D>
  );
}

function ExpertiseHex({
  x,
  y,
  label,
  slug,
  onClick,
}: {
  x: number;
  y: number;
  label: string;
  slug: 'languages' | 'frontend' | 'ai' | 'platform' | 'tools';
  onClick: (s: 'languages' | 'frontend' | 'ai' | 'platform' | 'tools') => void;
}) {
  const setCursor = usePortfolioStore((s) => s.setCursorState);
  return (
    <group position={[x, y, 0]}>
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          setCursor('interactive');
          play('hover');
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setCursor('idle');
        }}
        onClick={(e) => {
          e.stopPropagation();
          play('click_primary');
          onClick(slug);
        }}
      >
        <cylinderGeometry args={[0.22, 0.22, 0.04, 6]} />
        <meshStandardMaterial
          color={palette.neonGreen}
          emissive={palette.neonGreen}
          emissiveIntensity={0.5}
          metalness={0.7}
          roughness={0.25}
          transparent
          opacity={0.45}
        />
      </mesh>
      <Text
        raycast={noRaycast}
        ref={disableRaycast}
        position={[0, -0.20, 0.04]}
        fontSize={0.045}
        color={palette.textPrimary}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.001}
        outlineColor="#000"
        maxWidth={0.6}
      >
        {label.toUpperCase()}
      </Text>
    </group>
  );
}

/** Bottom of left wall — Tech Stack (Html-transform with 12 placeholder logos). */
function LeftWallTechStack() {
  return (
    <HUDPanel3D
      position={[-WALL_X, -0.4, -3]}
      rotation={[0, Math.PI / 2, 0]}
      width={2.2}
      height={1.8}
      title="TECH STACK"
    >
      <Html
        transform
        occlude="blending"
        position={[0, -0.1, 0.02]}
        distanceFactor={2.2}
        style={{ width: '320px', pointerEvents: 'auto', userSelect: 'none' }}
      >
        <div className="hud-panel-3d" style={{ width: 320 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 6,
            }}
          >
            {techStack.slice(0, 12).map((t) => (
              <div
                key={t}
                title={t}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  padding: 4,
                  border: '1px solid rgba(0,255,136,0.25)',
                  background: 'rgba(0,255,136,0.05)',
                  borderRadius: 3,
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 3,
                    background: 'rgba(0,255,136,0.18)',
                    border: '1px solid rgba(0,255,136,0.4)',
                  }}
                />
                <span
                  style={{
                    fontSize: 7,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: '#88CCAA',
                  }}
                >
                  {t}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Html>
    </HUDPanel3D>
  );
}

// ─────────────────────────── RIGHT WALL ───────────────────────────

/** Top of right wall — System Status text rows. */
function RightWallStatus() {
  return (
    <HUDPanel3D
      position={[WALL_X, 4.0, -3]}
      rotation={[0, -Math.PI / 2, 0]}
      width={2.2}
      height={1.8}
      title="SYSTEM STATUS"
    >
      {systemStatus.slice(0, 5).map((row, i) => {
        const y = 0.55 - i * 0.20;
        return (
          <group key={row.label} position={[0, y, 0]}>
            <Text
              raycast={noRaycast}
              ref={disableRaycast}
              position={[-0.95, 0, 0]}
              fontSize={0.075}
              color={palette.textSecondary}
              anchorX="left"
              anchorY="middle"
              letterSpacing={0.15}
            >
              {row.label.toUpperCase()}
            </Text>
            <Text
              raycast={noRaycast}
              ref={disableRaycast}
              position={[0.95, 0, 0]}
              fontSize={0.085}
              color={palette.neonBright}
              anchorX="right"
              anchorY="middle"
              outlineWidth={0.002}
              outlineColor={palette.neonGreen}
            >
              {row.value.toUpperCase()}
            </Text>
          </group>
        );
      })}
    </HUDPanel3D>
  );
}

/** Middle right wall — System Overview stats + Project Metrics gauges. */
function RightWallMetrics() {
  return (
    <HUDPanel3D
      position={[WALL_X, 1.7, -3]}
      rotation={[0, -Math.PI / 2, 0]}
      width={2.2}
      height={2.0}
      title="SYSTEM OVERVIEW"
    >
      {/* Stats list — top half. */}
      {[
        { label: 'PROJECTS COMPLETED', value: '25+' },
        { label: 'USERS IMPACTED', value: '3.2K+' },
        { label: 'UPTIME', value: '99%' },
        { label: 'COUNTRIES REACHED', value: '12+' },
      ].map((row, i) => {
        const y = 0.55 - i * 0.13;
        return (
          <group key={row.label} position={[0, y, 0]}>
            <Text
              raycast={noRaycast}
              ref={disableRaycast}
              position={[-0.95, 0, 0]}
              fontSize={0.057}
              color={palette.textSecondary}
              anchorX="left"
              anchorY="middle"
              letterSpacing={0.15}
            >
              {row.label}
            </Text>
            <Text
              raycast={noRaycast}
              ref={disableRaycast}
              position={[0.95, 0, 0]}
              fontSize={0.067}
              color={palette.neonBright}
              anchorX="right"
              anchorY="middle"
            >
              {row.value}
            </Text>
          </group>
        );
      })}

      {/* Project metrics ring gauges — bottom half via Html transform SVG. */}
      <Html
        transform
        occlude="blending"
        position={[0, -0.55, 0.02]}
        distanceFactor={2.2}
        style={{ width: '320px', pointerEvents: 'auto', userSelect: 'none' }}
      >
        <div className="hud-panel-3d" style={{ width: 320 }}>
          <h3>PROJECT METRICS</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {metrics.slice(0, 6).map((m) => (
              <MetricRing key={m.label} pct={m.ringPct} value={m.value} label={m.label} />
            ))}
          </div>
        </div>
      </Html>
    </HUDPanel3D>
  );
}

function MetricRing({ pct, value, label }: { pct: number; value: string; label: string }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <svg width="46" height="46" viewBox="0 0 46 46">
        <circle cx="23" cy="23" r={r} stroke="rgba(0,255,136,0.15)" strokeWidth="3" fill="none" />
        <circle
          cx="23"
          cy="23"
          r={r}
          stroke="#00FF88"
          strokeWidth="3"
          fill="none"
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
          transform="rotate(-90 23 23)"
          style={{ filter: 'drop-shadow(0 0 4px #00FF88)' }}
        />
        <text x="23" y="27" textAnchor="middle" style={{ font: '600 9px ui-sans-serif', fill: '#4DFFAA' }}>
          {value}
        </text>
      </svg>
      <div style={{
        fontSize: 6,
        textAlign: 'center',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: '#88CCAA',
        lineHeight: 1.1,
      }}>
        {label}
      </div>
    </div>
  );
}

/** Bottom right wall — Live Feed rolling timestamps. */
function RightWallLiveFeed() {
  return (
    <HUDPanel3D
      position={[WALL_X, -0.5, -3]}
      rotation={[0, -Math.PI / 2, 0]}
      width={2.2}
      height={1.5}
      title="LIVE FEED"
    >
      {liveFeed.slice(0, 5).map((row, i) => {
        const y = 0.40 - i * 0.18;
        const intensity = 1 - i * 0.15;
        return (
          <group key={row.event} position={[0, y, 0]}>
            <Text
              raycast={noRaycast}
              ref={disableRaycast}
              position={[-0.95, 0, 0]}
              fontSize={0.067}
              color={palette.textSecondary}
              anchorX="left"
              anchorY="middle"
            >
              {row.ago}
            </Text>
            <Text
              raycast={noRaycast}
              ref={disableRaycast}
              position={[-0.45, 0, 0]}
              fontSize={0.067}
              color={palette.textPrimary}
              fillOpacity={intensity}
              anchorX="left"
              anchorY="middle"
              letterSpacing={0.1}
            >
              {row.event.toUpperCase()}
            </Text>
          </group>
        );
      })}
    </HUDPanel3D>
  );
}

// ─────────────────────────── FLOATING (mid-air, around capsule) ──────

/** About Me — floating left of capsule. */
function FloatingAbout() {
  return (
    <HUDPanel3D
      position={[-3.5, 2.7, 0.5]}
      rotation={[0, 0.3, 0]}
      width={1.6}
      height={1.1}
      title="ABOUT ME"
      bob
    >
      <Text
        raycast={noRaycast}
        ref={disableRaycast}
        position={[0, -0.05, 0]}
        fontSize={0.07}
        color={palette.textPrimary}
        anchorX="center"
        anchorY="middle"
        maxWidth={1.4}
        lineHeight={1.35}
        textAlign="center"
      >
        Passionate developer and problem solver, building intelligent solutions that create real-world impact through cutting-edge technologies.
      </Text>
    </HUDPanel3D>
  );
}

/** Achievements — floating left of capsule, lower. */
function FloatingAchievements() {
  return (
    <HUDPanel3D
      position={[-3.5, 1.2, 0.5]}
      rotation={[0, 0.3, 0]}
      width={1.6}
      height={1.4}
      title="ACHIEVEMENTS"
      bob
    >
      {achievements.slice(0, 4).map((line, i) => {
        const y = 0.35 - i * 0.18;
        return (
          <group key={line} position={[0, y, 0]}>
            <mesh raycast={noRaycast} position={[-0.65, 0, 0]}>
              <circleGeometry args={[0.025, 12]} />
              <meshBasicMaterial color={palette.neonBright} toneMapped={false} />
            </mesh>
            <Text
              raycast={noRaycast}
              ref={disableRaycast}
              position={[-0.55, 0, 0]}
              fontSize={0.055}
              color={palette.textPrimary}
              anchorX="left"
              anchorY="middle"
              maxWidth={1.2}
              letterSpacing={0.08}
            >
              {line.toUpperCase()}
            </Text>
          </group>
        );
      })}
    </HUDPanel3D>
  );
}

/** Current Status + Download Resume button — floating right of capsule, lower. */
function FloatingStatus() {
  const openResume = usePortfolioStore((s) => s.openResume);
  const setCursor = usePortfolioStore((s) => s.setCursorState);

  return (
    <HUDPanel3D
      position={[3.5, 1.2, 0.5]}
      rotation={[0, -0.3, 0]}
      width={1.7}
      height={1.4}
      title="CURRENT STATUS"
      bob
    >
      {/* Status bullets. */}
      <group position={[0, 0.35, 0]}>
        <mesh raycast={noRaycast} position={[-0.65, 0, 0]}>
          <circleGeometry args={[0.025, 12]} />
          <meshBasicMaterial color={palette.neonBright} toneMapped={false} />
        </mesh>
        <Text
          raycast={noRaycast}
          ref={disableRaycast}
          position={[-0.55, 0, 0]}
          fontSize={0.055}
          color={palette.textPrimary}
          anchorX="left"
          anchorY="middle"
          maxWidth={1.2}
        >
          Available for new opportunities
        </Text>
      </group>
      <group position={[0, 0.15, 0]}>
        <mesh raycast={noRaycast} position={[-0.65, 0, 0]}>
          <circleGeometry args={[0.025, 12]} />
          <meshBasicMaterial color={palette.neonBright} toneMapped={false} />
        </mesh>
        <Text
          raycast={noRaycast}
          ref={disableRaycast}
          position={[-0.55, 0, 0]}
          fontSize={0.055}
          color={palette.textPrimary}
          anchorX="left"
          anchorY="middle"
          maxWidth={1.2}
        >
          Open to collaborate
        </Text>
      </group>

      {/* Download Resume button. */}
      <group position={[0, -0.35, 0]}>
        <mesh
          onPointerOver={(e) => {
            e.stopPropagation();
            setCursor('interactive');
            play('hover');
          }}
          onPointerOut={(e) => {
            e.stopPropagation();
            setCursor('idle');
          }}
          onClick={(e) => {
            e.stopPropagation();
            play('click_primary');
            openResume();
          }}
        >
          <planeGeometry args={[1.2, 0.22]} />
          <meshStandardMaterial
            color={palette.neonGreen}
            emissive={palette.neonGreen}
            emissiveIntensity={0.6}
            transparent
            opacity={0.25}
          />
        </mesh>
        <Text
          raycast={noRaycast}
          ref={disableRaycast}
          position={[0, 0, 0.01]}
          fontSize={0.06}
          color={palette.neonBright}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.2}
          outlineWidth={0.003}
          outlineColor={palette.neonGreen}
        >
          ↓ DOWNLOAD RESUME
        </Text>
      </group>
    </HUDPanel3D>
  );
}

/** Philosophy — floating right of capsule, upper. */
function FloatingPhilosophy() {
  return (
    <HUDPanel3D
      position={[3.5, 2.7, 0.5]}
      rotation={[0, -0.3, 0]}
      width={1.7}
      height={1.1}
      title="MY PHILOSOPHY"
      bob
    >
      <Text
        raycast={noRaycast}
        ref={disableRaycast}
        position={[0, -0.05, 0]}
        fontSize={0.058}
        color={palette.textPrimary}
        anchorX="center"
        anchorY="middle"
        maxWidth={1.5}
        lineHeight={1.4}
        textAlign="center"
      >
        {`“${philosophy}”`}
      </Text>
    </HUDPanel3D>
  );
}

// ─────────────────────────── FLOOR SERVICES STRIP ─────────────────────

/** Floor projection — 6 service hex tiles in a row in front of the camera. */
function FloorServicesStrip() {
  const services = [
    { title: 'AI SOLUTIONS', sub: 'INTELLIGENT SYSTEMS' },
    { title: 'WEB DEVELOPMENT', sub: 'FULL STACK SITES' },
    { title: 'CLOUD & DEVOPS', sub: 'SCALABLE INFRA' },
    { title: 'DATA & ANALYTICS', sub: 'INSIGHTS · METRICS' },
    { title: 'CYBER SECURITY', sub: 'SECURE BY DESIGN' },
    { title: 'UI / UX DESIGN', sub: 'CRAFTED EXPERIENCES' },
  ];
  return (
    <group position={[0, 0.05, 6]} rotation={[-Math.PI / 2 + 0.2, 0, 0]}>
      <Text
        raycast={noRaycast}
        ref={disableRaycast}
        position={[0, 0.8, 0.01]}
        fontSize={0.13}
        color={palette.neonBright}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.32}
        outlineWidth={0.003}
        outlineColor={palette.neonGreen}
      >
        SERVICES I OFFER
      </Text>
      {services.map((s, i) => {
        const x = -3.75 + i * 1.5;
        return <ServiceHex key={s.title} x={x} title={s.title} sub={s.sub} phase={i * 0.5} />;
      })}
    </group>
  );
}

function ServiceHex({
  x,
  title,
  sub,
  phase,
}: {
  x: number;
  title: string;
  sub: string;
  phase: number;
}) {
  const ref = useRef<Group | null>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime + phase;
    ref.current.position.z = 0.02 + Math.sin(t * 0.8) * 0.02;
  });
  return (
    <group ref={ref} position={[x, 0, 0.02]}>
      <mesh raycast={noRaycast}>
        <cylinderGeometry args={[0.4, 0.4, 0.02, 6]} />
        <meshStandardMaterial
          color={palette.neonGreen}
          emissive={palette.neonGreen}
          emissiveIntensity={0.4}
          metalness={0.6}
          roughness={0.3}
          transparent
          opacity={0.35}
        />
      </mesh>
      {/* Icon placeholder — small floating shape inside the hex. */}
      <mesh raycast={noRaycast} position={[0, 0.04, 0]} rotation={[0, 0, 0]}>
        <icosahedronGeometry args={[0.12, 0]} />
        <meshStandardMaterial
          color={palette.neonBright}
          emissive={palette.neonBright}
          emissiveIntensity={1.4}
          toneMapped={false}
          wireframe
        />
      </mesh>
      <Text
        raycast={noRaycast}
        ref={disableRaycast}
        position={[0, -0.55, 0]}
        rotation={[0, 0, 0]}
        fontSize={0.07}
        color={palette.textPrimary}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.16}
        outlineWidth={0.002}
        outlineColor="#000"
        maxWidth={1.3}
      >
        {title}
      </Text>
      <Text
        raycast={noRaycast}
        ref={disableRaycast}
        position={[0, -0.70, 0]}
        fontSize={0.04}
        color={palette.textSecondary}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.18}
        maxWidth={1.3}
      >
        {sub}
      </Text>
    </group>
  );
}

// ─────────────────────────── EXPORT — single mount point ──────────

/**
 * Single component that mounts every V10.1 3D HUD panel inside the
 * museum room. Drop into <Scene/> once.
 */
export function RoomPanels() {
  return (
    <group>
      {/* Left wall. */}
      <LeftWallNav />
      <LeftWallExpertise />
      <LeftWallTechStack />

      {/* Right wall. */}
      <RightWallStatus />
      <RightWallMetrics />
      <RightWallLiveFeed />

      {/* Floating around capsule. */}
      <FloatingAbout />
      <FloatingAchievements />
      <FloatingPhilosophy />
      <FloatingStatus />

      {/* Floor in front of camera. */}
      <FloorServicesStrip />
    </group>
  );
}
