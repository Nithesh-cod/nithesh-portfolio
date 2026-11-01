'use client';

import { Gauge, Music, Power, Sparkles, Volume2, Waves } from 'lucide-react';
import type { ReactNode } from 'react';
import { play, unlock } from '@/lib/audio';
import { useOS } from '@/lib/jarvis/osStore';
import { usePortfolioStore } from '@/lib/store';

/** Sound, motion, voice and graphics. Saved in this browser (localStorage). */
export function SettingsApp() {
  const settings = useOS((s) => s.settings);
  const update = useOS((s) => s.updateSettings);
  const replayBoot = useOS((s) => s.replayBoot);
  const music = usePortfolioStore((s) => s.audioEnabled);
  const setMusic = usePortfolioStore((s) => s.setAudioEnabled);

  return (
    <div className="app-settings">
      <Row icon={<Volume2 size={17} />} title="UI sounds" note="Clicks and transitions.">
        <Switch
          on={settings.sound}
          label="UI sounds"
          onToggle={(on) => {
            unlock();
            update({ sound: on });
            if (on) play('click_primary');
          }}
        />
      </Row>
      <Row icon={<Music size={17} />} title="Ambient music" note="The room’s background track.">
        <Switch
          on={music}
          label="Ambient music"
          onToggle={(on) => {
            unlock();
            setMusic(on);
          }}
        />
      </Row>
      <Row icon={<Waves size={17} />} title="Music volume" note={`${Math.round(settings.musicVolume * 100)}%`}>
        <input
          className="app-range"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={settings.musicVolume}
          aria-label="Music volume"
          onChange={(e) => update({ musicVolume: Number(e.target.value) })}
        />
      </Row>
      <Row icon={<Sparkles size={17} />} title="Reduce motion" note="Shorter, calmer animations. Your system setting is always respected.">
        <Switch on={settings.reduceMotion} label="Reduce motion" onToggle={(on) => update({ reduceMotion: on })} />
      </Row>
      <Row icon={<Volume2 size={17} />} title="JARVIS voice replies" note="JARVIS AI reads answers aloud when you speak to it.">
        <Switch on={settings.voiceReplies} label="JARVIS voice replies" onToggle={(on) => update({ voiceReplies: on })} />
      </Row>
      <Row icon={<Gauge size={17} />} title="Graphics" note="Performance turns off the museum’s mirror floor, bloom and holograms.">
        <div className="app-seg" role="radiogroup" aria-label="Graphics">
          {(['quality', 'performance'] as const).map((g) => (
            <button key={g} type="button" role="radio" aria-checked={settings.graphics === g} onClick={() => update({ graphics: g })}>
              {g === 'quality' ? 'Quality' : 'Performance'}
            </button>
          ))}
        </div>
      </Row>
      <Row icon={<Power size={17} />} title="Boot animation" note="Watch the JARVIS start-up again.">
        <button
          type="button"
          className="app-btn"
          onClick={() => {
            play('transition');
            replayBoot();
          }}
        >
          Replay boot
        </button>
      </Row>
      <p className="app-settings-foot">Settings are stored only in this browser.</p>
    </div>
  );
}

function Row({ icon, title, note, children }: { icon: ReactNode; title: string; note: string; children: ReactNode }) {
  return (
    <div className="app-setting">
      <span className="app-setting-icon">{icon}</span>
      <div>
        <strong>{title}</strong>
        <span>{note}</span>
      </div>
      {children}
    </div>
  );
}

function Switch({ on, label, onToggle }: { on: boolean; label: string; onToggle: (on: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className="app-switch" onClick={() => onToggle(!on)}>
      <i />
    </button>
  );
}
