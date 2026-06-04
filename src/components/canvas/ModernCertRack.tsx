'use client';

import { Text, useTexture } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import gsap from 'gsap';
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

/* V11.1 — vertical 3-slot cert tower (replaces the V10.2 grid rack).
 * Matches the reference image: a tall thin frame with three large
 * cert slabs stacked top-to-bottom and "CERTIFICATIONS &
 * ACHIEVEMENTS" header floating above. The remaining 9 certs are
 * surfaced via a small "VIEW ALL" badge below the tower. */

const RACK_POS: [number, number, number] = [3, 1.6, 1.0];
const RACK_ROT: [number, number, number] = [0, -0.40, 0];

const FRAME_W = 1.5;
const FRAME_H = 3.4;
const SLAB_W = 1.20;
const SLAB_H = 0.85;
const SLAB_GAP = 1.05; // vertical centre-to-centre between slabs

const FEATURED_IDS = ['applied-gen-ai', 'ai-first-software-engineering', 'front-end-web-dev'] as const;

export function ModernCertRack() {
  const allCerts: readonly Certificate[] = certificateGroups.flatMap((g) => g.certs);
  const featured: Certificate[] = FEATURED_IDS
    .map((id) => allCerts.find((c) => c.id === id))
    .filter((c): c is Certificate => Boolean(c));
  // If any featured id was missing from content, top up with the
  // first available certs so we always render exactly 3 slabs.
  while (featured.length < 3) {
    const fallback = allCerts.find((c) => !featured.includes(c));
    if (!fallback) break;
    featured.push(fallback);
  }

  return (
    <group position={RACK_POS} rotation={RACK_ROT}>
      {/* Title floating above the frame. */}
      <RackTitle />

      {/* Outer frame — thin metal box with neon emissive trim. */}
      <RackFrame />

      {/* 3 large cert slabs stacked. */}
      {featured.slice(0, 3).map((cert, i) => {
        const y = SLAB_GAP * (1 - i); // top, middle, bottom
        return <CertSlab key={cert.id} cert={cert} y={y} phase={i * 0.5} />;
      })}

      {/* Mounting struts between slabs (decorative shelves). */}
      <Strut y={SLAB_GAP - SLAB_H / 2 - 0.10} />
      <Strut y={-SLAB_GAP + SLAB_H / 2 + 0.10} />

      {/* VIEW ALL CERTIFICATES badge below the tower. */}
      <ViewAllBadge />

      {/* Vertical sweep scanline traversing the front face. */}
      <SweepScanline />
    </group>
  );
}

/* ────────────────────── TITLE ────────────────────── */

function RackTitle() {
  const dotRef = useRef<Mesh | null>(null);
  useFrame((state) => {
    if (!dotRef.current) return;
    const pulse = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 2.2);
    (dotRef.current.material as MeshBasicMaterial).opacity = 0.5 + pulse * 0.5;
  });
  return (
    <group position={[0, FRAME_H / 2 + 0.30, 0]}>
      <Text
        raycast={noRaycast}
        ref={disableRaycast}
        fontSize={0.10}
        color={palette.neonBright}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.20}
        outlineWidth={0.003}
        outlineColor={palette.neonGreen}
      >
        [ CERTIFICATIONS & ACHIEVEMENTS ]
      </Text>
      <mesh ref={dotRef} raycast={noRaycast} position={[-0.95, 0, 0]}>
        <circleGeometry args={[0.020, 16]} />
        <meshBasicMaterial color={palette.neonGreen} transparent toneMapped={false} />
      </mesh>
    </group>
  );
}

/* ────────────────────── FRAME ────────────────────── */

function RackFrame() {
  const mat = (
    <meshStandardMaterial
      color={palette.neonGreen}
      emissive={palette.neonGreen}
      emissiveIntensity={2.0}
      metalness={0.9}
      roughness={0.20}
      toneMapped={false}
    />
  );
  return (
    <group>
      {/* 4 corner verticals. */}
      <mesh raycast={noRaycast} position={[-FRAME_W / 2, 0, 0]}>
        <boxGeometry args={[0.035, FRAME_H, 0.035]} />
        {mat}
      </mesh>
      <mesh raycast={noRaycast} position={[FRAME_W / 2, 0, 0]}>
        <boxGeometry args={[0.035, FRAME_H, 0.035]} />
        {mat}
      </mesh>
      {/* Top + bottom horizontals. */}
      <mesh raycast={noRaycast} position={[0, FRAME_H / 2, 0]}>
        <boxGeometry args={[FRAME_W + 0.04, 0.035, 0.035]} />
        {mat}
      </mesh>
      <mesh raycast={noRaycast} position={[0, -FRAME_H / 2, 0]}>
        <boxGeometry args={[FRAME_W + 0.04, 0.035, 0.035]} />
        {mat}
      </mesh>
    </group>
  );
}

function Strut({ y }: { y: number }) {
  return (
    <mesh raycast={noRaycast} position={[0, y, 0]}>
      <boxGeometry args={[FRAME_W - 0.05, 0.018, 0.025]} />
      <meshStandardMaterial
        color={palette.darkSurface}
        emissive={palette.neonGreen}
        emissiveIntensity={1.4}
        metalness={0.85}
        roughness={0.25}
        toneMapped={false}
      />
    </mesh>
  );
}

