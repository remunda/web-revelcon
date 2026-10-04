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

This is a single-page, scrollable, mobile-first event site for **RevelCON** (Kouzelnická akademie Oslavany, **22 May 2027**). It is a static site under `public/`, deployed by Cloudflare Workers (`wrangler.jsonc` → `assets.directory: "./public"`). Event copy and the published programme derive from `drive/REVELCON/docs/web revelcon.docx`; the site does not invent prices, contacts, sale URLs, or social URLs.

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
- The page has a full visual hero followed by Vítejte, Program, Magické aktivity, Úniková RPG hra, Vstupenky a poukazy, Praktické informace and Kontakt sections, then a footer.
- The welcome copy uses the approved “lost letter” hook and one-day student experience: wands, first spells, potions, magical creatures, broom flying, music, show, cinema, quiz, literary competition, activities and the RPG game.
- The approved hero image is served through a semantic `<picture>`: portrait on screens through 768px and landscape above it. The hero image is decorative (`alt=""`); event name, date and place are real text.
- Hero image sources are copied locally to `public/`; the design screenshots and unapproved alternative icon sheet are not used as page assets.

#### 2. Navigation and interaction
- Header and mobile dialog each contain the six primary links: Úvod/Vítejte, Program, Magické aktivity, Praktické informace, Vstupenky a poukazy and Kontakt. Small decorative gate/owl, scroll/hourglass, book/lecturer, compass, seal/ticket and quill symbols are `aria-hidden`; the RPG game is an additional in-page link.
- The accessible mobile `<dialog>` menu is progressively enhanced by `main.js`: it opens from a real button, returns focus to that button on close, closes on Escape through the native dialog, and closes after a menu link is chosen.
- A skip link goes to `#obsah`. All navigation and tickets calls-to-action are real anchors, so reading and linking work without JavaScript.
- On mobile, an IntersectionObserver shows a safe-area-aware sticky “Vstupenky již brzy” link only after the hero has been left. The regular ticket section remains available without JavaScript.

#### 3. Visual language and typography
- `styles.css` defines a warm gold/parchment/ink palette, ornamental text symbols (decorative and `aria-hidden`), parchment texture gradients and restrained shadows.
- Cormorant Garamond supplies readable serif copy and display headings; Marck Script is reserved for a single ornamental seal. The existing SVG wordmark is used in the header and footer.
- No background music, canvas animation, pointer trail, star field or long intro sequence remains.

#### 4. Responsive and accessible behaviour
- Layout is mobile-first: navigation and activity cards are one column on phones, two columns on tablet, and three columns at desktop widths. The programme becomes two readable time/event panels on larger screens and one panel column on phones; its times use tabular numerals and do not rely on horizontal table scrolling. Hero uses the portrait image on phones and landscape on desktop.
- Links and menu buttons meet a 44px minimum target; keyboard focus is visibly gold; headings and landmark structure remain semantic.
- `prefers-reduced-motion: reduce` disables smooth scrolling and decorative CSS transitions/animations.
- `viewport-fit=cover` plus safe-area padding protects header, dialog, and mobile sticky ticket link around phone cut-outs.

#### 5. Content status
- The working event date is `2027-05-22`, at Kouzelnická akademie Oslavany.
- Published programme includes Main Stage (opening, Šeklin, Fookin’ guns, quiz, SUKUBA and 5 Leaf Clover) and Area (stalls, RPG game, children’s activities, cinema, owls, micromagic and Quad Ball), with the document’s times.
- Ticket copy covers wave presale, limited on-site availability, age bands, family entry, wand vouchers, team RPG vouchers and mailed gift invitations without displaying prices or a sale URL.
- Practical information lists Zámecký park Oslavany, opening hours, direct Brno bus, free parking, voluntary costumes and the stated food/drink offer. Contact details and social links remain deliberately unpublished.

### Deprecated Features

- **Fullscreen night-sky teaser** (removed 2026-10-04): canvas starfield, drifting mist, pointer trail, animated 31-second text/title entrance and fullscreen no-scroll layout were replaced by the scrollable event site above.
- **Background music module** (removed 2026-10-04): `public/music.js` and its external audio-library imports were removed; the site has no autoplay or optional music.
- **Perpetual title glow** (removed 2026-09-17): the teaser-only CSS filter animation was removed with the fullscreen teaser.
