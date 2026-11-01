'use client';

import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  RepeatWrapping,
  SRGBColorSpace,
  type IUniform,
  type MeshStandardMaterial,
  type Texture,
} from 'three';
import { palette } from '@/lib/palette';
import { noRaycast } from '@/lib/three-utils';

/* Oval exhibit hall: one continuous curved window wall wrapping the back
 * and sides (open toward the camera), a city skyline ribbon behind it,
 * and a dark ceiling with a central halo ring and an oval of downlights.
 * Parametrised on the room ellipse so panels can be laid out along it. */

export const ROOM = {
  rx: 10.5,       // ellipse half-width (x)
  rz: 9.0,        // ellipse half-depth (z)
  cz: -0.5,       // ellipse centre z
  height: 7.0,
  halfArc: 2.05,  // wall spans θ ∈ [-halfArc, halfArc]; θ=0 is straight back
} as const;

/** Point on the room ellipse at angle θ (0 = back centre), scaled by `k`. */
export function ovalPoint(theta: number, k = 1): [number, number] {
  return [ROOM.rx * k * Math.sin(theta), ROOM.cz - ROOM.rz * k * Math.cos(theta)];
}

export function OvalRoom() {
  return (
    <group>
      <CitySkyline />
      <WindowWall />
      <Ceiling />
    </group>
  );
}

/* ──────────────────────────── GEOMETRY ──────────────────────────── */

/** Vertical ribbon along an elliptical arc. uv.x = arc length (world units),
 *  uv.y = height (world units) unless `normalise` maps both to 0..1. */
