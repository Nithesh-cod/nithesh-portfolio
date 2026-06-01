'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { CatmullRomCurve3, Vector3 } from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { stations, waypoints } from '@/lib/content';
import { usePortfolioStore } from '@/lib/store';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const FOCUS_DURATION = 0.7; // seconds
const RETURN_DURATION = 0.6;

/**
 * Drives the camera along two parallel Catmull-Rom curves through the waypoints —
 * one for position, one for lookAt — sampled with the same t so the camera never
 * snaps at segment seams. Lenis owns smooth scroll; GSAP ScrollTrigger scrubs t.
 *
 * When activeProject is set (a console was clicked), we GSAP-tween the camera
 * to a focus pose and pause the curve update. Lenis is stopped to lock the page.
 * On close, the camera tweens back to the curve sample at the current scroll t.
 *
 * prefers-reduced-motion bypasses Lenis + the scrub and snaps via IntersectionObserver.
 */
export function ScrollCamera() {
  const { camera } = useThree();
  const setSection = usePortfolioStore((s) => s.setSection);
  const activeProject = usePortfolioStore((s) => s.activeProject);
  const closeProject = usePortfolioStore((s) => s.closeProject);
  const modalOpen = usePortfolioStore((s) => s.modalOpen);

  const progress = useRef(0);
  const lookCurrent = useRef(new Vector3());
  const lookTarget = useRef(new Vector3());
  const lenisRef = useRef<Lenis | null>(null);
  // True while a GSAP camera tween is mid-flight — useFrame must not overwrite.
  const tweening = useRef(false);

  const curve = useMemo(
    () =>
      new CatmullRomCurve3(
        waypoints.map((w) => new Vector3(...w.position)),
        false,
        'catmullrom',
        0.4,
      ),
    [],
  );

  const lookCurve = useMemo(
    () =>
      new CatmullRomCurve3(
        waypoints.map((w) => new Vector3(...w.lookAt)),
        false,
        'catmullrom',
        0.4,
      ),
    [],
  );

  // Initialise lookCurrent to the entrance lookAt so the very first frame doesn't snap.
  useEffect(() => {
    lookCurrent.current.copy(lookCurve.getPointAt(0));
  }, [lookCurve]);

  /* ─────────────── Lenis + ScrollTrigger setup ─────────────── */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced) {
      const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-waypoint]'));
      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              const idx = Number(e.target.getAttribute('data-waypoint') ?? 0);
              progress.current = waypoints.length > 1 ? idx / (waypoints.length - 1) : 0;
              setSection(idx);
            }
          }
        },
        { threshold: 0.5 },
      );
      sections.forEach((s) => io.observe(s));
      return () => io.disconnect();
    }

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => 1 - Math.pow(1 - t, 3),
      smoothWheel: true,
      touchMultiplier: 1.2,
    });
    lenisRef.current = lenis;
    document.documentElement.classList.add('lenis', 'lenis-smooth');

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    const st = ScrollTrigger.create({
      start: 0,
      end: () => document.documentElement.scrollHeight - window.innerHeight,
      onUpdate: (self) => {
        progress.current = self.progress;
        const idx = Math.round(self.progress * (waypoints.length - 1));
        setSection(idx);
      },
    });

    return () => {
      st.kill();
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
      document.documentElement.classList.remove('lenis', 'lenis-smooth');
    };
  }, [setSection]);

  /* ────────── Modal open: pause scroll, tween to focus ────────── */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Under reduced motion we still pause Lenis + flip the position, but skip the eased tween.
    const dur = reduced ? 0 : FOCUS_DURATION;
    const ret = reduced ? 0 : RETURN_DURATION;

    if (activeProject) {
      const station = stations.find((s) => s.slug === activeProject);
      if (!station) {
        closeProject();
        return;
      }
      lenisRef.current?.stop();
      tweening.current = true;

      const [sx, sy, sz] = station.position;
      // Camera: just above + in front of the station, looking down at it.
      gsap.to(camera.position, {
        x: sx,
        y: sy + 0.55,
        z: sz + 1.1,
        duration: dur,
        ease: 'power2.out',
        onComplete: () => {
          tweening.current = false;
        },
      });
      gsap.to(lookCurrent.current, {
        x: sx,
        y: sy,
        z: sz,
        duration: dur,
        ease: 'power2.out',
      });
      return;
    }

    // Closing: return to the scroll-derived pose at the current t.
    const pos = curve.getPointAt(progress.current);
    const look = lookCurve.getPointAt(progress.current);
    tweening.current = true;
    gsap.to(camera.position, {
      x: pos.x,
      y: pos.y,
      z: pos.z,
      duration: ret,
      ease: 'power2.inOut',
      onComplete: () => {
        tweening.current = false;
        lenisRef.current?.start();
      },
    });
    gsap.to(lookCurrent.current, {
      x: look.x,
      y: look.y,
      z: look.z,
      duration: ret,
      ease: 'power2.inOut',
    });
  }, [activeProject, camera.position, closeProject, curve, lookCurve]);

  /* ────────── Per-frame: sample curves OR honour the tween ────────── */
  useFrame((_, dt) => {
    if (modalOpen || tweening.current) {
      // While modal is open or any tween is mid-flight, GSAP is mutating
      // camera.position + lookCurrent — we just commit the lookAt.
      camera.lookAt(lookCurrent.current);
      return;
    }

    const t = progress.current;
    const pos = curve.getPointAt(t);
    lookTarget.current.copy(lookCurve.getPointAt(t));

    camera.position.lerp(pos, Math.min(1, dt * 4));
    lookCurrent.current.lerp(lookTarget.current, Math.min(1, dt * 4));
    camera.lookAt(lookCurrent.current);
  });

  return null;
}
