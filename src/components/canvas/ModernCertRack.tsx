'use client';

import { Html, Text, useTexture } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import gsap from 'gsap';
import { ArrowRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  AdditiveBlending,
  SRGBColorSpace,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
  type Texture,
} from 'three';
import { certificateGroups, type Certificate } from '@/lib/content';
import { palette } from '@/lib/palette';
import { usePortfolioStore } from '@/lib/store';
import { disableRaycast, noRaycast } from '@/lib/three-utils';
import { play } from '@/lib/audio';

/* V11.2 — Cert rack rebuilt to match reference image:
 *   • Outer mounting frame (2 vertical posts + 2 cross-bars + caps)
 *   • 3 large CertDisplay blocks stacked vertically. Each:
 *       - Solid dark metal frame (boxGeometry)
 *       - Inner neon rim tubes (4 emissive bars)
 *       - Cert PNG mapped onto a plane (clearly visible)
 *       - Faint physical-glass cover for a subtle highlight
 *       - Small cert-title strip BELOW the frame (drei <Text>)
 *   • <Html> "CERTIFICATIONS & ACHIEVEMENTS" header above
 *   • <Html> "VIEW ALL 12 CERTIFICATES →" button below
 *   • Vertical sweep scanline + per-slot breathing animation. */

const RACK_POS: [number, number, number] = [2.8, 1.5, 0.8];
const RACK_ROT: [number, number, number] = [0, -0.40, 0];

const FRAME_W = 1.55; // mounting-frame width
const FRAME_H = 3.10; // mounting-frame height
const CERT_W = 1.35;
const CERT_H = 0.80;
const SLOT_GAP = 0.95; // vertical centre-to-centre

const FEATURED_IDS = [
  'applied-gen-ai',
  'ai-first-software-engineering',
  'front-end-web-dev',
] as const;

/** Short uppercase strip label shown beneath each cert frame. */
const CERT_SHORT: Record<string, string> = {
  'applied-gen-ai': 'APPLIED GEN AI · CERTIFICATION',
  'ai-first-software-engineering': 'AI-FIRST · SOFTWARE ENGINEERING',
  'front-end-web-dev': 'FRONT-END · WEB DEVELOPER',
};

export function ModernCertRack() {
  const allCerts: readonly Certificate[] = certificateGroups.flatMap((g) => g.certs);
  const featured: Certificate[] = FEATURED_IDS
    .map((id) => allCerts.find((c) => c.id === id))
    .filter((c): c is Certificate => Boolean(c));
  while (featured.length < 3) {
    const fallback = allCerts.find((c) => !featured.includes(c));
    if (!fallback) break;
    featured.push(fallback);
  }

  return (
    <group position={RACK_POS} rotation={RACK_ROT}>
      {/* Floating header — DOM, matches v11-card typography. */}
      <Html
        transform
        occlude="blending"
        position={[0, FRAME_H / 2 + 0.30, 0]}
        distanceFactor={2.4}
        style={{ pointerEvents: 'none' }}
      >
        <div className="cert-rack-title">CERTIFICATIONS &amp; ACHIEVEMENTS</div>
      </Html>

      {/* Outer mounting frame. */}
      <RackFrame />

      {/* 3 cert displays stacked vertically (top, middle, bottom). */}
      {featured.slice(0, 3).map((cert, i) => (
        <CertDisplay
          key={cert.id}
          cert={cert}
          y={SLOT_GAP * (1 - i)}
          phase={i * 0.5}
        />
      ))}

      {/* VIEW ALL 12 CERTIFICATES button. */}
      <ViewAllButton />

      {/* Vertical sweep scanline traversing the rack face. */}
      <SweepScanline />
    </group>
  );
}

/* ────────────────────── MOUNTING FRAME ────────────────────── */

