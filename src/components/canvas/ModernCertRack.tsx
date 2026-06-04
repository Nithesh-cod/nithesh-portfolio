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

/* V12.0 — cert rack now displays ALL 12 certificates in a 4×3 grid
 * (4 rows × 3 columns), positioned center-back of the room so it sits
 * cleanly between the Tech Stack panel (right wall) and the capsule. */

const RACK_POS: [number, number, number] = [0, 2.4, -5.5];
const RACK_ROT: [number, number, number] = [0, 0, 0];

const ROWS = 4;
const COLS = 3;

const FRAME_W = 2.6;   // outer frame width
const FRAME_H = 2.4;   // outer frame height
const CERT_W = 0.78;   // individual cert frame width
const CERT_H = 0.50;   // individual cert frame height
const CERT_GAP_X = 0.05;
const CERT_GAP_Y = 0.05;
const CERT_PITCH_X = CERT_W + CERT_GAP_X;
const CERT_PITCH_Y = CERT_H + CERT_GAP_Y;

export function ModernCertRack() {
  const allCerts: readonly Certificate[] = certificateGroups.flatMap((g) => g.certs).slice(0, ROWS * COLS);

  return (
    <group position={RACK_POS} rotation={RACK_ROT}>
      {/* Floating header. */}
      <Html
        transform
        occlude={false}
        position={[0, FRAME_H / 2 + 0.35, 0]}
        distanceFactor={2.4}
        style={{ pointerEvents: 'none' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div className="cert-rack-title">CERTIFICATIONS &amp; ACHIEVEMENTS</div>
          <div className="cert-rack-subtitle">12 / 12 VERIFIED · CONTINUOUSLY GROWING</div>
        </div>
      </Html>

      {/* Mounting frame. */}
      <RackFrame />

      {/* 12 cert displays in 4×3 grid. */}
      {allCerts.map((cert, i) => {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const x = -((COLS - 1) / 2) * CERT_PITCH_X + col * CERT_PITCH_X;
        const y = ((ROWS - 1) / 2) * CERT_PITCH_Y - row * CERT_PITCH_Y;
        return (
          <CertDisplay key={cert.id} cert={cert} x={x} y={y} phase={i * 0.35} />
        );
      })}

      {/* VIEW DETAILED CERTIFICATES button. */}
      <ViewAllButton />

      {/* Vertical sweep scanline. */}
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
  return (
    <group>
      {/* 4 vertical posts (between + at edges of the 3 cols). */}
      {[-1, 1].map((s) => (
        <mesh key={s} raycast={noRaycast} position={[(s * FRAME_W) / 2, 0, -0.06]}>
          <boxGeometry args={[0.04, FRAME_H + 0.3, 0.04]} />
          {postMat}
        </mesh>
      ))}

      {/* 3 horizontal struts between rows. */}
      {[1.5, 0.5, -0.5, -1.5].map((rowOffset, i) => {
        const y = rowOffset * (CERT_PITCH_Y / 2);
        // Skip top + bottom edges that are caps below.
        if (i === 0 || i === 3) return null;
        return (
          <mesh key={i} raycast={noRaycast} position={[0, y, -0.05]}>
            <boxGeometry args={[FRAME_W, 0.028, 0.028]} />
            {postMat}
          </mesh>
        );
      })}

      {/* Top + bottom caps. */}
      <mesh raycast={noRaycast} position={[0, FRAME_H / 2 + 0.12, -0.05]}>
        <boxGeometry args={[FRAME_W + 0.10, 0.08, 0.06]} />
        <meshStandardMaterial color="#0F1A18" metalness={0.85} roughness={0.22} />
      </mesh>
      <mesh raycast={noRaycast} position={[0, -FRAME_H / 2 - 0.12, -0.05]}>
        <boxGeometry args={[FRAME_W + 0.10, 0.08, 0.06]} />
        <meshStandardMaterial color="#0F1A18" metalness={0.85} roughness={0.22} />
      </mesh>
    </group>
  );
}

/* ────────────────────── CERT DISPLAY ────────────────────── */

function CertDisplay({
  cert,
  x,
  y,
  phase,
}: {
  cert: Certificate;
  x: number;
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
    const hoverZ = hovered ? 0.05 : 0;
    const op = openProgress.current.value;
    groupRef.current.position.z = hoverZ + op * 0.30;

    if (frameMatRef.current) {
      frameMatRef.current.emissiveIntensity = hovered ? 0.45 : 0.15;
    }
    const rimBase = hovered ? 3.0 : 1.8;
    rimRefs.current.forEach((m) => {
      if (m) m.emissiveIntensity = rimBase + Math.sin(t * 1.4 + phase) * 0.20;
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
      duration: 0.55,
      ease: 'power2.out',
      onComplete: () => {
        openCertificate(cert.id);
      },
    });
  };

  return (
    <group ref={groupRef} position={[x, y, 0]}>
      {/* Outer metal frame. */}
      <mesh raycast={noRaycast}>
        <boxGeometry args={[CERT_W, CERT_H, 0.06]} />
        <meshStandardMaterial
          ref={frameMatRef}
          color="#1A2A28"
          metalness={0.70}
          roughness={0.30}
          emissive={palette.neonGreen}
          emissiveIntensity={0.15}
        />
      </mesh>

      {/* Inner neon rim (4 emissive tubes). */}
      <RimTubes
        w={CERT_W - 0.03}
        h={CERT_H - 0.03}
        d={0.06}
        registerRef={(m, i) => { rimRefs.current[i] = m; }}
      />

      {/* Cert PNG plane — clickable. */}
      <mesh
        position={[0, 0, 0.035]}
        onPointerOver={handleOver}
        onPointerOut={handleOut}
        onClick={handleClick}
      >
        <planeGeometry args={[CERT_W - 0.08, CERT_H - 0.07]} />
        <meshBasicMaterial map={tex} transparent toneMapped={false} />
      </mesh>
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
  const T = 0.010;
  const z = d / 2 + 0.001;
  return (
    <group>
      <mesh raycast={noRaycast} position={[0, h / 2, z]}>
        <boxGeometry args={[w, T, T]} />
        <meshStandardMaterial
          ref={(m) => { registerRef(m as MeshStandardMaterial | null, 0); }}
          color={palette.neonGreen} emissive={palette.neonGreen}
          emissiveIntensity={1.8} toneMapped={false}
        />
      </mesh>
      <mesh raycast={noRaycast} position={[0, -h / 2, z]}>
        <boxGeometry args={[w, T, T]} />
        <meshStandardMaterial
          ref={(m) => { registerRef(m as MeshStandardMaterial | null, 1); }}
          color={palette.neonGreen} emissive={palette.neonGreen}
          emissiveIntensity={1.8} toneMapped={false}
        />
      </mesh>
      <mesh raycast={noRaycast} position={[-w / 2, 0, z]}>
        <boxGeometry args={[T, h, T]} />
        <meshStandardMaterial
          ref={(m) => { registerRef(m as MeshStandardMaterial | null, 2); }}
          color={palette.neonGreen} emissive={palette.neonGreen}
          emissiveIntensity={1.8} toneMapped={false}
        />
      </mesh>
      <mesh raycast={noRaycast} position={[w / 2, 0, z]}>
        <boxGeometry args={[T, h, T]} />
        <meshStandardMaterial
          ref={(m) => { registerRef(m as MeshStandardMaterial | null, 3); }}
          color={palette.neonGreen} emissive={palette.neonGreen}
          emissiveIntensity={1.8} toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/* ────────────────────── VIEW ALL BUTTON ────────────────────── */

function ViewAllButton() {
  const openAllCerts = usePortfolioStore((s) => s.openAllCerts);

  return (
    <Html
      transform
      occlude={false}
      position={[0, -FRAME_H / 2 - 0.45, 0]}
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
          openAllCerts();
        }}
      >
        VIEW DETAILED CERTIFICATES
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
    matRef.current.opacity = 0.08 + Math.sin(phase * Math.PI) * 0.40;
  });
  return (
    <mesh ref={ref} raycast={noRaycast} position={[0, FRAME_H / 2 - 0.05, 0.08]}>
      <planeGeometry args={[FRAME_W * 0.97, 0.022]} />
      <meshBasicMaterial
        ref={matRef}
        color={palette.neonBright}
        transparent
        opacity={0.30}
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

/* ────────────────────── DREI text Text isn't used; pruned ──────────
 * Kept the Text import to satisfy other earlier modules; not used
 * inside this module any more. */
void Text;
void disableRaycast;
