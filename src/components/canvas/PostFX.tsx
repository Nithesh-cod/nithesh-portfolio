'use client';

import {
  Bloom,
  BrightnessContrast,
  ChromaticAberration,
  EffectComposer,
  HueSaturation,
  ToneMapping,
} from '@react-three/postprocessing';
import { BlendFunction, KernelSize, ToneMappingMode } from 'postprocessing';
import { type ReactElement, useMemo } from 'react';
import { HalfFloatType, Vector2 } from 'three';
import { usePortfolioStore } from '@/lib/store';

/**
 * Chain: Bloom (emissives only, threshold 0.85) → colour grade →
 * near-zero ChromaticAberration → ACES tone mapping. No god rays: they
 * radiated from the avatar's chest and smeared the statue.
 */
export function PostFX() {
  const perfMode = usePortfolioStore((s) => s.perfMode);
  // V11.2 — chromatic aberration nearly off; reference is sharp.
  const caOffset = useMemo(() => new Vector2(0.0001, 0.0001), []);

  if (perfMode === 'low') return null;

  const effects: ReactElement[] = [
    <Bloom
      key="bloom"
      intensity={0.25}
      luminanceThreshold={0.85}
      luminanceSmoothing={0.40}
      mipmapBlur
      kernelSize={KernelSize.MEDIUM}
    />,
    // V11.2 — gentle colour grading. Saturation -8 %, contrast +12 %.
    <HueSaturation key="hs" saturation={-0.08} hue={0.02} />,
    <BrightnessContrast key="bc" brightness={-0.02} contrast={0.12} />,
    <ChromaticAberration
      key="ca"
      offset={caOffset}
      radialModulation={false}
      modulationOffset={0}
      blendFunction={BlendFunction.NORMAL}
    />,
    <ToneMapping key="tm" mode={ToneMappingMode.ACES_FILMIC} />,
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
