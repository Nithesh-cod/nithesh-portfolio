'use client';

import {
  Bloom,
  DepthOfField,
  EffectComposer,
  LUT,
  ToneMapping,
} from '@react-three/postprocessing';
import { BlendFunction, KernelSize, ToneMappingMode } from 'postprocessing';
import { type ReactElement, useMemo } from 'react';
import { HalfFloatType } from 'three';
import { buildEmeraldLut } from '@/lib/lut';
import { usePortfolioStore } from '@/lib/store';
import { waypoints } from '@/lib/content';

/**
 * V7.0 — refined chain. Noise + ChromaticAberration + Vignette deleted
 * (glass handles its own CA, radial floor fade does the vignette job,
 * film grain reads dated). Bloom soft, ToneMapping ACES, LUT for warm-
 * cool grade. DoF still gated to cinematic tier.
 */
export function PostFX() {
  const perfMode = usePortfolioStore((s) => s.perfMode);
  const section = usePortfolioStore((s) => s.section);

  const lutTexture = useMemo(() => buildEmeraldLut(32), []);

  if (perfMode === 'low') return null;

  const tProgress = section / Math.max(1, waypoints.length - 1);
  const focusDistance = 0.005 + tProgress * 0.045;
  const cinematic = perfMode === 'cinematic';

  const effects: ReactElement[] = [
    <Bloom
      key="bloom"
      intensity={0.22}
      luminanceThreshold={0.85}
      luminanceSmoothing={0.2}
      radius={0.4}
      mipmapBlur
      kernelSize={KernelSize.SMALL}
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
