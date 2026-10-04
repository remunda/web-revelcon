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

# Current Site Behavior — Revelcon Event Site

> **MAINTENANCE RULE FOR AI AGENTS**: Whenever you add, remove, change, or break a feature in this site, you MUST also update this section to match. Keep the structure (numbered features, sub-bullets, file pointers) and replace any changed details. Do not delete features the user asked for — only update, add, or annotate. If a feature is removed, mark it `(removed YYYY-MM-DD)` and move it to the bottom under "Deprecated Features" so history is preserved.

This is a single-page, scrollable, mobile-first event site for **Revelcon** at **Zámek Oslavany** on **22 May 2027**. It is a static site under `public/`, deployed by Cloudflare Workers (`wrangler.jsonc` → `assets.directory: "./public"`). Event copy and the published programme derive from `drive/REVELCON/docs/web revelcon.docx`; the site does not invent prices, contacts, sale URLs, or social URLs.

### File map

| File | Role |
|---|---|
| `public/index.html` | Semantic page structure, hero picture, navigation, event sections and accessible links |
| `public/styles.css` | Dark forest-green and burgundy visual system, responsive layout, focus states and reduced-motion rules |
| `public/main.js` | Progressive-enhancement mobile dialog controls and sticky mobile ticket link |
| `public/revelcon-hero-landscape.jpeg` | Approved landscape hero visual, copied from `drive/REVELCON/` for static delivery |
| `public/revelcon-hero-portrait.jpeg` | Approved portrait hero visual, copied from `drive/REVELCON/` for static delivery |
| `public/revelcon-logo-bw.jpeg` | Optimised 1700 × 622 local raster of the approved black/white Revelcon logo, retained as the local source for the final transparent raster |
| `public/revelcon-logo-gold.png` | Tightly cropped transparent 1336 × 397 white-gold PNG generated from the approved BW raster in Chromium canvas processing; it has real alpha rather than an SVG mask, so the hero/footer wordmark has no rectangular source background or substantial transparent edge padding |
| `public/revelcon-dark-parchment.jpeg` | Optimised 1088 × 1200 crop of the safe dark parchment portion of the supplied composite texture, retained locally but not used by the current green/burgundy page treatment |
| `public/revelcon-logo.svg` | Legacy wordmark asset retained in public but no longer used on the event page |
| `wrangler.jsonc` | Workers config: targets `new-web-revelcon`, serves `./public` as static assets, provides fork-guarded PR previews, and deploys production from `main` |

### Features

#### 1. Scrollable event structure
- The page has a full visual hero followed by Vítejte, Program, Magické aktivity, Úniková RPG hra, Vstupenky a poukazy, Praktické informace, FAQ and Kontakt sections, then a footer. The welcome section includes an in-page visitor guide, “Na co se těšit”.
- The welcome heading is “Kouzelnická akademie Oslavany otvírá své brány” and its single paragraph is the approved Revelcon copy about a one-day connection between the known world and the world of magic. It does not retain the former lost-letter copy.
- The “Na co se těšit” guide links only to real page content: Program, Vstupenky, Aktivity pro děti, Úniková hra, Hůlky, Hudební vystoupení, Kouzelnická show, Kvíz, Literární soutěž, Království sov, Filmová promítání, Praktické informace, Kostýmy, Občerstvení and FAQ. Activity cards and practical-information entries provide the relevant fragment targets; FAQ contains only answers supported by already published details.
- The approved hero image is served through a semantic `<picture>`: portrait on screens through 768px and landscape above it. The hero image is decorative (`alt=""`); event name, date and place are real text.
- Hero image sources are copied locally to `public/`; the design screenshots and unapproved alternative icon sheet are not used as page assets.

