'use client';

import { useEffect, useState } from 'react';

/* Live Coimbatore weather from Open-Meteo (free, no API key, CORS-enabled).
 * One fetch per page session, shared by every widget that asks. */

export type Weather = { tempC: number; label: string; isDay: boolean; code: number };

const URL =
  'https://api.open-meteo.com/v1/forecast?latitude=11.0168&longitude=76.9558' +
  '&current=temperature_2m,weather_code,is_day&timezone=Asia%2FKolkata';

let pending: Promise<Weather | null> | null = null;

function describe(code: number): string {
  if (code === 0) return 'Clear';
  if (code <= 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 51 && code <= 57) return 'Drizzle';
  if (code >= 61 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Cloudy';
}

function fetchWeather(): Promise<Weather | null> {
  pending ??= fetch(URL)
    .then((r) => (r.ok ? r.json() : null))
    .then((j: { current?: { temperature_2m: number; weather_code: number; is_day: number } } | null) =>
      j?.current
        ? {
            tempC: Math.round(j.current.temperature_2m),
            code: j.current.weather_code,
            label: describe(j.current.weather_code),
            isDay: j.current.is_day === 1,
          }
        : null,
    )
    .catch(() => null);
  return pending;
}

export function useWeather(): Weather | null {
  const [weather, setWeather] = useState<Weather | null>(null);
  useEffect(() => {
    let alive = true;
    void fetchWeather().then((w) => alive && setWeather(w));
    return () => {
      alive = false;
    };
  }, []);
  return weather;
}
