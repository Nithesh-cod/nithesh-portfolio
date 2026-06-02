'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import gsap from 'gsap';
import { useEffect, useRef } from 'react';
import { Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { usePortfolioStore } from '@/lib/store';

const AUTO_ROTATE_IDLE_MS = 8000;
const FOCUS_DISTANCE = 4.5;
const FOCUS_DURATION = 0.8;
const PARALLAX_X = 0.15;
const PARALLAX_Y = 0.10;

/**
 * V8.0 — cursor-driven camera. Replaces ScrollCamera. Drag to rotate,
 * scroll to zoom, click any 3D object → 800 ms tween to focus pose,
 * auto-rotate resumes after 8 s idle. Subtle cursor parallax when idle.
 */
export function CameraRig() {
  const controls = useRef<OrbitControlsImpl | null>(null);
  const { camera } = useThree();

  const focusTarget = usePortfolioStore((s) => s.focusTarget);
  const lastInteractAt = usePortfolioStore((s) => s.lastInteractAt);
  const markInteract = usePortfolioStore((s) => s.markInteract);
  const tweening = useRef(false);
  const lastRequestId = useRef(0);

  // Cursor parallax — tracked in document space, applied when idle.
  const cursor = useRef({ x: 0, y: 0 });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onMove = (e: PointerEvent) => {
      cursor.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      cursor.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  // Focus tween — fires on every focusTarget request from the store.
  useEffect(() => {
    if (!focusTarget) return;
    if (focusTarget.requestId === lastRequestId.current) return;
    lastRequestId.current = focusTarget.requestId;
    if (!controls.current) return;

    const [tx, ty, tz] = focusTarget.lookAt;
    const [px, py, pz] = focusTarget.position;

    // Camera lands at the provided position OR at FOCUS_DISTANCE units
    // along the lookAt→position direction, whichever is further.
    const targetVec = new Vector3(tx, ty, tz);
    const desired = new Vector3(px, py, pz);
    const dir = new Vector3().subVectors(desired, targetVec);
    const dist = dir.length();
    dir.normalize();
    if (dir.lengthSq() < 0.001) dir.set(0, 0, 1);
    const finalCamPos = new Vector3()
      .copy(targetVec)
      .addScaledVector(dir, Math.max(dist, FOCUS_DISTANCE));

    tweening.current = true;
    gsap.killTweensOf(controls.current.target);
    gsap.killTweensOf(camera.position);

    gsap.to(controls.current.target, {
      x: tx,
      y: ty,
      z: tz,
      duration: FOCUS_DURATION,
      ease: 'power2.inOut',
      onUpdate: () => controls.current?.update(),
    });
    gsap.to(camera.position, {
      x: finalCamPos.x,
      y: finalCamPos.y,
      z: finalCamPos.z,
      duration: FOCUS_DURATION,
      ease: 'power2.inOut',
      onComplete: () => {
        tweening.current = false;
      },
    });

    markInteract();
  }, [focusTarget, camera, markInteract]);

  // Per-frame: auto-rotate gate + cursor parallax when idle.
  useFrame(() => {
    if (!controls.current) return;
    const c = controls.current as unknown as { autoRotate: boolean };
    if (tweening.current) {
      c.autoRotate = false;
      return;
    }
    const idleFor = performance.now() - lastInteractAt;
    c.autoRotate = idleFor > AUTO_ROTATE_IDLE_MS;

    // Subtle cursor parallax — only when truly idle (no recent drag, no tween).
    if (idleFor > 100) {
      const dx = cursor.current.x * PARALLAX_X;
      const dy = -cursor.current.y * PARALLAX_Y;
      // Apply as an offset that decays so it doesn't accumulate.
      camera.position.x += (dx - (camera.position.x - controls.current.target.x) * 0.0001) * 0.0006;
      camera.position.y += (dy * 0.0006);
    }
  });

  return (
    <OrbitControls
      ref={controls}
      enableDamping
      dampingFactor={0.05}
      enablePan={false}
      enableZoom
      // V8.1 — tightened distance bounds so the visitor can't pull too
      // far back from the new layout or get inside any card.
      minDistance={5}
      maxDistance={18}
      minPolarAngle={Math.PI * 0.25}
      maxPolarAngle={Math.PI * 0.55}
      // V8.1 — target slightly lower so the foreground project consoles
      // sit comfortably in the lower third of the frame.
      target={[0, 1.0, 0]}
      autoRotate
      autoRotateSpeed={0.25}
      onStart={() => markInteract()}
      onChange={() => markInteract()}
    />
  );
}
