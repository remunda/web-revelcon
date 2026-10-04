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

# Current Site Behavior — RevelCON Event Site

> **MAINTENANCE RULE FOR AI AGENTS**: Whenever you add, remove, change, or break a feature in this site, you MUST also update this section to match. Keep the structure (numbered features, sub-bullets, file pointers) and replace any changed details. Do not delete features the user asked for — only update, add, or annotate. If a feature is removed, mark it `(removed YYYY-MM-DD)` and move it to the bottom under "Deprecated Features" so history is preserved.

This is a single-page, scrollable, mobile-first event site for **RevelCON** (Kouzelnická akademie Oslavany, working date **22 May 2027**). It is a static site under `public/`, deployed by Cloudflare Workers (`wrangler.jsonc` → `assets.directory: "./public"`). The site intentionally does not invent prices, programme times, contacts, sale URLs, or social URLs: those areas state clearly that details will be published later.

### File map

| File | Role |
|---|---|
| `public/index.html` | Semantic page structure, hero picture, navigation, event sections and accessible links |
| `public/styles.css` | Warm parchment/ink visual system, responsive layout, focus states and reduced-motion rules |
| `public/main.js` | Progressive-enhancement mobile dialog controls and sticky mobile ticket link |
| `public/revelcon-hero-landscape.jpeg` | Approved landscape hero visual, copied from `drive/REVELCON/` for static delivery |
| `public/revelcon-hero-portrait.jpeg` | Approved portrait hero visual, copied from `drive/REVELCON/` for static delivery |
| `public/revelcon-logo.svg` | Existing RevelCON wordmark used in header and footer |
| `wrangler.jsonc` | Workers config: serves `./public` as static assets |

### Features

#### 1. Scrollable event structure
- The page has a full visual hero followed by Vítejte, Program, Magické aktivity, Úniková hra, Vstupenky, Praktické informace and Kontakt sections, then a footer.
- The approved hero image is served through a semantic `<picture>`: portrait on screens through 768px and landscape above it. The hero image is decorative (`alt=""`); event name, date and place are real text.
- Hero image sources are copied locally to `public/`; the design screenshots and unapproved alternative icon sheet are not used as page assets.

#### 2. Navigation and interaction
- Header has desktop navigation and an accessible mobile `<dialog>` menu. `main.js` opens it, returns focus to the triggering button on close, closes on Escape through the native dialog, and closes after a menu link is chosen.
- A skip link goes to `#obsah`. All navigation and tickets calls-to-action are real anchors, so reading and linking work without JavaScript.
- On mobile, an IntersectionObserver shows a safe-area-aware sticky “Vstupenky již brzy” link only after the hero has been left. The regular ticket section remains available without JavaScript.

#### 3. Visual language and typography
- `styles.css` defines a warm gold/parchment/ink palette, ornamental text symbols (decorative and `aria-hidden`), parchment texture gradients and restrained shadows.
- Cormorant Garamond supplies readable serif copy and display headings; Marck Script is reserved for a single ornamental seal. The existing SVG wordmark is used in the header and footer.
- No background music, canvas animation, pointer trail, star field or long intro sequence remains.

#### 4. Responsive and accessible behaviour
- Layout is mobile-first: navigation cards are one column on phones, two columns on tablet, and three columns at desktop widths. Hero uses the portrait image on phones and landscape on desktop.
- Links and menu buttons meet a 44px minimum target; keyboard focus is visibly gold; headings and landmark structure remain semantic.
- `prefers-reduced-motion: reduce` disables smooth scrolling and decorative CSS transitions/animations.
- `viewport-fit=cover` plus safe-area padding protects header, dialog, and mobile sticky ticket link around phone cut-outs.

#### 5. Content status
- The working event date is `2027-05-22`, at Kouzelnická akademie Oslavany.
- Programme schedule, detailed activities, ticket sale and voucher information, logistics, contact details and social links are explicitly marked as forthcoming rather than fabricated.

### Deprecated Features

- **Fullscreen night-sky teaser** (removed 2026-10-04): canvas starfield, drifting mist, pointer trail, animated 31-second text/title entrance and fullscreen no-scroll layout were replaced by the scrollable event site above.
- **Background music module** (removed 2026-10-04): `public/music.js` and its external audio-library imports were removed; the site has no autoplay or optional music.
- **Perpetual title glow** (removed 2026-09-17): the teaser-only CSS filter animation was removed with the fullscreen teaser.
