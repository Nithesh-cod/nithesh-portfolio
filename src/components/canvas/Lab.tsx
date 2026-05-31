'use client';

import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Text, useTexture } from '@react-three/drei';
import { useMemo, useRef, useState } from 'react';
import { BackSide, Color, type Mesh, type Texture } from 'three';
import { stations, RACK_POS, CRT_POS, CONTACT_POS, content, certificateGroups, type Certificate } from '@/lib/content';
import { InteractiveConsole } from '@/components/canvas/InteractiveConsole';
import { FogParticles } from '@/components/canvas/FogParticles';
import { play } from '@/lib/audio';
import { usePortfolioStore } from '@/lib/store';
import { palette } from '@/lib/palette';
import { noRaycast } from '@/lib/three-utils';

export function Lab() {
  return (
    <group>
      <Sky />
      <Floor />
      {stations.map((s) => (
        <InteractiveConsole key={s.slug} slug={s.slug} label={s.label} position={s.position} />
      ))}
      <CertificateRack />
      <Crt />
      <ContactTerminal />
      <FogParticles />
    </group>
  );
}

/* ────────────────────────────  Sky  ──────────────────────────────
 * Near-black sphere with a faint teal-haze band around the horizon (8%).
 * Replaces the green gradient — sky should not advertise the accent colour. */

const SKY_VERT = /* glsl */ `varying vec3 vDir;
void main(){
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const SKY_FRAG = /* glsl */ `varying vec3 vDir;
uniform vec3 uVoid; uniform vec3 uTeal;
void main(){
  vec3 d = normalize(vDir);
  float band = 1.0 - smoothstep(0.0, 0.4, abs(d.y));
  gl_FragColor = vec4(mix(uVoid, uTeal, band * 0.08), 1.0);
}`;

function Sky() {
  const uniforms = useMemo(
    () => ({ uVoid: { value: new Color(palette.void) }, uTeal: { value: new Color(palette.tealHaze) } }),
    [],
  );
  return (
    <mesh>
      <sphereGeometry args={[40, 32, 16]} />
      <shaderMaterial vertexShader={SKY_VERT} fragmentShader={SKY_FRAG} uniforms={uniforms} side={BackSide} depthWrite={false} />
    </mesh>
  );
}

/* ────────────────────────────  Floor  ──────────────────────────── */

const FLOOR_VERT = /* glsl */ `varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;

// Halved line width (×1.8 fwidth divisor), emerald-dim colour, ~30% pulse contribution
// (was 1.0), strong radial vignette to black at the horizon.
const FLOOR_FRAG = /* glsl */ `precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform vec3 uBase;
uniform vec3 uLine;
void main(){
  vec2 g = abs(fract(vUv * 60.0 - 0.5) - 0.5) / max(fwidth(vUv * 60.0) * 1.8, vec2(1e-4));
  float line = 1.0 - min(min(g.x, g.y), 1.0);
  vec2 c = vUv - 0.5;
  float r = length(c);
  float pulse = 0.5 + 0.5 * sin(uTime * 0.6 - r * 14.0);
  vec3 col = mix(uBase, uLine, line * 0.30 * (0.6 + 0.4 * pulse));
  col *= 1.0 - smoothstep(0.25, 0.62, r);
  gl_FragColor = vec4(col, 1.0);
}`;

function Floor() {
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBase: { value: new Color(palette.void) },
      uLine: { value: new Color(palette.emeraldDim) },
    }),
    [],
  );
  useFrame((_, dt) => {
    uniforms.uTime.value += dt;
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -1]} receiveShadow>
      <planeGeometry args={[40, 40, 1, 1]} />
      <shaderMaterial vertexShader={FLOOR_VERT} fragmentShader={FLOOR_FRAG} uniforms={uniforms} />
    </mesh>
  );
}

/* ─────────────────────────  Certificate rack  ──────────────────────
 * Right-side rack repurposed as the certifications shelf. 12 drawers in
 * 3 rows by category. Each drawer is a clickable mesh that opens the
 * full-resolution cert in the CertificateLightbox (via store).
 *
 * Decorative amber + violet side LEDs from the original ServerRack
 * survive — moved to the rack's right edge as status lights.
 * ─────────────────────────────────────────────────────────────────── */

