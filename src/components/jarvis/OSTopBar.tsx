'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  BatteryCharging,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  Bell,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSun,
  LayoutGrid,
  Moon,
  Power,
  Search,
  Snowflake,
  Sun,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { NRLogo } from '@/components/jarvis/NRLogo';
import { useShell, type ShellPanel } from '@/components/jarvis/shellStore';
import { useNotes } from '@/components/jarvis/useNotes';
import { play } from '@/lib/audio';
import { useBattery, useClock, useDeviceInfo } from '@/lib/jarvis/device';
import { DUR, EASE } from '@/lib/jarvis/motion';
import { useWeather, type Weather } from '@/lib/jarvis/weather';
import { useOS } from '@/lib/jarvis/osStore';
import { usePortfolioStore } from '@/lib/store';

function WeatherIcon({ w }: { w: Weather }) {
  const p = { size: 26, strokeWidth: 1.6 };
  if (w.code >= 95) return <CloudLightning {...p} />;
  if (w.code >= 71 && w.code <= 77) return <Snowflake {...p} />;
  if ((w.code >= 61 && w.code <= 67) || (w.code >= 80 && w.code <= 82)) return <CloudRain {...p} />;
  if (w.code >= 51 && w.code <= 57) return <CloudDrizzle {...p} />;
  if (w.code === 45 || w.code === 48) return <CloudFog {...p} />;
  if (w.code === 0) return w.isDay ? <Sun {...p} /> : <Moon {...p} />;
  if (w.code <= 2) return w.isDay ? <CloudSun {...p} /> : <CloudMoon {...p} />;
  return <Cloud {...p} />;
}

export function OSTopBar() {
  const clock = useClock();
  const weather = useWeather();
  const device = useDeviceInfo();
  const battery = useBattery();
  const setWorld = usePortfolioStore((s) => s.setWorld);
  const closeAll = useOS((s) => s.closeAll);
  const togglePanel = useShell((s) => s.togglePanel);
  const { unread } = useNotes();

  const toggle = (panel: ShellPanel) => {
    play('click_secondary');
    togglePanel(panel);
  };

  const BatteryIcon = !battery
    ? null
    : battery.charging
      ? BatteryCharging
      : battery.level > 0.66
        ? BatteryFull
        : battery.level > 0.33
          ? BatteryMedium
          : BatteryLow;

  return (
    <header className="jos-top">
      <div className="jos-brand">
        <NRLogo size={46} />
        <div>
          <strong>JARVIS OS</strong>
          <span>Nithesh&apos;s personal AI system</span>
        </div>
      </div>

      <div className="jos-motto" aria-hidden>
        THINK <i>/</i> PLAN <i>/</i> EXECUTE
      </div>

      <div className="jos-top-right">
        {/* The sidebar is gone at 1024px and below, so these also live here. */}
        <div className="jos-top-actions">
          <button type="button" className="jos-icon-btn jos-search-btn" aria-label="Search" aria-keyshortcuts="Control+K" onClick={() => toggle('palette')}>
            <Search size={17} />
            <kbd>Ctrl K</kbd>
          </button>
          <button type="button" className="jos-icon-btn" aria-label="All apps" onClick={() => toggle('launcher')}>
            <LayoutGrid size={17} />
          </button>
          <button
            type="button"
            className="jos-icon-btn"
            aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
            onClick={() => toggle('notifications')}
          >
            <Bell size={17} />
            <AnimatePresence>
              {unread > 0 && (
                <motion.em
                  key={unread}
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1, transition: { duration: DUR.quick, ease: EASE } }}
                  exit={{ scale: 0.4, opacity: 0, transition: { duration: DUR.quick, ease: EASE } }}
                >
                  {unread}
                </motion.em>
              )}
            </AnimatePresence>
          </button>
        </div>
        <div className="jos-clock">
          <b>{clock?.time ?? '--:--:--'}</b>
          <span>{clock ? `${clock.date} · IST` : ' '}</span>
        </div>
        {weather && (
          <div className="jos-weather" title="Live weather, Coimbatore (Open-Meteo)">
            <WeatherIcon w={weather} />
            <div>
              <b>{weather.tempC}°C</b>
              <span>{weather.label} · Coimbatore</span>
            </div>
          </div>
        )}
        <div className="jos-sys-icons">
          {device?.online === false ? <WifiOff size={18} aria-label="Offline" /> : <Wifi size={18} aria-label="Online" />}
          {BatteryIcon && battery && (
            <span className="jos-battery" title={`Your battery: ${Math.round(battery.level * 100)}%`}>
              <BatteryIcon size={19} />
              {Math.round(battery.level * 100)}%
            </span>
          )}
        </div>
        <button
          type="button"
          className="jos-power"
          aria-label="Shut down JARVIS and return to the room"
          title="Back to the room"
          onClick={() => {
            play('click_secondary');
            closeAll();
            setWorld('room');
          }}
        >
          <Power size={18} />
        </button>
      </div>
    </header>
  );
}
