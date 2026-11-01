'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { Vector3 } from 'three';
import { getPoseAtT } from '@/lib/scene-path';
import { useScrollProgress } from '@/lib/use-scroll-progress';

const LERP_K = 6; // Higher = snappier dock.

/**
 * Proving-slice camera rig: scroll drives t∈[0..1] along the scene path.
 * No OrbitControls, no auto-rotate, no modal focus tweens — the current
 * CameraRig keeps all of that for the default experience.
 */
export function ScrollCameraRig() {
  const { camera } = useThree();
  const t = useScrollProgress();
  const tSmooth = useRef(0);
  const lookAt = useRef(new Vector3(0, 1.5, 0));

  useFrame((_, dt) => {
    const k = 1 - Math.exp(-LERP_K * dt);
    tSmooth.current += (t - tSmooth.current) * k;
    const pose = getPoseAtT(tSmooth.current);
    camera.position.lerp(pose.camera, k);
    lookAt.current.lerp(pose.lookAt, k);
    camera.lookAt(lookAt.current);
  });

  return null;
}
