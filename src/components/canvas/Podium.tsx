'use client';

import { RoundedBox, Text } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useMemo, useRef, type ComponentProps, type ReactNode } from 'react';
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  LatheGeometry,
  Vector2,
  type Group,
  type IUniform,
  type Mesh,
  type MeshStandardMaterial,
} from 'three';
import { palette } from '@/lib/palette';
import { disableRaycast, noRaycast } from '@/lib/three-utils';

/* Realistic exhibit podium parts, shared by ProjectStation and the avatar
 * plinth collar. Everything is procedural: a turned (lathe) body with
 * filleted edges so highlights read like machined metal, clear-coated
 * gunmetal + brushed deck materials, recessed LED channels, floor contact
 * shadow, and hologram / glass-vitrine displays. */

export const BASE_TOP = 0.44;

// drei forwards unknown props to troika's Text, which supports curveRadius;
// drei's typings just don't declare it.
const CurvedText = Text as unknown as (props: ComponentProps<typeof Text> & { curveRadius: number }) => JSX.Element;

/* ─────────────────────────── profile helpers ─────────────────────────── */

/** Replaces each interior corner of a polyline with a small quadratic fillet. */
function filleted(points: readonly [number, number][], radius: number, steps = 3): Vector2[] {
  const out: Vector2[] = [];
  points.forEach((pt, i) => {
    const p = new Vector2(pt[0], pt[1]);
    if (i === 0 || i === points.length - 1) {
      out.push(p);
      return;
    }
    const a = new Vector2(...points[i - 1]!);
    const b = new Vector2(...points[i + 1]!);
    const da = a.clone().sub(p);
    const db = b.clone().sub(p);
    const p1 = p.clone().add(da.multiplyScalar(Math.min(radius / da.length(), 0.5)));
    const p2 = p.clone().add(db.multiplyScalar(Math.min(radius / db.length(), 0.5)));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const u = 1 - t;
      out.push(new Vector2(u * u * p1.x + 2 * u * t * p.x + t * t * p2.x, u * u * p1.y + 2 * u * t * p.y + t * t * p2.y));
    }
  });
  return out;
}

// Half-profile of the pedestal (radius, height), bottom centre → top centre.
const BASE_PROFILE: readonly [number, number][] = [
  [0, 0],
  [0.99, 0],
  [1.0, 0.07],
  [0.95, 0.085],
  [0.95, 0.098],
  [0.925, 0.098], // LED channel
  [0.925, 0.128],
  [0.95, 0.128],
  [0.95, 0.14],
  [0.86, 0.175],
  [0.82, 0.19],
  [0.79, 0.37],
  [0.83, 0.39],
  [0.84, 0.425],
  [0.8, BASE_TOP],
  [0, BASE_TOP],
];

// Low collar ring that wraps the avatar's own pedestal.
const COLLAR_PROFILE: readonly [number, number][] = [
  [1.26, 0.0],
  [1.66, 0.0],
  [1.68, 0.045],
  [1.64, 0.055],
  [1.64, 0.062], // LED channel
  [1.62, 0.062],
  [1.62, 0.085],
  [1.64, 0.085],
  [1.64, 0.095],
  [1.58, 0.12],
  [1.3, 0.12],
  [1.26, 0.1],
];

/* ─────────────────────────── materials ─────────────────────────── */

function GunmetalMaterial({ lowPerf }: { lowPerf: boolean }) {
  return lowPerf ? (
    <meshStandardMaterial color="#0d1416" metalness={0.85} roughness={0.32} envMapIntensity={1.1} />
  ) : (
    <meshPhysicalMaterial
      color="#0b1315"
      metalness={0.88}
      roughness={0.3}
      clearcoat={1}
      clearcoatRoughness={0.1}
      envMapIntensity={1.25}
    />
  );
}

function LedMaterial({ matRef, intensity = 2.6 }: { matRef?: (m: MeshStandardMaterial | null) => void; intensity?: number }) {
  return (
    <meshStandardMaterial
      ref={matRef}
      color={palette.neonGreen}
      emissive={palette.neonGreen}
      emissiveIntensity={intensity}
      toneMapped={false}
    />
  );
}

/* ─────────────────────────── base pedestal ─────────────────────────── */

type BaseProps = {
  name: string;
  subtitle: string;
  hovered: boolean;
  lowPerf: boolean;
  handlers: PodiumHandlers;
};

export type PodiumHandlers = {
  onPointerOver: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut: (e: ThreeEvent<PointerEvent>) => void;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
};

