'use client';

import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  RepeatWrapping,
  SRGBColorSpace,
  type IUniform,
  type MeshStandardMaterial,
  type Texture,
} from 'three';
import { palette } from '@/lib/palette';

const ROOM_HALF = 8;
const ROOM_HEIGHT = 6;
const PILLAR_RADIUS = 0.15;

/* ──────────────────────────────────────────────────────────────────── *
 * V11.0 — replaces RoomShell. Solid dark walls with 3 cutout windows  *
 * per side wall (left + right) + a procedural cyberpunk-night         *
 * skyline shader rendered on a backdrop plane behind each window      *
 * wall. Back wall stays solid (no windows). Ceiling + corner pillars  *
 * carried over from RoomShell.                                        *
 * ──────────────────────────────────────────────────────────────────── */

export function WindowsWall() {
  return (
    <group>
      <BackWall />
      <WindowsSideWall side="left" />
      <WindowsSideWall side="right" />
      <CityBackdrop side="left" />
      <CityBackdrop side="right" />
      <Ceiling />
      <CornerPillars />
    </group>
  );
}

/* ──────────────────────────── BACK WALL ─────────────────────────────
 * Solid dark surface behind the capsule. Slight neon edge strip at
 * top + bottom and a vertical accent down the centre.
 */
function BackWall() {
  return (
    <group position={[0, ROOM_HEIGHT / 2, -ROOM_HALF]}>
      <mesh>
        <planeGeometry args={[ROOM_HALF * 2, ROOM_HEIGHT]} />
        <meshStandardMaterial
          color={palette.darkSurface}
          metalness={0.40}
          roughness={0.65}
          side={DoubleSide}
        />
      </mesh>
      {/* Top + bottom emissive strips. */}
      <mesh position={[0, ROOM_HEIGHT / 2 - 0.05, 0.01]}>
        <planeGeometry args={[ROOM_HALF * 2 - 0.4, 0.02]} />
        <meshBasicMaterial color={palette.neonGreen} toneMapped={false} />
      </mesh>
      <mesh position={[0, -ROOM_HEIGHT / 2 + 0.05, 0.01]}>
        <planeGeometry args={[ROOM_HALF * 2 - 0.4, 0.02]} />
        <meshBasicMaterial color={palette.neonGreen} toneMapped={false} />
      </mesh>
    </group>
  );
}

/* ──────────────────────────── SIDE WALL ─────────────────────────────
 * Single plane carrying:
 *   • solid dark fill OUTSIDE the 3 window rects
 *   • near-transparent panes INSIDE the windows so the city backdrop
 *     plane behind shows through
 *   • neon-green emissive frame edges around each window
 *   • 2 vertical mullions per window
 *
 * Shader does all of this in one pass so we don't need to mesh out
 * dozens of trim strips.
 */
const WINDOW_VERT = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const WINDOW_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec3 uFrame;
uniform vec3 uWall;
uniform float uTime;