function ellipseRibbon(
  rx: number,
  rz: number,
  cz: number,
  halfArc: number,
  y0: number,
  y1: number,
  segments: number,
  normalise = false,
): BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  let len = 0;
  let px = 0;
  let pz = 0;
  const lengths: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const th = -halfArc + (2 * halfArc * i) / segments;
    const x = rx * Math.sin(th);
    const z = cz - rz * Math.cos(th);
    if (i > 0) len += Math.hypot(x - px, z - pz);
    px = x;
    pz = z;
    lengths.push(len);
    pos.push(x, y0, z, x, y1, z);
  }
  for (let i = 0; i <= segments; i++) {
    const u = normalise ? lengths[i]! / len : lengths[i]!;
    uv.push(u, normalise ? 0 : y0, u, normalise ? 1 : y1);
  }
  for (let i = 0; i < segments; i++) {
    const a = 2 * i;
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const g = new BufferGeometry();
  g.setIndex(idx);
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

const PASS_VERT = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

/* ──────────────────────────── WINDOW WALL ─────────────────────────── */

const WALL_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;          // x = arc length, y = height (world units)
uniform vec3 uFrame;
uniform vec3 uWall;
uniform float uTime;
uniform float uBayW;
uniform float uHeight;

void main() {
  float bx = mod(vUv.x, uBayW);
  float dx = abs(bx - uBayW * 0.5);
  float y = vUv.y;

  float halfPane = uBayW * 0.5 - 0.06;
  float paneBottom = 0.38;
  float paneTop = uHeight - 0.62;
  float inPane = step(dx, halfPane) * step(paneBottom, y) * step(y, paneTop);

  float edge = min(halfPane - dx, min(y - paneBottom, paneTop - y));
  float frame = inPane * (1.0 - smoothstep(0.0, 0.03, edge));
  float transomY = paneBottom + (paneTop - paneBottom) * 0.74;
  float transom = inPane * (1.0 - smoothstep(0.008, 0.024, abs(y - transomY)));

  float baseStrip = 1.0 - smoothstep(0.0, 0.035, abs(y - 0.20));
  float headStrip = 1.0 - smoothstep(0.0, 0.03, abs(y - (uHeight - 0.32)));
  float pulse = 0.85 + 0.15 * sin(uTime * 0.7);

  // Faint diagonal glass sheen so panes read as glass, not holes.
  float sheen = inPane * 0.05 * (1.0 - smoothstep(0.0, 0.35, abs(fract(vUv.x * 0.11 + y * 0.045) - 0.5)));

  float alpha = mix(1.0, 0.02, inPane);
  alpha = max(alpha, frame * 0.95);
  alpha = max(alpha, transom * 0.85);
  alpha = max(alpha, sheen);

  vec3 col = uWall * (0.75 + 0.5 * smoothstep(0.0, uHeight, y));
  col = mix(col, uFrame * 0.45, frame);
  col = mix(col, uFrame * 0.22, transom);
  col += vec3(0.65, 1.0, 0.85) * sheen;
  col += uFrame * (baseStrip * 1.6 + headStrip * 1.0) * pulse;
  alpha = max(alpha, max(baseStrip, headStrip));

  gl_FragColor = vec4(col, alpha);
}`;

function WindowWall() {
  const geometry = useMemo(
    () => ellipseRibbon(ROOM.rx, ROOM.rz, ROOM.cz, ROOM.halfArc, 0, ROOM.height, 160),
    [],
  );
  const uniforms = useMemo<Record<string, IUniform>>(
    () => ({
      uFrame: { value: new Color(palette.neonGreen) },
      uWall: { value: new Color('#070C10') },
      uTime: { value: 0 },
      uBayW: { value: 2.05 },
      uHeight: { value: ROOM.height },
    }),
    [],
  );
  useFrame((s) => {
    uniforms.uTime!.value = s.clock.elapsedTime;
  });
  return (
    <mesh geometry={geometry} raycast={noRaycast}>
      <shaderMaterial
        vertexShader={PASS_VERT}
        fragmentShader={WALL_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={DoubleSide}
      />
    </mesh>
  );
}

/* ──────────────────────────── CITY SKYLINE ────────────────────────── */

const CITY_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uMap;
uniform float uRepeats;

void main() {
  // Mirrored repeat along the arc so the photo tiles without visible seams.
  float x = vUv.x * uRepeats;
  float m = 1.0 - abs(mod(x, 2.0) - 1.0);
  vec2 uv = vec2(m, vUv.y);

  vec3 col = texture2D(uMap, uv).rgb;
  // Night-blue grade, keep warm window highlights.
  col = mix(col, col * vec3(0.62, 0.82, 1.18), 0.30);
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, col * vec3(1.10, 1.0, 0.90), step(0.5, luma) * 0.4);
  col = mix(col, col * vec3(0.85, 1.05, 0.95), 0.18);
  col *= 1.05;

  // Horizon haze + fade to night at the very top and bottom.
  float band = exp(-pow((vUv.y - 0.42) * 6.0, 2.0));
  col += band * vec3(0.015, 0.06, 0.04);
  col *= smoothstep(0.0, 0.12, vUv.y) * (1.0 - 0.35 * smoothstep(0.75, 1.0, vUv.y));

  gl_FragColor = vec4(col, 1.0);
}`;

function CitySkyline() {
  const tex = useTexture('/city-backdrop.jpg', (t) => {
    if (!Array.isArray(t)) {
      t.colorSpace = SRGBColorSpace;
      t.wrapS = RepeatWrapping;
      t.anisotropy = 8;
    }
  }) as Texture;
  const geometry = useMemo(
    () => ellipseRibbon(ROOM.rx + 4.5, ROOM.rz + 4.5, ROOM.cz, ROOM.halfArc + 0.15, -3, 15, 96, true),
    [],
  );
  const uniforms = useMemo<Record<string, IUniform>>(
    () => ({ uMap: { value: tex }, uRepeats: { value: 3.0 } }),
    [tex],
  );
  return (
    <mesh geometry={geometry} raycast={noRaycast}>
      <shaderMaterial
        vertexShader={PASS_VERT}
        fragmentShader={CITY_FRAG}
        uniforms={uniforms}
        side={DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

/* ──────────────────────────── CEILING ────────────────────────────── */

const DOWNLIGHT_COUNT = 12;

function Ceiling() {
  const haloRef = useRef<MeshStandardMaterial | null>(null);
  const innerRef = useRef<MeshStandardMaterial | null>(null);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (haloRef.current) haloRef.current.emissiveIntensity = 2.0 + 0.35 * Math.sin(t * 1.1);
    if (innerRef.current) innerRef.current.emissiveIntensity = 1.2 + 0.4 * Math.sin(t * 1.1 + 1.4);
  });

  const downlights = useMemo(
    () =>
      Array.from({ length: DOWNLIGHT_COUNT }, (_, i) => {
        const th = -ROOM.halfArc * 0.92 + (2 * ROOM.halfArc * 0.92 * i) / (DOWNLIGHT_COUNT - 1);
        return ovalPoint(th, 0.78);
      }),
    [],
  );

  const H = ROOM.height;
  return (
    <group>
      {/* Ceiling slab, shaped to the room ellipse. */}
      <mesh
        raycast={noRaycast}
        position={[0, H, ROOM.cz]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[ROOM.rx, ROOM.rz, 1]}
      >
        <circleGeometry args={[1, 96]} />
        <meshStandardMaterial color="#05090D" metalness={0.5} roughness={0.55} side={DoubleSide} />
      </mesh>

      {/* Recessed central dome disc + halo rings above the avatar. */}
      <mesh raycast={noRaycast} position={[0, H - 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.55, 64]} />
        <meshStandardMaterial
          color="#081410"
          emissive={palette.neonGreen}
          emissiveIntensity={0.08}
          side={DoubleSide}
        />
      </mesh>
      <mesh raycast={noRaycast} position={[0, H - 0.18, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.6, 0.075, 16, 128]} />
        <meshStandardMaterial
          ref={haloRef}
          color={palette.neonGreen}
          emissive={palette.neonGreen}
          emissiveIntensity={2.0}
          toneMapped={false}
        />
      </mesh>
      <mesh raycast={noRaycast} position={[0, H - 0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.05, 0.03, 12, 128]} />
        <meshStandardMaterial
          ref={innerRef}
          color={palette.neonBright}
          emissive={palette.neonBright}
          emissiveIntensity={1.2}
          toneMapped={false}
        />
      </mesh>
      <mesh raycast={noRaycast} position={[0, H - 0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.4, 0.02, 8, 128]} />
        <meshStandardMaterial
          color={palette.neonGreen}
          emissive={palette.neonGreen}
          emissiveIntensity={0.7}
          toneMapped={false}
        />
      </mesh>

      {/* Oval of recessed downlights following the wall. */}
      {downlights.map(([x, z], i) => (
        <Downlight key={i} position={[x, H - 0.06, z]} />
      ))}
    </group>
  );
}

function Downlight({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh raycast={noRaycast} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.2, 0.022, 10, 32]} />
        <meshStandardMaterial
          color="#1A2A28"
          emissive={palette.neonGreen}
          emissiveIntensity={0.9}
          toneMapped={false}
        />
      </mesh>
      <mesh raycast={noRaycast} position={[0, -0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.15, 24]} />
        <meshStandardMaterial
          color="#EFFFF6"
          emissive="#EFFFF6"
          emissiveIntensity={2.4}
          toneMapped={false}
          side={DoubleSide}
        />
      </mesh>
    </group>
  );
}
