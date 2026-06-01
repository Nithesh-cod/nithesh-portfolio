'use client';

import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Billboard, Text, useTexture } from '@react-three/drei';
import { useMemo, useRef, useState } from 'react';
import { BackSide, Color, type Mesh, type MeshStandardMaterial, type Texture } from 'three';
import { stations, RACK_POS, CRT_POS, CONTACT_POS, content, certificateGroups, type Certificate } from '@/lib/content';
import { InteractiveConsole } from '@/components/canvas/InteractiveConsole';
import { FogParticles } from '@/components/canvas/FogParticles';
import { play } from '@/lib/audio';
import { usePortfolioStore } from '@/lib/store';
import { palette } from '@/lib/palette';
import { disableRaycast, noRaycast } from '@/lib/three-utils';

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

// V2.4 floor shader: existing radial pulse PLUS a slow expanding ring every
// 8s. The ring is a thin bright band around r = (uTime mod 8) / 8 * 0.6.
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

  // Expanding ring pulse — bright band sweeps outward over 8s, fades at the
  // horizon. The exp(-x²) gives a soft band, sin(...) only contributes the
  // emerald-line colour so chassis areas aren't affected.
  float ringT = mod(uTime, 8.0) / 8.0;
  float ringR = ringT * 0.65;
  float ringBand = exp(-pow((r - ringR) * 40.0, 2.0));
  float ringFade = 1.0 - smoothstep(0.5, 0.65, r);
  col += uLine * ringBand * ringFade * 0.55 * (1.0 - ringT);

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
 * Server-rack visual restored per V1.9 spec: 12 vertical emerald stripes
 * in a 2-row × 6-column layout, each stripe = one cert "drawer". Click a
 * stripe → CertificateLightbox opens with the full-res cert.
 *
 * Accent colours are MEANINGFUL now:
 *   • AMBER  stripe = Applied Generative AI         (i = 4, top row)
 *   • VIOLET stripe = AI-First Software Engineering (i = 5, top row)
 *   • Every other stripe = emerald.
 *
 * A "CERTIFICATES" label sits above the rack in gold.
 *
 * Index → cert mapping (left→right, top→bottom):
 *   Top row (y = +0.5):   html5, css3, javascript, front-end-web-dev,
 *                         applied-gen-ai*, ai-first-software-engineering*
 *   Bottom row (y = −0.5): openai-gpt-models, gpt-3-for-developers,
 *                         prompt-engineering, basics-of-python,
 *                         python-fundamentals-part1, python-fundamentals-part2
 * ─────────────────────────────────────────────────────────────────── */

const RACK_W = 1.6;
const RACK_H = 2.6;
const RACK_D = 0.9;

type StripeSpec = { certId: string; accent: 'emerald' | 'amber' | 'violet' };

const STRIPE_ORDER: readonly StripeSpec[] = [
  // Top row (i = 0..5)
  { certId: 'html5',                          accent: 'emerald' },
  { certId: 'css3',                           accent: 'emerald' },
  { certId: 'javascript',                     accent: 'emerald' },
  { certId: 'front-end-web-dev',              accent: 'emerald' },
  { certId: 'applied-gen-ai',                 accent: 'amber'   },
  { certId: 'ai-first-software-engineering',  accent: 'violet'  },
  // Bottom row (i = 6..11)
  { certId: 'openai-gpt-models',              accent: 'emerald' },
  { certId: 'gpt-3-for-developers',           accent: 'emerald' },
  { certId: 'prompt-engineering',             accent: 'emerald' },
  { certId: 'basics-of-python',               accent: 'emerald' },
  { certId: 'python-fundamentals-part1',      accent: 'emerald' },
  { certId: 'python-fundamentals-part2',      accent: 'emerald' },
];

const ACCENT_COLOUR: Record<StripeSpec['accent'], string> = {
  emerald: palette.emeraldMid,
  amber: palette.amberKey,
  violet: palette.violetSpark,
};

const CERT_BY_ID: ReadonlyMap<string, Certificate> = new Map(
  certificateGroups.flatMap((g) => g.certs.map((c) => [c.id, c] as const)),
);