export function PodiumBase({ name, subtitle, hovered, lowPerf, handlers }: BaseProps) {
  const body = useMemo(() => new LatheGeometry(filleted(BASE_PROFILE, 0.012), lowPerf ? 48 : 96), [lowPerf]);
  const leds = useRef<(MeshStandardMaterial | null)[]>([]);
  const glow = useRef(0);

  useFrame((_, dt) => {
    glow.current += ((hovered ? 1 : 0) - glow.current) * Math.min(1, dt * 6);
    const base = 2.4 + glow.current * 2.2;
    leds.current.forEach((m, i) => {
      if (m) m.emissiveIntensity = i === 0 ? base : base * 0.7;
    });
  });

  return (
    <group>
      <FloorGrounding radius={1.0} hovered={hovered} />

      {/* Turned body — the click target. */}
      <mesh geometry={body} castShadow receiveShadow {...handlers}>
        <GunmetalMaterial lowPerf={lowPerf} />
      </mesh>

      {/* Brushed deck inlay + inset light line. */}
      <mesh position={[0, BASE_TOP + 0.0015, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRaycast}>
        <circleGeometry args={[0.7, lowPerf ? 48 : 96]} />
        <meshPhysicalMaterial color="#1b2427" metalness={1} roughness={0.36} anisotropy={0.7} envMapIntensity={1.1} />
      </mesh>
      <mesh position={[0, BASE_TOP + 0.002, 0]} rotation={[Math.PI / 2, 0, 0]} raycast={noRaycast}>
        <torusGeometry args={[0.74, 0.006, 8, 96]} />
        <LedMaterial matRef={(m) => { leds.current[1] = m; }} />
      </mesh>

      {/* LED strip recessed in the lower channel. */}
      <mesh position={[0, 0.113, 0]} rotation={[Math.PI / 2, 0, 0]} raycast={noRaycast}>
        <torusGeometry args={[0.938, 0.011, 10, 128]} />
        <LedMaterial matRef={(m) => { leds.current[0] = m; }} />
      </mesh>

      {/* Engraved labels wrapping the curved body. */}
      <CurvedText
        raycast={noRaycast}
        ref={disableRaycast}
        position={[0, 0.285, 0.808]}
        curveRadius={-0.808}
        fontSize={0.078}
        letterSpacing={0.2}
        color={palette.neonBright}
        outlineWidth={0.0015}
        outlineColor={palette.neonGreen}
        anchorX="center"
        anchorY="middle"
      >
        {name.toUpperCase()}
      </CurvedText>
      <CurvedText
        raycast={noRaycast}
        ref={disableRaycast}
        position={[0, 0.218, 0.813]}
        curveRadius={-0.813}
        fontSize={0.032}
        letterSpacing={0.22}
        color={palette.textSecondary}
        anchorX="center"
        anchorY="middle"
      >
        {subtitle}
      </CurvedText>
      <CurvedText
        raycast={noRaycast}
        ref={disableRaycast}
        position={[0, 0.407, 0.846]}
        curveRadius={-0.846}
        fontSize={0.026}
        letterSpacing={0.26}
        color={hovered ? '#EFFFF6' : palette.neonGreen}
        anchorX="center"
        anchorY="middle"
      >
        VIEW PROJECT  →
      </CurvedText>
    </group>
  );
}

/** Low turned collar with an LED channel, for the avatar's own pedestal. */
export function PlinthCollar({ lowPerf }: { lowPerf: boolean }) {
  const geo = useMemo(() => new LatheGeometry(filleted(COLLAR_PROFILE, 0.01), lowPerf ? 64 : 128), [lowPerf]);
  return (
    <group>
      <FloorGrounding radius={1.66} hovered={false} />
      <mesh geometry={geo} receiveShadow raycast={noRaycast}>
        <GunmetalMaterial lowPerf={lowPerf} />
      </mesh>
      <mesh position={[0, 0.0735, 0]} rotation={[Math.PI / 2, 0, 0]} raycast={noRaycast}>
        <torusGeometry args={[1.63, 0.01, 10, 160]} />
        <LedMaterial intensity={2.2} />
      </mesh>
      <mesh position={[0, 0.122, 0]} rotation={[Math.PI / 2, 0, 0]} raycast={noRaycast}>
        <torusGeometry args={[1.44, 0.005, 8, 160]} />
        <LedMaterial intensity={1.4} />
      </mesh>
    </group>
  );
}

/* ─────────────────────────── floor grounding ─────────────────────────── */

const DECAL_VERT = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const SHADOW_FRAG = /* glsl */ `
varying vec2 vUv;
uniform float uInner;
void main(){
  float r = length(vUv - 0.5) * 2.0;           // 0 centre → 1 rim of the decal
  float a = 0.62 * (1.0 - smoothstep(uInner, 1.0, r));
  gl_FragColor = vec4(0.0, 0.0, 0.0, a);
}`;

const POOL_FRAG = /* glsl */ `
varying vec2 vUv;
uniform vec3 uColor;
uniform float uEdge;
uniform float uBoost;
void main(){
  float r = length(vUv - 0.5) * 2.0;
  float pool = exp(-pow((r - uEdge) / 0.16, 2.0)) * step(uEdge - 0.05, r);
  float a = pool * (0.42 + uBoost * 0.35);
  gl_FragColor = vec4(uColor * a, a);
}`;

/** Contact shadow under the base plus a soft green light pool around its foot. */
function FloorGrounding({ radius, hovered }: { radius: number; hovered: boolean }) {
  const D = radius * 1.75;
  const shadowUniforms = useMemo<Record<string, IUniform>>(() => ({ uInner: { value: (radius * 0.9) / D } }), [radius, D]);
  const poolUniforms = useMemo<Record<string, IUniform>>(
    () => ({ uColor: { value: new Color(palette.neonGreen) }, uEdge: { value: radius / D }, uBoost: { value: 0 } }),
    [radius, D],
  );
  useFrame((_, dt) => {
    const u = poolUniforms.uBoost!;
    u.value += ((hovered ? 1 : 0) - u.value) * Math.min(1, dt * 5);
  });
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} raycast={noRaycast}>
        <planeGeometry args={[D, D]} />
        <shaderMaterial vertexShader={DECAL_VERT} fragmentShader={SHADOW_FRAG} uniforms={shadowUniforms} transparent depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} raycast={noRaycast}>
        <planeGeometry args={[D, D]} />
        <shaderMaterial
          vertexShader={DECAL_VERT}
          fragmentShader={POOL_FRAG}
          uniforms={poolUniforms}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

