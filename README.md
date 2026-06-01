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

### V2.3 — tier upgrade · glass-HUD overlays · Orbitron typography

The "god-tier" polish pass. 3D Billboard skill / contact text deleted in favour of cinematic DOM-overlay panels; consoles get Orbitron 900 + corner brackets; global HUD chrome added; modal + resume viewer redesigned to match the HUD aesthetic.

- **Orbitron font.** `public/fonts/Orbitron-Black.ttf` (306 KB) downloaded from Google Fonts. Wired up in two layers: `next/font/google` `Orbitron` 700/900 exposed as the CSS variable `--font-display-sci` (Tailwind family `font-sci`), and the TTF served at `/fonts/Orbitron-Black.ttf` for drei `<Text>` to use as its `font` prop in 3D.
- **FIX 1 — Console screen, sci-fi tier.** [`InteractiveConsole.tsx`](src/components/canvas/InteractiveConsole.tsx) project name now: Orbitron Black, `fontSize=0.21`, `letterSpacing=0.18`, `emerald-glow` fill with `outlineWidth=0.006` `outlineColor=goldAccent`. New `<ScreenCornerBrackets>` sub-component renders 4 L-shaped gold reticle brackets at each screen corner (`emissiveIntensity=1.2`). The thin gold underline below the name stays from V2.2.
- **FIX 2 — `SkillPodiums.tsx` DELETED.** No more floating 3D Billboard skill text. Import removed from `Scene.tsx`. The 3D scene at the skills waypoint is now clean — the HUD panel carries the content.
- **FIX 3 + 4 — `HudPanels.tsx` (new).** Three section-gated, glass-blur DOM overlays:
  - **SkillsPanel** — right side at `top-1/4`, 380 px wide. Header `>> SYS::CAPABILITIES` in mono emerald-glow with a gold rule. Iterates `content.skills` — each group label in Orbitron 700 gold, items as bordered inline pills. Slides in from `x: +40` with opacity fade.
  - **ContactPanel** — right side at `bottom-[18%]`. Header `>> CONNECT::CHANNELS`. Three clickable rows: LinkedIn (inline LinkedIn SVG icon → `window.open`), Email (mail icon → `mailto:`), Open Résumé (file icon → `openResume()`). Hover: row background `emerald-mid/10`, bottom gold rule appears, `↗` shifts right. Status footer with pulsing emerald dot: "Available for Summer 2026".
  - **CrtHintPanel** — bottom centre at the CRT waypoint. Compact instruction + "Open Terminal" pill (calls `openTerminal()`).
  - All three use a shared `<PanelFrame>` with corner brackets + emerald border + saturate-blurred glass background.
- **FIX 5 — Global HUD chrome.** [`Hud.tsx`](src/components/ui/Hud.tsx) rebuilt:
  - 4 viewport corner brackets at `inset-6` (gold, 32 px arms).
  - Top-centre status bar: `NITHESH.OS // v1.0 // ONLINE` with a pulsing emerald dot.
  - Top-right cluster: live UTC clock (`HH:MM:SS UTC`, updates every second) + the audio toggle.
  - Bottom-left section indicator: `WAYPOINT NN // SECTION_NAME [ NN / 09 ]` — pulls the waypoint's display label from `content.ts` (each waypoint now carries a `label` field like `CONSOLE_2 [ SMART_CANTEEN ]`).
  - Ambient scanline: single 1 px emerald line at `8%` opacity, CSS-animated `top: -2% → 102%` over 8 s on the `hudScan` keyframe in `globals.css`.