function CertificateRack() {
  return (
    <group position={RACK_POS}>
      {/* Rack chassis — graphite, metal */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[RACK_W, RACK_H, RACK_D]} />
        <meshStandardMaterial color={palette.graphite} roughness={0.5} metalness={0.85} />
      </mesh>

      {/* CERTIFICATES label above the rack, raycast disabled. */}
      <Text
        raycast={noRaycast}
        ref={disableRaycast}
        position={[0, RACK_H / 2 + 0.18, RACK_D / 2 + 0.001]}
        fontSize={0.22}
        color={palette.goldAccent}
        anchorX="center"
        anchorY="bottom"
        letterSpacing={0.22}
        outlineWidth={0.003}
        outlineColor={palette.void}
      >
        CERTIFICATES
      </Text>

      {/* 12 stripes — 2 rows × 6 columns. */}
      {STRIPE_ORDER.map((spec, i) => (
        <Stripe key={spec.certId} index={i} spec={spec} />
      ))}
    </group>
  );
}

const STRIPE_W = 0.16;
const STRIPE_H = 0.7;
const STRIPE_D = 0.02;

function Stripe({ index, spec }: { index: number; spec: StripeSpec }) {
  const cert = CERT_BY_ID.get(spec.certId);
  const meshRef = useRef<Mesh>(null);
  const matRef = useRef<MeshStandardMaterial | null>(null);
  const [hovered, setHovered] = useState(false);
  const openCertificate = usePortfolioStore((s) => s.openCertificate);
  const setCursor = usePortfolioStore((s) => s.setCursorState);
  const lastHoverAt = useRef(0);
  const timeRef = useRef(0);

  // Position formula: 6-wide rows, top row first (i 0..5), bottom row (i 6..11).
  const row = Math.floor(index / 6);
  const col = index % 6;
  const x = -0.6 + col * 0.24;
  const y = row === 0 ? 0.5 : -0.5; // top row +0.5, bottom row -0.5
  const baseZ = RACK_D / 2 + 0.01;

  // Hover slide + per-stripe breathing brightness (~10% modulation, 6s period,
  // offset by index so the rack reads as alive instead of strobing in unison).
  useFrame((_, dt) => {
    timeRef.current += dt;
    if (meshRef.current) {
      const target = baseZ + (hovered ? 0.05 : 0);
      meshRef.current.position.z += (target - meshRef.current.position.z) * Math.min(1, dt * 10);
    }
    if (matRef.current) {
      const phase = (timeRef.current / 6) * Math.PI * 2 + index * 0.55;
      const base = hovered ? 1.4 : 0.95;
      const breathe = 1 + Math.sin(phase) * 0.1;
      const accentBias = spec.accent === 'amber' ? -0.2 : 0;
      matRef.current.emissiveIntensity = (base + accentBias) * breathe;
    }
  });

  if (!cert) return null;

  const color = ACCENT_COLOUR[spec.accent];

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
    openCertificate(spec.certId);
  };

  return (
    <mesh
      ref={meshRef}
      position={[x, y, baseZ]}
      onPointerOver={handleOver}
      onPointerOut={handleOut}
      onClick={handleClick}
    >
      <boxGeometry args={[STRIPE_W, STRIPE_H, STRIPE_D]} />
      <meshStandardMaterial ref={matRef} color={palette.void} emissive={color} emissiveIntensity={0.95} />
    </mesh>
  );
}

/* ───────────────────────────  CRT  ─────────────────────────────── */

function Crt() {
  const setCursorState = usePortfolioStore((s) => s.setCursorState);
  const openTerminal = usePortfolioStore((s) => s.openTerminal);
  const [hovered, setHovered] = useState(false);
  // 150 ms throttle to keep hover from spamming the audio pool on re-entry.
  const lastHoverAt = useRef(0);

  const handleOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    setCursorState('interactive');
    const now = performance.now();
    if (now - lastHoverAt.current < 150) return;
    lastHoverAt.current = now;
    play('hover');
  };
  const handleOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(false);
    setCursorState('idle');
  };
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    play('startup');
    openTerminal();
  };

  return (
    <group position={CRT_POS} rotation={[0, Math.PI / 2.5, 0]} onPointerOver={handleOver} onPointerOut={handleOut} onClick={handleClick}>
      {/* Hover hint — Billboarded so it always faces camera. */}
      {hovered ? (
        <Billboard position={[0, 0.75, 0]}>
          <Text
            raycast={noRaycast}
            ref={disableRaycast}
            fontSize={0.09}
            color={palette.emeraldGlow}
            anchorX="center"
            anchorY="middle"
            letterSpacing={0.2}
            outlineWidth={0.003}
            outlineColor={palette.void}
          >
            CLICK TO OPEN TERMINAL
          </Text>
        </Billboard>
      ) : null}

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

function ContactTerminal() {
  const setCursorState = usePortfolioStore((s) => s.setCursorState);
  const openResume = usePortfolioStore((s) => s.openResume);
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
        ref={disableRaycast}
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
        ref={disableRaycast}
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
