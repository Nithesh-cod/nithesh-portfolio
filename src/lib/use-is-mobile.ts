'use client';

import { useEffect, useState } from 'react';

/**
 * Returns true when the viewport is narrower than 768 px OR the device has
 * multi-touch. Reactive — re-runs on resize.
 */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => {
      setMobile(
        window.innerWidth < 768 ||
        (navigator.maxTouchPoints ?? 0) > 1,
      );
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return mobile;
}
