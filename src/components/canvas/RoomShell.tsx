'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { AdditiveBlending, Color, DoubleSide, type IUniform, type MeshStandardMaterial } from 'three';
import { palette } from '@/lib/palette';

const ROOM_HALF = 8;
const ROOM_HEIGHT = 6;
const PILLAR_RADIUS = 0.15;

/**
 * V10.0 — enclosed room structure: 3 glass walls (LEFT/RIGHT/BACK; front
 * is open since the camera "enters" through it), a hex ceiling with 5
 * hanging emissive light fixtures, and 4 corner pillars connecting floor
 * to ceiling. Front-corner pillars omitted on the camera-side so the
 * frame doesn't get blocked.
 */
export function RoomShell() {
  return (
    <group>
      <Wall side="left" />
      <Wall side="right" />
      <Wall side="back" />
      <Ceiling />
      <CornerPillars />
    </group>
  );
}

/* ────────────────────────────  Walls  ──────────────────────────── */
// Hex-cutout shader on the wall glass: ~30 % of large hex cells are
// "open" (alpha 0) to create a sci-fi mesh-grid effect.

const WALL_VERT = /* glsl */ `varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const WALL_FRAG = /* glsl */ `precision highp float;
varying vec2 vUv;
uniform vec3 uColor;
uniform vec3 uFrameColor;
uniform float uTime;

vec2 hexCoord(vec2 p){
  p *= 8.0;
  vec2 r = vec2(1.0, 1.7320508);
  vec2 h = r * 0.5;
  vec2 a = mod(p, r) - h;
  vec2 b = mod(p - h, r) - h;
  return dot(a, a) < dot(b, b) ? a : b;
}
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main(){
  vec2 hex = hexCoord(vUv - 0.5);
  float dist = length(hex);
  // Frame edges between cells.
  float edge = smoothstep(0.42, 0.45, dist) - smoothstep(0.45, 0.48, dist);

  // Cell id used to drive randomly "open" cells (alpha 0).
  vec2 cellId = floor((vUv - 0.5) * 8.0);
  float rand = hash(cellId);
  float open = step(0.70, rand);                       // ~30 % open
  float interior = 1.0 - smoothstep(0.0, 0.42, dist);  // 1 inside, 0 at edge

  // Cell pulse for ~10 % of remaining cells.
  float pulseCell = step(0.92, rand);
  float pulse = 0.4 + 0.5 * sin(uTime * 1.2 + rand * 6.28);

  // Glass tint inside non-open cells.
  vec3 col = uColor * (0.05 + pulseCell * pulse * 0.12);
  col += uFrameColor * edge * 1.4;

  float a = (1.0 - open * interior) * (0.25 + edge * 1.5) +
            pulseCell * interior * pulse * 0.12;
  // Top + bottom edge boost (horizontal strips at vUv.y near 0 / 1).
  float strip = smoothstep(0.985, 1.0, vUv.y) + smoothstep(0.015, 0.0, vUv.y);
  col += uFrameColor * strip * 2.0;
  a += strip;

  gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
}`;

function Wall({ side }: { side: 'left' | 'right' | 'back' }) {
  const uniforms = useMemo<{ uColor: IUniform<Color>; uFrameColor: IUniform<Color>; uTime: IUniform<number> }>(
    () => ({
      uColor: { value: new Color('#88FFCC') },
      uFrameColor: { value: new Color(palette.neonGreen) },
      uTime: { value: 0 },
    }),
    [],
  );
  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime;
  });

  let position: [number, number, number];
  let rotation: [number, number, number];
  if (side === 'left') {
    position = [-ROOM_HALF, ROOM_HEIGHT / 2, 0];
    rotation = [0, Math.PI / 2, 0];
  } else if (side === 'right') {
    position = [ROOM_HALF, ROOM_HEIGHT / 2, 0];
    rotation = [0, -Math.PI / 2, 0];
  } else {
    position = [0, ROOM_HEIGHT / 2, -ROOM_HALF];
    rotation = [0, 0, 0];
  }

  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[ROOM_HALF * 2, ROOM_HEIGHT]} />
      <shaderMaterial
        vertexShader={WALL_VERT}
        fragmentShader={WALL_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={DoubleSide}
        blending={AdditiveBlending}
      />
    </mesh>
  );
}

/* ────────────────────────────  Ceiling + fixtures  ───────────────── */

const CEIL_VERT = /* glsl */ `varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const CEIL_FRAG = /* glsl */ `precision highp float;
varying vec2 vUv;
uniform vec3 uColor;
uniform float uTime;
vec2 hexCoord(vec2 p){
  p *= 16.0;
  vec2 r = vec2(1.0, 1.7320508);
  vec2 h = r * 0.5;
  vec2 a = mod(p, r) - h;
  vec2 b = mod(p - h, r) - h;
  return dot(a, a) < dot(b, b) ? a : b;
}
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec2 hex = hexCoord(vUv - 0.5);
  float dist = length(hex);
  float edge = smoothstep(0.42, 0.45, dist) - smoothstep(0.45, 0.48, dist);
  vec2 cellId = floor((vUv - 0.5) * 16.0);
  float rand = hash(cellId);
  float pulseCell = step(0.95, rand);
  float pulse = 0.4 + 0.5 * sin(uTime * 1.2 + rand * 6.28);
  vec3 col = uColor * (edge * 0.6 + pulseCell * (1.0 - smoothstep(0.0, 0.42, dist)) * pulse * 0.4);
  float a = edge * 0.5 + pulseCell * pulse * 0.18;
  gl_FragColor = vec4(col, a);
}`;

