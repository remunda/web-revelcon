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
| `public/styles.css` | Deep green parchment/ink visual system with restrained amber accents, responsive layout, focus states and reduced-motion rules |
| `public/main.js` | Progressive-enhancement mobile dialog controls |
| `public/revelcon-hero-landscape.jpeg` | Approved landscape hero visual, copied from `drive/REVELCON/` for static delivery |
| `public/revelcon-hero-portrait.jpeg` | Approved portrait hero visual, copied from `drive/REVELCON/` for static delivery |
| `public/revelcon-logo-bw.jpeg` | Optimised 1700 × 622 local raster of the approved black/white Revelcon logo, retained as the local source for the final transparent raster |
| `public/revelcon-logo-gold.png` | Tightly cropped transparent 1336 × 397 white-gold PNG generated from the approved BW raster in Chromium canvas processing; it has real alpha rather than an SVG mask, so the hero/footer wordmark has no rectangular source background or substantial transparent edge padding |
| `public/revelcon-dark-parchment.jpeg` | Optimised 1088 × 1200 crop of only the safe dark parchment portion of the supplied composite texture; it excludes the white/checkerboard area and tiles behind site sections |
| `public/revelcon-logo.svg` | Legacy wordmark asset retained in public but no longer used on the event page |
| `wrangler.jsonc` | Workers config: targets `new-web-revelcon`, serves `./public` as static assets, provides fork-guarded PR previews, and deploys production from `main` |

### Features

#### 1. Scrollable event structure
- The page has a full visual hero followed by Vítejte, Na co se těšit, Úniková RPG hra, Program, Praktické informace, FAQ and Kontakt sections, then a footer.
- The welcome h2 is “Vítejte na Revelconu”. Its current approved paragraph says: “Na Revelconu se na jeden den svět, který znáte, propojí se světem čar a kouzel. Kouzelnická akademie Oslavany slaví 20ti leté výročí odhalení světa kouzelníků a tak otvírá své brány pro všechny. Přijďte si pro svoji první hůlku, namíchejte lektvar nebo složte zkoušku z přemisťování. Můžete se také zúčastnit únikové hry s příběhem a odhalit tajemství školy. Program doplní hudební vystoupení, kouzelnická show, filmová promítání a mnoho dalšího – podrobnosti budeme postupně zveřejňovat.”
- The activity section h2 is “Na co se těšit” and its lead says “Detaily již brzy zde i na sociálních sítích”. Its cards include renamed “Aktivity pro děti”, “Kouzelnické hůlky” and “Létání na koštěti”, alongside Dračí hlídka, Kouzelnický kvíz, Království sov, Kino, Kouzelník Šeklin, Literární soutěž and Hudební vystoupení. The published children detail covers a student ID for ages 3–12, a wand, lessons in magical-creature care, spells and potion making, broom flying and apparition, limited capacity and advance-ticket access; wand detail makes original wands available to everyone, with visitors over 12 adding a wand voucher to their ticket. The quiz is for teams of 2–8, is included in admission, requires timely registration, awards prizes and prohibits phones; Království sov brings owl, raptor and parrot specialists to explain proper owl care and feeding. Kino presents authorised fan films in their original language with Czech subtitles, including stories of Bellatrix Lestrange, Neville Longbottom’s parents and a Snape-versus-Marauders duel. Šeklin performs twice daily and may also present close-up magic between shows; the literary competition is open to everyone, with rules announced at Revelcon’s opening and a winner selected by the Academy teaching-staff jury; and the music detail promises three bands, including one led by a local frontman, with Irish dancing suggested. The Program follows the Úniková RPG hra in page and DOM order.
- The approved hero image is served through a semantic `<picture>`: portrait on screens through 768px and landscape above it. It is shown directly without a tint, gradient or textured overlay; the image is decorative (`alt=""`), while the Revelcon name, subtitle, date and Zámek Oslavany venue are real text.
- Hero image sources are copied locally to `public/`; the design screenshots and unapproved alternative icon sheet are not used as page assets.

