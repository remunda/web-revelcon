# Cloudflare Workers

STOP. Your knowledge of Cloudflare Workers APIs and limits may be outdated. Always retrieve current documentation before any Workers, KV, R2, D1, Durable Objects, Queues, Vectorize, AI, or Agents SDK task.

## Docs

- https://developers.cloudflare.com/workers/
- MCP: `https://docs.mcp.cloudflare.com/mcp`

For all limits and quotas, retrieve from the product's `/platform/limits/` page. eg. `/workers/platform/limits`

## Commands

| Command | Purpose |
|---------|---------|
| `bun wrangler dev` | Local development |  
| `bun wrangler deploy` | Deploy to Cloudflare |
| `bun wrangler types` | Generate TypeScript types |

Running local development makes site available on http://localhost:8787/ check it if needed.


Run `wrangler types` after changing bindings in wrangler.jsonc.

## Node.js Compatibility

https://developers.cloudflare.com/workers/runtime-apis/nodejs/

## Errors

- **Error 1102** (CPU/Memory exceeded): Retrieve limits from `/workers/platform/limits/`
- **All errors**: https://developers.cloudflare.com/workers/observability/errors/

## Product Docs

Retrieve API references and limits from:
`/kv/` · `/r2/` · `/d1/` · `/durable-objects/` · `/queues/` · `/vectorize/` · `/workers-ai/` · `/agents/`

## Best Practices (conditional)

If the application uses Durable Objects or Workflows, refer to the relevant best practices:

- Durable Objects: https://developers.cloudflare.com/durable-objects/best-practices/rules-of-durable-objects/
- Workflows: https://developers.cloudflare.com/workflows/build/rules-of-workflows/

---

# Current Site Behavior — RevelCON Landing

> **MAINTENANCE RULE FOR AI AGENTS**: Whenever you add, remove, change, or break a feature in this site, you MUST also update this section to match. Keep the structure (numbered features, sub-bullets, file pointers) and replace any changed details. Do not delete features the user asked for — only update, add, or annotate. If a feature is removed, mark it `(removed YYYY-MM-DD)` and move it to the bottom under "Deprecated Features" so history is preserved.

This is a single-page, fullscreen animated landing for the **RevelCON** event ("Kouzelnická akademie Oslavany", 22.5.2026). It serves a magical/Harry Potter feel on top of a live night-sky background. Implemented as static assets under `public/`, deployed via Cloudflare Workers (`wrangler.jsonc` → `assets.directory: "./public"`).

### File map

| File | Role |
|---|---|
| `public/index.html` | Markup: sky div, stars canvas, sequenced text block, two scripts |
| `public/styles.css` | All visual styling, animations, font variables, responsive tweaks |
| `public/main.js` | Canvas starfield + mist field + star-shine + pointer trail + adaptive FPS tiers |
| `public/music.js` | Background music module (loaded as `<script type="module">`) |
| `wrangler.jsonc` | Workers config: serves `./public` as static assets |

### Features

#### 1. Fullscreen layout, no scroll
- `html, body { overflow: hidden }`, body uses `100dvh` (with `100vh` and `-webkit-fill-available` fallbacks) for true fullscreen on any device, including mobile browser chrome.
- Padding/safe area respected via `viewport-fit=cover` in the meta viewport.

#### 2. Animated night-sky gradient background
- `.sky` element: stacked radial gradients (purple/indigo/blue nebulae) over a dark linear base.
- Two looping animations (`skyDrift` 32s, `nebulaShift` 24s) with `translate + scale + hue-rotate + saturate` for organic, non-repeating motion.
- `.sky::after` adds soft screen-blended noise overlay so the gradient never looks flat.

#### 3. Drifting mist field (canvas layer)
- Mist blobs are rendered **on the same canvas as the stars**, **before** stars in the render loop, so stars stay sharp on top. No CSS layer, no `mix-blend-mode`, no `filter: blur()` — alpha falloff in the radial gradient IS the blur. This keeps the mist field in lockstep with the FPS sampler (it adapts when performance drops).
- Three depth layers in `main.js` (`makeMist`):
  - Layer 1 (far): base radius 0.12–0.22 × `min(width,height)`, speed 4–9 px/s, alpha 0.18–0.32.
  - Layer 2 (mid): base radius 0.18–0.32, speed 7–14 px/s, alpha 0.22–0.38.
  - Layer 3 (near): base radius 0.26–0.42, speed 11–20 px/s, alpha 0.26–0.44.
