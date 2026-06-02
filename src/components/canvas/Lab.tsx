'use client';

import { Text } from '@react-three/drei';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import gsap from 'gsap';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AdditiveBlending,
  BackSide,
  Color,
  Vector3,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
} from 'three';
import { stations, certificateGroups, RACK_POS, type Certificate } from '@/lib/content';
import { InteractiveConsole } from '@/components/canvas/InteractiveConsole';
import { FogParticles } from '@/components/canvas/FogParticles';
import { palette } from '@/lib/palette';
import { usePortfolioStore } from '@/lib/store';
import { disableRaycast, noRaycast } from '@/lib/three-utils';
import { play } from '@/lib/audio';

/**
 * V8.0 — environment shell.
 *   - 3-stop atmospheric sky sphere.
 *   - Reflective polished-obsidian floor disc (no grid).
 *   - Project console glass cards.
 *   - V8 CertificateRack: solid body + 12 stripes + 6 distinct animations.
 *   - FogParticles for atmospheric dust.
 */
export function Lab() {
  return (
    <group>
      <Sky />
      <Floor />
      {stations.map((s) => (
        <InteractiveConsole key={s.slug} slug={s.slug} label={s.label} position={s.position} />
      ))}
      <CertificateRack />
      <FogParticles />
    </group>
  );
}

/* ────────────────────────────  Sky  ────────────────────────────── */

const SKY_VERT = /* glsl */ `varying vec3 vDir;
void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const SKY_FRAG = /* glsl */ `varying vec3 vDir;
uniform vec3 uTop;
uniform vec3 uMid;
uniform vec3 uWarm;
uniform vec3 uBot;
void main(){
  vec3 d = normalize(vDir);
  float t = clamp(d.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 lower = mix(uBot, uMid, smoothstep(0.0, 0.5, t));
  vec3 col   = mix(lower, uTop, smoothstep(0.5, 1.0, t));
  float band = exp(-pow((t - 0.4) * 6.0, 2.0));
  col = mix(col, uWarm, band * 0.10);
  gl_FragColor = vec4(col, 1.0);
}`;

function Sky() {
  const uniforms = useMemo(
    () => ({
      uTop:  { value: new Color(palette.nightBase) },
      uMid:  { value: new Color(palette.nightMid) },
      uWarm: { value: new Color(palette.nightWarm) },
      uBot:  { value: new Color(palette.nightBase) },
    }),
    [],
  );
  return (
    <mesh>
      <sphereGeometry args={[80, 32, 16]} />
      <shaderMaterial
        vertexShader={SKY_VERT}
        fragmentShader={SKY_FRAG}
        uniforms={uniforms}
        side={BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}

/* ────────────────────────────  Floor  ──────────────────────────── */

const FLOOR_VERT = /* glsl */ `varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const FLOOR_FRAG = /* glsl */ `precision highp float;
varying vec2 vUv;
uniform vec3 uBase;
void main(){
  vec2 c = vUv - 0.5;
  float r = length(c);
  float a = 1.0 - smoothstep(0.18, 0.48, r);
  gl_FragColor = vec4(uBase, a * 0.5);
}`;

function Floor() {
  const overlayUniforms = useMemo(
    () => ({ uBase: { value: new Color(palette.nightBase) } }),
    [],
  );
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[22, 64]} />
        <meshPhysicalMaterial
          color={palette.nightBase}
          metalness={0.6}
          roughness={0.25}
          clearcoat={1.0}
          clearcoatRoughness={0.18}
          reflectivity={0.6}
          envMapIntensity={1.2}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <circleGeometry args={[22, 64]} />
        <shaderMaterial
          vertexShader={FLOOR_VERT}
          fragmentShader={FLOOR_FRAG}
          uniforms={overlayUniforms}
          transparent
          depthWrite={false}
        />
      </mesh>
    </>
  );
}

/* ═══════════════════════  Certificate Rack (V8.0)  ═══════════════════════
 * Solid rack body with 12 vertical stripes. Restored from V2.7. V8 adds:
 *   - approach unfold tied to camera distance (replaces V2.7 section gate)
 *   - GSAP drawer-click animation
 *   - hover preview (this stripe forward, adjacent dim)
 *   - idle pulse on a random stripe every ~12 s
 *   - status indicator "STATUS: ACTIVE" floating above rack
 * ─────────────────────────────────────────────────────────────────── */