/* ─────────────────────────── hologram material ─────────────────────────── */

const HOLO_VERT = /* glsl */ `
varying vec3 vNormalW;
varying vec3 vPosW;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vPosW = w.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const HOLO_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uTime;
uniform float uIntensity;
varying vec3 vNormalW;
varying vec3 vPosW;
void main(){
  vec3 V = normalize(cameraPosition - vPosW);
  float fres = pow(1.0 - abs(dot(normalize(vNormalW), V)), 2.2);
  float scan = 0.7 + 0.3 * sin(vPosW.y * 140.0 - uTime * 7.0);
  float flicker = 0.93 + 0.07 * sin(uTime * 41.0) * sin(uTime * 17.0);
  float a = (0.10 + fres * 0.95) * scan * flicker * uIntensity;
  gl_FragColor = vec4(uColor * (0.55 + fres * 1.9), a);
}`;

/** Fresnel + scanline hologram material; pass `wireframe` for the lattice overlay. */
export function HoloMaterial({ intensity = 1, wireframe = false }: { intensity?: number; wireframe?: boolean }) {
  const uniforms = useMemo<Record<string, IUniform>>(
    () => ({ uColor: { value: new Color(palette.neonBright) }, uTime: { value: 0 }, uIntensity: { value: intensity } }),
    [intensity],
  );
  useFrame((s) => {
    uniforms.uTime!.value = s.clock.elapsedTime;
  });
  return (
    <shaderMaterial
      vertexShader={HOLO_VERT}
      fragmentShader={HOLO_FRAG}
      uniforms={uniforms}
      transparent
      depthWrite={false}
      blending={AdditiveBlending}
      side={DoubleSide}
      wireframe={wireframe}
    />
  );
}

/* ─────────────────────────── hologram projector ─────────────────────────── */

const CONE_FRAG = /* glsl */ `
varying vec2 vUv;
uniform float uTime;
uniform vec3 uColor;
uniform float uBoost;
void main(){
  float fade = pow(1.0 - vUv.y, 1.7);                       // bright at the emitter
  float streak = 0.72 + 0.28 * sin(vUv.x * 70.0 + uTime * 1.6);
  float scan = 0.82 + 0.18 * sin(vUv.y * 46.0 - uTime * 4.0);
  float a = fade * 0.42 * streak * scan * (1.0 + uBoost * 0.6);
  gl_FragColor = vec4(uColor * a, a);
}`;

