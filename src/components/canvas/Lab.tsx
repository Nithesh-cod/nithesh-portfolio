'use client';

import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { useMemo, useRef, useState } from 'react';
import { AdditiveBlending, BackSide, Color, type Group, type Mesh, type MeshBasicMaterial, type MeshStandardMaterial } from 'three';
import { stations, RACK_POS, certificateGroups, waypoints, type Certificate } from '@/lib/content';
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
      {/* Crt and ContactTerminal merged into AllTerminalsArc in V2.5 — see Scene.tsx. */}
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
  // V6.0 — grid line emissive bumped 0.30 → 0.39 (+30 %) for a brighter
  // emerald grid against the new slate-purple background tint.
  vec3 col = mix(uBase, uLine, line * 0.39 * (0.6 + 0.4 * pulse));

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
  // V2.7 — opening animation. openAmount is a shared ref that lerps toward 1
  // when the camera is at/near the certifications waypoint and toward 0
  // otherwise. Stripes, body emissive, and label scale all read from it each
  // frame, so the rack visibly "unfolds" as the visitor arrives.
  const openAmount = useRef(0);
  const lastOpen = useRef(0);
  const section = usePortfolioStore((s) => s.section);
  const certWpIndex = useMemo(() => waypoints.findIndex((w) => w.id === 'certifications'), []);
  const bodyMatRef = useRef<MeshStandardMaterial | null>(null);
  const labelGroupRef = useRef<Group | null>(null);

  useFrame(() => {
    // Open while the camera is at the cert waypoint or one stop before.
    const target =
      certWpIndex >= 0 && section >= certWpIndex - 1 && section <= certWpIndex ? 1 : 0;
    openAmount.current += (target - openAmount.current) * 0.05;
    const open = openAmount.current;

    // "Activation" sound — fires once when crossing the 0.3 → 0.5 threshold.
    if (lastOpen.current <= 0.3 && open > 0.5) {
      play('startup');
    }
    lastOpen.current = open;

    if (bodyMatRef.current) {
      bodyMatRef.current.emissiveIntensity = 0.05 + open * 0.20;
    }
    if (labelGroupRef.current) {
      const s = 1 + open * 0.1;
      labelGroupRef.current.scale.setScalar(s);
    }
  });

  return (
    <group position={RACK_POS}>
      {/* Rack chassis — graphite, metal. V2.7: emissive emerald-glow modulated
          by openAmount so the rack visibly brightens as the camera arrives. */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[RACK_W, RACK_H, RACK_D]} />
        <meshStandardMaterial
          ref={bodyMatRef}
          color={palette.graphite}
          emissive={palette.emeraldGlow}
          emissiveIntensity={0.05}
          roughness={0.5}
          metalness={0.85}
        />
      </mesh>

      {/* CERTIFICATES label — wrapped in a group so we can scale it without
          rebuilding the troika text geometry every frame. */}
      <group ref={labelGroupRef} position={[0, RACK_H / 2 + 0.18, RACK_D / 2 + 0.001]}>
        <Text
          raycast={noRaycast}
          ref={disableRaycast}
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
        {/* V6.0 — small "12 / 12" counter below the title in subtle bone. */}
        <Text
          raycast={noRaycast}
          ref={disableRaycast}
          position={[0, -0.04, 0]}
          fontSize={0.06}
          color={palette.bone}
          anchorX="center"
          anchorY="top"
          letterSpacing={0.3}
          outlineWidth={0.001}
          outlineColor={palette.void}
        >
          12 / 12
        </Text>
      </group>

      {/* 12 stripes — 2 rows × 6 columns. openAmount passed via ref so each
          stripe can lerp its own position toward the open pose. */}
      {STRIPE_ORDER.map((spec, i) => (
        <Stripe key={spec.certId} index={i} spec={spec} openAmountRef={openAmount} />
      ))}

      {/* V2.6 details — bolts at the 4 corners (front face), status LED at top,
          and cable ties on the back chassis. */}
      <RackBolts />
      <RackStatusLed />
      <RackCableTies />

      {/* Sweeping scanline — horizontal emerald bar that travels top→bottom
          across the rack chassis face every 4s. Pure visual drama. */}
      <RackScanline />
    </group>
  );
}

