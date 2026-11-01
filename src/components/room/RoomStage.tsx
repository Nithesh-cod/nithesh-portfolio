'use client';

import { Power } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Component, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { useRoom } from '@/components/room/roomStore';
import { setStick } from '@/components/room/walk';
import { play } from '@/lib/audio';
import { usePortfolioStore } from '@/lib/store';

const GamingRoom = dynamic(() => import('@/components/room/GamingRoom'), {
  ssr: false,
  loading: () => <div className="room-stage-loading">Loading the room…</div>,
});

/** Thumb stick for touch screens; dragging anywhere else on the room looks around. */
function WalkPad() {
  const knob = useRef<HTMLSpanElement>(null);

  const steer = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const box = e.currentTarget.getBoundingClientRect();
    const reach = box.width / 2;
    let x = (e.clientX - box.left - reach) / reach;
    let y = (e.clientY - box.top - reach) / reach;
    const length = Math.hypot(x, y);
    if (length > 1) {
      x /= length;
      y /= length;
    }
    setStick(x, -y);
    if (knob.current) knob.current.style.transform = `translate(${x * reach * 0.6}px, ${y * reach * 0.6}px)`;
  };
  const release = () => {
    setStick(0, 0);
    if (knob.current) knob.current.style.transform = '';
  };
  useEffect(() => release, []);

  return (
    <div
      className="room-pad"
      aria-hidden
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        steer(e);
      }}
      onPointerMove={steer}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <span ref={knob} className="room-pad-knob" />
    </div>
  );
}

function hintFor(touch: boolean, walking: boolean, near: boolean): string {
  if (near) return touch ? 'Tap the PC to boot JARVIS OS' : 'Press E to boot JARVIS OS';
  if (walking) return touch ? 'Tap the floor to walk there' : 'WASD to walk · Shift to run · Click the floor to walk there';
  return touch ? 'Use the stick to walk · Drag to look · Tap the PC to boot JARVIS' : 'WASD to walk · Drag to look · Click the PC to boot JARVIS';
}

/** The gaming room world. The power button stays on every device as the
 *  accessible / no-WebGL way to boot JARVIS. */
export function RoomStage() {
  const world = usePortfolioStore((s) => s.world);
  const booting = useRoom((s) => s.booting);
  const walking = useRoom((s) => s.walking);
  const near = useRoom((s) => s.near);
  const ready = useRoom((s) => s.ready);
  const requestBoot = useRoom((s) => s.requestBoot);
  const [touch, setTouch] = useState(false);
  useEffect(() => setTouch(window.matchMedia('(pointer: coarse)').matches), []);

  return (
    <div className="room-stage">
      <div className="room-stage-glow" aria-hidden />
      <RoomBoundary>
        <div className="room-canvas">
          <GamingRoom />
        </div>
      </RoomBoundary>
      {world === 'room' && !booting && (
        <div className="room-hud" data-touch={touch || undefined}>
          {/* Keyed so each new hint restarts the fade; only the walking tip fades. */}
          {ready && (
            <p key={hintFor(touch, walking, near)} className="room-hint" data-fades={(walking && !near) || undefined} aria-live="polite">
              {hintFor(touch, walking, near)}
            </p>
          )}
          <button
            type="button"
            className="room-boot-btn"
            onClick={() => {
              play('click_primary');
              requestBoot();
            }}
          >
            <Power size={18} /> Boot JARVIS
          </button>
        </div>
      )}
      {world === 'room' && !booting && ready && touch && <WalkPad />}
    </div>
  );
}

/** If WebGL fails, keep the dark stage and the boot button instead of crashing. */
class RoomBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    // eslint-disable-next-line no-console
    console.error('[room] 3D room failed, falling back to the boot button:', err);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