void main() {
  // 3 windows on horizontal axis centred at U = 0.20, 0.50, 0.80.
  // Window half-width 0.115 (= 1.84u of a 16-wide wall ≈ 2.5u target after frame).
  // Window vertical centre V = 0.55, half-height 0.32 (= 1.92u of 6h ≈ 3.0u target).
  float u = vUv.x;
  float d0 = abs(u - 0.20);
  float d1 = abs(u - 0.50);
  float d2 = abs(u - 0.80);
  float du;
  if (d0 <= d1 && d0 <= d2) { du = u - 0.20; }
  else if (d1 <= d2) { du = u - 0.50; }
  else { du = u - 0.80; }

  float dv = vUv.y - 0.55;
  float halfW = 0.115;
  float halfH = 0.32;

  // Inside-window mask (1 inside, 0 outside).
  float inWin = step(abs(du), halfW) * step(abs(dv), halfH);

  // Distance from inside-window pixel to nearest window edge.
  float edgeU = halfW - abs(du);
  float edgeV = halfH - abs(dv);
  float edgeDist = min(edgeU, edgeV);
  float frameEdge = inWin * (1.0 - smoothstep(0.0, 0.006, edgeDist));

  // Mullions inside each window: 2 vertical bars at du = ±halfW/3.
  float mullPos = halfW / 3.0;
  float mullion = inWin * (1.0 - smoothstep(0.0035, 0.0075, abs(abs(du) - mullPos)));

  // Faint pulsing trim along bottom-window-row 6px.
  float pulse = 0.5 + 0.5 * sin(uTime * 0.8);

  // Compose alpha:
  //  – outside window: opaque dark wall (alpha 1)
  //  – inside window: low alpha so city behind reads through
  //  – frame + mullion: full alpha emissive
  float alpha = (1.0 - inWin) * 1.0 + inWin * 0.04;
  alpha = max(alpha, frameEdge);
  alpha = max(alpha, mullion);

  // Compose colour:
  //  – wall base = uWall (very dark)
  //  – frame + mullion = uFrame * 3.0 (bright neon)
  vec3 col = uWall;
  col = mix(col, uFrame * (2.6 + pulse * 0.6), frameEdge + mullion);

  gl_FragColor = vec4(col, alpha);
}
`;

function WindowsSideWall({ side }: { side: 'left' | 'right' }) {
  const uniforms = useMemo<{
    uFrame: IUniform<Color>;
    uWall: IUniform<Color>;
    uTime: IUniform<number>;
  }>(
    () => ({
      uFrame: { value: new Color(palette.neonGreen) },
      uWall: { value: new Color(palette.darkSurface) },
      uTime: { value: 0 },
    }),
    [],
  );
  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime;
  });

  const position: [number, number, number] =
    side === 'left'
      ? [-ROOM_HALF, ROOM_HEIGHT / 2, 0]
      : [ROOM_HALF, ROOM_HEIGHT / 2, 0];
  const rotation: [number, number, number] =
    side === 'left' ? [0, Math.PI / 2, 0] : [0, -Math.PI / 2, 0];

  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[ROOM_HALF * 2, ROOM_HEIGHT]} />
      <shaderMaterial
        vertexShader={WINDOW_VERT}
        fragmentShader={WINDOW_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={DoubleSide}
      />
    </mesh>
  );
}

/* ──────────────────────────── CITY BACKDROP ─────────────────────────
 * V11.1 — uses /city-backdrop.jpg (user-provided cyberpunk night
 * photo). The shader applies:
 *   • slow horizontal texture scroll (parallax-feel)
 *   • subtle vertical-axis darken + horizon haze
 *   • green ambient tint overlay (matches scene palette)
 *   • mild box blur for "out the window" softness
 * Mirrored: left side flips U so the same photo doesn't look like a
 * mirror of itself across the room.
 */
const CITY_VERT = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const CITY_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uMap;
uniform float uTime;
uniform float uFlip; // 0 or 1 — flip U for the right wall
uniform vec3 uTint;

vec3 sampleSoft(sampler2D tex, vec2 uv) {
  vec2 px = vec2(1.0 / 1024.0);
  vec3 c = vec3(0.0);
  c += texture2D(tex, uv).rgb * 0.40;
  c += texture2D(tex, uv + vec2( px.x,  0.0)).rgb * 0.10;
  c += texture2D(tex, uv + vec2(-px.x,  0.0)).rgb * 0.10;
  c += texture2D(tex, uv + vec2( 0.0,  px.y)).rgb * 0.10;
  c += texture2D(tex, uv + vec2( 0.0, -px.y)).rgb * 0.10;
  c += texture2D(tex, uv + vec2( px.x,  px.y)).rgb * 0.05;
  c += texture2D(tex, uv + vec2(-px.x,  px.y)).rgb * 0.05;
  c += texture2D(tex, uv + vec2( px.x, -px.y)).rgb * 0.05;
  c += texture2D(tex, uv + vec2(-px.x, -px.y)).rgb * 0.05;
  return c;
}

void main() {
  // Optional U flip (so the two side walls don't appear identical).
  vec2 uv = vUv;
  if (uFlip > 0.5) uv.x = 1.0 - uv.x;
  // Slow horizontal scroll.
  uv.x = fract(uv.x + uTime * 0.0008);

  // 9-tap soft-blur sample.
  vec3 col = sampleSoft(uMap, uv);

  // V11.2 — push the overall image toward deep navy (matches reference).
  col = mix(col, col * vec3(0.60, 0.80, 1.20), 0.30);

  // Preserve warm pixel highlights (don't desaturate window lights).
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  if (luma > 0.5) {
    col = mix(col, col * vec3(1.10, 1.00, 0.90), 0.40);
  }

  // Subtle green ambient mixing from the room (very small share).
  col = mix(col, col * vec3(0.85, 1.05, 0.95), 0.18);

  // Reduce overall brightness — city is in the distance.
  col *= 0.75;

  // Horizon glow band — a thin warmer-greener strip near v=0.45.
  float band = exp(-pow((vUv.y - 0.45) * 6.0, 2.0));
  col += band * vec3(0.02, 0.08, 0.05);

  // Vignette so the edges feel further away.
  vec2 vc = vUv - 0.5;
  float vig = 1.0 - dot(vc, vc) * 0.45;
  col *= vig;

  gl_FragColor = vec4(col, 1.0);
}
`;

