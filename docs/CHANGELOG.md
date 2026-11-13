# Changelog

Newest first. Every change gets an entry (see CLAUDE.md rule 10). Format: date, what changed and why, files touched.

## 2026-11-13: Offline bills pile up and fly back as paper planes
- While the internet is off, each offline bill drops onto a small messy stack of paper slips beside the monitor ("BILL #1043 · Rs 2,980").
- The demo goes back online by itself after ~5.6s (visual demo, owner request): the slips fold away and turn into blue paper planes that fly one by one into the cloud card, then "All N bills synced · Nothing lost" → normal. Clicking the switch while syncing does nothing.
- Replaced the earlier round flying-receipt-icon effect. Added `plane` icon. Files: `components/Hero.jsx`, `components/Icons.jsx`, `styles.css`.

## 2026-11-13: Hero underline back + internet-down animation sequence
- Yellow self-drawing underline (`Squiggle`, re-added to `Bits.jsx`) under the last headline row "See every branch.".
- Internet switch now runs a full, logical sequence (`phase` state in `Hero.jsx`):
  - **OFF** → warm amber glow over the hero, brief screen glitch as the connection drops, sync chip turns orange with a pulsing "signal lost" ring and a bumping bill counter, receipt "SAVED OFFLINE".
  - **ON again** → "Back online · Syncing N bills…" with a filling progress bar and receipt icons flying from the receipt into the cloud chip; receipt "SYNCING…".
  - → "All N bills synced · Nothing lost" (green chip, green screen glow), then back to normal.
- JSON: added `hero.syncedNote`. Files: `components/Hero.jsx`, `components/Bits.jsx`, `content/landing-content.json`, `styles.css`.

## 2026-11-13: Internet switch note arrow
- The handwritten arrow next to the Internet switch now points straight left at the button (`.scribble.left.net-note .arrow { rotate(25deg) }`; hover nudge uses matching `pointNet` keyframes). Phones keep their own up-pointing arrow. File: `styles.css`.

## 2026-11-13: Hero right side restored (owner-locked)
- Owner wants the original right side kept: two-column hero restored (`.hero-grid` 1fr / 1.02fr, `.hero-stage` padding, right-side glow). Monitor + Active Bill screen, receipt overlap, "3 branches synced" chip and phone tag are exactly as before.
- Left column now holds the new copy: kicker "Made for shops in Pakistan", headline "Sell at every counter. / Track every item. / See every branch.", POS description, CTAs, Internet switch with note, trust list.
- Removed (no longer used): headline product chips (`.hr-chip`, `.hr-ic`, `chipIn`, `rows[].icon/chip/chipNote`), centered `.hero-head`, `.sr-only` + `srTitle` (the h1 is real text again).
- Offline note shortened ("saved offline, syncs later"); on phones the note's arrow points up at the switch.
- Files: `components/Hero.jsx`, `content/landing-content.json`, `styles.css`. Rule added to `CLAUDE.md`: the hero's right side is locked.

## 2026-11-13: Hero rewritten product-first + logic fix (internet, not power)
- Why: "Power OFF / Billing ON" was illogical. A power cut turns the PC off too. What actually fails during load shedding is the **internet** (router down, PC on UPS), and offline billing is the real feature.
- New headline (centered, 2-column grid): **"Sell at every counter. / Track every item. / See every branch."** ("every …" in brand blue), each with a live product chip (3 counters live, 1,284 in stock, Rs 1.24M today). Chips hidden on mobile.
- Demo switch is now **Internet ON/OFF** above the counter scene. OFF → POS screen, receipt and sync chip show offline billing with a bill counter ("will sync later"). The **night mode was removed** entirely (hero `.night` styles, star glow, `html[data-power]` navbar rules, the `document.documentElement.dataset.power` effect).
- Same logic fix elsewhere: timeline 15:00 card is now "Internet down / Router's off. Billing isn't." (mentions UPS); final CTA "Ready when the internet isn't."; `brand.about`; page `<title>` and meta description now describe the POS.
- Removed: Power/Billing pill headline (`.h-switch`, `.hs-*`, `hold`/`invite`/`bump` keyframes). Added: `wifi` icon, `.h-rows`/`.hr-*`, `.net-toggle`/`.nt-*` styles.
- Files: `components/Hero.jsx`, `components/Icons.jsx`, `components/Day.jsx`, `content/landing-content.json`, `styles.css`, `index.html`.

## 2026-11-13: Hero redesign: switch headline, centered layout (replaced next day)
- Why: the old hero (two-line headline with a colored second line, text left / screen right) looked too close to a competitor's site.
- New headline **"Power [ON] / Billing [ON]"** with real toggle pills built into the words. The Power pill IS the load-shedding switch (`role="switch"`): tap it and it flips to OFF, the hero goes to night, "Power" fades, and the **Billing pill stays ON**, glowing (`hold`) with a yellow "+N" bills badge. Words sit in a 2-column grid so the pills always line up.
- Centered hero (kicker, headline, lead, CTAs, trust) with a wide counter scene below (monitor center, receipt left, sync chip right, 3D tilt kept).
- Removed: yellow squiggle underline (`Squiggle` in Bits.jsx + CSS), separate power-switch row (`.power-switch`, `.ps-*`, `.switch-row`), old `.hero-grid` / `.h-top` / `.h-bottom` styles. Added `.sr-only` utility; the h1 has a hidden full-sentence title for screen readers/SEO.
- JSON `hero` keys changed: removed `titleTop`, `titleBottom`, `switchLabel`; added `powerWord`, `billingWord`, `srTitle`, `switchAria`, `nightNote`; new `description` and `switchNote`.
- Files: `components/Hero.jsx`, `components/Bits.jsx`, `content/landing-content.json`, `styles.css`.

