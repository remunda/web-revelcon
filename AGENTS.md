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
| `public/index.html` | Markup: sky div, clouds div, stars canvas, sequenced text block, two scripts |
| `public/styles.css` | All visual styling, animations, font variables, responsive tweaks |
| `public/main.js` | Canvas starfield + pointer repulsion + click-to-spawn + adaptive FPS tiers + pointer trail |
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

#### 3. Drifting mist / clouds layer
- 5 absolutely positioned `.cloud-N` spans inside `.clouds`, each with a unique scale, top %, opacity, and `cloudDrift` animation duration (95s–170s) and negative `animation-delay` so they start mid-screen on load.
- Each cloud is built from 4 layered radial gradients (blurred 40px) and uses `mix-blend-mode: screen` so it brightens the sky without looking like a solid shape.
- Sits between sky and stars (`z-index: 1`); stars stay sharp on top.

#### 4. Canvas starfield with parallax, twinkle, and pointer interaction
- `main.js` renders stars on `<canvas id="stars">` at full window size, using `devicePixelRatio` for sharp rendering.
- Three depth layers (z = 1/2/3) — closer stars are larger, move faster, and react more to pointer.
- Twinkle: pre-computed 256-entry sine table advances 5–12 FPS (tier-dependent) so per-frame cost is a table lookup, not `Math.sin`.
- **Pointer repulsion**: `mousemove` / `touchmove` push nearby stars away with quadratic falloff over a 180 px radius; affected stars also get a brightness boost. Smoothed via spring (`s.ox += (dx - s.ox) * 0.18`).
- **Pointer trail** ("kouzelná stopa"): Catmull–Rom → cubic Bézier curve through the last N pointer positions; trail length and thickness scale with cursor speed (min 6 pts, max 44 pts; min width 0.35×, max 1.6×); fades out 1.6 units/s after pointer stops. Disabled when `prefers-reduced-motion: reduce`.
- Click / tap spawns **one new star** at the pointer with a slight 30 px random offset, `life: 1.4` for a brief bright flash; spawn burst is throttled by `maxStars` (260 hard cap, oldest evicted).
- `cursor: crosshair` on canvas to signal interactivity.

#### 5. Adaptive performance tiers
- Detection: `navigator.userAgent` mobile regex, `navigator.deviceMemory ≤ 2`, `navigator.hardwareConcurrency ≤ 2` → start on `mid` tier.
- Three tiers — `high` (260 stars, DPR 1.5, glow, 12 twinkle FPS), `mid` (180 stars, DPR 1.25, no glow, 8 twinkle FPS), `low` (110 stars, DPR 1, no glow, 5 twinkle FPS).
- FPS sampler (1 s window) downgrades tier if FPS < 25 for 3 consecutive samples; upgrades back if FPS > 55 for 4 consecutive samples on non-low-end hardware.
- **Warm-up grace period**: no tier changes during the first 8 s after page load. This prevents first-paint / font-load / GC-pause FPS dips from wrongly downgrading the tier and visibly removing stars.
- All tier transitions call `applySize()` so DPR resyncs the canvas backing store.

#### 6. Animated text sequence before the title
- Four `<p class="line">` paragraphs appear in order with a fog reveal (fade + blur 16 → 0 + small upward drift) over 6 s, then fog fade out (3 s).
- Stagger: line 1 starts at 0 s, line 2 at 1.5 s, line 3 at 3 s, line 4 at 4.5 s.
- `.sequence` container is `max-width: min(620px, 88vw)` so text isn't stretched on wide monitors.
- Each `.line` is `position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%)` and centred within the container.

#### 7. Hero title "RevelCON"
- `<h1 class="title">` contains an inline `<svg class="title-svg">` with `viewBox="0 0 800 200"` and `preserveAspectRatio="xMidYMid meet"`.
- Each letter is a separate `<path>` element (Stoke glyph converted to outlines via `fontTools.pens.svgPathPen` in `generate-logo.py`). No font is downloaded at runtime — the SVG is self-contained.
- Wave: each path has a hand-tuned `transform="translate(x y) scale(s -s)"` where `y` follows a sinusoid (amplitude 10 px, first letter at baseline, peak in middle, last letter back at baseline).
- Gold gradient fill (`#fff8dc → #f5e6a8 → #a37a2c`) via inline `<linearGradient id="titleGold">` applied to the wrapping `<g fill="url(#titleGold)">`. Soft glow via inline `<filter id="titleGlow">` (Gaussian blur stdDeviation 0.8 + feMerge).
- `.title` is sized `width: min(92vw, 1100px)` with `aspect-ratio: 800 / 200` so the SVG scales proportionally on any viewport. Mobile breakpoints tighten width to `94vw` (≤480 px) and `96vw` (≤360 px).
- Two-stage animation: `titleReveal` 7 s starting at 49 s (opacity 0 → 1, scale 0.96 → 1, blur 20 px → 0, cubic-bezier easing), then perpetual `glow` 4 s alternate starting at 56.2 s.
- After title, `<p class="more-info">více informací brzy</p>` fades in via the same `fogReveal` 7 s starting at 49.5 s, positioned `clamp(6rem, 15vw, 11rem)` below the title.
- `aria-label="Revelcon"` on the `<h1>` keeps the title accessible to screen readers (the SVG itself is `role="img"`).
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
- All animations inside the canvas and `.sky`/`.clouds` honour `prefers-reduced-motion: reduce` — sky/clouds freeze, title and `more-info` show instantly without reveal, `.line` paragraphs are hidden.

#### 10. Background music
- `<script type="module" src="/music.js">` loaded from `index.html`.
- Module handles its own play/pause policy (browsers require user gesture for autoplay).
- See `public/music.js` for current track / volume / mute behaviour. Any change here must be reflected both in code and in this section.

#### 11. Accessibility & metadata
- `lang="cs"`, descriptive `<title>` and `<meta name="description">`.
- `<meta name="theme-color" content="#05060f">` matches body background for a clean mobile chrome colour.
- Decorative layers (`sky`, `clouds`, `stars`) all carry `aria-hidden="true"`.
- The text sequence container is `aria-live="polite"` so screen readers announce each line as it appears.
- `prefers-reduced-motion: reduce` disables decorative motion as described in §9.
