'use client';

import { Text, useTexture } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import gsap from 'gsap';
import { useEffect, useRef, useState } from 'react';
import { AdditiveBlending, SRGBColorSpace, type Mesh, type MeshBasicMaterial, type MeshStandardMaterial, type Texture } from 'three';
import { certificateGroups, type Certificate } from '@/lib/content';
import { palette } from '@/lib/palette';
import { usePortfolioStore } from '@/lib/store';
import { disableRaycast, noRaycast } from '@/lib/three-utils';
import { play } from '@/lib/audio';

const RACK_POS_V10: readonly [number, number, number] = [0, 2.5, -7.7];
const RACK_W = 4.4;
const RACK_H = 2.6;
const RACK_D = 0.15;

const FLAT_CERTS: readonly Certificate[] = certificateGroups.flatMap((g) => g.certs).slice(0, 12);

const FEATURED_GOLD = 4; // Applied Generative AI
const FEATURED_VIOLET = 5; // AI-First SE

/**
 * V10.0 — back-wall mounted cert rack. Glass backing plate + 4×3 grid of
 * recessed cert slots. Each slot click → GSAP drawer-slide + lightbox.
 * Approach unfold tied to camera distance; sweep scanline overlay.
 */
export function WallCertRack() {
  const bodyMatRef = useRef<MeshStandardMaterial | null>(null);

  useFrame(() => {
    if (bodyMatRef.current) {
      // Idle dim glow so the rack reads as a wall-mounted exhibit.
      bodyMatRef.current.emissiveIntensity = 0.12;
    }
  });

  return (
    <group position={RACK_POS_V10}>
      {/* Backing plate. */}
      <mesh>
        <boxGeometry args={[RACK_W, RACK_H, RACK_D]} />
        <meshStandardMaterial
          ref={bodyMatRef}
          color="#0A1014"
          metalness={0.7}
          roughness={0.4}
          emissive={palette.neonGreen}
          emissiveIntensity={0.1}
        />
      </mesh>

      {/* Gold-ish frame trim around backing plate. */}
      <RackFrame w={RACK_W} h={RACK_H} z={RACK_D / 2 + 0.005} />

      {/* CREDENTIALS VAULT title. */}
      <Text
        raycast={noRaycast}
        ref={disableRaycast}
        position={[0, RACK_H / 2 + 0.20, RACK_D / 2 + 0.01]}
        fontSize={0.18}
        color={palette.neonBright}
        anchorX="center"
        anchorY="bottom"
        letterSpacing={0.22}
        outlineWidth={0.002}
        outlineColor={palette.neonGreen}
      >
        CREDENTIALS VAULT
      </Text>
      <Text
        raycast={noRaycast}
        ref={disableRaycast}
        position={[0, RACK_H / 2 + 0.10, RACK_D / 2 + 0.01]}
        fontSize={0.055}
        color={palette.textSecondary}
        anchorX="center"
        anchorY="top"
        letterSpacing={0.3}
      >
        12 / 12 VERIFIED
      </Text>

      {/* 4 × 3 cert grid. */}
      {FLAT_CERTS.map((cert, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const x = -1.65 + col * 1.1;
        const y = 0.75 - row * 0.75;
        const accent =
          i === FEATURED_GOLD ? palette.champagneGold :
          i === FEATURED_VIOLET ? '#B89DFF' :
          palette.neonGreen;
        return (
          <CertSlot key={cert.id} cert={cert} position={[x, y, RACK_D / 2 + 0.01]} accent={accent} phase={i * 0.6} />
        );
      })}

      {/* Sweep scanline traversing the rack face. */}
      <RackScanline />
    </group>
  );
}

function RackFrame({ w, h, z }: { w: number; h: number; z: number }) {
  const T = 0.02;
  const mat = (
    <meshStandardMaterial
      color={palette.neonGreen}
      emissive={palette.neonGreen}
      emissiveIntensity={1.0}
      metalness={0.9}
      roughness={0.2}
      toneMapped={false}
    />
  );
  return (
    <>
      <mesh position={[0,  h / 2, z]}><planeGeometry args={[w, T]} />{mat}</mesh>
      <mesh position={[0, -h / 2, z]}><planeGeometry args={[w, T]} />{mat}</mesh>
      <mesh position={[-w / 2, 0, z]}><planeGeometry args={[T, h]} />{mat}</mesh>
      <mesh position={[ w / 2, 0, z]}><planeGeometry args={[T, h]} />{mat}</mesh>
    </>
  );
}

function CertSlot({
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
  const meshRef = useRef<Mesh>(null);
  const matRef = useRef<MeshStandardMaterial | null>(null);
  const [hovered, setHovered] = useState(false);
  const openProgress = useRef({ value: 0 });
  const animating = useRef(false);
  const t = useRef(phase);

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
        value: 0, duration: 0.4, ease: 'power2.in',
        onComplete: () => { animating.current = false; },
      });
    }
  }, [lightboxCertId, cert.id]);

  useFrame((_, dt) => {
    t.current += dt;
    if (!meshRef.current) return;
    // Per-slot bob.
    const bob = Math.sin(t.current * 0.8) * 0.005;
    const hoverZ = hovered ? 0.06 : 0;
    const op = openProgress.current.value;
    meshRef.current.position.z = position[2] + bob + hoverZ + op * 0.3;
    if (matRef.current) {
      matRef.current.emissiveIntensity = (hovered ? 0.7 : 0.35) + op * 0.6;
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
      value: 1, duration: 0.6, ease: 'power2.out',
      onComplete: () => {
        openCertificate(cert.id);
        animating.current = false;
      },
    });
  };

  return (
    <group position={[position[0], position[1], 0]}>
      <mesh
        ref={meshRef}
        position={[0, 0, position[2]]}
        onPointerOver={handleOver}
        onPointerOut={handleOut}
        onClick={handleClick}
      >
        <planeGeometry args={[0.95, 0.62]} />
        <meshStandardMaterial
          ref={matRef}
          map={tex}
          color="#FFFFFF"
          emissive={accent}
          emissiveIntensity={0.35}
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>
      {/* Slot frame. */}
      <RackFrame w={0.95} h={0.62} z={position[2] + 0.002} />
    </group>
  );
}

function RackScanline() {
  const matRef = useRef<MeshBasicMaterial | null>(null);
  const meshRef = useRef<Mesh>(null);
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    const phase = (t.current % 6) / 6;
    if (meshRef.current) {
      const top = RACK_H / 2 - 0.05;
      const bot = -RACK_H / 2 + 0.05;
      meshRef.current.position.y = top + (bot - top) * phase;
    }
    if (matRef.current) {
      const e = Math.sin(phase * Math.PI);
      matRef.current.opacity = 0.05 + 0.4 * e;
    }
  });
  return (
    <mesh ref={meshRef} position={[0, RACK_H / 2 - 0.05, RACK_D / 2 + 0.02]}>
      <planeGeometry args={[RACK_W * 0.97, 0.028]} />
      <meshBasicMaterial
        ref={matRef}
        color={palette.neonBright}
        transparent
        opacity={0.25}
        blending={AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}
