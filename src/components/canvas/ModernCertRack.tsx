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

/**
 * V10.2 — freestanding modern cert rack. Replaces the wall-mounted
 * Credentials Vault. Hexagonal pedestal base + open metal frame +
 * 12 glass cert slabs in a 4×3 grid + per-slab breathing emissive +
 * GSAP drawer-slide on click + security sweep scanline + spotlight.
 *
 * World position: [4, 0, -4], rotated -π/6 to angle toward the camera.
 */

const RACK_POS: [number, number, number] = [4, 0, -4];
const RACK_ROT: [number, number, number] = [0, -Math.PI / 6, 0];
const RACK_W = 2.5;
const RACK_H = 3.5;
const RACK_D = 0.4;

const SLAB_W = 0.55;
const SLAB_H = 0.40;

const FLAT_CERTS: readonly Certificate[] = certificateGroups.flatMap((g) => g.certs).slice(0, 12);

const FEATURED_GOLD = 4;   // Applied Generative AI
const FEATURED_VIOLET = 5; // AI-First SE

export function ModernCertRack() {
  return (
    <group position={RACK_POS} rotation={RACK_ROT}>
      {/* Pedestal base — hexagonal, dark glass. */}
      <PedestalBase />

      {/* Open frame with vertical columns + horizontal struts. */}
      <RackFrame />

      {/* 12 glass cert slabs in a 4×3 grid inside the frame. */}
      <CertGrid />

      {/* Top hex cap. */}
      <TopCap />

      {/* Floating title above the rack. */}
      <RackTitle />

      {/* Vertical sweep scanline traversing the face. */}
      <SweepScanline />
    </group>
  );
}

/* ────────────────────────── PEDESTAL ─────────────────────────── */

function PedestalBase() {
  return (
    <group position={[0, 0.20, 0]}>
      {/* Wide hex disc. */}
      <mesh raycast={noRaycast}>
        <cylinderGeometry args={[1.5, 1.6, 0.40, 6]} />
        <meshStandardMaterial
          color={palette.darkSurface}
          emissive={palette.neonGreen}
          emissiveIntensity={0.15}
          metalness={0.85}
          roughness={0.25}
        />
      </mesh>
      {/* Edge trim. */}
      <mesh raycast={noRaycast} position={[0, 0.20, 0]}>
        <torusGeometry args={[1.5, 0.015, 8, 6]} />
        <meshStandardMaterial
          color={palette.neonGreen}
          emissive={palette.neonGreen}
          emissiveIntensity={2.8}
          toneMapped={false}
        />
      </mesh>
      <mesh raycast={noRaycast} position={[0, -0.20, 0]}>
        <torusGeometry args={[1.6, 0.015, 8, 6]} />
        <meshStandardMaterial
          color={palette.neonGreen}
          emissive={palette.neonGreen}
          emissiveIntensity={2.0}
          toneMapped={false}
        />
      </mesh>

      {/* "CERTIFICATIONS" label on front face. */}
      <Text
        raycast={noRaycast}
        ref={disableRaycast}
        position={[0, 0.06, 1.51]}
        fontSize={0.13}
        color={palette.neonBright}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.22}
        outlineWidth={0.003}
        outlineColor={palette.neonGreen}
      >
        CERTIFICATIONS
      </Text>
      <Text
        raycast={noRaycast}
        ref={disableRaycast}
        position={[0, -0.08, 1.51]}
        fontSize={0.06}
        color={palette.textSecondary}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.32}
      >
        12 / 12 VERIFIED
      </Text>
    </group>
  );
}

/* ────────────────────────── OPEN FRAME ───────────────────────── */