## 2026-11-12: Live network wires in counter demo
- The dotted lines between the Master PC and the counters now flow continuously (`wireFlow`), with small glowing blue "data packets" riding along a second path (`.flow`, `packetFlow`), so the connection feels live.
- The Sell-button pulse (`.pulse`) and the Sold/Synced animations are unchanged and play on top.
- Files: `components/Counters.jsx` (extra `.flow` path), `styles.css` (counter demo block).

## 2026-11-12: FAQ chat live indicator + BOT tag
- Chat header shows it's an automated assistant: "BOT" tag after "ZAP POS Support"; status reads "Live · replies instantly".
- Live animations: the status dot blinks (`liveBlink`) and the avatar's green presence dot sends out a soft ring (`livePing`), both 1.6s loops, disabled automatically for reduced-motion users.
- Files: `components/Faq.jsx`, `styles.css` (FAQ block; merged duplicate `.chat-who b` rule).

## 2026-11-12: FAQ chat header redesign
- WhatsApp-style chat header: back arrow, round avatar (blue bolt on white, green presence dot), "online" with green dot ("typing…" in italic green while answering), video + call icons, gradient bar with soft shadow. Replaced the square logo that was clipped inside a white circle.
- Added icons `chevL`, `video` to `Icons.jsx`; `Faq.jsx` no longer imports `Logo`.
- Files: `components/Faq.jsx`, `components/Icons.jsx`, `styles.css` (FAQ block).

## 2026-11-12: Navbar logo text color
- Bug fix: with load shedding ON and the page scrolled, the nav pill turned white while "ZAP POS" stayed white (invisible). Night-mode nav rules now use `html[data-power="off"] .navbar …` so they beat `.navbar.scrolled .nav-pill`.
- Wordmark now two-tone everywhere: "ZAP" in heading color, "POS" in brand blue (`.brand-accent`, lighter blue at night/footer) via a `BrandName` helper in `Sections.jsx` (navbar + footer).
- Files: `components/Sections.jsx`, `styles.css`.

## 2026-11-12: Hardware note arrow
- The handwritten "no new hardware needed" arrow now points up toward the hardware stickers instead of down into empty space (`.scribble.left.hw-note .arrow` flips it vertically). File: `styles.css`.

## 2026-11-12: Hero underline position
- Moved the yellow squiggle under "The billing doesn't." lower (`bottom: -.36em`, slightly thinner) so it no longer cuts through descenders (the "g"); added more space below the headline (`.hero h1` margin-bottom 40px). File: `styles.css`.

## 2026-11-12: Vercel deployment setup
- Added `src/zappos-web/vercel.json` (build to `dist/`, long cache for hashed assets) so the landing page can be hosted on Vercel with Root Directory `src/zappos-web`.
- `App.jsx`: in production the API fetch only runs when `VITE_API_URL` is set, so the static Vercel site makes no failing `/api` requests and uses the bundled JSON.
- Docs: deployment sections in `CLAUDE.md` and `docs/ARCHITECTURE.md` (§2, §7), roadmap updated.
- Verified: production build loads with 0 API requests and 0 console errors.

## 2026-11-12: Claude project docs
- Added `CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/CHANGELOG.md`, `.claude/settings.json` and commands `/ship`, `/new-section`, `/update-content`, so future sessions can work without re-reading the whole codebase.
- Rule: Claude docs must be updated with every change.
- `.gitignore`: ignore `.claude/settings.local.json`. `README.md`: links to the docs.

## 2026-11-12: First push to GitHub
- Private repo `Muneeb-akhtar/ZAP-POS`, branch `main`, 28 files (node_modules / wwwroot / archives ignored).
- Pre-push audit removed dead code: 5 unused mockup screens, 28 unused CSS rules, 2 unused CSS variables, 5 unused icons, unused `brand.tagline`, unused API code (CORS, endpoints explorer, unused controller field). Fonts limited to Latin subsets (build output ~1.8 MB → 768 KB).

## 2026-11-12: Landing page v3 (current design)
- Concept "The lights go out. The billing doesn't.": load-shedding switch in the hero (page goes dark, offline bill counter, printing receipt), shop-type ticker, "A day at your counter" timeline, live multi-counter demo, hardware stickers, pricing as thermal receipts + comparison table, sticky-note reviews, WhatsApp-chat FAQ, night CTA, dark footer with wordmark.
- Hover animations site-wide (pointer devices only, reduced motion respected). Final CTA bolt spins on tap/click only (no hover, owner request).
- Fonts bundled via @fontsource (no Google Fonts).

## 2026-11-12: Project setup
- React + Vite landing page and ASP.NET Core 8 API (`GET /api/landing` serves `landing-content.json`), Visual Studio solution, blue brand + lightning-bolt logo.