function RackBolts() {
  // 4 small dark spheres at the front-face corners, slightly recessed.
  const ix = RACK_W / 2 - 0.05;
  const iy = RACK_H / 2 - 0.05;
  const z = RACK_D / 2 - 0.005;
  const corners: readonly [number, number][] = [
    [-ix, iy],
    [ix, iy],
    [-ix, -iy],
    [ix, -iy],
  ];
  return (
    <>
      {corners.map(([x, y], i) => (
        <mesh key={i} position={[x, y, z]}>
          <sphereGeometry args={[0.02, 12, 8]} />
          <meshStandardMaterial color={palette.steel} metalness={0.9} roughness={0.35} />
        </mesh>
      ))}
    </>
  );
}

function RackStatusLed() {
  const matRef = useRef<MeshStandardMaterial | null>(null);
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    if (matRef.current) {
      // Slow amber pulse 1.6s period — reads as "system online".
      matRef.current.emissiveIntensity = 1.2 + 0.5 * Math.sin(t.current * 3.9);
    }
  });
  return (
    <group position={[0, RACK_H / 2 - 0.07, RACK_D / 2 + 0.001]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.006, 14]} />
        <meshStandardMaterial
          ref={matRef}
          color={palette.amberKey}
          emissive={palette.amberKey}
          emissiveIntensity={1.4}
        />
      </mesh>
    </group>
  );
}

function RackCableTies() {
  // 3 thin dark cylinders crossing the back of the rack, visible from orbit-back.
  const ys = [0.7, 0.0, -0.7];
  return (
    <>
      {ys.map((y, i) => (
        <mesh key={i} position={[0, y, -(RACK_D / 2 + 0.012)]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.015, 0.015, RACK_W * 0.95, 12]} />
          <meshStandardMaterial color={palette.void} metalness={0.6} roughness={0.7} />
        </mesh>
      ))}
    </>
  );
}

function RackScanline() {
  const matRef = useRef<MeshBasicMaterial | null>(null);
  const meshRef = useRef<Mesh>(null);
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    const period = 4;
    const phase = (t.current % period) / period; // 0..1
    if (meshRef.current) {
      // travel from y = +H/2 - 0.05 → -H/2 + 0.05
      const top = RACK_H / 2 - 0.05;
      const bot = -RACK_H / 2 + 0.05;
      meshRef.current.position.y = top + (bot - top) * phase;
    }
    if (matRef.current) {
      // bright at midpass, dim at the edges
      const e = Math.sin(phase * Math.PI);
      matRef.current.opacity = 0.05 + 0.35 * e;
    }
  });
  return (
    <mesh ref={meshRef} position={[0, RACK_H / 2 - 0.05, RACK_D / 2 + 0.02]}>
      <planeGeometry args={[RACK_W * 0.96, 0.028]} />
      <meshBasicMaterial
        ref={matRef}
        color={palette.emeraldHot}
        transparent
        opacity={0.25}
        blending={AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

const STRIPE_W = 0.16;
const STRIPE_H = 0.7;
const STRIPE_D = 0.02;

function Stripe({
  index,
  spec,
  openAmountRef,
}: {
  index: number;
  spec: StripeSpec;
  openAmountRef: React.MutableRefObject<number>;
}) {
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
  // Row 0 (odd in spec wording) fans LEFT, row 1 fans RIGHT — "drawer fan".
  const fanDir = row === 0 ? -1 : 1;

  // Hover slide + per-stripe breathing brightness (~10% modulation, 6s period,
  // offset by index so the rack reads as alive instead of strobing in unison).
  // V2.7: also lerps toward an "open" pose driven by the parent's openAmountRef.
  useFrame((_, dt) => {
    timeRef.current += dt;
    const open = openAmountRef.current;
    if (meshRef.current) {
      const targetZ = baseZ + (hovered ? 0.05 : 0) + open * 0.15;
      const targetX = x + fanDir * open * 0.05;
      meshRef.current.position.z += (targetZ - meshRef.current.position.z) * Math.min(1, dt * 10);
      meshRef.current.position.x += (targetX - meshRef.current.position.x) * Math.min(1, dt * 10);
      meshRef.current.rotation.x = open * 0.05;
    }
    if (matRef.current) {
      const phase = (timeRef.current / 6) * Math.PI * 2 + index * 0.55;
      const base = hovered ? 1.4 : 0.95;
      const breathe = 1 + Math.sin(phase) * 0.1;
      const accentBias = spec.accent === 'amber' ? -0.2 : 0;
      // Add an "opening boost" so stripes brighten when the rack activates.
      matRef.current.emissiveIntensity = (base + accentBias) * breathe + open * 0.6;
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

/* CRT and ContactTerminal moved to AllTerminalsArc.tsx in V2.5 — see Scene.tsx. */
