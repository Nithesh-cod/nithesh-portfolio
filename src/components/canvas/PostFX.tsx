'use client';

import {
  Bloom,
  ChromaticAberration,
  DepthOfField,
  EffectComposer,
  LUT,
  Noise,
  ToneMapping,
  Vignette,
} from '@react-three/postprocessing';
import { BlendFunction, KernelSize, ToneMappingMode } from 'postprocessing';
import { type ReactElement, useMemo } from 'react';
import { HalfFloatType, Vector2 } from 'three';
import { buildEmeraldLut } from '@/lib/lut';
import { usePortfolioStore } from '@/lib/store';
import { waypoints } from '@/lib/content';

/**
 * Cinematic post chain.
 *   Bloom (0.22 / 0.95 / radius 0.35)  →  ChromaticAberration (0.0005)
 *     →  [cinematic only] DepthOfField  →  Noise (0.025)
 *     →  Vignette (0.5 / 0.55)  →  ToneMapping (ACES Filmic)  →  LUT
 *
 * DoF is mounted *only* in cinematic tier. In medium/low tiers the
 * DepthOfField pass is literally absent from the JSX tree — not just
 * inert via bokehScale=0. That was the diagnosis that finally stuck for
 * the `GL_INVALID_OPERATION: glBlitFramebuffer` cascade: even an
 * inert DoF still allocates its depth texture, which ping-pongs with
 * the composer's own depth attachment and triggers the blit conflict.
 *
 * Default tier is now `medium` (see lib/store.ts), so the site ships
 * without DoF for everyone. Users can opt into the cinematic look
 * once a PerfToggle UI exists.
 *
 * Threshold-based "selective bloom": chassis at luma ~0.1 don't clear
 * the 0.95 threshold, only emissive screens / LEDs / hologram bezel
 * do. Cheaper than wrapping every emissive in <Select>.
 */
export function PostFX() {
  const perfMode = usePortfolioStore((s) => s.perfMode);
  const section = usePortfolioStore((s) => s.section);

  const lutTexture = useMemo(() => buildEmeraldLut(32), []);
  const caOffset = useMemo(() => new Vector2(0.0005, 0.0005), []);

  if (perfMode === 'low') return null;

  const tProgress = section / Math.max(1, waypoints.length - 1);
  const focusDistance = 0.005 + tProgress * 0.045;
  const cinematic = perfMode === 'cinematic';

  // Build the children list conditionally — DoF must be absent from the JSX
  // tree, not just bokehScale=0. Type-narrowed filter so React's children
  // type stays JSX.Element[].
  const effects: ReactElement[] = [
    <Bloom
      key="bloom"
      intensity={0.22}
      luminanceThreshold={0.95}
      luminanceSmoothing={0.1}
      radius={0.35}
      mipmapBlur
      kernelSize={KernelSize.SMALL}
    />,
    <ChromaticAberration
      key="ca"
      offset={caOffset}
      radialModulation={false}
      modulationOffset={0}
      blendFunction={BlendFunction.NORMAL}
    />,
    cinematic ? (
      <DepthOfField
        key="dof"
        focusDistance={focusDistance}
        focalLength={0.05}
        bokehScale={2.2}
        blendFunction={BlendFunction.NORMAL}
      />
    ) : null,
    <Noise key="noise" opacity={0.025} blendFunction={BlendFunction.OVERLAY} />,
    <Vignette key="vignette" eskil={false} offset={0.5} darkness={0.55} />,
    <ToneMapping key="tm" mode={ToneMappingMode.ACES_FILMIC} />,
    <LUT key="lut" lut={lutTexture} tetrahedralInterpolation />,
  ].filter((e): e is ReactElement => e !== null);

  return (
    <EffectComposer
      multisampling={0}
      stencilBuffer={false}
      depthBuffer={true}
      enableNormalPass={false}
      frameBufferType={HalfFloatType}
    >
      {effects}
    </EffectComposer>
  );
}