const RACK_W = 2.9;
const RACK_H = 2.1;
const RACK_D = 0.55;
const DRAWER_W = 0.45;
const DRAWER_H = 0.3;
const DRAWER_D = 0.05;
const DRAWER_GAP_X = 0.06;
const HEADING_Y = 0.08;
const ROW_GAP_Y = 0.14;

type RackRow = { heading: string; ids: readonly string[] };

const RACK_ROWS: readonly RackRow[] = [
  { heading: 'FRONT-END',     ids: ['html5', 'css3', 'javascript', 'front-end-web-dev'] },
  { heading: 'GENERATIVE AI', ids: ['applied-gen-ai', 'ai-first-software-engineering', 'openai-gpt-models', 'gpt-3-for-developers', 'prompt-engineering'] },
  { heading: 'PROGRAMMING',   ids: ['basics-of-python', 'python-fundamentals-part1', 'python-fundamentals-part2'] },
];

const CERT_BY_ID: ReadonlyMap<string, Certificate> = new Map(
  certificateGroups.flatMap((g) => g.certs.map((c) => [c.id, c] as const)),
);

function CertificateRack() {
  // Layout rows top → bottom on the rack face.
  const rowStride = DRAWER_H + HEADING_Y + ROW_GAP_Y;
  const totalH = RACK_ROWS.length * rowStride - ROW_GAP_Y;
  const topY = totalH / 2;
  const faceZ = RACK_D / 2 + 0.002;

  return (
    <group position={RACK_POS}>
      {/* Rack chassis */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[RACK_W, RACK_H, RACK_D]} />
        <meshStandardMaterial color={palette.graphite} roughness={0.3} metalness={0.9} />
      </mesh>

      {/* Thin gold rim around the front face — 4 slabs */}
      {(
        [
          [0, RACK_H / 2 - 0.01, faceZ],
          [0, -RACK_H / 2 + 0.01, faceZ],
        ] as const
      ).map((p, i) => (
        <mesh key={`h${i}`} position={[p[0], p[1], p[2]]}>
          <boxGeometry args={[RACK_W, 0.018, 0.004]} />
          <meshStandardMaterial color={palette.goldAccent} emissive={palette.goldAccent} emissiveIntensity={0.2} metalness={0.95} roughness={0.25} />
        </mesh>
      ))}
      {(
        [
          [-RACK_W / 2 + 0.01, 0, faceZ],
          [RACK_W / 2 - 0.01, 0, faceZ],
        ] as const
      ).map((p, i) => (
        <mesh key={`v${i}`} position={[p[0], p[1], p[2]]}>
          <boxGeometry args={[0.018, RACK_H, 0.004]} />
          <meshStandardMaterial color={palette.goldAccent} emissive={palette.goldAccent} emissiveIntensity={0.2} metalness={0.95} roughness={0.25} />
        </mesh>
      ))}

      {/* Three row groups: heading + drawers */}
      {RACK_ROWS.map((row, ri) => {
        const yCentre = topY - ri * rowStride - HEADING_Y - DRAWER_H / 2;
        const rowWidth = row.ids.length * DRAWER_W + (row.ids.length - 1) * DRAWER_GAP_X;
        const xStart = -rowWidth / 2 + DRAWER_W / 2;
        return (
          <group key={row.heading} position={[0, yCentre, faceZ]}>
            <Text
              raycast={noRaycast}
              position={[0, DRAWER_H / 2 + 0.06, 0]}
              fontSize={0.06}
              color={palette.goldAccent}
              anchorX="center"
              anchorY="middle"
              letterSpacing={0.18}
              outlineWidth={0.001}
              outlineColor={palette.void}
            >
              {row.heading}
            </Text>
            {row.ids.map((id, di) => (
              <Drawer
                key={id}
                certId={id}
                position={[xStart + di * (DRAWER_W + DRAWER_GAP_X), 0, 0]}
              />
            ))}
          </group>
        );
      })}

      {/* Side status LEDs — keepsakes from the original ServerRack. */}
      <mesh position={[RACK_W / 2 + 0.03, 0.55, 0.12]} ref={(m) => m?.layers.enable(1)}>
        <boxGeometry args={[0.04, 0.1, 0.02]} />
        <meshStandardMaterial color={palette.void} emissive={palette.amberKey} emissiveIntensity={0.7} />
      </mesh>
      <mesh position={[RACK_W / 2 + 0.03, 0.35, 0.12]} ref={(m) => m?.layers.enable(1)}>
        <boxGeometry args={[0.04, 0.1, 0.02]} />
        <meshStandardMaterial color={palette.void} emissive={palette.violetSpark} emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[RACK_W / 2 + 0.03, 0.15, 0.12]} ref={(m) => m?.layers.enable(1)}>
        <boxGeometry args={[0.04, 0.1, 0.02]} />
        <meshStandardMaterial color={palette.void} emissive={palette.emeraldMid} emissiveIntensity={0.7} />
      </mesh>
    </group>
  );
}