function RackFrame() {
  const postMat = (
    <meshStandardMaterial
      color="#0F1A18"
      metalness={0.85}
      roughness={0.22}
      emissive={palette.neonGreen}
      emissiveIntensity={0.10}
      toneMapped={false}
    />
  );
  const strutMat = (
    <meshStandardMaterial
      color="#0F1A18"
      metalness={0.85}
      roughness={0.22}
      emissive={palette.neonGreen}
      emissiveIntensity={0.15}
      toneMapped={false}
    />
  );
  return (
    <group>
      {/* Vertical posts (left + right). */}
      <mesh raycast={noRaycast} position={[-FRAME_W / 2, 0, -0.05]}>
        <boxGeometry args={[0.04, FRAME_H + 0.4, 0.04]} />
        {postMat}
      </mesh>
      <mesh raycast={noRaycast} position={[FRAME_W / 2, 0, -0.05]}>
        <boxGeometry args={[0.04, FRAME_H + 0.4, 0.04]} />
        {postMat}
      </mesh>

      {/* Horizontal cross-bars between cert displays. */}
      <mesh raycast={noRaycast} position={[0, SLOT_GAP / 2, -0.04]}>
        <boxGeometry args={[FRAME_W, 0.03, 0.03]} />
        {strutMat}
      </mesh>
      <mesh raycast={noRaycast} position={[0, -SLOT_GAP / 2, -0.04]}>
        <boxGeometry args={[FRAME_W, 0.03, 0.03]} />
        {strutMat}
      </mesh>

      {/* Top + bottom caps. */}
      <mesh raycast={noRaycast} position={[0, FRAME_H / 2 + 0.15, -0.04]}>
        <boxGeometry args={[FRAME_W + 0.08, 0.08, 0.06]} />
        <meshStandardMaterial color="#0F1A18" metalness={0.85} roughness={0.22} />
      </mesh>
      <mesh raycast={noRaycast} position={[0, -FRAME_H / 2 - 0.15, -0.04]}>
        <boxGeometry args={[FRAME_W + 0.08, 0.08, 0.06]} />
        <meshStandardMaterial color="#0F1A18" metalness={0.85} roughness={0.22} />
      </mesh>
    </group>
  );
}

/* ────────────────────── CERT DISPLAY ────────────────────── */

function CertDisplay({
  cert,
  y,
  phase,
}: {
  cert: Certificate;
  y: number;
  phase: number;
}) {
  const groupRef = useRef<Group | null>(null);
  const frameMatRef = useRef<MeshStandardMaterial | null>(null);
  const rimRefs = useRef<(MeshStandardMaterial | null)[]>([]);
  const [hovered, setHovered] = useState(false);
  const openProgress = useRef({ value: 0 });
  const animating = useRef(false);

  const openCertificate = usePortfolioStore((s) => s.openCertificate);
  const lightboxCertId = usePortfolioStore((s) => s.lightboxCertId);
  const setCursor = usePortfolioStore((s) => s.setCursorState);

  const tex = useTexture(cert.image, (loaded) => {
    if (!Array.isArray(loaded)) {
      loaded.colorSpace = SRGBColorSpace;
      loaded.anisotropy = 4;
    }
  }) as Texture;

  useEffect(() => {
    if (lightboxCertId !== cert.id && openProgress.current.value > 0.001) {
      gsap.killTweensOf(openProgress.current);
      gsap.to(openProgress.current, {
        value: 0,
        duration: 0.40,
        ease: 'power2.in',
        onComplete: () => {
          animating.current = false;
        },
      });
    }
  }, [lightboxCertId, cert.id]);

  useFrame((_, dt) => {
    if (!groupRef.current) return;
    const t = (groupRef.current.userData.t ?? 0) + dt;
    groupRef.current.userData.t = t;
    // Hover lift + open-tween push.
    const hoverZ = hovered ? 0.04 : 0;
    const op = openProgress.current.value;
    groupRef.current.position.z = hoverZ + op * 0.30;

    // Frame metal brightens on hover.
    if (frameMatRef.current) {
      frameMatRef.current.emissiveIntensity = hovered ? 0.40 : 0.15;
    }
    // Rim tubes pulse with phase + jump on hover.
    const rimBase = hovered ? 3.0 : 2.0;
    rimRefs.current.forEach((m) => {
      if (m) m.emissiveIntensity = rimBase + Math.sin(t * 1.4 + phase) * 0.25;
    });
  });

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
    gsap.killTweensOf(openProgress.current);
    gsap.to(openProgress.current, {
      value: 1,
      duration: 0.60,
      ease: 'power2.out',
      onComplete: () => {
        openCertificate(cert.id);
      },
    });
  };

  const shortTitle = CERT_SHORT[cert.id] ?? cert.title.toUpperCase();

  return (
    <group ref={groupRef} position={[0, y, 0]}>
      {/* OUTER METAL FRAME (dark border). */}
      <mesh raycast={noRaycast}>
        <boxGeometry args={[CERT_W, CERT_H, 0.08]} />
        <meshStandardMaterial
          ref={frameMatRef}
          color="#1A2A28"
          metalness={0.70}
          roughness={0.30}
          emissive={palette.neonGreen}
          emissiveIntensity={0.15}
        />
      </mesh>

      {/* INNER NEON RIM (4 emissive tubes). */}
      <RimTubes
        w={CERT_W - 0.05}
        h={CERT_H - 0.05}
        d={0.08}
        registerRef={(m, i) => { rimRefs.current[i] = m; }}
      />

      {/* CERT IMAGE — front-face plane, clickable. */}
      <mesh
        position={[0, 0, 0.045]}
        onPointerOver={handleOver}
        onPointerOut={handleOut}
        onClick={handleClick}
      >
        <planeGeometry args={[CERT_W - 0.15, CERT_H - 0.12]} />
        <meshBasicMaterial map={tex} transparent toneMapped={false} />
      </mesh>

      {/* Subtle physical-glass cover for a slight reflective highlight. */}
      <mesh raycast={noRaycast} position={[0, 0, 0.051]}>
        <planeGeometry args={[CERT_W - 0.15, CERT_H - 0.12]} />
        <meshPhysicalMaterial
          transmission={0.95}
          roughness={0.05}
          thickness={0.01}
          color="#FFFFFF"
          transparent
          opacity={0.10}
        />
      </mesh>

      {/* SHORT TITLE STRIP below the frame. */}
      <Text
        raycast={noRaycast}
        ref={disableRaycast}
        position={[0, -CERT_H / 2 - 0.08, 0.06]}
        fontSize={0.040}
        color={palette.textSecondary}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.18}
        maxWidth={CERT_W * 0.95}
        outlineWidth={0.001}
        outlineColor={palette.bgBase}
      >
        {shortTitle}
      </Text>
    </group>
  );
}