#### 2. Navigation and interaction
- Header and mobile dialog each contain the six primary links: Úvod/Vítejte, Program, Na co se těšit, Praktické informace, Vstupenky a poukazy and Kontakt. Small decorative symbols are `aria-hidden`; the RPG game remains an additional in-page link in the mobile dialog.
- The accessible mobile `<dialog>` menu is progressively enhanced by `main.js`: it opens from a real button, returns focus to that button on close, closes on Escape through the native dialog, and closes after a menu link is chosen.
- A skip link goes to `#obsah`. All navigation and tickets calls-to-action are real anchors, so reading and linking work without JavaScript.
- On mobile, an IntersectionObserver shows a safe-area-aware sticky “Vstupenky & poukazy” link only after the hero has been left. The regular ticket section remains available without JavaScript.
- The former small header logo is intentionally absent. The header aligns its six desktop navigation links at the right, while the mobile menu button remains in the same safe area.

#### 3. Visual language and typography
- `styles.css` defines a dark forest-green and burgundy palette with warm cream copy and gold accents. The hero ends with an organic torn-paper edge into the green/burgundy content; no brown parchment texture is used in the active page treatment.
- The hero and footer use `revelcon-logo-gold.png`, a tightly cropped transparent white/gold raster generated from the approved BW logo. The hero presents Revelcon as the brand and places the subtitle “Odhal svět kouzel” directly under its wordmark; it uses “Zámek Oslavany” as the venue, not “Kouzelnická akademie Oslavany” as a brand subtitle. On desktop, the hero wordmark is capped at 260px wide (`min(23vw, 260px)`); mobile retains the larger `min(63vw, 300px)` presentation. The header contains no logo.
- Cards and programme panels combine dark green and burgundy grounds, thin gold borders, inset ornamental lines and high-contrast headings. The responsive visitor guide uses clear, keyboard-accessible text chips. Existing Unicode marks are decorative and `aria-hidden`; they are not a final icon delivery.
- Cormorant Garamond supplies readable serif copy and display headings; Marck Script is reserved for a single ornamental seal.
- No background music, canvas animation, pointer trail, star field or long intro sequence remains.

#### 4. Responsive and accessible behaviour
- Layout is mobile-first: activity cards are one column on phones, two columns on tablet, and three columns at desktop widths; the visitor-guide links wrap into touch-sized chips. The programme becomes two readable time/event panels on larger screens and one panel column on phones; its times use tabular numerals and do not rely on horizontal table scrolling. Hero uses the portrait image on phones and landscape on desktop.
- Links and menu buttons meet a 44px minimum target; keyboard focus is visibly gold; headings and landmark structure remain semantic.
- `prefers-reduced-motion: reduce` disables smooth scrolling and decorative CSS transitions/animations.
- `viewport-fit=cover` plus safe-area padding protects header, dialog, and mobile sticky ticket link around phone cut-outs.

#### 5. Content status
- The working event date is `2027-05-22`, at Zámek Oslavany (the area is the Zámecký park Oslavany).
- Published programme includes Main Stage (opening, Šeklin, Fookin’ guns, quiz, SUKUBA and 5 Leaf Clover) and Area (stalls, RPG game, children’s activities, cinema, owls, micromagic and Quad Ball), with the document’s times.
- Ticket copy covers wave presale, limited on-site availability, age bands, family entry, wand vouchers, team RPG vouchers and mailed gift invitations without displaying prices or a sale URL.
- Practical information lists Zámecký park Oslavany, opening hours, direct Brno bus, free parking, voluntary costumes and the stated food/drink offer. Contact details and social links remain deliberately unpublished.

### Deprecated Features

- **Fullscreen night-sky teaser** (removed 2026-10-04): canvas starfield, drifting mist, pointer trail, animated 31-second text/title entrance and fullscreen no-scroll layout were replaced by the scrollable event site above.
- **Background music module** (removed 2026-10-04): `public/music.js` and its external audio-library imports were removed; the site has no autoplay or optional music.
- **Perpetual title glow** (removed 2026-09-17): the teaser-only CSS filter animation was removed with the fullscreen teaser.