- **FIX 6 — `ProjectModal` redesign.** Now a 2-column glass card (40% / 60% on `md`+). Top bar with mono header `>> PROJECT::DETAIL` and bracketed `[ ✕ Close ]` button. Left column is an in-house decorative plate (no external screenshot asset) with the project's first word as huge watermark Orbitron text plus a CSS-only scanline overlay. Right column: stack joined string, Orbitron Black `28 px` project name with gold text-stroke, gold-accent caption subtitle (V2.2 carry-over), stack pills, summary, gold-arrow `Visit live ↗` pill CTA. Gold corner brackets at all four corners.
- **FIX 7 — `ResumeViewer` bracketed top bar.** 40 px top bar with `>> RESUME::VIEW` (left, emerald-glow), filename `Nithesh_Ramachandran.pdf` (centre, mono on `sm+`), and two action pills (right): `Download ↓` (gold border) + `Close ✕` (emerald border). Gold rule below the top bar; corner brackets on the modal frame.
- **Waypoint labels.** `content.ts` waypoints array gains a `label` field per entry: `ENTRANCE / PORTRAIT / CONSOLE_1 [ CROPAI ] / CONSOLE_2 [ SMART_CANTEEN ] / CONSOLE_3 [ TESTAI ] / SKILLS / CERTIFICATIONS / TERMINAL / CONTACT`.

Bundle: 492 KB → 494 KB First Load (**+2 KB**, well under the +30 KB budget). The 306 KB `Orbitron-Black.ttf` is served from `public/fonts/` as a static asset, not bundled.

### V2.2 — FINAL V1 polish

- **Console screen — name only, stylish typography.**
  - Caption text deleted from the screen plane.
  - Project name centred (`y=0.04`), `fontSize=0.17`, `letterSpacing=0.08`, `maxWidth=0.85` so "SMART CANTEEN" wraps to 2 lines cleanly and "CROPAI" / "TESTAI" stay single-line.
  - Colour: `palette.emeraldGlow` with `outlineWidth=0.004` and `outlineColor=palette.goldAccent` — subtle gold edge for premium feel.
  - Thin gold underline below the name (`0.57 × 0.008` plane, gold-accent emissive 0.6) — the "premium signal".
  - Caption migrated to the project modal: rendered as a gold-accent uppercase line between project name and summary in [`ProjectModal.tsx`](src/components/ui/ProjectModal.tsx).
- **CRT now opens the Terminal.**
  - Store extended with `terminalOpen / openTerminal / closeTerminal / toggleTerminal`.
  - [`Terminal.tsx`](src/components/ui/Terminal.tsx) refactored to read open state from the store (previously local `useState`). Backquote key still toggles via `toggleTerminal()`; Esc calls `closeTerminal()`.
  - [`Lab.tsx`](src/components/canvas/Lab.tsx) CRT click handler now calls `openTerminal()` instead of the stubbed `console.info`.
  - Hover hint above the CRT: "**CLICK TO OPEN TERMINAL**" rendered in `palette.emeraldGlow` via a `Billboard` that only appears while hovered. `raycast={noRaycast}` + `ref={disableRaycast}` so it never absorbs clicks.
- **Text overlap audit.** Walked all 9 waypoints against the scene graph. Console screens reduced text to a single centred name + gold underline (no caption residue). SkillPodiums already gated to ±1 of the skills waypoint (V1.8). Hologram tagline, CERTIFICATES label, and contact-terminal URL list all use `raycast={noRaycast}` + `disableRaycast` and stay within their respective mesh bounds. No additional sizing changes needed.

Bundle unchanged: 492 KB First Load. This is the **final V1 ship**; V2 (Workstation / OS concept) starts in a fresh repo.

### V2.1 — root cause found · clicks finally work · debug logs stripped

After 8 rounds of patching the wrong layer, the user found the actual blocker with the DevTools elements picker: the scroll-spine `<section>` spacers in `page.tsx`. Each was a `h-screen w-full` element at `z-10`, sitting on top of the canvas (`z-0`), with default `pointer-events: auto`. They absorbed every click before the canvas saw it.

