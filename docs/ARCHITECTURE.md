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
├─ supabase/schema.sql           tables, RLS, grants, functions, sign-up trigger (run in Supabase SQL editor; safe to re-run)
└─ src/
   └─ zappos-web/                React 18 + Vite 5 landing page + admin + customer account
      ├─ index.html              title/meta, mounts #root
      ├─ admin/index.html        admin entry (noindex, same theme script), loads src/admin/main.jsx
      ├─ account/index.html      customer account entry (noindex, same theme script), loads src/account/main.jsx
      ├─ invoice/index.html      a client's invoice by private link (noindex, same theme script), loads src/invoice/main.jsx
      ├─ .env.example            VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY template (copy to .env.local)
      ├─ vite.config.js          dev port 5173, four inputs (main, admin, account, invoice), build → dist/
      ├─ vercel.json             Vercel build: `npm run build`, output `dist/`, /admin, /account and /invoice rewrites + noindex and CSP headers, immutable cache for /assets
      ├─ public/favicon.svg      blue square + white bolt
      └─ src/
         ├─ main.jsx             font imports (Latin subsets) + styles.css + <App/>
         ├─ App.jsx              loads content (cache → Supabase), renders sections, demo form (#demo links), tracking listeners, cursor glow
         ├─ lib/content.js       Supabase config, defaultContent, mergeContent, fetchPublishedContent, localStorage cache
         ├─ lib/track.js         anonymous visit/click/view events, leadSource()
         ├─ admin/               admin panel (see §9)
         ├─ account/             customer sign-up / log-in / my account (see §10)
         ├─ invoice/             InvoiceDoc.jsx (the invoice, shared with the admin) + invoice.css (paper look, print), InvoicePage.jsx + page.css + main.jsx (the /invoice/?t= page, see §9)
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

Shop (/account/ or POS app) ──auth.signUp(email, password, data{name, phone, shop, city})──► auth.users
   └─ trigger link_signup() ──► leads row (matched by email, else mobile number, else new) gets user_id + signed_up_at
Shop signed in ──rpc('my_account')──► own shop, current plan, paid_until, payments (nothing else)
```
- `mergeContent(defaults, saved)`: objects merge key by key, arrays and plain values from `saved` win. So new JSON fields appear automatically, but a published array replaces the default array entirely.
- The landing page uses `GET {VITE_SUPABASE_URL}/rest/v1/site_content?id=eq.landing&select=data` with the anon key (no SDK). If Supabase is unset, down, or has no row yet, the bundled JSON is shown.
- **Demo requests:** any click on `a[href="#demo"]` (or opening `/#demo`) opens `LeadForm`; pricing buttons pass `data-plan`. Submit → `POST /rest/v1/rpc/submit_lead` (anon, params `p_name, p_phone, p_email, p_shop, …`). Visitors can't read or write the `leads` table directly; the same email or mobile number again updates the existing lead (no duplicates).
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

**Themes:** light tokens in `:root`, dark tokens in `:root[data-theme="dark"]` (right after `:root`); per-section dark twins for hard-coded colors in the "Dark theme: section-by-section" block near the end, then the `.theme-toggle` styles. Theme tokens beyond the palette: `--surface` (cards), `--solid` (bezels/frames), `--on-paper` (text on paper/stickers/yellow), `--sticker-shadow`. `index.html` has an inline script that sets `data-theme` before first paint (localStorage `zap-theme`, else **dark**: dark is the default everywhere; the device setting is ignored). `Sections.jsx` `ThemeToggle` (in the navbar) flips it, saves the choice, saves the visitor's choice, and uses the View Transitions API for a circular reveal from the button (instant fallback / reduced motion).

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
| `leads` | anon: nothing (uses `submit_lead()`) · admins: all | `status` ∈ new/contacted/demo/won/lost (won = customer), `follow_up` date, `notes`; length checks. **One lead per mobile number:** generated `phone_key` (via `phone_key()`: 0300-…, +92 300…, 92300… → `0300…`) with unique index `leads_phone_key`. **Accounts:** `email` (unique `leads_email_key` on lower(email)), `user_id` → auth.users (unique, on delete set null), `signed_up_at` |
| `phone_key(text)` | immutable helper | mirrored in JS as `phoneKey()` in `admin/biz.js`; keep both in sync |
| `submit_lead(p_name, p_phone, p_email, p_shop, p_city, p_plan, p_branches, p_message, p_source)` | anon only (security definer; the landing page always calls as anon) | insert, or on the same email (preferred) or `phone_key`: fill empty fields, append a dated "Sent the demo form again…" line to `notes`, Lost → New. Returns nothing |
| `payments` | admins only | `lead_id` → leads (**on delete restrict**), `amount` int > 0, `paid_on`, `method` ∈ cash/bank/jazzcash/easypaisa/card/other, `plan`, `billing` ∈ monthly/yearly/setup/other, `branches`, `starts_on`, `paid_until`, `reference`, `note`. Guards: `payments_period` (monthly/yearly need `starts_on` and `paid_until > starts_on`), **`payments_no_overlap`** (exclusion constraint, btree_gist: a shop's monthly/yearly periods `[starts_on, paid_until)` never overlap → one plan at a time, no double billing), unique `payments_same_payment` (lead, paid_on, amount, billing), unique `payments_reference` (method, lower(reference)) |
| `events` | anon: insert `type, name, visitor, device, referrer, campaign` · admins: read/delete | `type` ∈ visit/click/view |
| `is_admin()` | used by policies (authenticated only) | security definer |
| `link_signup()` + trigger `on_auth_user_created` (after insert on `auth.users`) | runs as definer, nobody can call it | links the new login to the lead with the same email, else same `phone_key` (from user metadata `phone`), else inserts a lead (`source` 'Sign-up'). A number/email whose lead already has another `user_id` → exception `ZAP_ACCOUNT_EXISTS` (sign-up fails). No metadata phone and no email match (e.g. the owner's own login) → nothing |
| `my_account()` | authenticated (security definer) | jsonb for `auth.uid()`'s lead: `name, shop, city, phone, email, since, plan, branches, billing, paid_until, active` (paid_until ≥ today, Asia/Karachi), `payments[] {paid_on, amount, method, plan, billing, branches, starts_on, paid_until}`, `invoices[] {no, kind, title, amount, issued_on, due_on, status, paid_on, token}` (not cancelled, link on). Null if the login isn't linked (admin). **Customers get no table policies; this is their only read path** (also for the POS app's licence check) |
| `plan_codes` | admins: read/insert, update `status` only (never delete) | every licence key made (`starts_on`, `status` active/replaced/revoked, `changed_at`; a new active key for a shop marks the older active one `replaced`, trigger `plan_codes_replace`; anon rpc `licence_status(p_branch, p_code)` → `{status, newest}` only for a caller holding one of that shop's keys, used by ZAP POS's `LicenceHost`): `lead_id` → leads (on delete restrict), `branch_code` (`^[A-Z0-9]{2,20}$`), `counters` 1–50, `paid_until`, `code` (unique), `made_by` (default `auth.uid()`). `leads.pos_branch_code` remembers each shop's ZAP POS branch code. Rows are written by the edge function below, as the signed-in admin |
| Edge function `make-plan-code` (`supabase/functions/make-plan-code/`) | signed-in admins only (`verify_jwt` + `is_admin()` rpc) | POST `{lead_id, branch_code, counters, paid_until, starts_on?}` → `{code}`. Signs with ECDSA P-256 using the secret `PLAN_SIGNING_KEY` (base64 PKCS#8; set in Supabase → Edge Functions → Secrets, never in the repo). `plancode.ts` = the code format, byte-for-byte the same as `src/Zap.Core/PlanCode.cs` in ZAP-POS-Desktop-App (a test there reads a code made by this file). ZAP POS applies the code in Settings > Plan, offline |
| `releases`, `release_installs` | admins (read/write releases, read installs) | `releases`: `version` (unique, x.y.z), `notes`, `sha256`, `size`, `parts[]` (paths in bucket `releases`), `signature` (base64 ECDSA over `ZAPREL1\|version\|sha256`), `target_branch` (null = all shops), `published`. `latest_release(p_branch)` (anon) returns the newest published one for that shop; `report_release(p_branch, p_version)` (anon) records what a shop runs. Bucket `releases`: public read, admin insert/update, 45 MB per file |
| Edge function `sign-release` | signed-in admins only | POST `{version, sha256}` → `{signature}` with `PLAN_SIGNING_KEY` |
| `admin_stats(days)` | authenticated (RLS still applies) | jsonb: `daily[] {date, visits, visitors, leads}`, `totals {visits, visitors, prevVisits, prevVisitors, leads, prevLeads, sawPricing, clickedCta}`, `clicks{}`, `devices{}`, `referrers[]`, `campaigns[]`; days in Asia/Karachi |
| `bills` (+ sequence `bills_no_seq`, bucket `bill-proofs`) | admins: read/insert/update (never delete) | bills and estimates (`kind`), numbered from 1001 (shown INV-/EST-), `lead_id`, `title`, `items` [{desc, qty, price, note?}] (≤ 50), `discount`, `tax_pct`, `amount` (whole Rs; with items it is computed by trigger `bills_total`: round((Σ qty×price − discount) × (1 + tax_pct/100))), `share_token` (48 hex, unique), `share_on`, `sent_at`, `note`, `issued_on`, `due_on`, `status` unpaid/proof/paid/cancelled, `proof_path` (private bucket `bill-proofs`, admins only), `paid_on`. Unique index `bills_same_bill` stops the same bill twice. Late / coming up are worked out from the dates in the page |
| `invoice_settings` (one row) | admins only | your details on every invoice: business, owner_name, phone, email, address, pay_details, note |
| `invoice_view(token)` | anon (flood-limited 300/20000 an hour) | one invoice by its private token (null if the link is off, the token is wrong or the bill is cancelled): lines, totals, dates, status, `client {name, shop, phone, city}`, `from` (invoice_settings) |
| `invoice_proof(token, path)` | anon (flood-limited 10/500) | after the client uploads to `bill-proofs/shared/<token>/…` (storage policy allows only that folder, for a shared unpaid bill; jpeg/png/webp/heic/pdf): sets `proof_path`, status unpaid → proof |
| `licence_lookup(code)` | anon (flood-limited 30/3000) | ZAP POS setup: for one exact licence key, `{branch_code, counters, paid_until, status, shop, name, phone, city, email, has_account}`; null for an unknown key. A sign-up with `plan_code` in its details is linked to that key's shop by `link_signup()` |
| `admin_team()`, `add_admin(email)`, `remove_admin(user)` | signed-in admins | the Team page: admins with email and last sign-in; add by the email of an existing account (`no_account` / `already` / `added`); you can't remove yourself (`self`) |
| `help_requests` + `send_help_request(...)` | anon may only call the function; admins read/update | help desk requests from ZAP POS / the website: name, phone, shop, `branch_code`, `topic`, `message`, `status` open/waiting/solved, `priority`, `reply`. The same message from the same number within an hour is kept once; linked to the lead by phone |
| `admin_health()` | signed-in admins | jsonb: database size, rows + newest per table, storage per bucket, each shop's last reported ZAP POS version, open help requests, newest release |
| `rate_limits`, `rate_ok()`, `limit_visitors()` | nobody through the API | flood protection: triggers `leads_limit` (insert/update), `help_requests_limit`, `release_installs_limit` refuse visitors (role anon) over a per-address (sha256) and an overall hourly limit |

## 9. Admin panel (`/admin/`)
- **Pages (20 Nov 2026), menu order:** Dashboard, Leads, Customers, Team (`Team.jsx`), Plans, System health (`Health.jsx`), Releases, Help desk (`HelpDesk.jsx`), Bills (`Bills.jsx`: stats, status tabs, date range, customer filter, search, table with Settle / Make bill / view / WhatsApp (message with the private link, sets `sent_at`) / Cancel, proof upload; `BillSheet` = invoice editor with lines, quick-add items (`QUICK`), discount, tax %, live total; `BillView` = the `InvoiceDoc` the client sees + link on/off, Copy link, Email (mailto), Send on WhatsApp, Download PDF (print); `InvoiceSettingsSheet` edits `invoice_settings`), Payments, Earnings (`Earnings.jsx`: payments + settled bills, ranked per customer, per-month `Area`, CSV), Analytics. `billState()` / `billNo()` are exported from `Bills.jsx`. `Area` animates its line with a clip-path reveal (`admReveal`).
- **Layout (20 Nov 2026):** `AdminApp` renders a top bar (`.adm-top`: brand with the logo that zaps every 2 minutes, `QUICK` links, theme toggle, `.adm-top-logout`) across a 248 px sidebar (`.adm-console` badge, `BUSINESS` + website sections, `.adm-nav-chev` on the open page, `.adm-side-foot` profile card + Log out) and the main column. `PageBar` takes `icon`; `TableFoot` closes every table. Styles: the "Layout" block in `admin.css`, after the "Admin look" block.
- **Look (19 Nov 2026):** the "Admin look" block in `admin.css` (just before the mobile media queries): the website's white/blue/yellow with frosted glass (`--glass`, `--glass-line`, `--glass-shadow`, dark twins on `:root[data-theme="dark"] .adm`) over `--bg` with two fixed, slowly drifting blurred blobs (`.adm::before/::after`). Yellow only for small highlights: title squiggle (`.adm-title`, in `PageBar`), the dot on the open page, `Stat hero` (the money card), the last bar, "ending" keys. Chart motion is CSS (`admGrow`, `admGrowX`, `admDraw`, `admRing`, `admRise`); numbers count up in JS (`CountUp`). All motion stops under `prefers-reduced-motion`.
- **`Charts.jsx`:** `CountUp`, `Stat` (`hero` = solid blue money card), `Bars`, `BarList`, `Funnel`, `Area` (smooth line + soft fill), `Donut` (ring with a number in the middle and a key).
- **Entry:** `admin/index.html` → `src/admin/main.jsx` (fonts, `styles.css` for tokens/theme, `admin.css`) → `AdminApp.jsx`.
- **Screens (`AdminApp.jsx`):** `SetupNeeded` (env vars missing), `Login` (`signInWithPassword`), `NotAdmin` (signed in but not in `admins`), `Panel`. On admin login it sets localStorage `zap-no-track`.
- **Panel:** sidebar with two groups. *Business*: Dashboard, Leads (badge = new), Payments, Customers (badge = overdue), Analytics. *Website*: the `SECTIONS` editor tabs (dot = unsaved; "unsaved" badge on the group). Hash routing: `#dashboard`, `#leads`, `#leads/<id>` (opens that lead), `#payments`, `#customers`, `#analytics`, `#<section id>`. Holds the website draft (so switching pages keeps edits), the business store, toasts (max 3) and the Add lead / Record payment sheets.
- **Website editor (`ContentPage`):** loads `site_content`, merges with `defaultContent`, edits a `draft`. Bar: status, View site, Discard, Publish (`upsert({ id: 'landing', data: draft })`, Ctrl+S). Unload warning when unpublished. "Reset everything to the built-in content" (2-step).
- **`Dashboard.jsx`:** stat tiles (visitors/requests 7 days vs previous 7, received this month vs last, customers), "Needs your attention", visitors chart (30 d), latest leads, renewals, website `checklist()` (placeholder detection rules live there).
- **`Leads.jsx`:** list with search + filter chips, expandable `LeadDetail` (status segment, call-back date, notes, Call/WhatsApp/Record payment/Edit/Delete), `LeadSheet` (add/edit; blocks a mobile number another lead already has, by `phoneKey`), CSV export.
- **`Payments.jsx`:** `PaymentSheet` (price = plan `monthly`/`annual` × branches when the plan has a `unit`; monthly/yearly get "Covers from" = the later of paid-on and the shop's current paid-until, paid-until = covers-from +1 or +12 months; refuses overlapping periods with a message naming the clashing dates), payments tab (tiles, per-month chart, by method/plan, table, month filter, CSV), `Customers` tab (renewal state from the latest `paid_until`: overdue < 0 d, due ≤ 7 d, active; estimated monthly income = monthly amounts + yearly ÷ 12; each row has a **Plan code** button).
- **`Releases.jsx`** (`#releases`): publish a ZAP POS version (file → version read from its ProductVersion, SHA-256 in the browser, `sign-release`, upload in 40 MB parts, insert into `releases`), send to all shops or one shop code, list with "x of y shops updated" and Stop sending.
- **`PlanCodes.jsx`:** default export `Plans` (nav "Plans"): stats, filter chips, the keys table with Copy / Renew / Revoke / Restore (`keyState()` names the state). `PlanCodeSheet` (Plans → New key, or Customers → Plan code): client, duration chips 1/3/6/12 months or a date (starts at the later of today and the current active key's end), shop code (remembered from the last code / `leads.pos_branch_code`), counters, paid until (filled from their payments), calls the edge function `make-plan-code`, then shows the code with Copy and Send on WhatsApp (message with the steps), plus the codes made for that customer.
- **`Analytics.jsx`:** range 7/30/90, tiles with deltas, per-day charts, funnel, `BarList`s; `CLICK_LABELS` names the `data-track` values.
- **Shared:** `biz.js` (Supabase client, labels `STATUSES/METHODS/BILLING`, formatting `rs/rsShort/dateFmt/timeAgo/addMonths/daysUntil`, `phoneKey` (same rule as SQL `phone_key()`), `isPeriod(billing)`, `telLink/waLink` (03… → 92…), database-guard errors → plain messages (`GUARDS`), `downloadCsv` (UTF-8 BOM for Excel), `customersOf`, `useBizStore`, `useStats`), `ui.jsx` (`PageBar`, `Card`, `StatusPill`, `ConfirmButton`, `Sheet`, `Toasts`, `Field`), `Charts.jsx` (`Stat`, `Bars` with hover tooltip, `BarList`, `Funnel`; single brand-blue series, no chart library).
- **Fields (`Fields.jsx`):** generic editor driven by the JSON shape: strings (input/textarea, icon picker for `icon` keys via `iconNames`, selects from `CHOICES`), numbers (`monthly`, `annual`, `stock`; empty → null), booleans (switch), string lists, `[mark, text]` pair lists (receipt lines), object lists as collapsible cards (move up/down, 2-step delete, add), compare rows (`values` → ✓ / – / text per plan, plus "Add group heading"/"Add feature row"). Keys starting with `_` are hidden.
- **`sections.js`:** `SECTIONS` (id, label, icon, top-level `keys`, hint), `LABELS` (friendly field names), `HINTS` (help text under fields), `CHOICES`, `humanize` fallback.
- **Styling (`admin.css`):** `adm-` classes on the landing tokens, so light/dark come for free (status colors have dark twins next to them). Under 900px the sidebar becomes a top bar with scrolling tabs, grids go single-column, sheets become bottom sheets; under 700px tables turn into cards (`td[data-label]`).
- **Supabase:** see §8. Add an admin: create the user in Supabase Auth, then `insert into public.admins (user_id) select id from auth.users where email = '…';`.

## 10. Customer account (`/account/`)
- **Entry:** `account/index.html` → `src/account/main.jsx` (fonts, `styles.css`, `admin/admin.css` for boxes/fields/tables) → `AccountApp.jsx`. Landing "Log in" buttons use `links.portal` (default `/account/`); `/account/#signup` opens the sign-up tab.
- **Screens:** `Auth` (tabs Log in / Sign up, plus Forgot password; sign-up sends `{ name, phone, shop, city }` as user metadata and `emailRedirectTo` `/account/`; "check your email" when confirmation is on), `NewPassword` (on the `PASSWORD_RECOVERY` auth event), `MyAccount` (`rpc('my_account')`: greeting, plan card green = active / red = expired, Download + "Pay or renew on WhatsApp" buttons, invoices table with View links to `/invoice/?t=`, payments table). A login that isn't linked to a shop sees the WhatsApp help, or a link to `/admin/` if it is the admin.
- **Errors → text:** "already registered" / empty `identities` → `emailTaken`; "Database error saving new user" (trigger `ZAP_ACCOUNT_EXISTS`) → `shopTaken`; unconfirmed email → `notConfirmed`.
- **Text:** `account` key in `landing-content.json` (admin tab "Customer account"); `{email}`, `{name}`, `{date}` placeholders filled by `fill()`.
- **Styles:** `acc-` block in `admin/admin.css` (plan card has dark twins), phone rules in its 700px block.
- **Admin side:** lead rows show an "Account" (paid, green) / "Not paid" (amber) chip; filters "Signed up, not paid" (`#leads/unpaid`) and "Has account" (`#leads/account`); lead detail shows Email + Account; Customers tab notes "has account / no account yet"; Dashboard "Needs your attention" counts sign-ups that haven't paid.
- **POS app (not in this repo):** sign in with the same Supabase Auth email + password (anon key), then `rpc('my_account')` → use `active` / `paid_until` / `plan` / `branches` to unlock features. Never give the app the service-role key.
- **Supabase settings it relies on:** Authentication → Sign In / Providers → "Allow new users to sign up" ON; URL Configuration → Site URL = the live domain, Redirect URLs include `https://<domain>/account/` and `http://localhost:5173/account/`. Supabase's built-in email sender is rate-limited (a few emails per hour); set up custom SMTP (Authentication → Emails) before launch, or turn off "Confirm email".

## 11. Client invoice page (`/invoice/?t=<token>`)
- No login: the 48-character token in the link is the key. `InvoicePage.jsx` uses plain fetch (no Supabase SDK): `rpc/invoice_view`, text from `site_content` merged over `invoice` in `landing-content.json`.
- Download PDF = `window.print()`; `invoice.css` prints only `.inv-doc` while one is on screen (`body:has(.inv-doc)`). The document stays paper-white in dark mode.
- Upload payment screenshot (bills only, unpaid or proof, ≤ 8 MB): POST to `storage/v1/object/bill-proofs/shared/<token>/<time>-<name>`, then `rpc/invoice_proof`. The admin sees "Proof received".
- Switching the link off in the admin (`share_on = false`) makes the page say the link isn't valid.
