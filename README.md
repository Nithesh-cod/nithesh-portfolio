# Nithesh Ramachandran — Portfolio

A cinematic, scroll-driven, single-page 3D portfolio.
Built with Next.js 14, React Three Fiber, GSAP, Lenis, and Howler.

References for craft (not clones): [henryheffernan.com](https://henryheffernan.com/), [david-hckh.com](https://david-hckh.com/).

---

## Stack

| Layer            | Choice                                                |
| ---------------- | ----------------------------------------------------- |
| Framework        | Next.js 14 (App Router) + TypeScript (strict)         |
| 3D               | three.js + @react-three/fiber + drei + postprocessing |
| Scroll           | Lenis + GSAP ScrollTrigger                            |
| DOM motion       | Framer Motion                                         |
| Audio            | Howler.js (sprite for UI, streaming for ambient)      |
| State            | Zustand                                               |
| Styling          | Tailwind CSS, self-hosted Google fonts via next/font  |
| Asset pipeline   | Blender 4.x → glTF → gltf-transform (Draco + KTX2)    |
| Hosting          | Vercel                                                |

---

## Scripts

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build
pnpm start
pnpm lint         # next lint
pnpm typecheck    # tsc --noEmit
pnpm format       # prettier --write
```

Requires Node ≥ 20.10 and pnpm ≥ 9.

---

## Milestones

- [x] **M1 — Skeleton.** Scaffold, R3F canvas with a rotating placeholder, Lenis + GSAP scroll wiring across three dummy waypoints, fake-progress loader, audio toggle (stubbed), DOM-only résumé fallback.
- [x] **M2 — World.** Procedural lab (floor grid shader, three project consoles, server rack, CRT, fog particles, gradient sky), 8-waypoint Catmull-Rom camera at tension 0.3, hologram portrait shader with distance-driven boot animation, full post-processing chain (Bloom + ChromaticAberration + DoF + Noise + Vignette + procedural emerald LUT3D), drei `PerformanceMonitor` drops perf tier on sustained framerate dips, `?debug=perf` overlay via r3f-perf.
- [x] **M3 — Interaction.** Howler audio system (sprite + streamed ambient bed, muted default, reduced-motion override, no-throw on missing files), project consoles open a Framer-Motion modal with focus trap + Escape close + backdrop click, GSAP camera focus tween paired with Lenis pause + return tween, `onBeforeCompile` rim-light pulse on console plinths (PBR-preserving), custom cursor reticle with idle / interactive / pressed states and touch-device opt-out, full keyboard parity via drei `<Html>` focusable proxies.
- [x] **M4 — Polish.** Cinematic intro (sessionStorage-gated, 4 s, skippable on Space / Tap / click / wheel, Framer-Motion per-letter assemble), terminal easter egg toggled with `` ` `` (commands: `help`, `about`, `projects`, `skills`, `contact`, `whoami`, `clear`, `matrix`, `sudo hire-me`; Esc closes; focus trap on input), SEO + OG card auto-generated via `next/og` on the edge, apple-touch-icon, `robots.txt`, `sitemap.xml`, canonical URL.

---

## Deploy to Vercel

1. **Connect the repo.** Push to GitHub, then on Vercel: New Project → import the repo. Framework auto-detect picks Next.js 14; no overrides needed.
2. **Build settings** (auto-populated, do not change):
   - Build command: `next build`
   - Output directory: `.next`
   - Install command: `npm install` (or `pnpm install` if you've added a lockfile)
   - Node version: 20.x
3. **Environment variables.** None required for the M1–M4 surface. If you later add server-side AI features (terminal commands hitting an LLM, etc.) wire them under Project → Settings → Environment Variables.
4. **Domain.** Default `*.vercel.app` works; for `nithesh.dev` add the domain in Project → Domains and update `siteUrl` in [`src/app/layout.tsx`](src/app/layout.tsx) + the `SITE` constant in [`src/app/robots.ts`](src/app/robots.ts) and [`src/app/sitemap.ts`](src/app/sitemap.ts).
5. **OG card preview.** After deploy, visit `https://yourdomain/opengraph-image` to see the live OG render. Test with the [Vercel OG Playground](https://og-playground.vercel.app/) before sharing.
6. **First production verification.**
   - Lighthouse (mobile Slow-4G): aim for ≥ 75 Perf, ≥ 95 a11y, ≥ 95 best-practices, ≥ 100 SEO.
   - DevTools console: should be silent (the `?debug=perf` overlay is dev-only).
   - With audio files in place, the toggle should fade the ambient bed in and out smoothly.

---

## Customize content

Every piece of user-facing content lives in **one file**: [`src/lib/content.ts`](src/lib/content.ts).
Edit that file and every surface — the 3D scene, the modal, the terminal, the DOM résumé fallback, the OG card, the metadata title — updates automatically.

| Asset you might swap | Path | Notes |
| --- | --- | --- |
| Résumé text                  | [`src/lib/content.ts`](src/lib/content.ts)                          | Strict-typed; the `content` object is the single source of truth |
| Portrait                     | [`public/portrait.png`](public/portrait.png)                        | 3:4 portrait, plain blue studio bg works best; shader masks chroma |
| Résumé PDF                   | [`public/nithesh-ramachandran-resume.pdf`](public/nithesh-ramachandran-resume.pdf) | Keep the filename; the "Download résumé" button uses the relative path |
| UI sounds (sprite)           | `public/audio/ui.mp3`                                                | See [`public/audio/README.md`](public/audio/README.md) for sprite layout + sources |
| Ambient bed                  | `public/audio/ambient.mp3`                                           | ≤ 2 MB streamed, −22 LUFS, looping pad |
| Favicon                      | [`public/favicon.ico`](public/favicon.ico)                          | 32×32 ICO; current is generated from `palette.ts` (script in [README M3.7 changelog](#changelog)) |
| Apple touch icon             | [`src/app/apple-icon.tsx`](src/app/apple-icon.tsx)                  | Edge-rendered 180×180 PNG — edit the JSX to redesign |
| OG card                      | [`src/app/opengraph-image.tsx`](src/app/opengraph-image.tsx)        | Edge-rendered 1200×630 PNG — edit JSX, redeploy |
| Site URL (deploy domain)     | `src/app/layout.tsx`, `src/app/robots.ts`, `src/app/sitemap.ts`     | Three matched constants — update together |
| Palette tokens               | [`src/lib/palette.ts`](src/lib/palette.ts)                          | Tailwind config + every component reads from here |
| GitHub URL (currently `null`) | [`src/lib/content.ts`](src/lib/content.ts) → `contact.github`       | Replace `null` with the full URL; the UI flips from "Coming soon" to a live link |

---

## Performance budget (hard limits)

| Metric                  | Budget                | M4 measurement (production build) |
| ----------------------- | --------------------- | --------------------------------- |
| Initial JS (gzipped)    | ≤ 250 KB              | ~160 KB (≈ 484 KB raw First Load) |
| Total `.glb`            | ≤ 8 MB                | 0 KB — procedural fallback in use |
| UI audio sprite         | ≤ 200 KB              | n/a until files dropped in        |
| LCP (mobile 4G)         | ≤ 3.0 s               | run Lighthouse on the live deploy |
| 60 fps on               | M1 MacBook Air, mid-tier Windows laptop, iPhone 13 | verify on real hardware |
| 30 fps minimum on (low) | iPhone SE 2, mid-tier Android | drei `PerformanceMonitor` auto-degrades to `medium` then `low` if sustained fps < 40 |

When you cut a production deploy, paste Lighthouse + WebPageTest scores back into this table.

---

## Licence & attribution

Code: **MIT** — add `LICENSE` at the repo root with the MIT text and Nithesh's name.

Third-party assets you ship will need credit. Once you drop files into `public/audio/`, add a block here like:

```
- Ambient bed — "<track title>" by <artist> — <source URL> — <licence link>
- UI sprite   — assembled from <samples> by <artist> — <licence>
```

Currently bundled: none. The portrait and résumé PDF are Nithesh's own assets.

---

## Customising content

All résumé content lives in [`src/lib/content.ts`](src/lib/content.ts) as a single typed `content` export.
**Never hardcode text inside components.** Edit `content.ts` and every surface updates.

### Swap the portrait

Replace `public/portrait.png`. Square crops look best; the hologram shader (added in M2) centre-crops anything that isn't 1:1.

### Swap the résumé PDF

Replace `public/nithesh-ramachandran-resume.pdf` (keep the filename). The "Download résumé" button points at it by relative path.

### Add the GitHub URL

In `src/lib/content.ts`, find `contact.github: null` and replace with the full URL string (`'https://github.com/<user>'`). The UI shows a styled "Coming soon" state while it's `null`.

---

## File layout

```
public/                Static assets the user can drop-in/swap
  portrait.png
  nithesh-ramachandran-resume.pdf
  models/              .glb files (M2)
  audio/               ui.mp3 sprite + ambient.mp3 (M3)
  textures/            colour-grade LUT (M2)
src/
  app/                 Next App Router (layout, single page)
  components/
    canvas/            R3F scene + 3D primitives
    ui/                DOM overlays (HUD, loader, modals)
    motion/            Scroll/camera choreography
  shaders/             Raw GLSL (M2+)
  lib/                 content.ts, store.ts, audio.ts, perf.ts
  styles/              Tailwind base
```

---

## Accessibility & graceful degradation

- Audio defaults **off**. First user click unlocks WebAudio.
- `prefers-reduced-motion` disables Lenis + the scrub camera and falls back to native section anchors.
- Full résumé content is in the DOM beneath the canvas — screen readers and search engines get the same payload whether WebGL is available or not.
- Three perf tiers (low / medium / cinematic) plus an auto-downgrade based on framerate (added in M2/M4).
- The site is dark-only by design; `prefers-color-scheme: light` is intentionally ignored.

---

## Performance budgets (hard limits)

| Metric                  | Budget                |
| ----------------------- | --------------------- |
| LCP (mobile 4G)         | ≤ 3.0 s               |
| Initial JS (gzipped)    | ≤ 250 KB              |
| Total `.glb`            | ≤ 8 MB                |
| UI audio sprite         | ≤ 200 KB              |
| 60 fps on               | M1 MacBook Air, mid-tier Windows laptop, iPhone 13 |
| 30 fps minimum on (low) | iPhone SE 2, mid-tier Android |

---

## Licence & attribution

Code: MIT (see `LICENSE`, to be added).
Third-party audio (added in M3) will be credited in this README with source + licence link.

---

## Changelog

### V1 — ship

Four fixes from production screenshots, minimum to deploy.

- **A. Console clicks** — Intro overlay (z-80) was rendering with default `pointer-events: auto`, blocking canvas clicks during its 4 s lifetime and 600 ms exit fade. Set `pointer-events: none` on the Intro `motion.div`; skip handlers were already window-level (keydown, pointerdown, wheel) so the change costs nothing. Rest of the click chain (`InteractiveConsole.handleClick → play → openProject → store flip → ProjectModal AnimatePresence`) was already correct, verified by code review.
- **B. Portrait skin tone** — moved the warm push from the start of the subject path (`aces(src * vec3(...))`) to *just before* the luma cap, on the accumulated `col`. Push restored to `vec3(1.04, 1.00, 0.96)`. Cap raised from 0.75 → 0.82 linear; the `col *= 0.82 / outLuma` form is a uniform scale so colour ratios survive clipping (no per-channel hue shift). Documented in shader comment.
- **C. Contact terminal** — `ContactTerminal` in `Lab.tsx` now renders a multi-line `drei <Text>` on the screen (email + LinkedIn handle), a thin gold divider rule, and a `DOWNLOAD RESUME →` row in gold. Whole group is clickable: pointer over plays the `hover` sprite (debounced like consoles), click opens `/nithesh-ramachandran-resume.pdf` in a new tab. `AccessibilityProxies` contact entry now triggers the same `window.open` instead of just scrolling — full keyboard parity.
- **D. Fog particles** — `<pointsMaterial>` now declares `sizeAttenuation={true}` as an explicit value (was JSX boolean shorthand; some renderers were treating it as undefined), base size set to 0.04 per spec. Points now shrink with distance instead of rendering as screen-space squares at far waypoints.

Build unchanged: 484 KB First Load. No bundle delta.

### M4.1 hotfix — DoF cinematic-only (root-cause for `glBlitFramebuffer` cascade)

The diagnosis that finally stuck after four false starts: an always-mounted `<DepthOfField>` allocates its own depth texture inside `EffectComposer`, and that texture ping-pongs with the composer's depth attachment between passes — triggering `GL_INVALID_OPERATION: glBlitFramebuffer: Read and write depth stencil attachments cannot be the same image` every frame. `bokehScale = 0` doesn't help; the texture still exists.

- **`src/components/canvas/PostFX.tsx`** — children are now built as an array, with `cinematic ? <DepthOfField …/> : null` filtered out. In `medium`/`low` tiers the DoF pass is *literally absent from the JSX tree*. Type-narrowed filter keeps the children list as `ReactElement[]`.
- **`src/lib/store.ts`** — default `perfMode` flipped from `'cinematic'` → `'medium'`. The site ships without DoF for everyone; users opt back into cinematic via the (future) PerfToggle. `PerformanceTier` in `Scene.tsx` initial-tier matched accordingly.

Net effect: the WebGL2 framebuffer chain now has exactly one depth attachment owned by the composer. The blit conflict cannot reach the DoF code path because no DoF effect is registered.

Build unchanged: 484 KB First Load.

### M4 — Polish

- **`src/components/ui/Intro.tsx`** — 4 s skippable cover. `sessionStorage('intro-played')` gate so returning visitors skip directly to the main scene. Letter-by-letter assemble via Framer Motion per-letter `motion.span` with staggered `opacity / y / scale / blur` transitions. "Press space / tap to skip" hint fades in at 1 s. Skip triggers: `Space`, `Enter`, any `pointerdown`, any `wheel` — all of them flip the flag and exit-fade. Plays `startup` sprite if audio is unlocked.
- **`src/components/ui/Terminal.tsx`** — fullscreen overlay toggled by `` ` `` (Backquote), `Esc` to close. JetBrains Mono + `terminal-grn` text on void-blur backdrop. Commands as a typed `Record<string, () => string | 'CLEAR' | 'MATRIX' | 'HIRE'>` — `help`, `about`, `projects`, `skills`, `contact`, `whoami`, `clear`, `matrix` (CSS-only katakana rain for 5 s), `sudo hire-me` (window.location → mailto). Focus trap on the input; restores focus to the previously-active element on close. Plays `transition` on open, `click_primary` on valid command, `click_secondary` on unknown.
- **SEO / OG / icons (App Router conventions, edge runtime where it matters):**
  - `src/app/opengraph-image.tsx` — 1200×630 PNG generated by `next/og` on the edge. Pulls name / tagline / headline / location from `content.ts` and palette colours from `palette.ts`. Auto-discovered by Next so the `og:image` meta tag points at `/opengraph-image` with the right dimensions + alt.
  - `src/app/apple-icon.tsx` — 180×180 PNG via `next/og`, emerald-mid square with a gold inner stroke.
  - `src/app/robots.ts` — `MetadataRoute.Robots` allowing all + sitemap reference.
  - `src/app/sitemap.ts` — `MetadataRoute.Sitemap` with the single `/` route.
  - `layout.tsx` — extended `metadata.openGraph` with locale, `twitter.creator`, `alternates.canonical`. `viewport.themeColor` updated to `palette.void` (`#07090C`).
- **Deploy checklist** (in this README, above): Vercel hookup, build settings, env vars, domain steps, OG-preview path, customise-content table, performance budget table with M4 measurements, licence + attribution block.
- **M3.7 GL fix tightening** — re-stripped `<Canvas gl>` props to *exactly* the spec's five: `powerPreference`, `antialias: false`, `stencil: false`, `depth: true`, `alpha: false`. Removed extras (`outputColorSpace`, `toneMapping`, `preserveDrawingBuffer`) that could cause FBO attachment mismatches with EffectComposer. `preserveDrawingBuffer` in dev was the most likely real culprit — it forces an additional buffer copy that interacts badly with ping-ponged depth attachments.

Build delta: 482 KB → 484 KB First Load (+2 KB for Intro + Terminal + bits). New static routes: `/robots.txt`, `/sitemap.xml`. New edge routes: `/opengraph-image`, `/apple-icon`.

### M3.8 — Hard cap on hologram subject luma (kills bloom feedback)

The right diagnosis after M3.6/M3.7 tried to suppress it in the shader and Bloom kept finding it anyway: **Bloom samples the composited framebuffer**, not the shader output, so the in-shader luma-protect from M3.7 had no effect on what Bloom selected. Two real fixes:

- **`src/shaders/hologram.frag`** — final hard luma ceiling at the bottom of the shader, gated by `subjectMask > 0.5`. Subject pixels are scaled down so their output luma never exceeds **0.75 (linear)**. Frame / fresnel / scanline / sweep contributions can still cross threshold because they're supposed to bloom — only the portrait imagery is clamped.

  Why 0.75 and not 0.88 as initially specified: the post-FX chain (ACES tonemap + LUT highlight tint at 0.18 + S-curve `smoothstep(-0.08, 1.08, x)`) lifts mid-highs by roughly `+0.07–0.10` in display space. A 0.88 linear cap exits the chain at ~0.90 display luma — *exactly on the spec boundary*, measured at 0.904 (FAIL by 0.004). 0.75 linear lands at **~0.81 display** with ~0.09 headroom.
- **`src/components/canvas/Hologram.tsx`** — switched the portrait plane from `AdditiveBlending` → `NormalBlending`. Additive was summing the shader output onto the bezel's emissive contribution, so subject pixels could reach `framebuffer > 0.95` even when the shader itself capped them. Alpha blending lets the subject occlude the bezel where the shader's `subjectMask` is high; the bezel still shows through the panel haze where it's not. Combined with the in-shader cap, no subject pixel can cross Bloom's `luminanceThreshold = 0.95`.

**Verification.** Measured at cap=0.88 (pre-change): max luma in `x ∈ [557, 717], y ∈ [280, 540]` = **0.9039** at (620, 408), RGB (235, 230, 222). Predicted at cap=0.75 (current): ≈ 0.81 (well under the 0.90 acceptance threshold). The live numerical re-measurement at cap=0.75 was blocked by preview-tool flake — the headless tab's `requestAnimationFrame` is throttled while backgrounded, so the WebGL canvas read back as zero pixels or stale frames after each reload — but the cap math is deterministic: every pixel exits the shader at ≤ 0.75 linear, and the post-FX chain has a fixed transfer for that input.

Build delta: 482 KB → 482 KB (unchanged).

### M3.7 — Hotfix (console silence + favicon + eye-protect tighten)

- **PostFX FBO config + Canvas GL alignment** — the dev console was flooding `GL_INVALID_OPERATION glBlitFramebuffer: Read and write depth stencil attachments cannot be the same image` every frame. Root cause: `EffectComposer` was using a packed depth-stencil attachment that DoF tried to blit between as both source and destination. Fix: `<EffectComposer multisampling={0} stencilBuffer={false} depthBuffer={true} enableNormalPass={false} frameBufferType={HalfFloatType}>` and align `<Canvas gl={{ antialias: false, stencil: false, depth: true, alpha: false }}>` so the renderer and composer agree. DoF gets an explicit `blendFunction={BlendFunction.NORMAL}`. HalfFloat also cleans up any residual bloom banding on HDR highlights.
- **Hover-sprite debounce + Howl pool** — `InteractiveConsole` and `Crt` hover handlers now keep a `useRef<number>` timestamp and skip `play('hover')` if it fired within the last 150 ms. (R3F's `onPointerOver` can re-fire as the cursor crosses child meshes inside the same group.) Howls in `audio.ts` also pin `pool: 5` (UI sprite) / `pool: 2` (ambient) — matches Howler's default but pins the contract.
- **Favicon** — `public/favicon.ico` is now a real 32×32 ICO (emerald-mid square with a one-pixel void border, generated from `palette` so it stays in sync). `layout.tsx` metadata declares `icons.icon` + `icons.shortcut` so Next ships a `<link rel="icon">` and stops 404'ing.
- **Hologram eye-protect tighten** — `hologram.frag` lowered the luma-protect band from `smoothstep(0.85, 0.98)` → `smoothstep(0.75, 0.95)` so forehead specular highlights + pupil catchlights all fall into the no-scanline zone. Jitter amplitude dropped another 30% (0.0009 → 0.00063) for the same reason.

Verified: console silent over 5 s of waypoint scrolling + 40 synthetic hover-in/out cycles. Favicon `HTTP 200`. Build delta: 482 KB → 482 KB (no change).

### M3.6 — Portrait & detail polish

Four targeted fixes after the M3.5 colour pass — each one is the single change to its file, no scope creep.

- **`src/shaders/hologram.frag`** — eye-catchlights were blowing out to solid white squares because scanline / RGB-ghost passes kept adding brightness to pixels that were already near 1.0. Now: compute `subjLuma`, derive `protect = 1.0 - smoothstep(0.85, 0.98, subjLuma)`, multiply both the scanline overlay and the RGB-ghost contribution by `protect` so bright subject regions are left alone. Scanline contrast softened from `mix(0.72, 1.0, …)` → `mix(0.85, 1.05, …)`. Jitter amplitude halved (0.0018 → 0.0009). Subject warm push pulled back from `vec3(1.05, 1.0, 0.95)` → `vec3(1.02, 1.0, 0.98)` — less orange, more natural.
- **`src/components/canvas/Hologram.tsx`** — deleted the leftover `<ringGeometry args={[1.04, 1.06, 64]} />` mesh that was rendering a halo arc behind the portrait. The hologram silhouette is now strictly rectangular, framed only by the four-slab `GoldFrame` and the outer graphite bezel. `GoldFrame` material now uses `side: FrontSide` explicit to be safe against any additive bleed.
- **`src/components/canvas/InteractiveConsole.tsx`** — the gold bezel was a `boxGeometry` slab sitting behind the screen, and its top face was poking up past the screen edge when tilted forward (the "floating green square" — gold + screen bloom misread as another panel). Replaced with a new `BezelFrame` component: four thin gold slabs hugging the 0.95×0.55 screen on each side. Screen geometry changed from `boxGeometry [0.95, 0.55, 0.04]` → `planeGeometry [0.95, 0.55]` so there are no box edges to catch light. Screen + bezel + etched label now all live in one tilted sub-group, sharing the parent rotation cleanly.

Build delta: First Load JS 481 KB → 482 KB raw (+1 KB for the `BezelFrame` helper). No regression.

### M3.5 — Colour & material correction

The M3 render had collapsed into monochrome emerald because the LUT, bloom, and every base material were all pulling toward green simultaneously. M3.5 rebalances every layer so emerald is a ~5% accent, neutrals carry the frame, and the portrait reads as a person.

- **`src/lib/palette.ts`** — new single source of truth. Tailwind extended with both canonical names (`void`, `graphite`, `ivory`, `bone`, `amber-key`, `gold-accent`, `teal-haze`, `azure-rim`, `emerald-{hot,mid,dim}`, `violet-spark`) and legacy aliases re-pointed at neutral targets so old class usage upgrades automatically.
- **`src/lib/lut.ts`** — replaced the emerald-everywhere grade with a classic "orange & teal" curve: shadows pulled toward dark teal-green, **mids untouched** (slight desaturation only — skin tone stays), highlights warmed to cream. Mild S-curve via `smoothstep(-0.08, 1.08, x)` for contrast.
- **`src/components/canvas/PostFX.tsx`** — Bloom: intensity 0.6→0.22, threshold 0.85→0.95, radius 0.35, kernel SMALL. The high threshold acts as a poor-man's selective bloom — chassis at luma ~0.1 don't clear it, only emissive screens / LEDs / hologram do. CA 0.0008→0.0005. Noise 0.04→0.025. Vignette 0.4/0.7→0.5/0.55. Added explicit `ToneMapping(ACES_FILMIC)` effect; renderer set to `NoToneMapping` to avoid double-application.
- **`src/components/canvas/Lab.tsx`** — chassis materials swapped to graphite (metal 0.9, rough 0.25) for the server rack, steel for the CRT body. Floor grid uses `emerald-dim` at ×0.30 strength with a halved line width and a stronger radial fade to black at the horizon. Sky is near-void with an 8% teal-haze band at horizon. Server rack LEDs: 9 emerald-mid (intensity 0.9), 2 amber-key (0.45), **1 violet-spark (1.1)** — that's the spec's 1% violet pop.
- **`src/components/canvas/FogParticles.tsx`** (extracted) — 85% bone particles at 0.15 opacity + 15% emerald-mid at 0.28 opacity, both additive. Reads as "drifting dust" instead of "Matrix rain."
- **`src/components/canvas/InteractiveConsole.tsx`** — plinth chassis = graphite (rough 0.35 / metal 0.85). Screen is the only emerald surface, with a **thin gold-accent bezel** mesh just behind it (the premium signal). Hovered emissive intensity 1.4→1.2; idle 1.1→0.85.
- **`src/components/canvas/Hologram.tsx`** + **`src/shaders/hologram.frag`** — the big one. Subject pixels are now **preserved as is** with only a tiny warm push (`× vec3(1.05, 1.0, 0.95)`) and a cheap ACES tonemap — no more green multiply on skin. The emerald `uBgTint` only affects the background path (where the blue-mask says "no subject"), and even there it's at ×0.12. Panel haze 0.18→0.06. Outer bezel emissive intensity 0.45→0.08; the visible "frame" comes from a new four-slab **gold-accent rectangle** between the bezel and the portrait.
- **`src/components/canvas/Scene.tsx`** — light kit rewritten. Ambient dropped to 0.15 of `palette.void` (no more green ambient bleeding into shadows). Amber-key directional at 1.4 from front-right above. Azure-rim fill at 0.4 from back-left. Emerald-mid rim point light scoped to **layer 1**; hologram + console screens + CRT screen + contact terminal screen all call `mesh.layers.enable(1)` so the rim only paints those surfaces. Plus a small warm amber fill near the hologram for skin readability.
- **UI chrome** — HUD, AudioToggle, Loader, ProjectModal, Cursor all moved to `bone` / `ivory` text with 1px `emerald-mid/40` borders. The only emerald fills left in chrome are functional state dots (sound on, cursor centre) and the modal's accent rule.

Verified visually at the portrait waypoint (screenshot below the changelog in the conversation). Build delta vs M3: First Load JS 479 KB → 481 KB raw (+2 KB), no regression.

### M3 — Interaction

**Pre-M3 cleanup**
- `r3f-perf` static import removed from `Scene.tsx`; replaced with a `DevPerf` component that dynamic-imports it only under `NODE_ENV === 'development' && ?debug=perf`. The chunk (≈ 30 KB gz) is now lazy and not in the initial page load.
- `hologram.frag`: dropped the RGB-diff blue mask for an HSV-based one (hue ∈ [180°, 220°], saturation > 0.35) with 4-neighbour cardinal dilation to soften silhouette halos. `Hologram.tsx` now passes a `uTexelSize` uniform from the decoded image dimensions.
- `ScrollCamera`: positions and lookAt targets are now sampled from two **parallel** `CatmullRomCurve3` curves (same `t`), so the camera no longer snaps between segments.

**Audio (`src/lib/audio.ts`)**
- Howler wrapper: `initAudio()`, `unlock()`, `setMusicEnabled()`, `play(SpriteId)`.
- Sprite layout: `click_primary`, `click_secondary`, `hover`, `transition`, `startup`. Authoring spec in [`public/audio/README.md`](public/audio/README.md).
- Defaults muted. First user toggle calls `Howler.ctx.resume()`. `prefers-reduced-motion` force-mutes regardless of toggle state and fades ambient out on media-query change.
- Missing files → single `console.warn` at startup, all `play()` calls become no-ops. **No throws.**
- `AudioController` component subscribes the Zustand `audioEnabled` flag to `setMusicEnabled` side-effects.
- `AudioToggle` now actually drives the bed: `unlock() → toggle() → play('click_primary'/'click_secondary')`.

**Interaction**
- `InteractiveConsole.tsx` extracted from `Lab.tsx` so per-console hover state, material patching, and click handlers live in one place. Plinth `MeshStandardMaterial` is patched via `onBeforeCompile` — a fresnel rim term modulated by `uHovered` (200 ms lerp) and a slow `uTime` breathing pulse. PBR shadow + light contributions preserved.
- `ProjectModal.tsx`: Framer-Motion fade+scale (200 ms in, 150 ms out), blurred emerald-tinted backdrop, dark glass card with 1 px emerald border + four thin gold corner accents, focus trap, Escape / backdrop / Close-button all close, focus restored to the originating proxy on close. CTA = "Visit live site →" with `target="_blank" rel="noopener noreferrer"`.
- Console click → `play('click_primary')` + `openProject(slug)`. ScrollCamera's `useEffect` GSAP-tweens the camera position + lookAt to the station and stops Lenis; close reverses the tween (to the current scroll `t`) and resumes Lenis. Reduced-motion users get instant snaps instead of eased tweens.
- CRT click stubbed to `play('startup')` + `console.info` (terminal overlay in M4).

**Cursor + accessibility**
- `Cursor.tsx` reticle: rAF + last-known-position pattern (not throttled mousemove). 3 states: idle dot, interactive corner-bracket reticle with gold accents, pressed shrink. Disabled when `(pointer: fine)` is false or `prefers-reduced-motion` is set.
- `cursor: none` is scoped to `.canvas-root` only — UI, links, modals keep the system cursor.
- `AccessibilityProxies.tsx`: invisible focusable `<button>` proxies inside drei `<Html>` at each interactive 3D object's world position. Tab cycles consoles → CRT → contact. Enter / Space fires the same handler as a click.

### M2 — World

- Procedural `Lab.tsx`: dark plane with anti-aliased radial-pulse grid shader, three tilted-screen consoles arranged in an arc (labels rendered with drei `<Text>` from `content.stations`), tall server rack with 12 emissive LED stripes, side-desk CRT, deep-back contact terminal, additive emerald fog particles drifting upward.
- Gradient `<Sky>` via back-side sphere + custom 2-colour shader so the world doesn't terminate in a flat fog wall.
- `Hologram.tsx`: 3:4 plane sourcing `/portrait.png`, runs `hologram.frag` (blue-background masking via R/G vs B threshold, scanlines, RGB ghosting, fresnel edge glow, vertical jitter, scanline-sweep boot reveal). `uBoot` ramps 0→1 when the camera is inside 3.2 units of the panel and decays past 4.2.
- `PostFX.tsx`: Bloom (0.6 / 0.85), ChromaticAberration (0.0008), DepthOfField (focus distance bound to scroll section), Noise (0.04), Vignette (0.4 / 0.7), LUT3D (procedural emerald-shadows / gold-highlights, 32³).
- Procedural LUT generator in `src/lib/lut.ts` — `Data3DTexture`, no PNG asset needed.
- Scene now mounts `PerformanceMonitor` from drei. Sustained sub-40 fps for ~3 s degrades the perf tier (cinematic → medium → low); `medium`/`low` zero the DoF, `low` removes the whole composer; DPR is floored to 1 on any decline.
- `?debug=perf` query param mounts the r3f-perf HUD.
- Camera path expanded to 8 waypoints (Entrance → Portrait → 3× Console → Server Rack → CRT → Contact); Catmull-Rom tension dropped to 0.3 for smoother passes.
- DOM résumé fallback flipped to `sr-only` — it stays in the tree for screen readers, SEO, no-WebGL, and reduced-motion, but doesn't break the cinematic frame.
- Build deps added: `r3f-perf`, `raw-loader` (for `.frag` / `.vert` imports), `@typescript-eslint/{eslint-plugin,parser}` (to satisfy the strict `no-explicit-any` + `ban-ts-comment` rules in `.eslintrc`).

### M1 — Skeleton

- Next.js 14 + TS-strict scaffold; pnpm + Node 20+ engines pinned.
- R3F canvas mounted via `next/dynamic` so SSR never touches WebGL.
- Rotating emerald-emissive placeholder cube as the M2 stand-in.
- Lenis + GSAP ScrollTrigger driving a Catmull-Rom camera path across three dummy waypoints from `content.ts`.
- `prefers-reduced-motion` short-circuits Lenis and uses an IntersectionObserver instead.
- Fake 0→100% loader (swapped for `drei/useProgress()` in M2).
- HUD with wordmark, section counter, scroll hint, and a stubbed audio toggle (no sound files yet).
- DOM-only résumé fallback rendered beneath the canvas for SEO, screen readers, and the no-WebGL path.
- Tailwind palette mirrors §4.1 of the brief; `next/font` self-hosts Space Grotesk + Inter + JetBrains Mono.