function RackFrame() {
  const mat = (
    <meshStandardMaterial
      color={palette.neonGreen}
      emissive={palette.neonGreen}
      emissiveIntensity={1.6}
      metalness={0.9}
      roughness={0.20}
      toneMapped={false}
    />
  );
  // Frame sits from Y=0.5 (just above pedestal) to Y=0.5+RACK_H=4.0
  const yMid = 0.5 + RACK_H / 2;
  return (
    <group position={[0, yMid, 0]}>
      {/* 4 vertical corner columns. */}
      {(
        [
          [-RACK_W / 2, -RACK_D / 2],
          [RACK_W / 2, -RACK_D / 2],
          [-RACK_W / 2, RACK_D / 2],
          [RACK_W / 2, RACK_D / 2],
        ] as const
      ).map(([x, z], i) => (
        <mesh key={i} raycast={noRaycast} position={[x, 0, z]}>
          <boxGeometry args={[0.04, RACK_H, 0.04]} />
          {mat}
        </mesh>
      ))}

      {/* Horizontal struts every 0.7h on the front face. */}
      {[0, 1, 2, 3, 4].map((i) => {
        const y = RACK_H / 2 - i * (RACK_H / 4);
        return (
          <mesh key={`h${i}`} raycast={noRaycast} position={[0, y, RACK_D / 2]}>
            <boxGeometry args={[RACK_W + 0.04, 0.025, 0.04]} />
            {mat}
          </mesh>
        );
      })}
      {/* Same struts on the back. */}
      {[0, 1, 2, 3, 4].map((i) => {
        const y = RACK_H / 2 - i * (RACK_H / 4);
        return (
          <mesh key={`hb${i}`} raycast={noRaycast} position={[0, y, -RACK_D / 2]}>
            <boxGeometry args={[RACK_W + 0.04, 0.025, 0.04]} />
            {mat}
          </mesh>
        );
      })}
    </group>
  );
}

/* ────────────────────────── CERT GRID ────────────────────────── */

function CertGrid() {
  return (
    <group position={[0, 0.5 + RACK_H / 2, RACK_D / 2 + 0.04]}>
      {FLAT_CERTS.map((cert, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const x = -0.84 + col * 0.56;
        const y = 1.05 - row * 0.86;
        const accent =
          i === FEATURED_GOLD ? palette.accentGold :
          i === FEATURED_VIOLET ? '#9D7FE8' :
          palette.neonGreen;
        return (
          <CertSlab
            key={cert.id}
            cert={cert}
            position={[x, y, 0]}
            accent={accent}
            phase={i * 0.6}
          />
        );
      })}
    </group>
  );
}

function CertSlab({
  cert,
  position,
  accent,
  phase,
}: {
  cert: Certificate;
  position: readonly [number, number, number];
  accent: string;
  phase: number;
}) {
  const groupRef = useRef<Group | null>(null);
  const matRef = useRef<MeshStandardMaterial | null>(null);
  const [hovered, setHovered] = useState(false);
  const animating = useRef(false);
  const openProgress = useRef({ value: 0 });

  const openCertificate = usePortfolioStore((s) => s.openCertificate);
  const lightboxCertId = usePortfolioStore((s) => s.lightboxCertId);
  const setCursor = usePortfolioStore((s) => s.setCursorState);

  const tex = useTexture(cert.image, (loaded) => {
    if (!Array.isArray(loaded)) {
      loaded.colorSpace = SRGBColorSpace;
      loaded.anisotropy = 4;
    }
  }) as Texture;

  // When lightbox closes, slide the slab back home.
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
    if (!groupRef.current) return;
    const t = (groupRef.current.userData.t ?? 0) + dt;
    groupRef.current.userData.t = t;
    const hoverZ = hovered ? 0.15 : 0;
    const op = openProgress.current.value;
    groupRef.current.position.z = position[2] + hoverZ + op * 0.6;
    if (matRef.current) {
      // Per-slab breathing emissive.
      matRef.current.emissiveIntensity = 1.2 + Math.sin(t * 1.4 + phase) * 0.4 + (hovered ? 0.6 : 0) + op * 0.8;
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
      duration: 0.6,
      ease: 'power2.out',
      onComplete: () => {
        openCertificate(cert.id);
      },
    });
  };

  return (
    <group ref={groupRef} position={[position[0], position[1], 0]}>
      {/* Glass slab face. */}
      <mesh
        onPointerOver={handleOver}
        onPointerOut={handleOut}
        onClick={handleClick}
      >
        <planeGeometry args={[SLAB_W, SLAB_H]} />
        <meshStandardMaterial
          ref={matRef}
          map={tex}
          color="#FFFFFF"
          emissive={accent}
          emissiveIntensity={1.2}
          roughness={0.30}
          metalness={0.15}
        />
      </mesh>
      {/* Neon frame around slab. */}
      <SlabFrame w={SLAB_W} h={SLAB_H} color={accent} />
    </group>
  );
}

