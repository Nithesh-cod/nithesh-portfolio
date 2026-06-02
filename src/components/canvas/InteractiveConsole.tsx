'use client';

import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { useMemo, useRef, useState } from 'react';
import { Color, FrontSide, MeshStandardMaterial, type IUniform } from 'three';
import { play } from '@/lib/audio';
import { usePortfolioStore } from '@/lib/store';
import { palette } from '@/lib/palette';
import { disableRaycast, noRaycast } from '@/lib/three-utils';
import type { Project, Station } from '@/lib/content';

type RimUniforms = {
  uHovered: { value: number };
  uTime: { value: number };
  uRimColor: { value: Color };
};

/**
 * One project console: plinth + tilted emissive screen + hover floating label.
 *
 * The plinth's MeshStandardMaterial is patched via onBeforeCompile to add a
 * fresnel-based rim term modulated by uHovered (0→1 lerp on hover) and a slow
 * breathing pulse on uTime. Patching beats a full custom shader here because
 * we keep PBR shadow + light contributions intact.
 */
export function InteractiveConsole({
  slug,
  label,
  position,
}: {
  slug: Project['slug'];
  label: string;
  position: Station['position'];
}) {
  const [hovered, setHovered] = useState(false);
  const openProject = usePortfolioStore((s) => s.openProject);
  const setCursorState = usePortfolioStore((s) => s.setCursorState);
  // Pointerover can re-fire as the cursor crosses child meshes within the group;
  // a 150ms throttle stops the hover sprite from re-triggering every few pixels
  // and exhausting Howler's HTML5 pool.
  const lastHoverAt = useRef(0);

  // Per-console material instance with patched standard shader.
  const { plinthMaterial, uniforms } = useMemo(() => {
    const u: RimUniforms = {
      uHovered: { value: 0 },
      uTime: { value: 0 },
      uRimColor: { value: new Color(palette.emeraldHot) },
    };
    const mat = new MeshStandardMaterial({
      color: palette.graphite,
      roughness: 0.35,
      metalness: 0.85,
    });
    mat.onBeforeCompile = (shader) => {
      // Promote our locals to actual uniforms — share references with the React side
      // so useFrame updates feed straight into the GLSL.
      (shader.uniforms as Record<string, IUniform>).uHovered = u.uHovered;
      (shader.uniforms as Record<string, IUniform>).uTime = u.uTime;
      (shader.uniforms as Record<string, IUniform>).uRimColor = u.uRimColor;

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
           uniform float uHovered;
           uniform float uTime;
           uniform vec3 uRimColor;`,
        )
        .replace(
          '#include <dithering_fragment>',
          `#include <dithering_fragment>
           // Fresnel from view-space normal + view position.
           vec3 N = normalize(vNormal);
           vec3 V = normalize(vViewPosition);
           float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.5);
           // Breathing pulse so the rim feels alive, not static.
           float pulse = 0.65 + 0.35 * sin(uTime * 2.4);
           gl_FragColor.rgb += uRimColor * fres * uHovered * pulse * 1.7;`,
        );
    };
    return { plinthMaterial: mat, uniforms: u };
  }, []);

  useFrame((_, dt) => {
    uniforms.uTime.value += dt;
    const target = hovered ? 1 : 0;
    uniforms.uHovered.value += (target - uniforms.uHovered.value) * Math.min(1, dt * 6);
  });

  const handleOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    setCursorState('interactive');
    const now = performance.now();
    if (now - lastHoverAt.current < 150) return;
    lastHoverAt.current = now;
    play('hover');
  };

  const handleOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(false);
    setCursorState('idle');
  };

  const handleDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setCursorState('pressed');
  };

  const handleUp = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setCursorState(hovered ? 'interactive' : 'idle');
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    play('click_primary');
    openProject(slug);
  };

  // Per spec FIX 1 STEP 1.2 OUTCOME B: handlers belong on the actual mesh
  // with geometry, NOT on the parent <group>. Bubbling-via-group was the
  // most likely path missing after the noRaycast sweep.
  const handlers = {
    onPointerOver: handleOver,
    onPointerOut: handleOut,
    onPointerDown: handleDown,
    onPointerUp: handleUp,
    onClick: handleClick,
  } as const;

  return (
    <group position={position}>
      {/* V2.6: STEPPED plinth — narrower body + slightly wider top "lid" that
          overhangs by ~5%. Reads as furniture, not a single block.
          Body (bottom): 1.0 × 0.42 × 0.62
          Lid  (top):    1.10 × 0.04 × 0.72   ← overhang on all sides
          Lid top surface ends at y = -0.07; the screen sits well above it. */}
      <mesh
        castShadow
        receiveShadow
        position={[0, -0.30, 0]}
        material={plinthMaterial}
        {...handlers}
      >
        <boxGeometry args={[1.0, 0.42, 0.62]} />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        position={[0, -0.07, 0]}
        {...handlers}
      >
        <boxGeometry args={[1.10, 0.04, 0.72]} />
        <meshStandardMaterial color={palette.steel} metalness={0.9} roughness={0.35} />
      </mesh>

      {/* V6.0 — thin gold inlay strip running along the front top edge of
          the lid. Reads as a premium chrome accent. */}
      <mesh position={[0, -0.052, 0.72 / 2 + 0.001]}>
        <boxGeometry args={[1.06, 0.005, 0.005]} />
        <meshStandardMaterial
          color={palette.goldAccent}
          emissive={palette.goldAccent}
          emissiveIntensity={0.8}
          metalness={0.95}
          roughness={0.2}
        />
      </mesh>

      {/* Front-face LED row — 4 emerald dots near the top of the body. */}
      <PlinthLedRow z={0.62 / 2 + 0.001} />
      {/* Rear-face LED row — same colour, visible from the orbit-back waypoint. */}
      <PlinthLedRow z={-(0.62 / 2 + 0.001)} />

      {/* Tilted screen sub-group: dim emerald plane + 4-slab gold bezel + the
          project name (centred, large, stylized).
          V2.6 fix: tilt -0.7 rad (~ -40°, up from -0.45) and lift to y=0.30 so
          the screen's bottom edge clears the plinth lid (which sits at -0.05). */}
      <group position={[0, 0.30, 0.20]} rotation={[-0.7, 0, 0]}>
        <mesh ref={(m) => m?.layers.enable(1)} {...handlers}>
          <planeGeometry args={[0.95, 0.55]} />
          <meshStandardMaterial
            color={palette.graphite}
            emissive={palette.emeraldMid}
            emissiveIntensity={hovered ? 0.5 : 0.3}
            roughness={0.25}
            metalness={0.4}
            side={FrontSide}
          />
        </mesh>
        <BezelFrame />

        {/* Project name — DEFAULT troika font (no `font` prop). The earlier
            attempts to load Orbitron failed: local TTF was corrupted, and
            gstatic serves WOFF2 to modern UAs via content-negotiation which
            troika-three-text can't parse. The default sans is fine — we lean
            on aggressive styling (wide tracking, thick gold outline, gold
            corner brackets, gold underline) to carry the sci-fi feel.
            Orbitron still ships for DOM use via next/font in layout.tsx. */}
        <Text
          raycast={noRaycast}
          ref={disableRaycast}
          // V2.5: y=0 (true centre) now the underline mesh is gone.
          position={[0, 0, 0.006]}
          fontSize={0.13}
          // V6.0 — slight warm tint instead of pure emerald glow; outline
          // gold at 60 % opacity (=goldAccent with 0.003 width).
          color="#FFF6E0"
          anchorX="center"
          anchorY="middle"
          maxWidth={0.85}
          textAlign="center"
          lineHeight={1.0}
          letterSpacing={0.16}
          outlineWidth={0.003}
          outlineColor={palette.goldAccent}
          outlineOpacity={0.6}
        >
          {label.toUpperCase()}
        </Text>

        {/* Targeting-reticle corner brackets — 4 gold L-shapes at each screen corner. */}
        <ScreenCornerBrackets />
      </group>
    </group>
  );
}

/** 4 small emissive LED dots in a row across one face of the plinth body. */
function PlinthLedRow({ z }: { z: number }) {
  // Four positions across X, centred about 0. y is just below the lid line.
  const xs = [-0.27, -0.09, 0.09, 0.27];
  return (
    <group position={[0, -0.13, z]}>
      {xs.map((x, i) => (
        <mesh key={i} position={[x, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 0.005, 12]} />
          <meshStandardMaterial
            color={palette.emeraldMid}
            emissive={palette.emeraldMid}
            emissiveIntensity={1.0}
            metalness={0.2}
            roughness={0.4}
          />
        </mesh>
      ))}
    </group>
  );
}

/** 4 L-shaped gold corner brackets at the console screen edges. */
function ScreenCornerBrackets() {
  // Screen is 0.95 × 0.55 centred at local (0,0). Brackets inset slightly inside.
  const W = 0.95;
  const H = 0.55;
  const L = 0.08; // bracket arm length
  const T = 0.012; // bracket thickness
  const Z = 0.007;
  const matProps = {
    color: palette.goldAccent,
    emissive: palette.goldAccent,
    emissiveIntensity: 1.2,
    metalness: 0.95,
    roughness: 0.25,
  } as const;
  // Build 4 corners, each with 1 horizontal arm + 1 vertical arm.
  // sx, sy = sign for x and y (-1 or +1)
  const corners: readonly [number, number][] = [
    [-1, 1],
    [1, 1],
    [-1, -1],
    [1, -1],
  ];
  return (
    <>
      {corners.map(([sx, sy]) => {
        const xOuter = (sx * (W / 2 - L / 2));
        const yOuter = (sy * (H / 2 - T / 2));
        const xInner = (sx * (W / 2 - T / 2));
        const yInner = (sy * (H / 2 - L / 2));
        return (
          <group key={`${sx}_${sy}`}>
            {/* horizontal arm */}
            <mesh position={[xOuter, yOuter, Z]}>
              <planeGeometry args={[L, T]} />
              <meshStandardMaterial {...matProps} />
            </mesh>
            {/* vertical arm */}
            <mesh position={[xInner, yInner, Z]}>
              <planeGeometry args={[T, L]} />
              <meshStandardMaterial {...matProps} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

/** Four thin gold slabs hugging the 0.95×0.55 console screen. Strictly rectangular. */
function BezelFrame() {
  const W = 0.99;
  const H = 0.59;
  const T = 0.022;
  const Z = -0.002;
  const mat = {
    color: palette.goldAccent,
    metalness: 0.95,
    roughness: 0.25,
    emissive: palette.goldAccent,
    emissiveIntensity: 0.2,
    side: FrontSide,
  } as const;
  return (
    <>
      <mesh position={[0, H / 2, Z]}>
        <boxGeometry args={[W, T, 0.005]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      <mesh position={[0, -H / 2, Z]}>
        <boxGeometry args={[W, T, 0.005]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      <mesh position={[-W / 2, 0, Z]}>
        <boxGeometry args={[T, H, 0.005]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      <mesh position={[W / 2, 0, Z]}>
        <boxGeometry args={[T, H, 0.005]} />
        <meshStandardMaterial {...mat} />
      </mesh>
    </>
  );
}