// V8.1 — moved further back-right + slight inward yaw so the rack faces
// the camera. RACK_POS sourced from content.ts as the authoritative coord.
const RACK_POS_V8: readonly [number, number, number] = RACK_POS;
const RACK_YAW = -0.3; // slight rotation toward camera
const RACK_W = 2.5;
const RACK_H = 3.0;
const RACK_D = 0.4;

type StripeAccent = 'mint' | 'gold' | 'purple';
type StripeSpec = { certId: string; accent: StripeAccent };

const STRIPE_ORDER: readonly StripeSpec[] = [
  // Top row.
  { certId: 'html5',                          accent: 'mint' },
  { certId: 'css3',                           accent: 'mint' },
  { certId: 'javascript',                     accent: 'mint' },
  { certId: 'front-end-web-dev',              accent: 'mint' },
  { certId: 'applied-gen-ai',                 accent: 'gold' },
  { certId: 'ai-first-software-engineering',  accent: 'purple' },
  // Bottom row.
  { certId: 'openai-gpt-models',              accent: 'mint' },
  { certId: 'gpt-3-for-developers',           accent: 'mint' },
  { certId: 'prompt-engineering',             accent: 'mint' },
  { certId: 'basics-of-python',               accent: 'mint' },
  { certId: 'python-fundamentals-part1',      accent: 'mint' },
  { certId: 'python-fundamentals-part2',      accent: 'mint' },
];

const ACCENT_COLOR: Record<StripeAccent, string> = {
  mint:   palette.signalMint,
  gold:   palette.champagneGold,
  purple: '#B89DFF',
};

const CERT_BY_ID: ReadonlyMap<string, Certificate> = new Map(
  certificateGroups.flatMap((g) => g.certs.map((c) => [c.id, c] as const)),
);

const APPROACH_DISTANCE = 5.5;
const APPROACH_FAR = 9.0;

function CertificateRack() {
  // Approach state — driven by camera distance to rack centre.
  const openAmount = useRef({ value: 0 });
  const lastOpen = useRef(0);
  const idlePulseTarget = useRef<number>(-1); // index of currently pulsing stripe
  const lastIdlePulseAt = useRef(performance.now() + Math.random() * 12000);

  const bodyMatRef = useRef<MeshStandardMaterial | null>(null);
  const labelGroupRef = useRef<Group | null>(null);
  const statusDotRef = useRef<MeshStandardMaterial | null>(null);

  const { camera } = useThree();
  const tmpPos = useMemo(() => new Vector3(), []);

  useFrame((_, dt) => {
    // Approach amount: 0 if camera further than APPROACH_FAR, 1 if closer
    // than APPROACH_DISTANCE, lerp in-between.
    tmpPos.set(RACK_POS_V8[0], RACK_POS_V8[1], RACK_POS_V8[2]);
    const dist = camera.position.distanceTo(tmpPos);
    const target =
      dist <= APPROACH_DISTANCE
        ? 1
        : dist >= APPROACH_FAR
          ? 0
          : 1 - (dist - APPROACH_DISTANCE) / (APPROACH_FAR - APPROACH_DISTANCE);
    openAmount.current.value += (target - openAmount.current.value) * Math.min(1, dt * 4);
    const open = openAmount.current.value;

    // Activation sound — once on cross 0.3 → 0.5.
    if (lastOpen.current <= 0.3 && open > 0.5) play('startup');
    lastOpen.current = open;

    if (bodyMatRef.current) {
      bodyMatRef.current.emissiveIntensity = 0.05 + open * 0.30;
    }
    if (labelGroupRef.current) {
      const s = 1 + open * 0.15;
      labelGroupRef.current.scale.setScalar(s);
    }
    if (statusDotRef.current) {
      // Mint dot pulses regardless.
      const t = performance.now() / 1000;
      statusDotRef.current.emissiveIntensity = 1.0 + 0.5 * Math.sin(t * 3.0);
    }

    // Idle pulse — pick a random stripe every ~12 s.
    const now = performance.now();
    if (now - lastIdlePulseAt.current > 12000 && idlePulseTarget.current < 0) {
      idlePulseTarget.current = Math.floor(Math.random() * STRIPE_ORDER.length);
      // Reset target after 1 s (each Stripe inspects idlePulseTarget.current).
      setTimeout(() => {
        idlePulseTarget.current = -1;
        lastIdlePulseAt.current = performance.now() + Math.random() * 4000;
      }, 1000);
    }
  });

  return (
    <group position={RACK_POS_V8} rotation={[0, RACK_YAW, 0]}>
      {/* Rack body. */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[RACK_W, RACK_H, RACK_D]} />
        <meshStandardMaterial
          ref={bodyMatRef}
          color={palette.nightMid}
          emissive={palette.signalMint}
          emissiveIntensity={0.05}
          roughness={0.5}
          metalness={0.85}
        />
      </mesh>

      {/* Gold frame border around the body face. */}
      <BodyFrame />

      {/* CERTIFICATES label. */}
      <group ref={labelGroupRef} position={[0, RACK_H / 2 + 0.22, RACK_D / 2 + 0.001]}>
        <Text
          raycast={noRaycast}
          ref={disableRaycast}
          fontSize={0.20}
          color={palette.champagneGold}
          anchorX="center"
          anchorY="bottom"
          letterSpacing={0.22}
          outlineWidth={0.002}
          outlineColor={palette.nightBase}
          outlineOpacity={0.6}
        >
          CERTIFICATES
        </Text>
        <Text
          raycast={noRaycast}
          ref={disableRaycast}
          position={[0, -0.04, 0]}
          fontSize={0.06}
          color={palette.pearlCool}
          anchorX="center"
          anchorY="top"
          letterSpacing={0.3}
        >
          12 / 12
        </Text>
      </group>

      {/* STATUS: ACTIVE indicator. */}
      <group position={[RACK_W / 2 - 0.45, RACK_H / 2 - 0.12, RACK_D / 2 + 0.002]}>
        <mesh position={[-0.18, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.018, 0.018, 0.005, 14]} />
          <meshStandardMaterial
            ref={statusDotRef}
            color={palette.signalMint}
            emissive={palette.signalMint}
            emissiveIntensity={1.2}
          />
        </mesh>
        <Text
          raycast={noRaycast}
          ref={disableRaycast}
          position={[0.02, 0, 0]}
          fontSize={0.05}
          color={palette.signalMint}
          anchorX="left"
          anchorY="middle"
          letterSpacing={0.2}
        >
          STATUS: ACTIVE
        </Text>
      </group>

      {/* 12 stripes. */}
      {STRIPE_ORDER.map((spec, i) => (
        <Stripe
          key={spec.certId}
          index={i}
          spec={spec}
          openAmountRef={openAmount}
          idlePulseTargetRef={idlePulseTarget}
        />
      ))}

      {/* Sweep scanline. */}
      <RackScanline />
    </group>
  );
}

