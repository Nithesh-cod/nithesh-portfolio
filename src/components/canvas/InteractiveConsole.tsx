'use client';

import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { MeshTransmissionMaterial, RoundedBox, Text } from '@react-three/drei';
import { useRef, useState } from 'react';
import { type Group, type MeshStandardMaterial } from 'three';
import { palette } from '@/lib/palette';
import { usePortfolioStore } from '@/lib/store';
import { disableRaycast, noRaycast } from '@/lib/three-utils';
import { play } from '@/lib/audio';
import type { Project, Station } from '@/lib/content';

// V8.0 — SUBSTANTIAL glass card. Lower transmission, more visible borders,
// internal accent details. Reads as a solid glass plaque, not a ghost.
const CARD_W = 1.5;
const CARD_H = 1.0;
const CARD_D = 0.06;
const FLOAT_AMP = 0.04;
const FLOAT_PERIOD = 6;
const BORDER_T = 0.015;

export function InteractiveConsole({
  slug,
  label,
  position,
}: {
  slug: Project['slug'];
  label: string;
  position: Station['position'];
}) {
  const groupRef = useRef<Group | null>(null);
  const borderMatRef = useRef<MeshStandardMaterial | null>(null);
  const accentDotRef = useRef<MeshStandardMaterial | null>(null);
  const [hovered, setHovered] = useState(false);
  const t = useRef(Math.random() * Math.PI * 2);

  const openProject = usePortfolioStore((s) => s.openProject);
  const focusOn = usePortfolioStore((s) => s.focusOn);
  const setCursor = usePortfolioStore((s) => s.setCursorState);
  const lowPerf = usePortfolioStore((s) => s.perfMode === 'low');

  const restY = position[1] + 0.45;

  useFrame((_, dt) => {
    t.current += dt;
    if (!groupRef.current) return;
    const bob = Math.sin((t.current / FLOAT_PERIOD) * Math.PI * 2) * FLOAT_AMP;
    const lift = hovered ? 0.05 : 0;
    groupRef.current.position.y = restY + bob + lift;
    if (borderMatRef.current) {
      borderMatRef.current.emissiveIntensity = hovered ? 1.8 : 1.2;
    }
    if (accentDotRef.current) {
      // Mint "active" dot — gentle blink.
      const blink = 0.6 + 0.4 * Math.sin(t.current * 2.0);
      accentDotRef.current.emissiveIntensity = blink * 1.6;
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
    play('click_primary');
    focusOn(
      [position[0] * 0.5, restY + 0.3, position[2] + 2.5],
      [position[0], restY, position[2]],
    );
    openProject(slug);
  };

  return (
    <group ref={groupRef} position={[position[0], restY, position[2]]}>
      {/* SUBSTANTIAL glass slab — transmission 0.65, thickness 0.8, slight
          blue tint so it reads as visible. */}
      <RoundedBox
        args={[CARD_W, CARD_H, CARD_D]}
        radius={0.04}
        smoothness={3}
        onPointerOver={handleOver}
        onPointerOut={handleOut}
        onClick={handleClick}
      >
        {lowPerf ? (
          <meshStandardMaterial
            color="#A8B5D8"
            roughness={0.25}
            metalness={0.15}
            transparent
            opacity={0.55}
          />
        ) : (
          <MeshTransmissionMaterial
            transmission={0.65}
            thickness={0.8}
            roughness={0.18}
            chromaticAberration={0.02}
            ior={1.5}
            distortion={0.04}
            color="#A8B5D8"
            samples={3}
            resolution={256}
          />
        )}
      </RoundedBox>

      {/* Gradient overlay — emissive champagne fade from top → transparent
          at bottom. Adds visual weight. */}
      <GradientOverlay />

      {/* Project name. */}
      <Text
        raycast={noRaycast}
        ref={disableRaycast}
        position={[0, 0.05, CARD_D / 2 + 0.002]}
        fontSize={0.15}
        color={palette.ivoryWarm}
        anchorX="center"
        anchorY="middle"
        maxWidth={CARD_W * 0.85}
        textAlign="center"
        lineHeight={1.0}
        letterSpacing={0.08}
        outlineWidth={0.002}
        outlineColor={palette.champagneGold}
        outlineOpacity={0.6}
      >
        {label.toUpperCase()}
      </Text>

      {/* Subtle gold underline below the name. */}
      <mesh position={[0, -0.07, CARD_D / 2 + 0.0015]}>
        <planeGeometry args={[CARD_W * 0.45, 0.006]} />
        <meshStandardMaterial
          color={palette.champagneGold}
          emissive={palette.champagneGold}
          emissiveIntensity={0.9}
          metalness={0.95}
          roughness={0.22}
        />
      </mesh>

      {/* Mint "active" accent dot, top-left corner. */}
      <mesh
        position={[-CARD_W / 2 + 0.08, CARD_H / 2 - 0.08, CARD_D / 2 + 0.0015]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[0.018, 0.018, 0.005, 16]} />
        <meshStandardMaterial
          ref={accentDotRef}
          color={palette.signalMint}
          emissive={palette.signalMint}
          emissiveIntensity={1.4}
        />
      </mesh>

      {/* Champagne-gold edge stroke — thicker + brighter than V7.0. */}
      <EdgeStroke
        w={CARD_W}
        h={CARD_H}
        z={CARD_D / 2 + 0.001}
        thickness={BORDER_T}
        matRef={borderMatRef}
      />
    </group>
  );
}

/**
 * Champagne-gold gradient fade from top (visible) to bottom (transparent)
 * across the card face — adds visual weight without obscuring the name.
 */
const GRADIENT_VERT = /* glsl */ `varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const GRADIENT_FRAG = /* glsl */ `precision highp float;
varying vec2 vUv;
uniform vec3 uColor;
void main(){
  float t = vUv.y; // 0 bottom → 1 top
  float a = t * 0.3;
  gl_FragColor = vec4(uColor, a);
}`;

function GradientOverlay() {
  const uniformsRef = useRef({
    uColor: { value: { r: 0.79, g: 0.66, b: 0.38 } }, // champagneGold
  });
  return (
    <mesh position={[0, 0, CARD_D / 2 + 0.0005]}>
      <planeGeometry args={[CARD_W, CARD_H]} />
      <shaderMaterial
        vertexShader={GRADIENT_VERT}
        fragmentShader={GRADIENT_FRAG}
        uniforms={uniformsRef.current}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

function EdgeStroke({
  w,
  h,
  z,
  thickness,
  matRef,
}: {
  w: number;
  h: number;
  z: number;
  thickness: number;
  matRef: React.MutableRefObject<MeshStandardMaterial | null>;
}) {
  return (
    <>
      <mesh position={[0, h / 2, z]}>
        <planeGeometry args={[w, thickness]} />
        <meshStandardMaterial
          ref={matRef}
          color={palette.champagneGold}
          emissive={palette.champagneGold}
          emissiveIntensity={1.2}
          metalness={0.95}
          roughness={0.22}
        />
      </mesh>
      <mesh position={[0, -h / 2, z]}>
        <planeGeometry args={[w, thickness]} />
        <meshStandardMaterial
          color={palette.champagneGold}
          emissive={palette.champagneGold}
          emissiveIntensity={1.2}
          metalness={0.95}
          roughness={0.22}
        />
      </mesh>
      <mesh position={[-w / 2, 0, z]}>
        <planeGeometry args={[thickness, h]} />
        <meshStandardMaterial
          color={palette.champagneGold}
          emissive={palette.champagneGold}
          emissiveIntensity={1.2}
          metalness={0.95}
          roughness={0.22}
        />
      </mesh>
      <mesh position={[w / 2, 0, z]}>
        <planeGeometry args={[thickness, h]} />
        <meshStandardMaterial
          color={palette.champagneGold}
          emissive={palette.champagneGold}
          emissiveIntensity={1.2}
          metalness={0.95}
          roughness={0.22}
        />
      </mesh>
    </>
  );
}
