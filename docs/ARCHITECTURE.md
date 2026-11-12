# ZAP POS: Architecture

Detailed map of the codebase so changes can be made without re-reading every file.
**Update this file in the same change whenever structure changes** (new section, component, endpoint, folder, JSON key or CSS block). Log every change in `docs/CHANGELOG.md`.

## 1. Repository layout
```
ZAP POS/
├─ CLAUDE.md                     quick rules + commands (read first)
├─ docs/ARCHITECTURE.md          this file
├─ docs/CHANGELOG.md             dated history of changes (newest first)
├─ .claude/                      Claude Code settings + custom commands
├─ ZapPos.sln                    Visual Studio solution (API project only)
├─ README.md                     human setup guide
└─ src/
   ├─ ZapPos.Api/                ASP.NET Core 8 Web API
   │  ├─ Program.cs              controllers + static files + SPA fallback
   │  ├─ Controllers/LandingController.cs   GET /api/landing
   │  ├─ ZapPos.Api.csproj       links ../zappos-web/src/content/landing-content.json as Data/landing-content.json
   │  └─ Properties/launchSettings.json      http://localhost:5080
   └─ zappos-web/                React 18 + Vite 5 landing page
      ├─ index.html              title/meta, mounts #root
      ├─ vite.config.js          dev port 5173, proxy /api → :5080, default build → ../ZapPos.Api/wwwroot
      ├─ vercel.json             Vercel build: `npm run build -- --outDir dist`, output `dist/`, immutable cache for /assets
      ├─ public/favicon.svg      blue square + white bolt
      └─ src/
         ├─ main.jsx             font imports (Latin subsets) + styles.css + <App/>
         ├─ App.jsx              fetches content, renders sections in order, cursor-glow listener
         ├─ styles.css           all styles (see §5)
         ├─ content/landing-content.json   ALL page content (see §4)
         └─ components/          see §3
```

## 2. Data flow
```
landing-content.json ──(bundled import)──► App.jsx state (fallback, renders instantly)
        │
        └──(csproj <Content Link>)──► API bin/Data/landing-content.json
                                         └─► GET /api/landing ──fetch──► App.jsx state (replaces fallback)
```
- One JSON file is the single source of truth for both.
- Dev: Vite proxies `/api` to the API, so no CORS is needed. If the API is down, fetch fails silently and the fallback stays.
- Prod on **Vercel** (current): static site from `dist/`. `App.jsx` skips the fetch when not in dev and `VITE_API_URL` is unset, so the bundled JSON is the content.
- Prod with the API (future): set `VITE_API_URL` on Vercel → `fetch(`${VITE_API_URL}/api/landing`)` (the API must allow the Vercel origin via CORS). Alternatively `npm run build` (default) writes into `ZapPos.Api/wwwroot` and the API serves the SPA itself (`MapFallbackToFile("index.html")`).
- **Admin panel plan:** replace the file read in `LandingController` with EF Core + SQL Server, keeping the exact JSON shape. Add authenticated CRUD endpoints (`/api/admin/...`). The landing page code shouldn't need changes.

## 3. Components → sections
Rendered by `App.jsx` in this order:

| # | Component | File | JSON key(s) | Anchor | CSS block |
|---|---|---|---|---|---|
| 1 | `Navbar` | Sections.jsx | `brand`, `nav`, `links` | n/a | Navbar (floating pill) |
| 2 | `Hero` | Hero.jsx | `hero`, `brand`, `links` | `#home` | Hero, Monitor frame |
| 3 | `Ticker` | Sections.jsx | `ticker` | n/a | Ticker |
| 4 | `Day` | Day.jsx | `day` | `#day` | A day at the counter |
| 5 | `Counters` | Counters.jsx | `counters` | `#counters` | Live multi-counter demo |
| 6 | `Hardware` | Sections.jsx | `hardware` | n/a | Hardware stickers |
| 7 | `Pricing` | Pricing.jsx | `pricing` | `#pricing` | Pricing as receipts |
| 8 | `Reviews` | Reviews.jsx | `reviewsSection`, `reviews` | `#reviews` | Reviews: sticky notes |
| 9 | `Faq` | Faq.jsx | `faq`, `brand`, `links` | `#faq` | FAQ as WhatsApp chat |
| 10 | `FinalCta` | Sections.jsx | `finalCta`, `links`, `brand` | n/a | Final CTA (night) |
| 11 | `Footer` | Sections.jsx | `brand`, `footer`, `links` | `#contact` | Footer |

Shared building blocks:
- `Icons.jsx`: `<Icon name size fill className />` (stroke icons from the `paths` map; adds class `icon icon-<name>`) and `<Logo size />` (blue gradient square + white bolt).
- `Bits.jsx`: `Kicker` (pill label), `Scribble` (handwritten note + arrow, `dir` = left/up/right), `Squiggle` (self-drawing yellow underline), `Stars`, `Barcode` (deterministic from a seed string), `formatRs(n)`.
- `Mockups.jsx`: `Monitor` (screen + stand) and `PosBillingScreen({ status })` (the fake POS UI in the hero).

