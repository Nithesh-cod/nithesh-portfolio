'use client';

import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { AdditiveBlending, type Group, PerspectiveCamera, Vector3 } from 'three';
import { POSES, ROOM, type Pose } from '@/components/room/layout';
import { useRoom } from '@/components/room/roomStore';
import { bindWalkInput, distanceTo, DESK_BOX, EYE, nearestFree, REACH, readDrive, RUN_SPEED, slide, takeBootKey, takeLook, WALK_FOV, WALK_SPEED, wasDrag } from '@/components/room/walk';
import { play } from '@/lib/audio';
import { usePortfolioStore } from '@/lib/store';

/* Room camera. It starts on a composed view that drifts with the pointer. The
 * first key, drag or floor click hands over to first-person walking. Booting
 * JARVIS flies it into the centre monitor (ease-in-out, 1.5 s) and hands over to
 * the OS just before it lands; powering JARVIS off flies back to where you were. */

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const IN_S = 1.5;
const OUT_S = 1.2;
const HANDOFF = 0.82;

const LOOK_SPEED = 0.0034;
const MAX_PITCH = 1.3;
const GRIP = 10; // how quickly speed follows the keys
const ARRIVED = 0.14;

type Flight = { from: { pos: Vector3; look: Vector3; fov: number }; toScreen: boolean; t: number; dur: number };

type Walker = {
  active: boolean;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  vx: number;
  vz: number;
  stride: number;
  target: { x: number; z: number } | null;
  stalled: number;
};

