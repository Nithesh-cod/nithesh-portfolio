'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { AdditiveBlending, type BufferAttribute, type Points } from 'three';
import { palette } from '@/lib/palette';

const TOTAL = 700;
const EMERALD_RATIO = 0.15; // 15% accented; 85% neutral

/**
 * Two interleaved particle systems — mostly bone-white "fireflies" with a
 * 15% sprinkle of emerald-mid. Neutral-dominant on purpose: the "drifting
 * dust in moonlight" feel comes from the bone particles, not green ones.
 */
export function FogParticles() {
  return (
    <>
      <Layer count={Math.round(TOTAL * (1 - EMERALD_RATIO))} color={palette.bone} opacity={0.15} />
      <Layer count={Math.round(TOTAL * EMERALD_RATIO)} color={palette.emeraldMid} opacity={0.28} />
    </>
  );
}

function Layer({ count, color, opacity }: { count: number; color: string; opacity: number }) {
  const ref = useRef<Points>(null);

  const positions = useMemo(() => {
    const a = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      a[i * 3 + 0] = (Math.random() - 0.5) * 18;
      a[i * 3 + 1] = Math.random() * 5;
      a[i * 3 + 2] = (Math.random() - 0.5) * 18;
    }
    return a;
  }, [count]);

  useFrame((_, dt) => {
    if (!ref.current) return;
    const attr = ref.current.geometry.getAttribute('position') as BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 1; i < arr.length; i += 3) {
      arr[i] = (arr[i] ?? 0) + dt * 0.12;
      if ((arr[i] ?? 0) > 5) arr[i] = 0;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color={color}
        transparent
        opacity={opacity}
        // sizeAttenuation explicit `true` — points shrink with distance instead
        // of staying screen-sized (which read as huge squares at far waypoints).
        sizeAttenuation={true}
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}