function BodyFrame() {
  const T = 0.018;
  const Z = RACK_D / 2 + 0.001;
  const props = {
    color: palette.champagneGold,
    emissive: palette.champagneGold,
    emissiveIntensity: 0.6,
    metalness: 0.95,
    roughness: 0.22,
  } as const;
  return (
    <>
      <mesh position={[0, RACK_H / 2, Z]}>
        <planeGeometry args={[RACK_W, T]} />
        <meshStandardMaterial {...props} />
      </mesh>
      <mesh position={[0, -RACK_H / 2, Z]}>
        <planeGeometry args={[RACK_W, T]} />
        <meshStandardMaterial {...props} />
      </mesh>
      <mesh position={[-RACK_W / 2, 0, Z]}>
        <planeGeometry args={[T, RACK_H]} />
        <meshStandardMaterial {...props} />
      </mesh>
      <mesh position={[RACK_W / 2, 0, Z]}>
        <planeGeometry args={[T, RACK_H]} />
        <meshStandardMaterial {...props} />
      </mesh>
    </>
  );
}

const STRIPE_W = 0.28;
const STRIPE_H = 1.05;
const STRIPE_D = 0.04;

function Stripe({
  index,
  spec,
  openAmountRef,
  idlePulseTargetRef,
}: {
  index: number;
  spec: StripeSpec;
  openAmountRef: React.MutableRefObject<{ value: number }>;
  idlePulseTargetRef: React.MutableRefObject<number>;
}) {
  const cert = CERT_BY_ID.get(spec.certId);
  const meshRef = useRef<Mesh>(null);
  const matRef = useRef<MeshStandardMaterial | null>(null);
  const [hovered, setHovered] = useState(false);
  const openCertificate = usePortfolioStore((s) => s.openCertificate);
  const lightboxCertId = usePortfolioStore((s) => s.lightboxCertId);
  const setCursor = usePortfolioStore((s) => s.setCursorState);

  // GSAP-driven per-stripe drawer animation.
  const clickProgress = useRef({ value: 0 });
  const idleProgress = useRef({ value: 0 });
  const animating = useRef(false);
  const timeRef = useRef(Math.random() * 6.0);

  // Position formula: 6-wide rows.
  const row = Math.floor(index / 6);
  const col = index % 6;
  const x = -RACK_W / 2 + 0.27 + col * 0.40;
  const y = row === 0 ? 0.45 : -0.55;
  const baseZ = RACK_D / 2 + 0.012;

  // Reverse tween when lightbox closes.
  useEffect(() => {
    if (lightboxCertId !== spec.certId && clickProgress.current.value > 0.001) {
      gsap.killTweensOf(clickProgress.current);
      gsap.to(clickProgress.current, {
        value: 0,
        duration: 0.4,
        ease: 'power2.in',
        onComplete: () => {
          animating.current = false;
        },
      });
    }
  }, [lightboxCertId, spec.certId]);

  // Trigger idle pulse if this stripe is selected.
  useEffect(() => {
    const checkIdle = () => {
      if (idlePulseTargetRef.current === index && idleProgress.current.value < 0.01) {
        gsap.to(idleProgress.current, {
          value: 1,
          duration: 0.2,
          ease: 'power2.out',
          onComplete: () => {
            gsap.to(idleProgress.current, { value: 0, duration: 0.8, ease: 'power2.in' });
          },
        });
      }
    };
    const interval = setInterval(checkIdle, 80);
    return () => clearInterval(interval);
  }, [idlePulseTargetRef, index]);

  useFrame((_, dt) => {
    timeRef.current += dt;
    const open = openAmountRef.current.value;
    const click = clickProgress.current.value;
    const idle = idleProgress.current.value;

    if (meshRef.current) {
      // Approach unfold: stripes slide forward 0.3.
      const approachZ = baseZ + open * 0.3;
      // Approach fan: top row tilts left, bottom row tilts right.
      const fanRot = (row === 0 ? -1 : 1) * open * 0.06;
      // Hover preview: +0.08 forward.
      const hoverZ = hovered ? 0.08 : 0;
      // Click slide: +0.6 forward, 5° tilt.
      const clickZ = click * 0.6;
      const clickRot = click * 0.087; // ~5°
      // Idle pulse: +0.15.
      const idleZ = idle * 0.15;

      const targetZ = approachZ + hoverZ + clickZ + idleZ;
      meshRef.current.position.z += (targetZ - meshRef.current.position.z) * Math.min(1, dt * 12);
      meshRef.current.rotation.x = -clickRot; // tilt top toward camera
      meshRef.current.rotation.z = fanRot;
    }
    if (matRef.current) {
      // Breathing — 6 s, 10 % amplitude, phase-offset by index.
      const phase = (timeRef.current / 6) * Math.PI * 2 + index * 0.55;
      const breathe = 1 + Math.sin(phase) * 0.1;
      const base = hovered ? 1.4 : 0.95;
      const boost = click * 1.0 + idle * 0.6;
      matRef.current.emissiveIntensity = base * breathe + boost;
    }
  });

  if (!cert) return null;

  const color = ACCENT_COLOR[spec.accent];

  const handleOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    setCursor('interactive');
    play('hover');
  };
  const handleOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(false);
    setCursor('idle');
  };
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (animating.current) return;
    animating.current = true;
    play('click_primary');
    gsap.killTweensOf(clickProgress.current);
    gsap.to(clickProgress.current, {
      value: 1,
      duration: 0.6,
      ease: 'power2.out',
      onComplete: () => {
        openCertificate(spec.certId);
        animating.current = false;
      },
    });
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
      <meshStandardMaterial
        ref={matRef}
        color={palette.nightBase}
        emissive={color}
        emissiveIntensity={0.95}
      />
    </mesh>
  );
}

function RackScanline() {
  const matRef = useRef<MeshBasicMaterial | null>(null);
  const meshRef = useRef<Mesh>(null);
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    const period = 4;
    const phase = (t.current % period) / period;
    if (meshRef.current) {
      const top = RACK_H / 2 - 0.05;
      const bot = -RACK_H / 2 + 0.05;
      meshRef.current.position.y = top + (bot - top) * phase;
    }
    if (matRef.current) {
      const e = Math.sin(phase * Math.PI);
      matRef.current.opacity = 0.05 + 0.35 * e;
    }
  });
  return (
    <mesh ref={meshRef} position={[0, RACK_H / 2 - 0.05, RACK_D / 2 + 0.02]}>
      <planeGeometry args={[RACK_W * 0.96, 0.028]} />
      <meshBasicMaterial
        ref={matRef}
        color={palette.signalMint}
        transparent
        opacity={0.25}
        blending={AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}
