'use client';

import { MeshTransmissionMaterial, RoundedBox, Text, useTexture } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import gsap from 'gsap';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BackSide,
  Color,
  SRGBColorSpace,
  type Group,
  type Mesh,
  type MeshStandardMaterial,
  type Texture,
} from 'three';
import { stations, RACK_POS, certificateGroups, type Certificate } from '@/lib/content';
import { InteractiveConsole } from '@/components/canvas/InteractiveConsole';
import { FogParticles } from '@/components/canvas/FogParticles';
import { palette } from '@/lib/palette';
import { usePortfolioStore } from '@/lib/store';
import { disableRaycast, noRaycast } from '@/lib/three-utils';
import { play } from '@/lib/audio';

export function Lab() {
  return (
    <group>
      <Sky />
      <Floor />
      {stations.map((s) => (
        <InteractiveConsole key={s.slug} slug={s.slug} label={s.label} position={s.position} />
      ))}
      <CertificateCards />
      <FogParticles />
    </group>
  );
}

/* ────────────────────────────  Sky  ──────────────────────────────
 * V7.0 — soft 3-stop atmospheric gradient. night-base top / night-mid
 * middle with a subtle warm wash / night-base bottom. */

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
  // Subtle warm wash near the horizon band.
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

/* ────────────────────────────  Floor  ────────────────────────────
 * V7.0 — reflective polished-obsidian disc. No grid, no dots. Just a
 * dark mirror that picks up the env IBL + spotlight reflections. Radial
 * alpha fade overlay so the floor blends into atmosphere at edges. */