- Each mist has a hue (205–245, cool blue/violet) and a `stretchX` factor (2.5–4.5) so it reads as a wide horizontal cloud band rather than a circle. The radial gradient is scaled horizontally via `ctx.scale(stretchX, 1)` and the `fillRect` is widened to match so the gradient isn't clipped.
- Each mist has a per-mist vertical wobble (8–28 px amplitude, 22–45 s period) so the field never looks like a conveyor belt.
- Horizontal drift wraps from right back to left with `r * stretchX * 1.2` margin so blobs don't visibly "pop in" at the edge; on wrap the Y coordinate re-randomizes so the field stays organic.
- Under `prefers-reduced-motion: reduce` mists are still drawn but skip all position updates and wobble (they sit perfectly still).

#### 4. Canvas starfield with parallax, twinkle, glow, and star-shine
- `main.js` renders stars on `<canvas id="stars">` at full window size, using `devicePixelRatio` for sharp rendering.
- Three depth layers (z = 1/2/3) — closer stars are larger, move faster, and react more to pointer.
- **Two-phase twinkle**: each star combines a slow "breath" sine (0.003–0.012 Hz) with a faster "shimmer" sine (0.008–0.025 Hz), both via the pre-computed 256-entry table. ~25 % of stars are "twitchy" (1.5–1.8× speed, 1.4× amplitude). Brightness range per star: base 0.25–0.7 + amplitude 0.15–0.55, so the field breathes organically instead of pulsing in unison.
- **Fairytale flash**: ~15 % of stars are scheduled for a one-off bright flare at a random time 4–18 s after spawn. The flare uses a bell curve (`4·t·(1-t)`) over 0.6–1.4 s, then either schedules another flash 8–25 s later or never flashes again. During a flash the star gets a soft glow halo. This is the "twinkle twinkle little star" moment — rare, gentle, never strobing.
- **Glow** (`high` tier only): two-pass additive (`globalCompositeOperation = "lighter"`) halo on stars currently above brightness 0.75 or in a flash. Outer atmospheric halo (r × 5.5, alpha × 0.07) + inner core glow (r × 2.4, alpha × 0.22). Composes into a believable bloom when bright stars overlap.
- **Star shine** (`high` tier only, gated by `drawShine`): 4-point diffraction cross on stars above brightness 0.8 or in a flash. Primary horizontal + vertical spikes (length `r × (12 + intensity × 22)`); secondary 45° spikes at 55 % length appear once intensity exceeds 0.5 for the classic "star burst" look. All spikes use `lighter` blend.
- **Pointer trail** ("kouzelná stopa"): Catmull–Rom → cubic Bézier curve through the last N pointer positions; trail length and thickness scale with cursor speed (min 6 pts, max 44 pts; min width 0.35×, max 1.6×); fades out 1.6 units/s after pointer stops. Disabled when `prefers-reduced-motion: reduce`.
- Click / tap spawns **one new star** at the pointer with a slight 30 px random offset, `life: 1.4` for a brief bright flash; spawn burst is throttled by `maxStars` (140 hard cap, oldest evicted).
- `cursor: crosshair` on canvas to signal interactivity.

#### 5. Adaptive performance tiers
- Detection: `navigator.userAgent` mobile regex, `navigator.deviceMemory ≤ 2`, `navigator.hardwareConcurrency ≤ 2` → start on `mid` tier.
- Three tiers:
  - `high`: 140 stars, 9 mists, DPR 1.5, glow + shine enabled, 12 twinkle FPS.
  - `mid`: 100 stars, 6 mists, DPR 1.25, glow/shine off, 8 twinkle FPS.
  - `low`: 70 stars, 3 mists, DPR 1, glow/shine off, 5 twinkle FPS.
- Counts are intentionally modest — the field should feel like a quiet night sky, not a snowstorm.
- FPS sampler (1 s window) downgrades tier if FPS < 25 for 3 consecutive samples; upgrades back if FPS > 55 for 4 consecutive samples on non-low-end hardware.
- **Warm-up grace period**: no tier changes during the first 8 s after page load. This prevents first-paint / font-load / GC-pause FPS dips from wrongly downgrading the tier and visibly removing stars or mists.
- All tier transitions call `applySize()` so DPR resyncs the canvas backing store, and `buildMists()` to refresh the mist field for the new cloud count.

#### 6. Animated text sequence before the title
- Four `<p class="line">` paragraphs appear in order with a fog reveal (fade + blur 16 → 0 + small upward drift) over 6 s, then fog fade out (3 s).
- Stagger: line 1 starts at 0 s, line 2 at 1.5 s, line 3 at 3 s, line 4 at 4.5 s.
- `.sequence` container is `max-width: min(620px, 88vw)` so text isn't stretched on wide monitors.
- Each `.line` is `position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%)` and centred within the container.

