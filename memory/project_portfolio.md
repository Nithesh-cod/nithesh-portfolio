---
name: project-portfolio
description: Cinematic single-page 3D portfolio — Next.js 14 + R3F + GSAP + Lenis + Howler, emerald lab metaphor.
metadata:
  type: project
---

Single-page scroll-driven 3D portfolio. Working dir: `N:/MY PROJECTS/Modern Portfolio/`.

**Why:** Internship-hunt portfolio with Awwwards-tier craft. References: henryheffernan.com (diegetic interactions, CRT post-FX), david-hckh.com (scroll-driven camera, green HDR hero). Must feel distinct, not clone.

**How to apply:**
- Stack is non-negotiable: Next.js 14 App Router + TS strict + R3F + drei + postprocessing + GSAP ScrollTrigger + Lenis + Framer Motion + Howler + Zustand + Tailwind.
- One coherent stage: emerald-lit underground lab. Camera path through it = scroll spine.
- Every interaction = sound. Default audio OFF, click-to-enable.
- Portrait → diegetic hologram panel inside scene, not floating headshot.
- Mobile auto-degrade to 2D fallback below perf threshold.
- All resume content lives in `src/lib/content.ts` — never hardcode in components.
- Performance budgets are hard: ≤8 MB glb, ≤250 KB gzipped JS, 60fps M1 Air / 30fps iPhone SE2.
- Milestones: 1 Skeleton → 2 World → 3 Interaction → 4 Polish. Don't advance until current builds clean.
- No GitHub URL supplied yet — leave `// TODO: GITHUB_URL` and "Coming soon" UI state.
- No Blender file — start with procedural fallback scene of primitive geometries.

Linked: [[user-profile]], [[reference-assets]].
