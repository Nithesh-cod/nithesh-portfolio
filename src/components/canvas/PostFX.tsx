'use client';

import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  GodRays,
  ToneMapping,
} from '@react-three/postprocessing';
import { BlendFunction, KernelSize, ToneMappingMode } from 'postprocessing';
import { type ReactElement, useMemo } from 'react';
import { HalfFloatType, type Mesh, Vector2 } from 'three';
import { usePortfolioStore } from '@/lib/store';

/**
 * V9.3 — chain order: Bloom (heavy, threshold 0.65) → GodRays from the
 * capsule's invisible sun mesh → ChromaticAberration (0.0005) → ToneMapping
 * (ACES_FILMIC). LUT dropped — the cyan/green grade comes from the
 * neon-green emissives directly.
 */
export function PostFX({ sunRef }: { sunRef?: React.MutableRefObject<Mesh | null> | React.RefObject<Mesh> }) {
  const perfMode = usePortfolioStore((s) => s.perfMode);
  const caOffset = useMemo(() => new Vector2(0.0005, 0.0005), []);

  if (perfMode === 'low') return null;

  const effects: ReactElement[] = [
    <Bloom
      key="bloom"
      intensity={0.6}
      luminanceThreshold={0.7}
      luminanceSmoothing={0.4}
      mipmapBlur
      kernelSize={KernelSize.LARGE}
    />,
    sunRef?.current ? (
      <GodRays
        key="godrays"
        sun={sunRef.current}
        density={0.96}
        decay={0.94}
        weight={0.5}
        exposure={0.4}
        samples={60}
        clampMax={1.0}
        blendFunction={BlendFunction.SCREEN}
      />
    ) : null,
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