const FLOOR_VERT_V7 = /* glsl */ `varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const FLOOR_FRAG_V7 = /* glsl */ `precision highp float;
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
      {/* Reflective base disc. */}
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
      {/* Radial alpha-fade overlay. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <circleGeometry args={[22, 64]} />
        <shaderMaterial
          vertexShader={FLOOR_VERT_V7}
          fragmentShader={FLOOR_FRAG_V7}
          uniforms={overlayUniforms}
          transparent
          depthWrite={false}
        />
      </mesh>
    </>
  );
}

/* ─────────────  V7.0 Certificate Wall: 4×3 floating glass cards  ───────────── */

const TILE_W = 0.8;
const TILE_H = 0.6;
const TILE_D = 0.08;
const FLAT_CERTS: readonly Certificate[] = certificateGroups
  .flatMap((g) => g.certs)
  .slice(0, 12);

// Two featured tiles get accent edge strokes; everything else gets neutral.
const FEATURED_GOLD_INDEX = 4;   // Applied Generative AI
const FEATURED_MINT_INDEX = 5;   // AI-First Software Engineering

function CertificateCards() {
  // 4 columns × 3 rows centred on RACK_POS, but with NO rack body — the
  // tiles just float in a grid formation in the air.
  return (
    <group position={RACK_POS}>
      {/* "CERTIFICATES" floating title above grid. */}
      <Text
        raycast={noRaycast}
        ref={disableRaycast}
        position={[0, 1.55, 0]}
        fontSize={0.18}
        color={palette.champagneGold}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.2}
        outlineWidth={0.002}
        outlineColor={palette.nightBase}
        outlineOpacity={0.6}
      >
        CERTIFICATES
      </Text>
      <Text
        raycast={noRaycast}
        ref={disableRaycast}
        position={[0, 1.35, 0]}
        fontSize={0.06}
        color={palette.pearlCool}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.3}
      >
        12 / 12
      </Text>

      {FLAT_CERTS.map((cert, i) => {
        const row = Math.floor(i / 4); // 0..2
        const col = i % 4;              // 0..3
        const x = -1.35 + col * 0.9;
        const y = 0.7 - row * 0.7;
        const accent =
          i === FEATURED_GOLD_INDEX ? palette.champagneGold :
          i === FEATURED_MINT_INDEX ? palette.signalMint :
          null;
        return (
          <FloatingCertCard
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

function FloatingCertCard({
  cert,
  position,
  accent,
  phase,
}: {
  cert: Certificate;
  position: readonly [number, number, number];
  accent: string | null;
  phase: number;
}) {
  const groupRef = useRef<Group | null>(null);
  const innerRef = useRef<Mesh>(null);
  const matRef = useRef<MeshStandardMaterial | null>(null);
  const [hovered, setHovered] = useState(false);
  const openProgress = useRef({ value: 0 });
  const animating = useRef(false);
  const t = useRef(phase);

  const openCertificate = usePortfolioStore((s) => s.openCertificate);
  const lightboxCertId = usePortfolioStore((s) => s.lightboxCertId);
  const setCursor = usePortfolioStore((s) => s.setCursorState);
  const lowPerf = usePortfolioStore((s) => s.perfMode === 'low');

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
    t.current += dt;
    const op = openProgress.current.value;
    if (groupRef.current) {
      const bob = Math.sin((t.current / 8) * Math.PI * 2) * 0.03;
      const lift = hovered ? 0.1 : 0;
      groupRef.current.position.z = position[2] + lift + op * 0.5;
      groupRef.current.position.y = position[1] + bob;
    }
    if (matRef.current) {
      matRef.current.emissiveIntensity = hovered ? 0.7 : 0.3;
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
        animating.current = false;
      },
    });
  };

  return (
    <group ref={groupRef} position={[position[0], position[1], position[2]]}>
      {/* Glass slab. */}
      <RoundedBox
        args={[TILE_W, TILE_H, TILE_D]}
        radius={0.03}
        smoothness={3}
        onPointerOver={handleOver}
        onPointerOut={handleOut}
        onClick={handleClick}
      >
        {lowPerf ? (
          <meshStandardMaterial
            color={palette.glassIce}
            roughness={0.25}
            metalness={0.1}
            transparent
            opacity={0.4}
          />
        ) : (
          <MeshTransmissionMaterial
            transmission={0.78}
            thickness={0.4}
            roughness={0.18}
            chromaticAberration={0.02}
            ior={1.5}
            distortion={0.04}
            color={palette.glassIce}
            samples={3}
            resolution={256}
          />
        )}
      </RoundedBox>

      {/* Inner certificate PNG plane — sits behind the glass front. */}
      <mesh ref={innerRef} position={[0, 0, TILE_D / 2 - 0.005]}>
        <planeGeometry args={[TILE_W * 0.92, TILE_H * 0.92]} />
        <meshStandardMaterial
          ref={matRef}
          map={tex}
          color={palette.ivoryWarm}
          emissive={accent ?? palette.champagneDeep}
          emissiveIntensity={0.3}
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>

      {/* Corner brackets — gold L-shapes; mint if signal accent, otherwise gold. */}
      <CertBrackets
        w={TILE_W}
        h={TILE_H}
        z={TILE_D / 2 + 0.002}
        color={accent ?? palette.champagneGold}
        opacity={accent ? 1 : 0.7}
      />
    </group>
  );
}

function CertBrackets({
  w,
  h,
  z,
  color,
  opacity,
}: {
  w: number;
  h: number;
  z: number;
  color: string;
  opacity: number;
}) {
  const L = 0.08;
  const T = 0.01;
  const mat = (
    <meshStandardMaterial
      color={color}
      emissive={color}
      emissiveIntensity={opacity}
      metalness={0.95}
      roughness={0.22}
    />
  );
  const corners: readonly [number, number][] = [
    [-1, 1],
    [1, 1],
    [-1, -1],
    [1, -1],
  ];
  return (
    <group position={[0, 0, z]}>
      {corners.map(([sx, sy]) => (
        <group key={`${sx}_${sy}`}>
          <mesh position={[sx * (w / 2 - L / 2), sy * (h / 2 - T / 2), 0]}>
            <planeGeometry args={[L, T]} />
            {mat}
          </mesh>
          <mesh position={[sx * (w / 2 - T / 2), sy * (h / 2 - L / 2), 0]}>
            <planeGeometry args={[T, L]} />
            {mat}
          </mesh>
        </group>
      ))}
    </group>
  );
}