function Drawer({ certId, position }: { certId: string; position: readonly [number, number, number] }) {
  const cert = CERT_BY_ID.get(certId);
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const openCertificate = usePortfolioStore((s) => s.openCertificate);
  const setCursor = usePortfolioStore((s) => s.setCursorState);
  const lastHoverAt = useRef(0);
  const baseZ = position[2];
  // useTexture suspends; cert.image is the same PNG used by the lightbox.
  const tex = useTexture(cert?.image ?? '/portrait.png') as Texture;

  // Hover slide: drawer eases +0.1 z forward.
  useFrame((_, dt) => {
    if (!meshRef.current) return;
    const target = baseZ + (hovered ? 0.1 : 0);
    meshRef.current.position.z += (target - meshRef.current.position.z) * Math.min(1, dt * 8);
  });

  if (!cert) return null;

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
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    play('click_primary');
    openCertificate(certId);
  };

  return (
    <group>
      {/* Drawer front — handlers DIRECTLY on the mesh (FIX 1 lesson). */}
      <mesh
        ref={meshRef}
        position={[position[0], position[1], position[2]]}
        onPointerOver={handleOver}
        onPointerOut={handleOut}
        onClick={handleClick}
      >
        <boxGeometry args={[DRAWER_W, DRAWER_H, DRAWER_D]} />
        <meshStandardMaterial
          map={tex}
          color={palette.ivory}
          emissive={palette.emeraldMid}
          emissiveIntensity={hovered ? 0.18 : 0.05}
          roughness={0.55}
          metalness={0.1}
        />
      </mesh>
      {/* Date below the drawer — Billboard-style fixed text, raycast disabled.
          (Title is visible on the drawer thumbnail; date is the supplementary line.) */}
      <Text
        raycast={noRaycast}
        position={[position[0], position[1] - DRAWER_H / 2 - 0.06, position[2] + DRAWER_D / 2 + 0.002]}
        fontSize={0.035}
        color={palette.bone}
        anchorX="center"
        anchorY="top"
        letterSpacing={0.04}
      >
        {cert.date}
      </Text>
    </group>
  );
}

/* ───────────────────────────  CRT  ─────────────────────────────── */

function Crt() {
  const setCursorState = usePortfolioStore((s) => s.setCursorState);
  // 150 ms throttle to keep hover from spamming the audio pool on re-entry.
  const lastHoverAt = useRef(0);

  const handleOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setCursorState('interactive');
    const now = performance.now();
    if (now - lastHoverAt.current < 150) return;
    lastHoverAt.current = now;
    play('hover');
  };
  const handleOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setCursorState('idle');
  };
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    play('startup');
    // eslint-disable-next-line no-console
    console.info('[crt] activated — terminal overlay lands in M4');
  };

  return (
    <group position={CRT_POS} rotation={[0, Math.PI / 2.5, 0]} onPointerOver={handleOver} onPointerOut={handleOut} onClick={handleClick}>
      <mesh position={[0, -0.45, 0]} receiveShadow>
        <boxGeometry args={[1.6, 0.08, 0.9]} />
        <meshStandardMaterial color={palette.graphite} roughness={0.55} metalness={0.6} />
      </mesh>
      <mesh castShadow>
        <boxGeometry args={[0.8, 0.65, 0.7]} />
        <meshStandardMaterial color={palette.steel} roughness={0.45} metalness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.36]} ref={(m) => m?.layers.enable(1)}>
        <boxGeometry args={[0.62, 0.48, 0.02]} />
        <meshStandardMaterial color={palette.void} emissive={palette.emeraldHot} emissiveIntensity={0.9} />
      </mesh>
    </group>
  );
}