/** Emitter lens on the deck, a projection light cone, and two rising scan rings. */
export function HoloProjector({ height, topRadius, hovered }: { height: number; topRadius: number; hovered: boolean }) {
  const uniforms = useMemo<Record<string, IUniform>>(
    () => ({ uTime: { value: 0 }, uColor: { value: new Color(palette.neonBright) }, uBoost: { value: 0 } }),
    [],
  );
  const rings = useRef<(Mesh | null)[]>([]);
  useFrame((s, dt) => {
    uniforms.uTime!.value = s.clock.elapsedTime;
    const b = uniforms.uBoost!;
    b.value += ((hovered ? 1 : 0) - b.value) * Math.min(1, dt * 5);
    rings.current.forEach((r, i) => {
      if (!r) return;
      const t = (s.clock.elapsedTime * 0.35 + i * 0.5) % 1;
      r.position.y = BASE_TOP + 0.04 + t * height;
      const rad = 0.2 + (topRadius - 0.2) * t;
      r.scale.setScalar(rad);
      (r.material as MeshStandardMaterial).opacity = Math.sin(t * Math.PI) * 0.55;
    });
  });

  return (
    <group>
      {/* Emitter: metal collar + glowing lens. */}
      <mesh position={[0, BASE_TOP + 0.02, 0]} raycast={noRaycast}>
        <cylinderGeometry args={[0.27, 0.3, 0.04, 48]} />
        <meshPhysicalMaterial color="#121b1d" metalness={1} roughness={0.25} clearcoat={1} />
      </mesh>
      <mesh position={[0, BASE_TOP + 0.042, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRaycast}>
        <circleGeometry args={[0.2, 48]} />
        <meshStandardMaterial color={palette.neonBright} emissive={palette.neonBright} emissiveIntensity={2.6} toneMapped={false} />
      </mesh>
      <mesh position={[0, BASE_TOP + 0.043, 0]} rotation={[Math.PI / 2, 0, 0]} raycast={noRaycast}>
        <torusGeometry args={[0.235, 0.008, 8, 64]} />
        <LedMaterial intensity={3} />
      </mesh>

      {/* Projection cone. */}
      <mesh position={[0, BASE_TOP + 0.04 + height / 2, 0]} raycast={noRaycast}>
        <cylinderGeometry args={[topRadius, 0.2, height, 64, 1, true]} />
        <shaderMaterial
          vertexShader={DECAL_VERT}
          fragmentShader={CONE_FRAG}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          side={DoubleSide}
        />
      </mesh>

      {/* Rising scan rings. */}
      {[0, 1].map((i) => (
        <mesh key={i} ref={(m) => { rings.current[i] = m; }} rotation={[Math.PI / 2, 0, 0]} raycast={noRaycast}>
          <torusGeometry args={[1, 0.006, 6, 96]} />
          <meshStandardMaterial
            color={palette.neonBright}
            emissive={palette.neonBright}
            emissiveIntensity={2}
            transparent
            opacity={0.4}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ─────────────────────────── glass vitrine ─────────────────────────── */

const CASE_W = 1.06;
const CASE_H = 0.94;

/** Museum display case: transmissive glass box, chrome corner posts, a
 *  gunmetal lid with an LED strip lighting the exhibit from above. */
export function Vitrine({ lowPerf, hovered, children }: { lowPerf: boolean; hovered: boolean; children: ReactNode }) {
  const y0 = BASE_TOP;
  const half = CASE_W / 2 - 0.012;
  const lidLed = useRef<MeshStandardMaterial | null>(null);
  useFrame(() => {
    if (lidLed.current) lidLed.current.emissiveIntensity = hovered ? 3.4 : 2.4;
  });

  return (
    <group>
      {/* Glass. depthWrite off so the hologram inside still draws. */}
      <RoundedBox args={[CASE_W, CASE_H, CASE_W]} radius={0.025} smoothness={3} position={[0, y0 + CASE_H / 2, 0]} raycast={noRaycast}>
        {lowPerf ? (
          <meshPhysicalMaterial color="#bff5dd" transparent opacity={0.16} roughness={0.05} metalness={0} clearcoat={1} depthWrite={false} />
        ) : (
          <meshPhysicalMaterial
            color="#e6fff3"
            transmission={1}
            thickness={0.08}
            roughness={0.04}
            ior={1.5}
            clearcoat={1}
            clearcoatRoughness={0.03}
            attenuationColor="#8fffd0"
            attenuationDistance={1.6}
            envMapIntensity={1.4}
            transparent
            depthWrite={false}
          />
        )}
      </RoundedBox>

      {/* Chrome corner posts — a faint self-lit tint so they read as lit
          metal against the dark room instead of black lines. */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => (
        <mesh key={`${sx}${sz}`} position={[sx! * half, y0 + CASE_H / 2, sz! * half]} raycast={noRaycast}>
          <boxGeometry args={[0.026, CASE_H, 0.026]} />
          <meshPhysicalMaterial
            color="#e6f1ef"
            metalness={1}
            roughness={0.1}
            clearcoat={1}
            envMapIntensity={2.2}
            emissive="#bfe9da"
            emissiveIntensity={0.18}
          />
        </mesh>
      ))}

      {/* Glass edge highlights + a diagonal reflection streak on each pane. */}
      <GlassEdges half={half} y0={y0} />
      {[0, 1, 2, 3].map((i) => (
        <group key={i} rotation={[0, (i * Math.PI) / 2, 0]}>
          <mesh position={[0, y0 + CASE_H / 2, half + 0.003]} raycast={noRaycast}>
            <planeGeometry args={[CASE_W - 0.05, CASE_H - 0.04]} />
            <shaderMaterial
              vertexShader={DECAL_VERT}
              fragmentShader={SHEEN_FRAG}
              transparent
              depthWrite={false}
              blending={AdditiveBlending}
            />
          </mesh>
        </group>
      ))}

      {/* Lid + downward LED strip. */}
      <RoundedBox args={[CASE_W + 0.08, 0.07, CASE_W + 0.08]} radius={0.02} smoothness={3} position={[0, y0 + CASE_H + 0.035, 0]} raycast={noRaycast}>
        <GunmetalMaterial lowPerf={lowPerf} />
      </RoundedBox>
      <mesh position={[0, y0 + CASE_H - 0.004, 0]} rotation={[Math.PI / 2, 0, 0]} raycast={noRaycast}>
        <ringGeometry args={[half - 0.05, half - 0.02, 4, 1, Math.PI / 4]} />
        <meshStandardMaterial
          ref={lidLed}
          color={palette.neonBright}
          emissive={palette.neonBright}
          emissiveIntensity={2.4}
          toneMapped={false}
          side={DoubleSide}
        />
      </mesh>

      {children}
    </group>
  );
}

const SHEEN_FRAG = /* glsl */ `
varying vec2 vUv;
void main(){
  // Two soft diagonal streaks, the way light catches a real glass pane.
  float d = vUv.x * 0.8 + vUv.y;
  float s1 = exp(-pow((d - 0.62) / 0.06, 2.0)) * 0.10;
  float s2 = exp(-pow((d - 0.80) / 0.025, 2.0)) * 0.07;
  float edgeFade = smoothstep(0.0, 0.08, vUv.y) * smoothstep(1.0, 0.85, vUv.y);
  float a = (s1 + s2) * edgeFade;
  gl_FragColor = vec4(vec3(0.85, 1.0, 0.95) * a, a);
}`;

/** Thin bright lines along the glass box's top and bottom edges. */
function GlassEdges({ half, y0 }: { half: number; y0: number }) {
  const edge = (
    <meshBasicMaterial color="#d8fff0" transparent opacity={0.55} toneMapped={false} depthWrite={false} />
  );
  return (
    <group>
      {[y0 + 0.004, y0 + CASE_H - 0.004].map((y) =>
        [0, 1, 2, 3].map((i) => (
          <group key={`${y}-${i}`} rotation={[0, (i * Math.PI) / 2, 0]}>
            <mesh position={[0, y, half]} raycast={noRaycast}>
              <boxGeometry args={[CASE_W - 0.03, 0.006, 0.006]} />
              {edge}
            </mesh>
          </group>
        )),
      )}
    </group>
  );
}

/* ─────────────────────────── floating exhibit ─────────────────────────── */

/** Slowly turning, gently floating group for hologram content. */
export function FloatingExhibit({ y, phase, hovered, children }: { y: number; phase: number; hovered: boolean; children: ReactNode }) {
  const ref = useRef<Group | null>(null);
  const lift = useRef(0);
  useFrame((s, dt) => {
    if (!ref.current) return;
    lift.current += ((hovered ? 0.06 : 0) - lift.current) * Math.min(1, dt * 5);
    const t = s.clock.elapsedTime + phase;
    ref.current.position.y = y + Math.sin(t * 0.9) * 0.025 + lift.current;
    ref.current.rotation.y += dt * (hovered ? 0.9 : 0.45);
  });
  return <group ref={ref} position={[0, y, 0]}>{children}</group>;
}
