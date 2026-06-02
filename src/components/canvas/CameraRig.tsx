'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Vector3 } from 'three';

const BASE_X = 0;
const BASE_Y = 3.2;
const BASE_Z = 9;
const TARGET = new Vector3(0, 1.4, 0);

/**
 * V9.3 — fixed camera with subtle breathing + mouse parallax.
 * No OrbitControls. Position lerps each frame toward a target derived
 * from time-driven sin/cos + the state.mouse.{x,y} R3F provides.
 */
export function CameraRig() {
  const target = useRef(new Vector3());

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const mouseX = state.mouse.x;
    const mouseY = state.mouse.y;

    target.current.set(
      BASE_X + Math.sin(t * 0.3) * 0.15 + mouseX * 0.25,
      BASE_Y + Math.cos(t * 0.4) * 0.08 + mouseY * 0.15,
      BASE_Z + Math.sin(t * 0.2) * 0.10,
    );
    state.camera.position.lerp(target.current, 0.04);
    state.camera.lookAt(TARGET);
  });

  return null;
}
