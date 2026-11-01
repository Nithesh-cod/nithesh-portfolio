'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useRef } from 'react';
import { PerspectiveCamera, Vector3 } from 'three';
import { POSES, type Pose } from '@/components/room/layout';
import { useRoom } from '@/components/room/roomStore';
import { usePortfolioStore } from '@/lib/store';

/* Room camera. At rest it drifts gently with the pointer. Booting JARVIS
 * flies it into the centre monitor (ease-in-out, 1.5 s) and hands over to
 * the OS just before it lands; powering JARVIS off flies it back out. */

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const IN_S = 1.5;
const OUT_S = 1.2;
const HANDOFF = 0.82;

type Flight = { from: { pos: Vector3; look: Vector3; fov: number }; toScreen: boolean; t: number; dur: number };

export function RoomCameraRig({ narrow, still }: { narrow: boolean; still: boolean }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const world = usePortfolioStore((s) => s.world);
  const booting = useRoom((s) => s.booting);
  const finishBoot = useRoom((s) => s.finishBoot);
  const setSettled = useRoom((s) => s.setSettled);

  const look = useRef(new Vector3());
  const goalPos = useRef(new Vector3());
  const goalLook = useRef(new Vector3());
  const flight = useRef<Flight | null>(null);
  const atScreen = useRef(false);

  const base = narrow ? POSES.baseNarrow : POSES.base;

  // First frame: start wherever the current world says.
  useLayoutEffect(() => {
    const p = world === 'jarvis' ? POSES.monitor : base;
    atScreen.current = world === 'jarvis';
    camera.position.set(...p.pos);
    look.current.set(...p.look);
    camera.fov = p.fov;
    camera.updateProjectionMatrix();
    camera.lookAt(look.current);
    setSettled(world === 'jarvis');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((state, dt) => {
    const wantScreen = world === 'jarvis' || booting;
    if (wantScreen !== atScreen.current) {
      atScreen.current = wantScreen;
      flight.current = {
        from: { pos: camera.position.clone(), look: look.current.clone(), fov: camera.fov },
        toScreen: wantScreen,
        t: 0,
        dur: still ? 0.01 : wantScreen ? IN_S : OUT_S,
      };
      setSettled(false);
    }

    const pose: Pose = wantScreen ? POSES.monitor : base;
    goalPos.current.set(...pose.pos);
    goalLook.current.set(...pose.look);

    // Resting drift with the pointer (never while at the screen).
    if (!wantScreen && !still) {
      const t = state.clock.elapsedTime;
      goalPos.current.x += state.pointer.x * 0.32 + Math.sin(t * 0.21) * 0.04;
      goalPos.current.y += state.pointer.y * 0.14 + Math.sin(t * 0.17) * 0.02;
      goalLook.current.x += state.pointer.x * 0.22;
      goalLook.current.y += state.pointer.y * 0.1;
    }

    const f = flight.current;
    if (f) {
      f.t = Math.min(1, f.t + dt / f.dur);
      const k = easeInOut(f.t);
      camera.position.lerpVectors(f.from.pos, goalPos.current, k);
      look.current.lerpVectors(f.from.look, goalLook.current, k);
      camera.fov = f.from.fov + (pose.fov - f.from.fov) * k;
      camera.updateProjectionMatrix();
      if (f.toScreen && booting && f.t >= HANDOFF) finishBoot();
      if (f.t >= 1) {
        flight.current = null;
        if (wantScreen) setSettled(true);
      }
    } else {
      const a = 1 - Math.exp(-dt * 3);
      camera.position.lerp(goalPos.current, a);
      look.current.lerp(goalLook.current, a);
      if (Math.abs(camera.fov - pose.fov) > 0.01) {
        camera.fov += (pose.fov - camera.fov) * a;
        camera.updateProjectionMatrix();
      }
      if (booting) finishBoot();
    }
    camera.lookAt(look.current);
  });

  return null;
}
