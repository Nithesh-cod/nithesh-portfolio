'use client';

import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import { BackSide, Color } from 'three';
import { stations, RACK_POS, CRT_POS, CONTACT_POS, content } from '@/lib/content';
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
      <ServerRack />
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

/* ─────────────────────────  Server rack  ───────────────────────── */
// 12 LEDs: 1 violet-spark (index 5) + 2 amber-key (indices 3, 9) + 9 emerald-mid.

type LedSpec = { color: string; intensity: number };
const LED_SPECS: readonly LedSpec[] = Array.from({ length: 12 }, (_, i) =>
  i === 5
    ? { color: palette.violetSpark, intensity: 1.1 }
    : i === 3 || i === 9
      ? { color: palette.amberKey, intensity: 0.45 }
      : { color: palette.emeraldMid, intensity: 0.9 },
);

function ServerRack() {
  return (
    <group position={RACK_POS}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.6, 2.6, 0.9]} />
        <meshStandardMaterial color={palette.graphite} roughness={0.25} metalness={0.9} />
      </mesh>
      {LED_SPECS.map((spec, i) => (
        <mesh
          key={i}
          position={[-0.6 + (i % 6) * 0.24, -1.0 + Math.floor(i / 6) * 1.0, 0.46]}
          ref={(m) => m?.layers.enable(1)}
        >
          <boxGeometry args={[0.16, 0.7, 0.02]} />
          <meshStandardMaterial color={palette.void} emissive={spec.color} emissiveIntensity={spec.intensity} />
        </mesh>
      ))}
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