/* ────────────────────── CERT SLAB ────────────────────── */

function CertSlab({
  cert,
  y,
  phase,
}: {
  cert: Certificate;
  y: number;
  phase: number;
}) {
  const meshRef = useRef<Mesh | null>(null);
  const matRef = useRef<MeshStandardMaterial | null>(null);
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
        duration: 0.4,
        ease: 'power2.in',
        onComplete: () => {
          animating.current = false;
        },
      });
    }
  }, [lightboxCertId, cert.id]);

  useFrame((_, dt) => {
    if (!meshRef.current) return;
    const t = (meshRef.current.userData.t ?? 0) + dt;
    meshRef.current.userData.t = t;
    const hoverZ = hovered ? 0.08 : 0;
    const op = openProgress.current.value;
    meshRef.current.position.z = hoverZ + op * 0.5;
    if (matRef.current) {
      // Per-slab breathing emissive.
      matRef.current.emissiveIntensity =
        0.40 + Math.sin(t * 1.4 + phase) * 0.20 + (hovered ? 0.6 : 0) + op * 0.7;
    }
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
    <group position={[0, y, 0.06]}>
      {/* Cert image slab. */}
      <mesh
        ref={meshRef}
        onPointerOver={handleOver}
        onPointerOut={handleOut}
        onClick={handleClick}
      >
        <planeGeometry args={[SLAB_W, SLAB_H]} />
        <meshStandardMaterial
          ref={matRef}
          map={tex}
          color="#FFFFFF"
          emissive={palette.neonGreen}
          emissiveIntensity={0.50}
          roughness={0.30}
          metalness={0.15}
        />
      </mesh>
      {/* Neon-edge frame around the slab. */}
      <SlabFrame />
    </group>
  );
}

function SlabFrame() {
  const T = 0.014;
  const mat = (
    <meshStandardMaterial
      color={palette.neonBright}
      emissive={palette.neonBright}
      emissiveIntensity={2.8}
      toneMapped={false}
    />
  );
  return (
    <>
      <mesh raycast={noRaycast} position={[0, SLAB_H / 2, 0.005]}>
        <boxGeometry args={[SLAB_W + 0.02, T, 0.01]} />
        {mat}
      </mesh>
      <mesh raycast={noRaycast} position={[0, -SLAB_H / 2, 0.005]}>
        <boxGeometry args={[SLAB_W + 0.02, T, 0.01]} />
        {mat}
      </mesh>
      <mesh raycast={noRaycast} position={[SLAB_W / 2, 0, 0.005]}>
        <boxGeometry args={[T, SLAB_H, 0.01]} />
        {mat}
      </mesh>
      <mesh raycast={noRaycast} position={[-SLAB_W / 2, 0, 0.005]}>
        <boxGeometry args={[T, SLAB_H, 0.01]} />
        {mat}
      </mesh>
    </>
  );
}

/* ────────────────────── VIEW ALL BADGE ────────────────────── */

function ViewAllBadge() {
  const [hovered, setHovered] = useState(false);
  const matRef = useRef<MeshStandardMaterial | null>(null);
  const openCert = usePortfolioStore((s) => s.openCertificate);
  const allCerts = certificateGroups.flatMap((g) => g.certs);
  const setCursor = usePortfolioStore((s) => s.setCursorState);

  useFrame((state) => {
    if (matRef.current) {
      matRef.current.emissiveIntensity =
        (hovered ? 1.4 : 0.6) + Math.sin(state.clock.elapsedTime * 1.8) * 0.20;
    }
  });

  return (
    <group position={[0, -FRAME_H / 2 - 0.22, 0.05]}>
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          setCursor('interactive');
          play('hover');
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          setCursor('idle');
        }}
        onClick={(e) => {
          e.stopPropagation();
          play('click_primary');
          // Open the 4th cert as a starting point — user can navigate.
          if (allCerts[3]) openCert(allCerts[3].id);
        }}
      >
        <planeGeometry args={[1.0, 0.22]} />
        <meshStandardMaterial
          ref={matRef}
          color={palette.neonGreen}
          emissive={palette.neonGreen}
          emissiveIntensity={0.7}
          transparent
          opacity={0.30}
        />
      </mesh>
      <Text
        raycast={noRaycast}
        ref={disableRaycast}
        position={[0, 0, 0.012]}
        fontSize={0.058}
        color={palette.textPrimary}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.22}
        outlineWidth={0.002}
        outlineColor={palette.neonGreen}
      >
        VIEW ALL CERTIFICATES
      </Text>
    </group>
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
    matRef.current.opacity = 0.10 + Math.sin(phase * Math.PI) * 0.50;
  });
  return (
    <mesh ref={ref} raycast={noRaycast} position={[0, FRAME_H / 2 - 0.05, 0.08]}>
      <planeGeometry args={[FRAME_W * 0.97, 0.024]} />
      <meshBasicMaterial
        ref={matRef}
        color={palette.neonBright}
        transparent
        opacity={0.4}
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