function SlabFrame({ w, h, color }: { w: number; h: number; color: string }) {
  const T = 0.015;
  return (
    <>
      <mesh raycast={noRaycast} position={[0, h / 2, 0.005]}>
        <boxGeometry args={[w + 0.02, T, 0.01]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={3.0} toneMapped={false} />
      </mesh>
      <mesh raycast={noRaycast} position={[0, -h / 2, 0.005]}>
        <boxGeometry args={[w + 0.02, T, 0.01]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={3.0} toneMapped={false} />
      </mesh>
      <mesh raycast={noRaycast} position={[w / 2, 0, 0.005]}>
        <boxGeometry args={[T, h, 0.01]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={3.0} toneMapped={false} />
      </mesh>
      <mesh raycast={noRaycast} position={[-w / 2, 0, 0.005]}>
        <boxGeometry args={[T, h, 0.01]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={3.0} toneMapped={false} />
      </mesh>
    </>
  );
}

/* ────────────────────────── TOP CAP ──────────────────────────── */

function TopCap() {
  return (
    <group position={[0, 0.5 + RACK_H + 0.1, 0]}>
      <mesh raycast={noRaycast}>
        <cylinderGeometry args={[1.4, 1.4, 0.10, 6]} />
        <meshStandardMaterial
          color={palette.darkSurface}
          emissive={palette.neonGreen}
          emissiveIntensity={0.20}
          metalness={0.85}
          roughness={0.30}
        />
      </mesh>
      <mesh raycast={noRaycast} position={[0, 0.06, 0]}>
        <torusGeometry args={[1.4, 0.012, 8, 6]} />
        <meshStandardMaterial
          color={palette.neonGreen}
          emissive={palette.neonGreen}
          emissiveIntensity={3.0}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/* ────────────────────────── TITLE + STATUS ───────────────────── */

function RackTitle() {
  const dotRef = useRef<Mesh | null>(null);
  useFrame((state) => {
    if (!dotRef.current) return;
    const pulse = (Math.sin(state.clock.elapsedTime * 2) + 1) / 2;
    (dotRef.current.material as MeshBasicMaterial).opacity = 0.5 + pulse * 0.5;
  });
  return (
    <group position={[0, 0.5 + RACK_H + 0.45, 0]}>
      <Text
        raycast={noRaycast}
        ref={disableRaycast}
        position={[0, 0.10, 0]}
        fontSize={0.16}
        color={palette.neonBright}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.18}
        outlineWidth={0.004}
        outlineColor={palette.neonGreen}
      >
        CERTIFICATIONS VAULT
      </Text>
      {/* Pulsing status dot + ACTIVE. */}
      <group position={[0, -0.08, 0]}>
        <mesh ref={dotRef} raycast={noRaycast} position={[-0.32, 0, 0]}>
          <circleGeometry args={[0.020, 16]} />
          <meshBasicMaterial color={palette.accentGold} transparent opacity={1} toneMapped={false} />
        </mesh>
        <Text
          raycast={noRaycast}
          ref={disableRaycast}
          position={[-0.16, 0, 0]}
          fontSize={0.055}
          color={palette.accentGold}
          anchorX="left"
          anchorY="middle"
          letterSpacing={0.30}
        >
          ACTIVE
        </Text>
      </group>
    </group>
  );
}

/* ────────────────────────── SCANLINE ─────────────────────────── */

function SweepScanline() {
  const ref = useRef<Mesh | null>(null);
  const matRef = useRef<MeshBasicMaterial | null>(null);
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    if (!ref.current || !matRef.current) return;
    const phase = (t.current % 5) / 5;
    const top = 0.5 + RACK_H - 0.05;
    const bot = 0.5 + 0.05;
    ref.current.position.y = top + (bot - top) * phase;
    matRef.current.opacity = 0.10 + Math.sin(phase * Math.PI) * 0.45;
  });
  return (
    <mesh ref={ref} raycast={noRaycast} position={[0, 0.5 + RACK_H - 0.05, RACK_D / 2 + 0.08]}>
      <planeGeometry args={[RACK_W * 0.98, 0.025]} />
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
