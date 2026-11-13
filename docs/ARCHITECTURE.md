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
├─ README.md                     human setup guide
├─ supabase/schema.sql           tables, RLS, grants, admin_stats() (run in Supabase SQL editor; safe to re-run)
└─ src/
   └─ zappos-web/                React 18 + Vite 5 landing page + admin
      ├─ index.html              title/meta, mounts #root
      ├─ admin/index.html        admin entry (noindex, same theme script), loads src/admin/main.jsx
      ├─ .env.example            VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY template (copy to .env.local)
      ├─ vite.config.js          dev port 5173, two inputs (main, admin), build → dist/
      ├─ vercel.json             Vercel build: `npm run build`, output `dist/`, /admin rewrite + noindex header, immutable cache for /assets
      ├─ public/favicon.svg      blue square + white bolt
      └─ src/
         ├─ main.jsx             font imports (Latin subsets) + styles.css + <App/>
         ├─ App.jsx              loads content (cache → Supabase), renders sections, demo form (#demo links), tracking listeners, cursor glow
         ├─ lib/content.js       Supabase config, defaultContent, mergeContent, fetchPublishedContent, localStorage cache
         ├─ lib/track.js         anonymous visit/click/view events, leadSource()
         ├─ admin/               admin panel (see §9)
         ├─ styles.css           all styles (see §5)
         ├─ content/landing-content.json   ALL page content (see §4)
         └─ components/          see §3
```

## 2. Data flow
```
landing-content.json ──(bundled import = defaultContent)──┐
localStorage "zap-content" (last published copy) ──────────┼─ mergeContent ─► App.jsx state (instant)
Supabase site_content[id='landing'].data ──REST fetch──────┘   then re-merge + re-cache when the fetch returns

Admin (/admin/) ──supabase-js (signed in)──► upsert site_content[id='landing'] ──► live on next page load
```
- `mergeContent(defaults, saved)`: objects merge key by key, arrays and plain values from `saved` win. So new JSON fields appear automatically, but a published array replaces the default array entirely.
- The landing page uses `GET {VITE_SUPABASE_URL}/rest/v1/site_content?id=eq.landing&select=data` with the anon key (no SDK). If Supabase is unset, down, or has no row yet, the bundled JSON is shown.
- **Demo requests:** any click on `a[href="#demo"]` (or opening `/#demo`) opens `LeadForm`; pricing buttons pass `data-plan`. Submit → `POST /rest/v1/leads` (anon, `return=minimal`). Visitors can insert but never read leads.
- **Tracking (`lib/track.js`):** `trackVisit()` once per load, `trackClick(name)` for any click inside `[data-track="name"]`, `trackView('pricing')` via IntersectionObserver → `POST /rest/v1/events` with `keepalive`. Off in dev, for bots/headless, with Do Not Track, and when localStorage `zap-no-track` is set (the admin sets it on login).
- **Admin data:** `admin/biz.js` loads all `leads` and `payments` once (`useBizStore`, shared via `BizContext`) and updates the local copy after each write; `useStats(days)` calls `rpc('admin_stats')`.

## 3. Components → sections
Rendered by `App.jsx` in this order (plus `LeadForm.jsx`, the demo request modal, rendered on top when open; CSS block "Demo request form (modal)", classes `lead-*`):

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
- `Bits.jsx`: `Kicker` (pill label), `Scribble` (handwritten note + arrow, `dir` = left/up/right), `Squiggle` (self-drawing yellow underline, hero headline), `Stars`, `Barcode` (deterministic from a seed string), `formatRs(n)`.
- `Mockups.jsx`: `Monitor` (screen + stand) and `PosBillingScreen({ status })` (the fake POS UI in the hero).
- `Sections.jsx` (internal): `BrandName` splits `brand.name` into "ZAP" + `.brand-accent` "POS" (two-tone wordmark in navbar and footer).

### Interactive behaviour (state lives in each component)
- **Hero**: `.hero-grid` 2 columns. **Left** `.hero-copy`: kicker, `.h-rows` headline (3 `.hr-row` lines, "every …" in `.hl` blue, yellow `Squiggle` underline drawn under the last row), lead, CTAs, **Internet switch** (`.net-toggle`, `role="switch"`) + handwritten note, trust list. **Right** `.hero-stage` (owner-locked layout, don't change): `Monitor` + `PosBillingScreen`, `.hero-receipt` (bottom-left overlap), `.hero-chip` (top-right), `.hero-phone-tag`. **Internet demo state machine** `phase`: `online` → (switch OFF) `offline` (auto-returns after `OFFLINE_MS` 5.6s; offline bills pile up as `.slip` paper slips in `.slip-stack` beside the monitor; warm `.hero::before` glow, one-shot `glitch` on the screen, chip `signalLost` ring + orange `.chip-count`, a bill saved every 1.6s) → (auto, or switch ON) `syncing` (slips fold away and `.plane` paper planes fly one by one, `FLY_GAP` 0.38s apart, into the chip; `.sync-bar` fills; switch is ignored until the demo finishes) → `synced` (2.6s: green chip "All N bills synced · Nothing lost") → `online`. Hero class is `is-<phase>`; screen status, receipt `.r-status.<phase>` and chip `.hero-chip.<phase>` follow it. No night mode (a power cut would turn the PC off too). Pointer movement over `.hero-stage` sets `--px/--py` for the 3D tilt/parallax.
- **App**: one global `pointermove` listener sets `--mx/--my` on the nearest `.glow` element (cursor spotlight on timeline cards and tills).
- **Counters**: `stock` (starts at `counters.stock`) and `last = {i, n}`. The tills use `key={i-n}` so they remount and replay animations on every sale. The SVG has three layers: `.wire` (dashes always flowing master→counters), `.flow` (always-moving glowing packets) and `.pulse` (one-shot bright pulse from the counter that sold, remounted per sale via `key`).
- **Pricing**: `annual` (monthly/yearly prices) and `open` (comparison table). Compare table begins with Monthly/Yearly price rows (current one highlighted); the toggle note "save up to N% yearly" is computed by `bestSaving` unless `pricing.saveLabel` is set (currently "save up to 30% yearly").
- **Faq**: `asked` (question indexes shown), `typing` (900ms typing dots), auto-scroll after the first render.
- **FinalCta**: `spin` set on click; cleared on `animationend` of `boltTap`. Background is `StarField` (7 hand-placed `STARS` that glow/dim + two `.shooting` stars that start when an IntersectionObserver adds `.final.in-view`).

## 4. Content schema (`landing-content.json`)
Top-level keys: `_note, brand, nav, links, hero, ticker, day, counters, hardware, pricing, reviewsSection, reviews, faq, finalCta, leadForm, footer`.
- `brand`: `name, phone, email, address, about`
- `links`: `demo` (`#demo` = open the demo form; any other URL is followed normally), `portal, windowsInstaller, googlePlay, appStore, whatsapp, social{linkedin,facebook,instagram,x}`
- `leadForm`: `title, description, nameLabel, phoneLabel, phonePlaceholder, phoneError, shopLabel, cityLabel, planLabel, notSure, branchesLabel, messageLabel, messagePlaceholder, submit, sending, privacy, successTitle, successText, errorText` (plan options come from `pricing.plans[].name`)
- `hero`: `kicker, rows[] {lead, accent}, description, primaryCta, secondaryCta, switchLabel, switchNote, offlineNote, syncedNote, trust[]`
- `day.stops[]`: `time` (12-hour, "9:00 AM"; rendered as clock + `.ampm`), `period, title, text, visual` (`visual` ∈ `open|counters|offline|stock|phone`, rendered by `visuals` in Day.jsx; `period` maps to an icon via `periodIcon`)
- `counters`: `kicker, title, titleHighlight, description, product, stock, note, points[]`
- `hardware.items[]`: `icon, label` (icon = a key in Icons.jsx)
- `pricing.plans[]`: `id, name, tag, monthly (per month, or null → "On request"), annual (yearly TOTAL; yearly view shows only annual/12 per month + "billed yearly"; never display the yearly total), unit? (e.g. "branch" → "/branch/month"), priceLabel?, description, cta, featured?, lines[[qty, label]]`. Plans today: Dukaan (1 shop, 1 counter), Brand (1–3 branches, per branch, featured), Enterprise (4+ branches, custom). Keep the receipts' lines and the `compare` rows in sync, and keep branch ranges non-overlapping. `monthly: null` shows `priceLabel` (e.g. "Custom").
- `pricing.compare[]`: either `{group}` or `{label, values[3]}` where a value is `true|false|string`, in plan order.
- `reviews[]`: `text, name, business` (**placeholders**). An empty array hides the section.
- `faq.items[]`: `q, a`
- Section titles use `title` + `titleHighlight` (the highlight renders blue on its own line).

## 5. Styling (`styles.css`)
Order of blocks (search the `/* ---------- Name ---------- */` headers):
1. Tokens `:root` (colors, shadows, fonts), base, `h2 .hl` convention
2. Buttons (`btn`, `btn-primary|outline|quiet|glass`, `btn-sm|lg|block`)
3. Shared bits (kicker, scribble, stars, store button, `.paper` + `.zz`/`.zz-top` torn receipt edges, `.r-rule`)
4. Navbar → Hero → Monitor frame + POS app UI → Ticker → Day → Counters → Hardware → Pricing → Reviews → FAQ → Final CTA → Footer → Demo request form (modal, `lead-*` classes; `html.modal-open` locks scroll; bottom sheet under 560px)
5. Reduced motion (kills all animation)
6. Responsive: `max-width: 1080px` (stack hero/heads), `900px` (mobile nav, single-column timeline/receipts/notes, compare table becomes stacked rows), `720px` (phone sizing)
7. **Hover animations** (`@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)`), always last

**Themes:** light tokens in `:root`, dark tokens in `:root[data-theme="dark"]` (right after `:root`); per-section dark twins for hard-coded colors in the "Dark theme: section-by-section" block near the end, then the `.theme-toggle` styles. Theme tokens beyond the palette: `--surface` (cards), `--solid` (bezels/frames), `--on-paper` (text on paper/stickers/yellow), `--sticker-shadow`. `index.html` has an inline script that sets `data-theme` before first paint (localStorage `zap-theme`, else `prefers-color-scheme`). `Sections.jsx` `ThemeToggle` (in the navbar) flips it, saves the choice, follows the device setting until the visitor picks one, and uses the View Transitions API for a circular reveal from the button (instant fallback / reduced motion).

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
- Vercel env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (same values as `.env.local`). Redeploy after changing them.
- Vercel project: import GitHub repo `Muneeb-akhtar/ZAP-POS`, **Root Directory `src/zappos-web`**, framework Vite (read from `vercel.json`). Every push to `main` deploys to production; other branches/PRs get preview URLs.
- Custom domain: Vercel → Settings → Domains.

## 8. Database (`supabase/schema.sql`)
| Table / function | Who can do what | Notes |
|---|---|---|
| `site_content` | anyone: read · admins: insert/update | one row `id='landing'`, trigger stamps `updated_at/updated_by` |
| `admins` | admins: read own row | add via the statement at the end of the file |
| `leads` | anon: insert `name, phone, shop, city, plan, branches, message, source` only · admins: all | `status` ∈ new/contacted/demo/won/lost (won = customer), `follow_up` date, `notes`; length checks |
| `payments` | admins only | `lead_id` → leads (**on delete restrict**), `amount` int > 0, `paid_on`, `method` ∈ cash/bank/jazzcash/easypaisa/card/other, `plan`, `billing` ∈ monthly/yearly/setup/other, `branches`, `paid_until`, `reference`, `note` |
| `events` | anon: insert `type, name, visitor, device, referrer, campaign` · admins: read/delete | `type` ∈ visit/click/view |
| `is_admin()` | used by policies | security definer |
| `admin_stats(days)` | authenticated (RLS still applies) | jsonb: `daily[] {date, visits, visitors, leads}`, `totals {visits, visitors, prevVisits, prevVisitors, leads, prevLeads, sawPricing, clickedCta}`, `clicks{}`, `devices{}`, `referrers[]`, `campaigns[]`; days in Asia/Karachi |

## 9. Admin panel (`/admin/`)
- **Entry:** `admin/index.html` → `src/admin/main.jsx` (fonts, `styles.css` for tokens/theme, `admin.css`) → `AdminApp.jsx`.
- **Screens (`AdminApp.jsx`):** `SetupNeeded` (env vars missing), `Login` (`signInWithPassword`), `NotAdmin` (signed in but not in `admins`), `Panel`. On admin login it sets localStorage `zap-no-track`.
- **Panel:** sidebar with two groups. *Business*: Dashboard, Leads (badge = new), Payments, Customers (badge = overdue), Analytics. *Website*: the `SECTIONS` editor tabs (dot = unsaved; "unsaved" badge on the group). Hash routing: `#dashboard`, `#leads`, `#leads/<id>` (opens that lead), `#payments`, `#customers`, `#analytics`, `#<section id>`. Holds the website draft (so switching pages keeps edits), the business store, toasts (max 3) and the Add lead / Record payment sheets.
- **Website editor (`ContentPage`):** loads `site_content`, merges with `defaultContent`, edits a `draft`. Bar: status, View site, Discard, Publish (`upsert({ id: 'landing', data: draft })`, Ctrl+S). Unload warning when unpublished. "Reset everything to the built-in content" (2-step).
- **`Dashboard.jsx`:** stat tiles (visitors/requests 7 days vs previous 7, received this month vs last, customers), "Needs your attention", visitors chart (30 d), latest leads, renewals, website `checklist()` (placeholder detection rules live there).
- **`Leads.jsx`:** list with search + filter chips, expandable `LeadDetail` (status segment, call-back date, notes, Call/WhatsApp/Record payment/Edit/Delete), `LeadSheet` (add/edit), CSV export.
- **`Payments.jsx`:** `PaymentSheet` (price = plan `monthly`/`annual` × branches when the plan has a `unit`; paid-until = +1 or +12 months), payments tab (tiles, per-month chart, by method/plan, table, month filter, CSV), `Customers` tab (renewal state from the latest `paid_until`: overdue < 0 d, due ≤ 7 d, active; estimated monthly income = monthly amounts + yearly ÷ 12).
- **`Analytics.jsx`:** range 7/30/90, tiles with deltas, per-day charts, funnel, `BarList`s; `CLICK_LABELS` names the `data-track` values.
- **Shared:** `biz.js` (Supabase client, labels `STATUSES/METHODS/BILLING`, formatting `rs/rsShort/dateFmt/timeAgo/addMonths/daysUntil`, `telLink/waLink` (03… → 92…), `downloadCsv` (UTF-8 BOM for Excel), `customersOf`, `useBizStore`, `useStats`), `ui.jsx` (`PageBar`, `Card`, `StatusPill`, `ConfirmButton`, `Sheet`, `Toasts`, `Field`), `Charts.jsx` (`Stat`, `Bars` with hover tooltip, `BarList`, `Funnel`; single brand-blue series, no chart library).
- **Fields (`Fields.jsx`):** generic editor driven by the JSON shape: strings (input/textarea, icon picker for `icon` keys via `iconNames`, selects from `CHOICES`), numbers (`monthly`, `annual`, `stock`; empty → null), booleans (switch), string lists, `[mark, text]` pair lists (receipt lines), object lists as collapsible cards (move up/down, 2-step delete, add), compare rows (`values` → ✓ / – / text per plan, plus "Add group heading"/"Add feature row"). Keys starting with `_` are hidden.
- **`sections.js`:** `SECTIONS` (id, label, icon, top-level `keys`, hint), `LABELS` (friendly field names), `HINTS` (help text under fields), `CHOICES`, `humanize` fallback.
- **Styling (`admin.css`):** `adm-` classes on the landing tokens, so light/dark come for free (status colors have dark twins next to them). Under 900px the sidebar becomes a top bar with scrolling tabs, grids go single-column, sheets become bottom sheets; under 700px tables turn into cards (`td[data-label]`).
- **Supabase:** see §8. Add an admin: create the user in Supabase Auth, then `insert into public.admins (user_id) select id from auth.users where email = '…';`.
