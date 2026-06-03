'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import gsap from 'gsap';
import { useEffect, useRef } from 'react';
import { Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { usePortfolioStore } from '@/lib/store';

const AUTO_ROTATE_IDLE_MS = 10000;
const FOCUS_DURATION = 0.8;

/**
 * V10.0 — OrbitControls museum-tour rig. Drag to rotate, scroll to zoom.
 * Slow auto-rotate (0.15 rad/s) resumes after 10 s idle. Click-to-focus
 * tween via GSAP wires through the store's focusOn action.
 */
export function CameraRig() {
  const controls = useRef<OrbitControlsImpl | null>(null);
  const { camera } = useThree();

  const focusTarget = usePortfolioStore((s) => s.focusTarget);
  const lastInteractAt = usePortfolioStore((s) => s.lastInteractAt);
  const markInteract = usePortfolioStore((s) => s.markInteract);
  const tweening = useRef(false);
  const lastRequestId = useRef(0);

  useEffect(() => {
    if (!focusTarget) return;
    if (focusTarget.requestId === lastRequestId.current) return;
    lastRequestId.current = focusTarget.requestId;
    if (!controls.current) return;

    const [tx, ty, tz] = focusTarget.lookAt;
    const [px, py, pz] = focusTarget.position;
    const finalCam = new Vector3(px, py, pz);

    tweening.current = true;
    gsap.killTweensOf(controls.current.target);
    gsap.killTweensOf(camera.position);

    gsap.to(controls.current.target, {
      x: tx, y: ty, z: tz,
      duration: FOCUS_DURATION,
      ease: 'power2.inOut',
      onUpdate: () => controls.current?.update(),
    });
    gsap.to(camera.position, {
      x: finalCam.x, y: finalCam.y, z: finalCam.z,
      duration: FOCUS_DURATION,
      ease: 'power2.inOut',
      onComplete: () => { tweening.current = false; },
    });

    markInteract();
  }, [focusTarget, camera, markInteract]);

  useFrame(() => {
    if (!controls.current) return;
    const c = controls.current as unknown as { autoRotate: boolean };
    if (tweening.current) {
      c.autoRotate = false;
      return;
    }
    c.autoRotate = performance.now() - lastInteractAt > AUTO_ROTATE_IDLE_MS;
  });

  return (
    <OrbitControls
      ref={controls}
      enableDamping
      dampingFactor={0.05}
      enablePan={false}
      enableZoom
      minDistance={6}
      maxDistance={15}
      minPolarAngle={0.3}
      maxPolarAngle={1.4}
      target={[0, 1.5, 0]}
      autoRotate
      autoRotateSpeed={0.15}
      onStart={() => markInteract()}
      onChange={() => markInteract()}
    />
  );
}
