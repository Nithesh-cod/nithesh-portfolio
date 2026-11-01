'use client';

import { Power } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Component, useEffect, useState, type ReactNode } from 'react';
import { useRoom } from '@/components/room/roomStore';
import { play } from '@/lib/audio';
import { usePortfolioStore } from '@/lib/store';

const GamingRoom = dynamic(() => import('@/components/room/GamingRoom'), {
  ssr: false,
  loading: () => <div className="room-stage-loading">Loading the room…</div>,
});

/** The gaming room world. The power button stays on every device as the
 *  accessible / no-WebGL way to boot JARVIS. */
export function RoomStage() {
  const world = usePortfolioStore((s) => s.world);
  const booting = useRoom((s) => s.booting);
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
        <div className="room-hud">
          <p className="room-hint">{touch ? 'Tap' : 'Click'} the PC or the monitors to boot JARVIS OS</p>
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