/* ───────────────────────  Contact terminal  ────────────────────── */
// Email + LinkedIn + a clickable DOWNLOAD RESUME row. The whole group is
// clickable as a fallback for the resume PDF; the button area in the screen
// is the visual affordance. Keyboard parity lives in AccessibilityProxies.

const LINKEDIN_SHORT = content.contact.linkedin.replace(/^https?:\/\/(www\.)?/, '');
const RESUME_URL = content.contact.resumeUrl;

function openResume() {
  if (typeof window === 'undefined') return;
  window.open(RESUME_URL, '_blank', 'noopener,noreferrer');
}

function ContactTerminal() {
  const setCursorState = usePortfolioStore((s) => s.setCursorState);
  const lastHoverAt = useRef(0);

  const handleOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setCursorState('interactive');
    const now = performance.now();
    if (now - lastHoverAt.current < 150) return;
    lastHoverAt.current = now;
    play('hover');
  };
  const handleOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setCursorState('idle');
  };
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    // eslint-disable-next-line no-console
    console.log('[CONTACT-CLICK] handler fired — opening resume');
    play('click_primary');
    openResume();
  };

  // Build multi-line URL list from content.contactLinks (label-padded, host-only).
  const urlText = content.contactLinks
    .map((l) => `${l.label.padEnd(13)} ${l.url.replace(/^(https?:\/\/|mailto:)/, '')}`)
    .join('\n');

  return (
    <group
      position={CONTACT_POS}
      onPointerOver={handleOver}
      onPointerOut={handleOut}
      onClick={handleClick}
    >
      {/* Chassis */}
      <mesh castShadow>
        <boxGeometry args={[1.4, 1.8, 0.6]} />
        <meshStandardMaterial color={palette.graphite} roughness={0.4} metalness={0.85} />
      </mesh>
      {/* Screen (slightly proud of chassis, on layer 1 for rim light) — emissive
          intensity dropped so the text on top reads clearly. */}
      <mesh position={[0, 0.2, 0.32]} ref={(m) => m?.layers.enable(1)}>
        <boxGeometry args={[1.1, 0.75, 0.02]} />
        <meshStandardMaterial color={palette.void} emissive={palette.emeraldMid} emissiveIntensity={0.35} />
      </mesh>
      {/* Six-line URL list on the screen, mono, raycast disabled. */}
      <Text
        raycast={noRaycast}
        position={[0, 0.32, 0.341]}
        fontSize={0.036}
        color={palette.emeraldGlow}
        anchorX="center"
        anchorY="middle"
        lineHeight={1.55}
        letterSpacing={0.02}
        maxWidth={1.0}
        textAlign="left"
      >
        {urlText}
      </Text>
      {/* Divider rule */}
      <mesh position={[0, 0.04, 0.341]}>
        <planeGeometry args={[0.95, 0.004]} />
        <meshBasicMaterial color={palette.goldAccent} transparent opacity={0.7} />
      </mesh>
      {/* DOWNLOAD RESUME button row */}
      <Text
        raycast={noRaycast}
        position={[0, -0.04, 0.341]}
        fontSize={0.05}
        color={palette.goldAccent}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.18}
        outlineWidth={0.001}
        outlineColor={palette.void}
      >
        {'DOWNLOAD RESUME →'}
      </Text>
    </group>
  );
}