export function RoomCameraRig({ narrow, still }: { narrow: boolean; still: boolean }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const canvas = useThree((s) => s.gl.domElement);
  const world = usePortfolioStore((s) => s.world);
  const booting = useRoom((s) => s.booting);
  const finishBoot = useRoom((s) => s.finishBoot);
  const requestBoot = useRoom((s) => s.requestBoot);
  const setSettled = useRoom((s) => s.setSettled);
  const setWalking = useRoom((s) => s.setWalking);
  const setNear = useRoom((s) => s.setNear);

  const look = useRef(new Vector3());
  const goalPos = useRef(new Vector3());
  const goalLook = useRef(new Vector3());
  const flight = useRef<Flight | null>(null);
  const atScreen = useRef(false);
  const marker = useRef<Group>(null);
  const walker = useRef<Walker>({ active: false, x: 0, y: EYE, z: 0, yaw: 0, pitch: 0, vx: 0, vz: 0, stride: 0, target: null, stalled: 0 });

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
    // Coming back from the museum remounts the room, so the walk starts over.
    setWalking(false);
    setNear(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () =>
      bindWalkInput(canvas, () => {
        const { booting: flying } = useRoom.getState();
        return usePortfolioStore.getState().world === 'room' && !flying;
      }),
    [canvas],
  );

  /** Take over from the composed view, facing wherever the camera already faces. */
  const startWalking = () => {
    const w = walker.current;
    if (w.active) return;
    const dir = look.current.clone().sub(camera.position).normalize();
    [w.x, w.z] = nearestFree(camera.position.x, camera.position.z);
    w.y = camera.position.y;
    w.yaw = Math.atan2(-dir.x, -dir.z);
    w.pitch = Math.asin(Math.max(-1, Math.min(1, dir.y)));
    w.active = true;
    setWalking(true);
  };

  const facing = (w: Walker, into: Vector3) => {
    const flat = Math.cos(w.pitch);
    return into.set(w.x - Math.sin(w.yaw) * flat, w.y + Math.sin(w.pitch), w.z - Math.cos(w.yaw) * flat);
  };

  const step = (w: Walker, dt: number, t: number) => {
    const turn = takeLook();
    w.yaw -= turn.x * LOOK_SPEED;
    w.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, w.pitch - turn.y * LOOK_SPEED));

    const { strafe, forward, run } = readDrive();
    const manual = strafe !== 0 || forward !== 0;
    if (manual) w.target = null;

    const sin = Math.sin(w.yaw);
    const cos = Math.cos(w.yaw);
    let wantX = -sin * forward + cos * strafe;
    let wantZ = -cos * forward - sin * strafe;
    let speed = run ? RUN_SPEED : WALK_SPEED;

    if (w.target) {
      const dx = w.target.x - w.x;
      const dz = w.target.z - w.z;
      const distance = Math.hypot(dx, dz);
      if (distance < ARRIVED) w.target = null;
      else {
        wantX = dx / distance;
        wantZ = dz / distance;
        speed = Math.min(WALK_SPEED, distance * 3 + 0.5);
        // Ease round to face the way we're heading.
        const heading = Math.atan2(-dx, -dz);
        const delta = Math.atan2(Math.sin(heading - w.yaw), Math.cos(heading - w.yaw));
        w.yaw += delta * (1 - Math.exp(-dt * 4));
      }
    }

    const length = Math.hypot(wantX, wantZ);
    if (length > 1) {
      wantX /= length;
      wantZ /= length;
    }
    const grip = 1 - Math.exp(-dt * GRIP);
    w.vx += (wantX * speed - w.vx) * grip;
    w.vz += (wantZ * speed - w.vz) * grip;

    const [x, z] = slide(w.x, w.z, w.vx * dt, w.vz * dt);
    const moved = Math.hypot(x - w.x, z - w.z);
    // Heading for a spot behind furniture: give up rather than push forever.
    w.stalled = w.target && moved < 0.2 * dt ? w.stalled + dt : 0;
    if (w.stalled > 0.35) w.target = null;
    w.x = x;
    w.z = z;

    const pace = dt > 0 ? moved / dt / WALK_SPEED : 0;
    w.stride += dt * 8.5 * Math.min(1.6, pace);
    w.y += (EYE - w.y) * (1 - Math.exp(-dt * 6));
    const bob = still ? 0 : Math.sin(w.stride) * 0.014 * Math.min(1, pace);

    camera.position.set(w.x, w.y + bob, w.z);
    facing(w, look.current);
    if (Math.abs(camera.fov - WALK_FOV) > 0.01) {
      camera.fov += (WALK_FOV - camera.fov) * (1 - Math.exp(-dt * 4));
      camera.updateProjectionMatrix();
    }

    const near = distanceTo(DESK_BOX, w.x, w.z) < REACH;
    setNear(near);
    if (takeBootKey() && near) {
      play('click_primary');
      requestBoot();
    }

    if (marker.current) {
      marker.current.visible = w.target !== null;
      if (w.target) {
        marker.current.position.set(w.target.x, 0.02, w.target.z);
        marker.current.scale.setScalar(1 + Math.sin(t * 6) * 0.08);
      }
    }
  };

  useFrame((state, dt) => {
    const wantScreen = world === 'jarvis' || booting;
    const w = walker.current;

    if (wantScreen !== atScreen.current) {
      atScreen.current = wantScreen;
      flight.current = {
        from: { pos: camera.position.clone(), look: look.current.clone(), fov: camera.fov },
        toScreen: wantScreen,
        t: 0,
        dur: still ? 0.01 : wantScreen ? IN_S : OUT_S,
      };
      w.vx = 0;
      w.vz = 0;
      w.target = null;
      setNear(false);
      setSettled(false);
    }

    const f = flight.current;
    if (!wantScreen && !f) {
      if (!w.active) {
        const { strafe, forward } = readDrive();
        const moved = takeLook();
        takeBootKey(); // too far from the desk here, so don't save it for later
        if (strafe !== 0 || forward !== 0 || moved.x !== 0 || moved.y !== 0 || w.target) startWalking();
      }
      if (w.active) {
        step(w, Math.min(dt, 0.05), state.clock.elapsedTime);
        camera.lookAt(look.current);
        return;
      }
    }
    if (marker.current) marker.current.visible = false;

    let goalFov: number;
    if (wantScreen) {
      const pose: Pose = POSES.monitor;
      goalPos.current.set(...pose.pos);
      goalLook.current.set(...pose.look);
      goalFov = pose.fov;
    } else if (w.active) {
      goalPos.current.set(w.x, EYE, w.z);
      facing({ ...w, y: EYE }, goalLook.current);
      goalFov = WALK_FOV;
    } else {
      goalPos.current.set(...base.pos);
      goalLook.current.set(...base.look);
      goalFov = base.fov;
    }

    // Resting drift with the pointer (only on the composed view).
    if (!wantScreen && !w.active && !still) {
      const t = state.clock.elapsedTime;
      goalPos.current.x += state.pointer.x * 0.32 + Math.sin(t * 0.21) * 0.04;
      goalPos.current.y += state.pointer.y * 0.14 + Math.sin(t * 0.17) * 0.02;
      goalLook.current.x += state.pointer.x * 0.22;
      goalLook.current.y += state.pointer.y * 0.1;
    }

    if (f) {
      takeLook(); // a drag during the flight shouldn't jolt the landing
      f.t = Math.min(1, f.t + dt / f.dur);
      const k = easeInOut(f.t);
      camera.position.lerpVectors(f.from.pos, goalPos.current, k);
      look.current.lerpVectors(f.from.look, goalLook.current, k);
      camera.fov = f.from.fov + (goalFov - f.from.fov) * k;
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
      if (Math.abs(camera.fov - goalFov) > 0.01) {
        camera.fov += (goalFov - camera.fov) * a;
        camera.updateProjectionMatrix();
      }
      if (booting) finishBoot();
    }
    camera.lookAt(look.current);
  });

  /** Click the floor to walk there. */
  const walkTo = (e: ThreeEvent<MouseEvent>) => {
    if (wasDrag() || world !== 'room' || booting) return;
    const [x, z] = nearestFree(e.point.x, e.point.z);
    walker.current.target = { x, z };
    walker.current.stalled = 0;
  };

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, (ROOM.z0 + ROOM.z1) / 2]} visible={false} onClick={walkTo}>
        <planeGeometry args={[ROOM.x1 - ROOM.x0, ROOM.z1 - ROOM.z0]} />
      </mesh>
      <group ref={marker} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.2, 0.25, 40]} />
          <meshBasicMaterial color="#5cffc4" transparent opacity={0.8} toneMapped={false} depthWrite={false} blending={AdditiveBlending} />
        </mesh>
      </group>
    </>
  );
}