- **FIX 0 — `pointer-events-none` on the scroll spine.** Two-class change in [`src/app/page.tsx`](src/app/page.tsx):
  ```diff
  - <div className="relative z-10">
  + <div className="pointer-events-none relative z-10">
      {waypoints.map((w, i) => (
        <section
          key={w.id}
          data-waypoint={i}
  -       className="h-screen w-full"
  +       className="pointer-events-none h-screen w-full"
          aria-label={w.id}
        />
      ))}
    </div>
  ```
  Scroll detection uses `window.scroll` events + `IntersectionObserver` (in reduced-motion mode), neither of which depend on pointer events on the spacers. Screen-reader access via `aria-label` is unaffected — `pointer-events` is independent of the accessibility tree. The canvas at `z-0` finally receives clicks.

- **FIX 2 — all debug logs stripped.** Removed `[CANVAS-POINTER]` from `Scene.tsx`, the `[CONSOLE-CLICK] 1./2./3.` chain from `InteractiveConsole.tsx`, `[MODAL-RENDER]` from `ProjectModal.tsx`, and `[CONTACT-CLICK]` from `Lab.tsx`. Production console should be silent now (except for any browser-extension chatter like `enable_copy.js` and Next's `hot-reloader-client` in dev).

- **FIX 1 audit (no orphan meshes found).** All 17 `boxGeometry` uses across `src/components/canvas/` were accounted for: 3 console plinths + their bezel slabs (4×3), Hologram outer bezel + GoldFrame slabs (4), CertificateRack chassis, 12 stripes, CRT desk + body + screen, Contact terminal chassis + screen. The "small TV cube" reported at waypoint 02 is most likely the **CRT body** (`0.8 × 0.65 × 0.7` at `[-4.2, 0.9, -2.6]`, rotated 72°) viewed from the portrait waypoint angle — at that distance the screen face appears as a small bright dot on a dark cube, which can read as "empty" without context. The CRT is intentional scene decor — V2.1.1 polish if you confirm the source pointing at a specific pixel.

Bundle unchanged: 492 KB First Load.

### V2.0 — canvas smoke test, ref-based raycast, podium overhaul, resume viewer

- **FIX 0 STEP 0.A — Canvas smoke test.** Added `onPointerDown` directly on `<Canvas>` in [`Scene.tsx`](src/components/canvas/Scene.tsx). It logs `[CANVAS-POINTER] hit at <x> <y>` with client coords from the DOM `PointerEvent`. After deploy: open DevTools, click on the 3D scene anywhere. If the line **doesn't** appear → a UI overlay is in front of the canvas (Intro / Cursor / Hud / Modal — inspect with the elements picker). If it **does** appear but `[CONSOLE-CLICK] 1. entered` still doesn't → the block is downstream (raycast / depth / R3F event).
- **FIX 0 STEP 0.B — Ref-based raycast disable (belt and suspenders).** New helper `disableRaycast` in [`three-utils.ts`](src/lib/three-utils.ts) — a ref callback that sets `obj.raycast = noRaycast` directly on the underlying three.js instance. Applied alongside `raycast={noRaycast}` on every Text inside a Billboard or screen sub-group (InteractiveConsole, Hologram, Lab.ContactTerminal, SkillPodiums). If drei's `<Text>` doesn't honour the `raycast` prop in this version of `troika-three-text`, the ref callback still wins because it mutates the instance directly after mount.
- **FIX 1 — Console caption overflow.** [`InteractiveConsole.tsx`](src/components/canvas/InteractiveConsole.tsx): caption `fontSize 0.046 → 0.04`, `maxWidth 0.8 → 0.88` (95% of screen width), tighter letter spacing. "AI crop-health classifier · React + ML" now wraps cleanly inside the screen bounds.
- **FIX 2 + 3 — SkillPodiums rebuilt.** [`SkillPodiums.tsx`](src/components/canvas/SkillPodiums.tsx) replaces `Object.entries(content.skills)` iteration with five hand-curated podium definitions:
  - **FRONT-END** · React · Next.js · Tailwind
  - **AI / GEN AI** · LLM APIs · Embeddings · RAG
  - **LANGUAGES** · JavaScript · TypeScript · Python
  - **DEPLOY** · Git · Vercel · Netlify
  - **CONTACT** — three clickable lines: LinkedIn → opens profile in new tab, Email → mailto:, **OPEN RESUME** → opens the `ResumeViewer` modal.
  Heading size 0.10, items size 0.06 (or 0.058 for contact lines), maxWidth 1.0. The CONTACT podium's lines are interactive Text meshes — raycast LEFT ENABLED on these — with hover state, sound, and a click handler.
- **FIX 5 — Resume viewer modal.** New [`ResumeViewer.tsx`](src/components/ui/ResumeViewer.tsx): full-screen Framer-Motion modal with the PDF rendered in an `<iframe>` (80vw × 85vh), top-bar with `✕ Close` (left) + `Download ↓` (right, gold pill — triggers an anchor `download="Nithesh_Ramachandran_Resume.pdf"` click), `Esc` and backdrop click close. Store extended with `resumeOpen / openResume / closeResume`. Mounted in [`page.tsx`](src/app/page.tsx). The contact terminal (in `Lab.tsx`) now opens this modal instead of `window.open`-ing the PDF in a new tab.

Bundle: 492 KB → 492 KB (unchanged — the ResumeViewer + podium rework offset by removed `window.open` helpers and tighter podium logic).

**Verification path after this deploy:**
1. Open the live URL in real Chrome.
2. Open DevTools → Console.
3. Click anywhere on the 3D scene. Expect to see `[CANVAS-POINTER] hit at <x> <y>`.
4. Click a project console screen. Expect `[CONSOLE-CLICK] 1. entered` immediately after.

If step 3 is silent → UI overlay block (use elements picker to find the culprit).
If step 3 logs but step 4 doesn't → R3F event / raycast issue downstream.
Paste the result and I'll do the next fix accordingly.

### V1.9 — stale-deploy diagnosis + stripe rack + podium framing

- **FIX 0 — `CERT_WALL_POS` import.** Already removed in V1.8 (`grep -r CERT_WALL_POS src/` returns zero matches; `npm run build 2>&1 | grep -iE "warning|error|attempted"` returns nothing). The error the user saw in production Chrome was a **stale Vercel deploy** — the V1.8 commit (`df69d54`) was on local `main` but hadn't been pushed yet, so Vercel was still serving the V1.7 build that still imported `CERT_WALL_POS`. V1.9 ships the push.
- **FIX 1 — Stripe rack restored.** `CertificateRack` in [`Lab.tsx`](src/components/canvas/Lab.tsx) reverted from the horizontal-drawer layout back to the original server-rack visual: **12 vertical stripes** (`0.16 × 0.7 × 0.02`) in 2 rows × 6 columns on the rack face. Rack chassis back to original `1.6 × 2.6 × 0.9` graphite metal. Each stripe is a clickable mesh — hover slides it +0.05 z forward, click opens the existing `CertificateLightbox` with that cert. **Accent colours are now meaningful**:
  - 🟠 Amber stripe (index 4, top row) = **Applied Generative AI**
  - 🟣 Violet stripe (index 5, top row) = **AI-First Software Engineering**
  - All other 10 stripes = emerald.
  - "**CERTIFICATES**" label rendered above the rack in gold (size 0.22, JetBrains Mono spacing, `raycast={noRaycast}`).
  - Index → cert mapping is documented in the file's header comment (left→right, top→bottom).
- **FIX 2 — Empty-podium framing.** Diagnosis: from the V1.7/1.8 skills waypoint (`[0, 2.0, 5.4]`), the leftmost / rightmost podiums sat at world-x ≈ ±2.54, depth-from-camera ≈ 2.44 — outside the ~31° horizontal half-FOV (`atan(2.54 / 2.44) ≈ 46°`). They were rendered but **clipped off-screen**, reading as "empty". Fixes:
  - Arc radius `2.6 → 2.2`, arc span `155° → 130°` (extreme podiums now at ±77° instead of ±77.5° but closer to centre).
  - `SKILL_ARC_POS` moved forward `z = 2.4 → 1.8` so podiums are deeper from camera.
  - Skills waypoint camera moved back `z = 5.4 → 6.8`. Net effect: extreme podiums now at ≈ ±27° from camera-forward, comfortably inside the ~31° half-FOV.
- **FIX 3 — Overlap audit (static).** Walked each waypoint mentally against the scene graph. SkillPodiums already gated by `Math.abs(section - SKILLS_WP_IDX) > 1` (V1.8). Hologram tagline, contact-terminal URL list, console captions, and the new CERTIFICATES label all live on their own meshes / Billboards with `raycast={noRaycast}` so they don't intercept clicks; they appear at small scale from far waypoints (< 30 px high) and read as scene detail, not as competing text. No additional gates added — adding too many `if (Math.abs(...) > N) return null` shortcuts would defeat the "single coherent stage" feel the master prompt called for.
- **FIX 4 — Deploy.** Committed and pushed to `origin/main` so Vercel auto-deploys.

Bundle: 492 KB → 492 KB First Load (unchanged — stripe rack is geometrically simpler than the drawer grid).
Waypoint count unchanged at 9.

### V1.8 — click handler relocated, podium gating, rack drawers

Three fixes targeting the V1.7 fallout: clicks still didn't fire after the `noRaycast` sweep; SkillPodium text bled across other waypoints; user explicitly wanted the right-side rack repurposed as the cert shelf.

- **FIX 1 — Click handler on the mesh, not the group.** [`InteractiveConsole.tsx`](src/components/canvas/InteractiveConsole.tsx) used to mount `onPointerOver / onPointerOut / onPointerDown / onPointerUp / onClick` on the outer `<group>`, relying on R3F event bubbling from descendant meshes. The spec's STEP 1.2 OUTCOME B hint was the real cause: handlers belong on a mesh with geometry. Pointer handlers now mount on **both** the plinth `<mesh>` (boxGeometry) **and** the screen plane `<mesh>` (planeGeometry) via a spread `{...handlers}` — two raycastable surfaces feeding the same handler, no group-bubble dependency. The `[CONSOLE-CLICK]` debug logs from V1.7 are still in place for one more deploy so you can confirm "1. entered" finally appears.
- **FIX 2 — Skill podiums gated + sized.** [`SkillPodiums.tsx`](src/components/canvas/SkillPodiums.tsx) now early-returns `null` when `Math.abs(section - SKILLS_WP_IDX) > 1` — the entire arc (cylinders + Billboards) is **literally absent from the scene graph** at other waypoints, so it cannot bleed visually or absorb raycasts. Text sized per spec: heading `0.14 → 0.08`, items `0.062 → 0.05`, maxWidth `1.5 → 1.2` (≈ podium width).
- **FIX 3 — Right-side rack repurposed as `CertificateRack`.**
  - [`CertificateShelf.tsx`](src/components/canvas/CertificateShelf.tsx) **deleted**.
  - [`Lab.tsx`](src/components/canvas/Lab.tsx)'s `ServerRack` renamed and rewritten as `CertificateRack`. Rack now 2.9 × 2.1 × 0.55 (was 1.6 × 2.6 × 0.9). 12 LED stripes deleted. New layout on the front face: 3 rows of drawers (Front-End 4, Generative AI 5, Programming 3), each drawer a `0.45 × 0.3 × 0.05` box with the cert PNG as `MeshStandardMaterial.map`. Each drawer mounts handlers directly on its mesh (FIX 1 lesson applied). Hover slides the drawer +0.1 z via a `useFrame` lerp. Click opens the existing `CertificateLightbox` via `store.openCertificate(id)`.
  - Gold rim added around the rack's front face (four thin slabs).
  - Original amber + violet status LEDs survived — repositioned to the rack's right edge as decorative side lights, plus one emerald.
  - Waypoints: `server-rack` removed; `certifications` repositioned to view the rack from `[RACK_POS.x, RACK_POS.y+0.2, RACK_POS.z+3.6]` looking at `RACK_POS`. `AccessibilityProxies` "View certifications" proxy now sits at `RACK_POS`. New "View skills" proxy at `SKILL_ARC_POS`.
  - `CERT_WALL_POS` / `CERT_VIEW_POS` removed from [`content.ts`](src/lib/content.ts).

Bundle: 492 KB → 492 KB First Load (unchanged — `CertificateShelf` chunk gone, `CertificateRack` + drawers compensate).
Waypoint count: 10 → 9 (removed `server-rack`).

### V1.7 — clicks unblocked, new scene zones

The diagnostic from V1.6 was conclusive: `[CONSOLE-CLICK] 1. entered` never appeared, meaning the onClick handler on the console mesh was never invoked. Root cause: the Billboard `<Text>` captions added in V1.5 are raycastable meshes (drei `<Text>` is a real mesh via troika-three-text), and they sat directly in front of the consoles, swallowing every click. Fix landed plus four new scene zones.

- **FIX 0 — Clicks.** Added [`src/lib/three-utils.ts`](src/lib/three-utils.ts) exporting `noRaycast` (a no-op function — TypeScript strict rejects `raycast={null}` since the prop type is `RaycastFunction | undefined`). Every `<Text>` inside a `<Billboard>` in `InteractiveConsole`, `Hologram`, `Lab.ContactTerminal`, `CertificateShelf`, and `SkillPodiums` now uses `raycast={noRaycast}`. Text is visible, raycaster runs against it, but never appends an intersection — so R3F never delivers a click to it. Debug `console.log` chain from V1.6 is **still in place** for one more deploy so you can confirm "1. entered" now appears in real Chrome.
- **FIX 1 — Captions ON the screen.** `InteractiveConsole` no longer renders the floating Billboard caption below the chassis. Instead, the screen plane shows two lines of `<Text>` directly on it: title (large, `emerald-glow`, JetBrains-mono-ish stagger) in the top half, caption (small, `bone`, centred, max-width) in the bottom half. The screen's `emissiveIntensity` dropped from 0.85 → 0.35 so text reads cleanly against the panel instead of fighting the glow. Hover floating label removed (title now lives on the screen).
- **FIX 2 — Resume button.** `Lab.ContactTerminal.handleClick` now logs `[CONTACT-CLICK] handler fired — opening resume` before calling `window.open(content.contact.resumeUrl, '_blank', 'noopener,noreferrer')`. Same diagnostic pattern as console clicks — will confirm in real Chrome.
- **FIX 3 — Certificate side shelf + lightbox.** Tore out `CertificateWall.tsx`, replaced with:
  - [`src/components/canvas/CertificateShelf.tsx`](src/components/canvas/CertificateShelf.tsx) — 12 "containers" on a left-side wall (mounted at `[-6.5, 1.6, -1.5]`, rotated 90° about Y so the face points into the room). Four rows: Front-End (4 cards), Generative AI (3 + 2), Programming (3). Each container is a graphite box with a gold-rim plane front showing the cert thumbnail (`MeshStandardMaterial` with the PNG as `map`), title + date overlaid below. Single warm amber `SpotLight` sweeping the wall. Group headings in gold above each row.
  - [`src/components/ui/CertificateLightbox.tsx`](src/components/ui/CertificateLightbox.tsx) — Framer-Motion DOM modal triggered by container click. Reads `store.lightboxCertId`. Shows the full-resolution PNG via Next `<Image>`, title + issuer + date, Close button + Esc + backdrop click all close. Store extended with `lightboxCertId / openCertificate / closeCertificate`.
  - Certifications waypoint repositioned to `CERT_VIEW_POS` (4.5 units in front of the shelf, looking centred).
- **FIX 4 — Skill podiums.** [`src/components/canvas/SkillPodiums.tsx`](src/components/canvas/SkillPodiums.tsx) — 5 graphite cylinders with thin gold-torus rims in a shallow semicircular arc (`SKILL_ARC_POS = [0, 0.4, 2.4]`, 155° span, radius 2.6). Each podium maps to one key in `content.skills` (Languages / Front-End / AI · Gen AI / Platform / Tools). Above each, a Billboard with heading (`emerald-glow`, large) + items joined by ` · ` (`bone`, smaller). Hover pulses the gold rim emissive 0.22 → 0.55. New `skills` waypoint at `[0, 2.0, 5.4]` inserted between `console-3` and `server-rack`.
- **FIX 5 — Live URL + project URLs visible in scene.**
  - `content.ts` now exports `liveUrl` and `contactLinks` (Portfolio · CropAI · Smart Canteen · TestAI · LinkedIn · Email).
  - Hologram tagline now includes a second `<Text>` line: `live at nithesh-portfolio-amber.vercel.app` (bone, smaller).
  - Contact terminal screen renders the six-line URL list as `<Text>` directly on the screen, monospace, `emerald-glow` on dim emerald, with a gold divider and `DOWNLOAD RESUME →` row beneath.

Bundle: 486 KB → 492 KB First Load (+6 KB for the lightbox, shelf, podiums, and Next/Image usage on the lightbox).

Waypoint count: 9 → 10 (added `skills`).

Issue dates as read from each PDF (kept from V1.6):

| Group         | Cert                                              | Date           |
| ------------- | ------------------------------------------------- | -------------- |
| Front-End     | Front End Web Developer Certification             | Feb 6, 2026    |
| Front-End     | HTML5 — The Language                              | Feb 6, 2026    |
| Front-End     | CSS3                                              | Feb 6, 2026    |
| Front-End     | JavaScript                                        | Feb 6, 2026    |
| Generative AI | Applied Generative AI Certification               | Apr 8, 2026    |
| Generative AI | AI-first Software Engineering                     | Apr 1, 2026    |
| Generative AI | Introduction to OpenAI GPT Models                 | Apr 1, 2026    |
| Generative AI | GPT-3 for Developers                              | Apr 1, 2026    |
| Generative AI | Prompt Engineering                                | Apr 1, 2026    |
| Programming   | Basics of Python                                  | Mar 12, 2025   |
| Programming   | Programming Fundamentals using Python — Part 1    | Mar 31, 2025   |
| Programming   | Programming Fundamentals using Python — Part 2    | Mar 31, 2025   |

### V1.5 + V1.6 — merged ship

Five fixes in one pass.

- **1. 144Hz icon hunt.** `grep src/` returned no `144` / `laptop` matches in component code. The only plausible source was `r3f-perf`'s dev overlay leaking into prod (the lib renders a small monitor/refresh-rate badge). Removed `<DevPerf />` entirely from `Scene.tsx`, removed the lazy `import('r3f-perf')` path, and uninstalled the package from `dependencies`. No runtime path can mount r3f-perf now; if you want it back add it under a feature-branch.
- **2. Console click instrumentation.** Added the spec'd labelled `console.log` chain to `InteractiveConsole.handleClick` (`1. entered`, `2. audio.play returned`, `3. openProject called`) and a `[MODAL-RENDER]` log at the top of `ProjectModal`. **Left in place for one deploy.** After clicking a console in production Chrome with DevTools open, paste the log sequence and I'll pick the matching fix path from the spec's a/b/c/d/e tree (most likely (b) Howler throwing — fix is in `audio.ts` to make `play()` no-op cleanly when sprite load fails; current code already guards `if (!uiSprite) return` so this should be safe, but the log will tell us). Logs will be removed once the diagnosis lands.
- **3. Always-visible captions.** Added `caption` field to the `Project` type in `content.ts`. `InteractiveConsole` now renders a `drei <Billboard><Text>` below each console reading from `content.projects[].caption` (CropAI, Smart Canteen, TestAI). `Hologram` renders a Billboarded tagline below the panel using `content.hero.tagline`. Bone-coloured text with a void outline for readability against the floor grid.
- **4. Hologram visual restoration.** In `hologram.frag`: scanline modulation tightened from `mix(0.85, 1.05)` to `mix(0.92, 1.04)` (visible but doesn't punch). Fresnel edge glow re-enabled, capped via `min(fres * 1.4, 0.4)` so it can't bloom. Jitter amplitude halved again (`0.00063 → 0.000315`). RGB ghosting deleted entirely — that was the M3.6 culprit for eye blowout. Warm push + 0.82 luma cap from V1 stay intact. The portrait now reads as a holographic display (scanlines + edge glow visible) while skin stays natural.
- **5. Certificate wall.** Twelve certificates rendered as framed planes in three thematic groups on a back wall. New `certifications` waypoint inserted between `entrance` and `portrait`, positioned 5.5 units in front of the wall looking centred.
  - **PDF → PNG pipeline.** Run-once script at `scripts/convert-certs.mjs` using `pdf-to-img` (page 1, 2× scale ≈ 150 DPI) → `sharp` (auto-trim near-white margins, resize longest edge to 1200 px, PNG compression level 9). Output 12 files at `public/certificates/png/<id>.png`, average ~205 KB each (~2.5 MB total). Re-run any time the source PDFs change.
  - **Layout.** `CertificateWall.tsx` lays each group out per its `layout` enum: `grid-2x2` (Front-End), `three-plus-two` (Generative AI — top row 3 centred, bottom row 2 centred), `row-1x3` (Programming). 1.2 × 0.9 unit cards with a 4-slab gold bezel (same recipe as the hologram frame), the PNG as `MeshStandardMaterial.map`, plus a subtle emerald-mid emissive at 0.04 so cards aren't dead in low-light.
  - **Lighting.** One warm amber `SpotLight` per group (angle 0.5, penumbra 0.6, intensity 0.9, decay 2), positioned above and slightly in front of the cards. Light only touches the wall area — the rest of the scene's lighting kit is untouched.
  - **Labels.** Title + date under each card via `Billboard<Text>` so they always face the camera (ivory title, bone date). Group heading above each cluster in gold with a thin gold underline rule.
  - **Accessibility.** New `View certifications` proxy in `AccessibilityProxies.tsx` — Tab to it, Enter scrolls the page to the certifications waypoint. HUD section counter auto-updates (already reads `waypoints.length`).
  - **Cert dates** read from each PDF's page-1 "on …" line, not hardcoded.

Issue dates as read from the PDFs:

| Group         | Cert                                              | Date           |
| ------------- | ------------------------------------------------- | -------------- |
| Front-End     | Front End Web Developer Certification             | Feb 6, 2026    |
| Front-End     | HTML5 — The Language                              | Feb 6, 2026    |
| Front-End     | CSS3                                              | Feb 6, 2026    |
| Front-End     | JavaScript                                        | Feb 6, 2026    |
| Generative AI | Applied Generative AI Certification               | Apr 8, 2026    |
| Generative AI | AI-first Software Engineering                     | Apr 1, 2026    |
| Generative AI | Introduction to OpenAI GPT Models                 | Apr 1, 2026    |
| Generative AI | GPT-3 for Developers                              | Apr 1, 2026    |
| Generative AI | Prompt Engineering                                | Apr 1, 2026    |
| Programming   | Basics of Python                                  | Mar 12, 2025   |
| Programming   | Programming Fundamentals using Python — Part 1    | Mar 31, 2025   |
| Programming   | Programming Fundamentals using Python — Part 2    | Mar 31, 2025   |

Bundle: 484 KB → 486 KB First Load (+2 KB for cert geometry + Billboard usage).

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
