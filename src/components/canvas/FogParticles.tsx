'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { AdditiveBlending, type BufferAttribute, type Points } from 'three';
import { palette } from '@/lib/palette';

const TOTAL = 1500;
const EMERALD_RATIO = 0.15;

/**
 * Two interleaved particle systems — mostly bone-white "fireflies" with a
 * 15% sprinkle of emerald-mid. Each particle drifts upward AND its alpha
 * twinkles on a phase offset for organic feel. Count bumped 700→1500 in
 * V2.4 for atmosphere.
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
  const time = useRef(0);

  // positions + per-particle size variance (Float32 attribute "aSize" interp)
  const positions = useMemo(() => {
    const a = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      a[i * 3 + 0] = (Math.random() - 0.5) * 20;
      a[i * 3 + 1] = Math.random() * 5;
      a[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return a;
  }, [count]);

  const phases = useMemo(() => {
    const a = new Float32Array(count);
    for (let i = 0; i < count; i++) a[i] = Math.random() * Math.PI * 2;
    return a;
  }, [count]);

  useFrame((_, dt) => {
    time.current += dt;
    if (!ref.current) return;
    const attr = ref.current.geometry.getAttribute('position') as BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 1; i < arr.length; i += 3) {
      arr[i] = (arr[i] ?? 0) + dt * 0.12;
      if ((arr[i] ?? 0) > 5) arr[i] = 0;
    }
    attr.needsUpdate = true;
    // Twinkle via global opacity sweep — cheap, no per-vertex attribute.
    const mat = (ref.current.material as { opacity: number }) ?? null;
    if (mat) {
      mat.opacity = opacity * (0.7 + 0.3 * Math.sin(time.current * 1.6));
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aPhase" args={[phases, 1]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color={color}
        transparent
        opacity={opacity}
        sizeAttenuation={true}
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}