#### 7. Hero title "RevelCON"
- `<h1 class="title">` contains an inline `<svg class="title-svg">` with `viewBox="0 0 800 200"` and `preserveAspectRatio="xMidYMid meet"`.
- Each letter is wrapped in `<g class="letter"><g class="sway"><path .../></g></g>` (Stoke glyph converted to outlines via `fontTools.pens.svgPathPen` in `generate-logo.py`). No font is downloaded at runtime — the SVG is self-contained.
- Wave: each path has a hand-tuned `transform="translate(x y) scale(s -s)"` where `y` follows a sinusoid (amplitude 10 px, first letter at baseline, peak in middle, last letter back at baseline).
- Gold gradient fill (`#fff8dc → #f5e6a8 → #a37a2c`) via inline `<linearGradient id="titleGold">` applied to the wrapping `<g fill="url(#titleGold)">`. Soft glow via inline `<filter id="titleGlow">` (Gaussian blur stdDeviation 0.8 + feMerge).
- `.title` is sized `width: min(96vw, 1500px)` with `aspect-ratio: 800 / 200` so the SVG scales proportionally on any viewport. Mobile breakpoints tighten width to `98vw` (≤480 px) and `100vw` (≤360 px).
- **Multi-directional flurry arrival**: `letterArrive` keyframes (opacity 0 → 1, `translate(var(--dx-from), var(--dy-from))` with slight overshoot, scale 0.92 → 1.02 → 1, easing `cubic-bezier(0.16, 1, 0.3, 1)`) running for 0.80 s per letter. Each letter flies in from a distinct angle/vector (below-left, top-left, bottom, top-right, etc.) with a tight 0.06 s stagger (launching 49.00 s to 49.42 s, completing ~50.22 s) without any blur.
- **Gentle wind sway**: Inner `<g class="sway">` elements run `letterSway` keyframes (subtle rotation -1.4° to +1.5° and translation ±1.5px to ±2.2px on 4.2s–6.0s out-of-phase loops) starting immediately as each letter completes arrival (~49.80s–50.22s).
- **Perpetual glow**: `glow` keyframes 4 s alternate starting at 56.2 s on `.title`.
- After title starts arriving, `<p class="more-info">více informací brzy</p>` fades in via `fogReveal` 7 s starting at 49.5 s, positioned `clamp(6rem, 15vw, 11rem)` below the title.
- `aria-label="Revelcon"` on the `<h1>` keeps the title accessible to screen readers (the SVG itself is `role="img"`).
- Under `prefers-reduced-motion: reduce`, `.title`, `.letter`, and `.sway` animations are disabled and all letters show immediately with `opacity: 1; transform: none;`.
- To regenerate paths after editing `generate-logo.py`: `python3 generate-logo.py` (requires `fontTools`; reads `/tmp/opencode/stoke/Stoke.ttf`).

#### 8. Typography
- Two CSS variables defined in `:root`:
  - `--font-base`: `"Italianno", "Metamorphous", "Cormorant Garamond", "EB Garamond", Garamond, cursive, serif` — default body font, used by `.line` and `.more-info`.
  - `--font-display`: `"Italianno", "Metamorphous", "Cormorant Garamond", Garamond, "Times New Roman", cursive, serif` — used by `.title` only.
- Google Fonts loaded via single `<link>` to `fonts.googleapis.com/css2?family=Italianno&display=swap` with `preconnect` hints to `fonts.googleapis.com` and `fonts.gstatic.com`.
- `Italianno` is the current magical-script choice (thin, calligraphic). History of font swaps: Cinzel Decorative → EB Garamond italic → Cormorant Garamond → Metamorphous → Fleur DeLeah → Italianno.

#### 9. Responsive behaviour
- Base layout works at any viewport via `clamp()`, `100dvh`, `vw`/`vmax` units, and grid-style centring.
- `@media (max-width: 480px)` increases `.line` font size proportionally so thin calligraphic fonts stay legible, and tightens `.title` / `.more-info` so they don't overflow on narrow phones.
- `@media (max-width: 360px)` further clamps title and `more-info` for very narrow handsets.
- All animations inside the canvas and `.sky` honour `prefers-reduced-motion: reduce` — sky freezes, mists still drawn but stopped, title and `more-info` show instantly without reveal, `.line` paragraphs are hidden.

#### 10. Background music
- `<script type="module" src="/music.js">` loaded from `index.html`.
- Module handles its own play/pause policy (browsers require user gesture for autoplay).
- See `public/music.js` for current track / volume / mute behaviour. Any change here must be reflected both in code and in this section.

#### 11. Accessibility & metadata
- `lang="cs"`, descriptive `<title>` and `<meta name="description">`.
- `<meta name="theme-color" content="#05060f">` matches body background for a clean mobile chrome colour.
- Decorative layers (`sky`, `stars`) all carry `aria-hidden="true"`.
- The text sequence container is `aria-live="polite"` so screen readers announce each line as it appears.
- `prefers-reduced-motion: reduce` disables decorative motion as described in §9.