function Ceiling() {
  const uniforms = useMemo<{ uColor: IUniform<Color>; uTime: IUniform<number> }>(
    () => ({
      uColor: { value: new Color(palette.neonGreen) },
      uTime: { value: 0 },
    }),
    [],
  );
  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime;
  });

  // 5 hanging fixtures.
  const FIXTURES: readonly [number, number][] = [
    [-4, -2],
    [-2, 2],
    [0, 0],
    [2, 2],
    [4, -2],
  ];

  return (
    <group>
      {/* Ceiling plane — slightly darker hex pattern (no full opacity). */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM_HEIGHT, 0]}>
        <planeGeometry args={[ROOM_HALF * 2, ROOM_HALF * 2]} />
        <shaderMaterial
          vertexShader={CEIL_VERT}
          fragmentShader={CEIL_FRAG}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          side={DoubleSide}
          blending={AdditiveBlending}
        />
      </mesh>
      {/* 5 hanging fixtures — small emissive torus rings. */}
      {FIXTURES.map(([x, z], i) => (
        <Fixture key={i} position={[x, ROOM_HEIGHT - 0.3, z]} />
      ))}
    </group>
  );
}

function Fixture({ position }: { position: readonly [number, number, number] }) {
  const matRef = useRef<MeshStandardMaterial | null>(null);
  useFrame((state) => {
    if (matRef.current) {
      matRef.current.emissiveIntensity = 1.4 + 0.4 * Math.sin(state.clock.elapsedTime * 1.6 + position[0]);
    }
  });
  return (
    <group position={position}>
      {/* Torus ring. */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.30, 0.025, 12, 36]} />
        <meshStandardMaterial
          ref={matRef}
          color={palette.neonGreen}
          emissive={palette.neonGreen}
          emissiveIntensity={1.4}
          metalness={0.9}
          roughness={0.2}
          toneMapped={false}
        />
      </mesh>
      {/* Center light disc. */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.18, 24]} />
        <meshStandardMaterial
          color="#DDFFEE"
          emissive="#DDFFEE"
          emissiveIntensity={2.2}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/* ────────────────────────────  Corner pillars  ────────────────── */

function CornerPillars() {
  // Only back-corner pillars (front would block the camera frame).
  const CORNERS: readonly [number, number][] = [
    [-ROOM_HALF, -ROOM_HALF],
    [ROOM_HALF, -ROOM_HALF],
    [-ROOM_HALF, ROOM_HALF * 0.9],
    [ROOM_HALF, ROOM_HALF * 0.9],
  ];
  return (
    <>
      {CORNERS.map(([x, z], i) => (
        <group key={i} position={[x, ROOM_HEIGHT / 2, z]}>
          {/* Pillar body. */}
          <mesh>
            <cylinderGeometry args={[PILLAR_RADIUS, PILLAR_RADIUS, ROOM_HEIGHT, 16]} />
            <meshStandardMaterial color="#1A2A22" metalness={0.8} roughness={0.3} />
          </mesh>
          {/* Vertical emissive strip running the height. */}
          <mesh position={[0, 0, PILLAR_RADIUS + 0.005]}>
            <planeGeometry args={[0.04, ROOM_HEIGHT - 0.2]} />
            <meshStandardMaterial
              color={palette.neonGreen}
              emissive={palette.neonGreen}
              emissiveIntensity={1.5}
              toneMapped={false}
            />
          </mesh>
          {/* Top cap. */}
          <mesh position={[0, ROOM_HEIGHT / 2 - 0.05, 0]}>
            <cylinderGeometry args={[PILLAR_RADIUS + 0.04, PILLAR_RADIUS + 0.02, 0.08, 16]} />
            <meshStandardMaterial color={palette.neonGreen} emissive={palette.neonGreen} emissiveIntensity={1.0} toneMapped={false} />
          </mesh>
          {/* Bottom cap. */}
          <mesh position={[0, -ROOM_HEIGHT / 2 + 0.05, 0]}>
            <cylinderGeometry args={[PILLAR_RADIUS + 0.04, PILLAR_RADIUS + 0.02, 0.08, 16]} />
            <meshStandardMaterial color={palette.neonGreen} emissive={palette.neonGreen} emissiveIntensity={1.0} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </>
  );
}
