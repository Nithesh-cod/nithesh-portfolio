'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  type IUniform,
  type MeshStandardMaterial,
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
 * Procedural cyberpunk night skyline. Buildings as vertical columns
 * with random heights, grid of lit windows on each building, three
 * accent colours (warm orange, mint green, cold blue), occasional
 * flicker. Plane is 30w × 14h, mounted 1.7u outside each side wall
 * facing inward. Subtle atmospheric fog between wall + backdrop
 * (handled by Scene-level <fog>) gives the depth-perception sell.
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
uniform float uTime;

float hash(float n){ return fract(sin(n) * 43758.5453); }

void main() {
  // 36 buildings across the plane (×30w world). Roughly 1 building / 0.85u.
  float BLDS = 36.0;
  float bIdx = floor(vUv.x * BLDS);
  float bLocalX = fract(vUv.x * BLDS); // 0..1 inside one building's "slot"

  // Per-building randomness.
  float h0 = hash(bIdx * 17.13);
  float h1 = hash(bIdx * 91.71);

  // Building height (% of plane).
  float bHeight = 0.18 + 0.62 * h0;

  // Slim/wide silhouette — leave a vertical gap on either side of each
  // building so silhouettes read as separate buildings.
  float gapW = 0.08 + 0.10 * h1; // gap fraction
  float bMask = step(gapW, bLocalX) * step(bLocalX, 1.0 - gapW);

  // In-building mask: below building top AND inside silhouette.
  float inBld = step(vUv.y, bHeight) * bMask;

  // Building base colour — dark with vertical fade.
  vec3 bldColor = mix(
    vec3(0.012, 0.018, 0.030),
    vec3(0.030, 0.044, 0.060),
    smoothstep(0.0, bHeight, vUv.y)
  );

  // Window grid inside the building.
  // 8 columns × 22 rows depending on height.
  float WIN_COLS = 8.0;
  float WIN_ROWS = 22.0;
  float winCol = floor(bLocalX * WIN_COLS);
  float winRow = floor(vUv.y / bHeight * WIN_ROWS);
  float winId = winCol + winRow * 23.0 + bIdx * 79.0;

  // Slight gap between window cells so they read as cells.
  float winLocalU = fract(bLocalX * WIN_COLS);
  float winLocalV = fract(vUv.y / bHeight * WIN_ROWS);
  float cellMask = step(0.18, winLocalU) * step(winLocalU, 0.82)
                 * step(0.18, winLocalV) * step(winLocalV, 0.82);

  // ~26 % of cells are lit.
  float winRand = hash(winId * 1.13);
  float winLit = step(0.74, winRand) * cellMask;

  // Window colour — 3 tints.
  float ch = hash(winId * 2.71);
  vec3 winColor;
  if (ch < 0.55)      winColor = vec3(1.00, 0.86, 0.50); // warm tungsten
  else if (ch < 0.85) winColor = vec3(0.50, 1.00, 0.78); // mint green
  else                winColor = vec3(0.55, 0.72, 1.00); // cold blue

  // Flicker ~6 % of windows.
  float flicker = 1.0;
  if (hash(winId * 3.71) > 0.94) {
    flicker = 0.45 + 0.55 * abs(sin(uTime * 6.0 + winId * 11.3));
  }

  // Sky gradient — vertical, deep blue at top, slight glow at horizon.
  vec3 sky = mix(
    vec3(0.020, 0.030, 0.060),
    vec3(0.005, 0.010, 0.024),
    smoothstep(0.40, 1.00, vUv.y)
  );
  // Horizon glow.
  sky += smoothstep(0.55, 0.40, vUv.y) * vec3(0.020, 0.040, 0.080) * 0.6;

  // Stars — very sparse white dots in upper sky.
  float starId = floor(vUv.x * 200.0) + floor(vUv.y * 80.0) * 100.0;
  float starR = hash(starId * 5.37);
  float star = step(0.998, starR) * step(0.60, vUv.y);

  vec3 final = mix(sky, bldColor, inBld);
  final += winLit * winColor * 1.4 * flicker;
  final += star * vec3(0.9, 0.95, 1.0);

  // Distant haze near horizon (smooths city silhouettes).
  float haze = smoothstep(0.0, 0.20, vUv.y) * (1.0 - smoothstep(0.20, 0.50, vUv.y));
  final += haze * vec3(0.08, 0.12, 0.20) * 0.25;

  gl_FragColor = vec4(final, 1.0);
}
`;

function CityBackdrop({ side }: { side: 'left' | 'right' }) {
  const uniforms = useMemo<{ uTime: IUniform<number> }>(
    () => ({ uTime: { value: 0 } }),
    [],
  );
  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime;
  });

  // Mount 1.7u outside the wall (x = ±9.7) facing inward, large enough
  // to cover the full window aperture from any reasonable camera angle.
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