#### 2. Navigation and interaction
- Header and mobile dialog each contain the five primary links: Úvod/Vítejte, Program, Na co se těšit, Praktické informace and Kontakt. “Na co se těšit” links directly to the activity-card section; small decorative symbols are `aria-hidden`, and the RPG game is an additional in-page link in the mobile dialog.
- Directly below the hero, a labelled “Rozcestník” navigation presents all published destinations as grouped, real-anchor tabs: Program and Vstupenky; children’s activities, Úniková hra, Hůlky, Hudební vystoupení, Kouzelnická show, Kvíz, Literární soutěž, Království sov and Filmová promítání; plus Praktické informace, Kostýmy, Občerstvení and FAQ. Vstupenky points to the existing ticket-availability FAQ; the other tabs point to their corresponding section, activity card or practical-information item.
- The accessible mobile `<dialog>` menu is progressively enhanced by `main.js`: it opens from a real button, returns focus to that button on close, closes on Escape through the native dialog, and closes after a menu link is chosen.
- A skip link goes to `#obsah`. All navigation and the remaining hero programme call-to-action are real anchors, including the labelled hero down-arrow that links to Vítejte, so reading and linking work without JavaScript.
- The former small header logo is intentionally absent. The header aligns its five desktop navigation links at the right, while the mobile menu button remains in the same safe area.

#### 3. Visual language and typography
- `styles.css` defines a dark forest-green parchment/ink palette drawn toward the hero artwork, with yellow-orange amber reserved for calls to action, headings, symbols and fine ornamental borders. The local cropped parchment texture is tinted, blended and tiled across the content sections, while the hero keeps the approved imagery unobscured and transitions directly into the content.
- The hero and footer use `revelcon-logo-gold.png`, a tightly cropped transparent white/gold raster generated from the approved BW logo. The hero presents Revelcon as the brand and places the subtitle “Odhal svět kouzel” directly under its wordmark; it uses “Zámek Oslavany” as the venue, not “Kouzelnická akademie Oslavany” as a brand subtitle. On desktop, the hero wordmark is capped at 260px wide (`min(23vw, 260px)`), roughly half the prior visible wordmark width; mobile retains the larger `min(63vw, 300px)` presentation. The header contains no logo.
- Cards, programme panels and FAQ use layered deep-green grounds, thin amber borders, inset ornamental lines and high-contrast amber headings. Existing Unicode marks are temporarily presented as consistent small decorative medallions and remain `aria-hidden`; they are not a final icon delivery.
- Cormorant Garamond supplies readable serif copy and display headings; Marck Script is reserved for a single ornamental seal.
- No background music, canvas animation, pointer trail, star field or long intro sequence remains.

#### 4. Responsive and accessible behaviour
- Layout is mobile-first: navigation and activity cards are one column on phones, two columns on tablet, and three columns at desktop widths. The programme becomes two readable time/event panels on larger screens and one panel column on phones; its times use tabular numerals and do not rely on horizontal table scrolling. Hero uses the portrait image on phones and landscape on desktop; on first mobile view it prioritises the unobscured artwork, wordmark, subtitle, date, venue and bottom-centred scroll cue, while the desktop-only hero copy and programme call-to-action remain available through the navigation and their linked sections.
- Links and menu buttons meet a 44px minimum target; keyboard focus is visibly gold; headings and landmark structure remain semantic.
- `prefers-reduced-motion: reduce` disables smooth scrolling and decorative CSS transitions/animations.
- `viewport-fit=cover` plus safe-area padding protects the header and dialog around phone cut-outs.

#### 5. Content status
- The working event date is `2027-05-22`, at Zámek Oslavany (the area is the Zámecký park Oslavany).
- Published programme includes Main Stage (opening, Šeklin, Fookin’ guns, quiz, SUKUBA and 5 Leaf Clover) and Area (stalls, RPG game, children’s activities, cinema, owls, micromagic and Quad Ball), with the document’s times.
- Practical information lists Zámecký park Oslavany, opening hours, direct Brno bus, free parking, voluntary costumes and the stated food/drink offer. Contact details and social links remain deliberately unpublished.

### Deprecated Features

- **Fullscreen night-sky teaser** (removed 2026-10-04): canvas starfield, drifting mist, pointer trail, animated 31-second text/title entrance and fullscreen no-scroll layout were replaced by the scrollable event site above.
- **Background music module** (removed 2026-10-04): `public/music.js` and its external audio-library imports were removed; the site has no autoplay or optional music.
- **Perpetual title glow** (removed 2026-09-17): the teaser-only CSS filter animation was removed with the fullscreen teaser.