function RimTubes({
  w,
  h,
  d,
  registerRef,
}: {
  w: number;
  h: number;
  d: number;
  registerRef: (m: MeshStandardMaterial | null, i: number) => void;
}) {
  const T = 0.015;
  const z = d / 2 + 0.002;
  const mat = (i: number) => (
    <meshStandardMaterial
      ref={(m) => { registerRef(m as MeshStandardMaterial | null, i); }}
      color={palette.neonGreen}
      emissive={palette.neonGreen}
      emissiveIntensity={2.0}
      toneMapped={false}
    />
  );
  return (
    <group>
      <mesh raycast={noRaycast} position={[0, h / 2, z]}>
        <boxGeometry args={[w, T, T]} />
        {mat(0)}
      </mesh>
      <mesh raycast={noRaycast} position={[0, -h / 2, z]}>
        <boxGeometry args={[w, T, T]} />
        {mat(1)}
      </mesh>
      <mesh raycast={noRaycast} position={[-w / 2, 0, z]}>
        <boxGeometry args={[T, h, T]} />
        {mat(2)}
      </mesh>
      <mesh raycast={noRaycast} position={[w / 2, 0, z]}>
        <boxGeometry args={[T, h, T]} />
        {mat(3)}
      </mesh>
    </group>
  );
}

/* ────────────────────── VIEW ALL BUTTON ────────────────────── */

function ViewAllButton() {
  const openCertificate = usePortfolioStore((s) => s.openCertificate);
  const allCerts = certificateGroups.flatMap((g) => g.certs);

  return (
    <Html
      transform
      occlude="blending"
      position={[0, -FRAME_H / 2 - 0.55, 0]}
      distanceFactor={2.4}
      style={{ pointerEvents: 'auto' }}
    >
      <button
        type="button"
        className="view-all-certs"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          play('click_primary');
          // Open the first non-featured cert as a starting point.
          const fallback = allCerts.find((c) => !FEATURED_IDS.includes(c.id as typeof FEATURED_IDS[number]));
          if (fallback) openCertificate(fallback.id);
        }}
      >
        VIEW ALL 12 CERTIFICATES
        <ArrowRight size={12} style={{ marginLeft: 6 }} />
      </button>
    </Html>
  );
}

/* ────────────────────── SCANLINE ────────────────────── */

function SweepScanline() {
  const ref = useRef<Mesh | null>(null);
  const matRef = useRef<MeshBasicMaterial | null>(null);
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    if (!ref.current || !matRef.current) return;
    const phase = (t.current % 5) / 5;
    const top = FRAME_H / 2 - 0.05;
    const bot = -FRAME_H / 2 + 0.05;
    ref.current.position.y = top + (bot - top) * phase;
    matRef.current.opacity = 0.08 + Math.sin(phase * Math.PI) * 0.45;
  });
  return (
    <mesh ref={ref} raycast={noRaycast} position={[0, FRAME_H / 2 - 0.05, 0.10]}>
      <planeGeometry args={[FRAME_W * 0.97, 0.022]} />
      <meshBasicMaterial
        ref={matRef}
        color={palette.neonBright}
        transparent
        opacity={0.40}
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
