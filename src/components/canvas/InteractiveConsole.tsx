'use client';

import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { useMemo, useRef, useState } from 'react';
import { Color, FrontSide, MeshStandardMaterial, type IUniform } from 'three';
import { play } from '@/lib/audio';
import { usePortfolioStore } from '@/lib/store';
import { palette } from '@/lib/palette';
import { noRaycast } from '@/lib/three-utils';
import { content, type Project, type Station } from '@/lib/content';

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
  const caption = useMemo(
    () => content.projects.find((p) => p.slug === slug)?.caption ?? '',
    [slug],
  );
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
    // eslint-disable-next-line no-console
    console.log('[CONSOLE-CLICK] 1. entered, slug=', slug);
    try {
      play('click_primary');
      // eslint-disable-next-line no-console
      console.log('[CONSOLE-CLICK] 2. audio.play returned');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[CONSOLE-CLICK] audio.play threw:', err);
    }
    try {
      openProject(slug);
      // eslint-disable-next-line no-console
      console.log('[CONSOLE-CLICK] 3. openProject called');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[CONSOLE-CLICK] openProject threw:', err);
    }
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
      {/* Plinth — graphite chassis, handlers bound directly on the mesh. */}
      <mesh
        castShadow
        receiveShadow
        position={[0, -0.25, 0]}
        material={plinthMaterial}
        {...handlers}
      >
        <boxGeometry args={[1.1, 0.5, 0.7]} />
      </mesh>

      {/* Tilted screen sub-group: dim emerald plane + 4-slab gold bezel + on-screen
          title and caption. Handlers ALSO bound on the screen plane mesh —
          two raycastable surfaces, same handler, no group-bubble dependency. */}
      <group position={[0, 0.08, 0.18]} rotation={[-0.45, 0, 0]}>
        <mesh ref={(m) => m?.layers.enable(1)} {...handlers}>
          <planeGeometry args={[0.95, 0.55]} />
          <meshStandardMaterial
            color={palette.graphite}
            emissive={palette.emeraldMid}
            // Reduced from 0.85 → 0.35 so on-screen text reads clearly against
            // the panel instead of fighting the emerald glow.
            emissiveIntensity={hovered ? 0.5 : 0.35}
            roughness={0.25}
            metalness={0.4}
            side={FrontSide}
          />
        </mesh>
        <BezelFrame />

        {/* Title (large) — sits in the top half of the screen. */}
        <Text
          raycast={noRaycast}
          position={[0, 0.12, 0.005]}
          fontSize={0.105}
          color={palette.emeraldGlow}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.14}
          outlineWidth={0.002}
          outlineColor={palette.void}
        >
          {label.toUpperCase()}
        </Text>

        {/* Caption (small) — bottom half, wrapped to screen width minus padding. */}
        <Text
          raycast={noRaycast}
          position={[0, -0.10, 0.005]}
          fontSize={0.046}
          color={palette.bone}
          anchorX="center"
          anchorY="middle"
          maxWidth={0.8}
          textAlign="center"
          lineHeight={1.25}
          letterSpacing={0.04}
        >
          {caption}
        </Text>
      </group>
    </group>
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