function CityBackdrop({ side }: { side: 'left' | 'right' }) {
  const tex = useTexture('/city-backdrop.jpg', (loaded) => {
    if (!Array.isArray(loaded)) {
      loaded.colorSpace = SRGBColorSpace;
      loaded.wrapS = RepeatWrapping;
      loaded.wrapT = RepeatWrapping;
      loaded.anisotropy = 8;
    }
  }) as Texture;

  const uniforms = useMemo<{
    uMap: IUniform<Texture>;
    uTime: IUniform<number>;
    uFlip: IUniform<number>;
    uTint: IUniform<Color>;
  }>(
    () => ({
      uMap: { value: tex },
      uTime: { value: 0 },
      uFlip: { value: side === 'right' ? 1 : 0 },
      uTint: { value: new Color('#A8FFD8') }, // very soft green tint
    }),
    [tex, side],
  );
  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime;
  });

  const x = side === 'left' ? -ROOM_HALF - 1.7 : ROOM_HALF + 1.7;
  const rot: [number, number, number] =
    side === 'left' ? [0, Math.PI / 2, 0] : [0, -Math.PI / 2, 0];

  return (
    <mesh position={[x, ROOM_HEIGHT / 2, 0]} rotation={rot}>
      <planeGeometry args={[30, 14]} />
      <shaderMaterial
        vertexShader={CITY_VERT}
        fragmentShader={CITY_FRAG}
        uniforms={uniforms}
        side={DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

/* ──────────────────────────── CEILING ───────────────────────────── */

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
  vec3 col = uColor * (edge * 0.5 + pulseCell * (1.0 - smoothstep(0.0, 0.42, dist)) * pulse * 0.35);
  float a = edge * 0.45 + pulseCell * pulse * 0.16;
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

  const FIXTURES: readonly [number, number][] = [
    [-4, -2],
    [-2, 2],
    [0, 0],
    [2, 2],
    [4, -2],
  ];

  return (
    <group>
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
      matRef.current.emissiveIntensity =
        1.4 + 0.4 * Math.sin(state.clock.elapsedTime * 1.6 + position[0]);
    }
  });
  return (
    <group position={position}>
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
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.18, 24]} />
        <meshStandardMaterial
          color={palette.textPrimary}
          emissive={palette.textPrimary}
          emissiveIntensity={2.2}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/* ──────────────────────────── CORNER PILLARS ────────────────────── */

function CornerPillars() {
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
          <mesh>
            <cylinderGeometry args={[PILLAR_RADIUS, PILLAR_RADIUS, ROOM_HEIGHT, 16]} />
            <meshStandardMaterial color={palette.darkSurface} metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0, PILLAR_RADIUS + 0.005]}>
            <planeGeometry args={[0.04, ROOM_HEIGHT - 0.2]} />
            <meshStandardMaterial
              color={palette.neonGreen}
              emissive={palette.neonGreen}
              emissiveIntensity={1.5}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[0, ROOM_HEIGHT / 2 - 0.05, 0]}>
            <cylinderGeometry args={[PILLAR_RADIUS + 0.04, PILLAR_RADIUS + 0.02, 0.08, 16]} />
            <meshStandardMaterial color={palette.neonGreen} emissive={palette.neonGreen} emissiveIntensity={1.0} toneMapped={false} />
          </mesh>
          <mesh position={[0, -ROOM_HEIGHT / 2 + 0.05, 0]}>
            <cylinderGeometry args={[PILLAR_RADIUS + 0.04, PILLAR_RADIUS + 0.02, 0.08, 16]} />
            <meshStandardMaterial color={palette.neonGreen} emissive={palette.neonGreen} emissiveIntensity={1.0} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </>
  );
}
