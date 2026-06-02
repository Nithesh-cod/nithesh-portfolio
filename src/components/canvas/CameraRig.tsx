'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Vector3 } from 'three';

/**
 * V9.0 — fixed-camera rig. NO OrbitControls, NO scroll. The camera orbits
 * very slowly around the scene centre (~0.05 rad/s) and is nudged by
 * cursor position for a subtle parallax. Designed so the 3D scene sits as
 * a "centerpiece" inside the dashboard HUD without stealing attention.
 */
const ORBIT_RADIUS = 9.5;
const ORBIT_HEIGHT = 3.2;   // V9.1 — lifted so the floor reads as flat
const ORBIT_SPEED = 0.05;   // rad/sec
const PARALLAX_X = 0.25;
const PARALLAX_Y = 0.15;
// V9.1 — target dropped to y=1.4 (capsule body centre) so the camera
// tilts ~10° downward — the hex floor now reads as ground, not a wall.
const TARGET = new Vector3(0, 1.4, 0);

export function CameraRig() {
  const { camera } = useThree();
  const t = useRef(0);
  const cursor = useRef({ x: 0, y: 0 });
  const tmp = useRef(new Vector3());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onMove = (e: PointerEvent) => {
      cursor.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      cursor.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  useFrame((_, dt) => {
    t.current += dt * ORBIT_SPEED;
    const x = Math.sin(t.current) * ORBIT_RADIUS;
    const z = Math.cos(t.current) * ORBIT_RADIUS;
    tmp.current.set(
      x + cursor.current.x * PARALLAX_X,
      ORBIT_HEIGHT - cursor.current.y * PARALLAX_Y,
      z,
    );
    camera.position.lerp(tmp.current, Math.min(1, dt * 2));
    camera.lookAt(TARGET);
  });

  return null;
}