### Interactive behaviour (state lives in each component)
- **Hero**: `offline` toggled by the power switch → adds `.night` to the hero, ticks a `bills` counter every 1.6s, sets `document.documentElement.dataset.power = 'off'|'on'` (the navbar goes dark via `html[data-power="off"]`). Pointer movement over `.hero-stage` sets CSS vars `--px/--py` (−0.5…0.5) used for the 3D tilt/parallax.
- **App**: one global `pointermove` listener sets `--mx/--my` on the nearest `.glow` element (cursor spotlight on timeline cards and tills).
- **Counters**: `stock` (starts at `counters.stock`) and `last = {i, n}`. The tills use `key={i-n}` so they remount and replay animations on every sale. The SVG `pulse` path animates along the wires.
- **Pricing**: `annual` (monthly/yearly prices) and `open` (comparison table).
- **Faq**: `asked` (question indexes shown), `typing` (900ms typing dots), auto-scroll after the first render.
- **FinalCta**: `spin` set on click; cleared on `animationend` of `boltTap`.

## 4. Content schema (`landing-content.json`)
Top-level keys: `_note, brand, nav, links, hero, ticker, day, counters, hardware, pricing, reviewsSection, reviews, faq, finalCta, footer`.
- `brand`: `name, phone, email, address, about`
- `links`: `demo, portal, windowsInstaller, googlePlay, appStore, whatsapp, social{linkedin,facebook,instagram,x}`
- `hero`: `kicker, titleTop, titleBottom, description, primaryCta, secondaryCta, switchLabel, switchNote, trust[]`
- `day.stops[]`: `time, period, title, text, visual` (`visual` ∈ `open|counters|offline|stock|phone`, rendered by `visuals` in Day.jsx; `period` maps to an icon via `periodIcon`)
- `counters`: `kicker, title, titleHighlight, description, product, stock, note, points[]`
- `hardware.items[]`: `icon, label` (icon = a key in Icons.jsx)
- `pricing.plans[]`: `id, name, tag, monthly, annual, priceLabel?, description, cta, featured?, lines[[qty, label]]`. `monthly: null` shows `priceLabel` (e.g. "Custom").
- `pricing.compare[]`: either `{group}` or `{label, values[3]}` where a value is `true|false|string`, in plan order.
- `reviews[]`: `text, name, business` (**placeholders**). An empty array hides the section.
- `faq.items[]`: `q, a`
- Section titles use `title` + `titleHighlight` (the highlight renders blue on its own line).

## 5. Styling (`styles.css`)
Order of blocks (search the `/* ---------- Name ---------- */` headers):
1. Tokens `:root` (colors, shadows, fonts), base, `h2 .hl` convention
2. Buttons (`btn`, `btn-primary|outline|quiet|glass`, `btn-sm|lg|block`)
3. Shared bits (kicker, scribble, squiggle, stars, store button, `.paper` + `.zz`/`.zz-top` torn receipt edges, `.r-rule`)
4. Navbar → Hero → Monitor frame + POS app UI → Ticker → Day → Counters → Hardware → Pricing → Reviews → FAQ → Final CTA → Footer
5. Reduced motion (kills all animation)
6. Responsive: `max-width: 1080px` (stack hero/heads), `900px` (mobile nav, single-column timeline/receipts/notes, compare table becomes stacked rows), `720px` (phone sizing)
7. **Hover animations** (`@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)`), always last

Key tokens: `--brand-50…700`, `--yellow #ffd60a`, `--night #060c1a`, `--night-2`, `--paper`, `--ink`, `--text`, `--muted`, `--line`, `--tint`; fonts `--font` (Inter), `--font-head` (Bricolage Grotesque Variable), `--font-mono` (JetBrains Mono), `--font-hand` (Caveat).

Gotchas:
- `.paper` uses `filter: drop-shadow` so the zig-zag pseudo-elements get shadows; don't add `overflow: hidden` to it.
- Mobile hero monitor has a fixed height (260px) and hides extra bill rows (`.bill-line:nth-child(n+3)` etc.).
- The day timeline background fades day→night with a fixed gradient. Its last two stops use dark styles (`.stop-3`, `.stop-4`), so adding or removing stops means adjusting those rules.

## 6. Adding a new landing section (checklist)
1. Add its content object to `landing-content.json`.
2. Create `components/NewThing.jsx` (default export, props from JSON).
3. Render it in `App.jsx` at the right position; add an `id` if the nav links to it (and add to `nav`).
4. Add a `/* ---------- New thing ---------- */` CSS block in section order, plus responsive rules and (optional) hover rules in the hover block.
5. Check 1366px and 390px widths; `npm run build`.
6. Update §3 and §4 of this file and add a CHANGELOG entry.

## 7. Deployment
- Vercel project: import GitHub repo `Muneeb-akhtar/ZAP-POS`, **Root Directory `src/zappos-web`**, framework Vite (read from `vercel.json`). Every push to `main` deploys to production; other branches/PRs get preview URLs.
- Env vars (Vercel → Settings → Environment Variables): `VITE_API_URL` (optional, unset today). Changing env vars requires a redeploy.
- Custom domain: Vercel → Settings → Domains.

## 8. API notes
- `Program.cs`: `AddControllers`, `UseDefaultFiles`, `UseStaticFiles`, `MapControllers`, `MapFallbackToFile("index.html")`. No CORS (Vite proxy handles dev).
- `LandingController`: reads `AppContext.BaseDirectory/Data/landing-content.json` and returns it raw as `application/json` (404 if missing).
