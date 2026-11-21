# Changelog

Newest first. Every change gets an entry (see CLAUDE.md rule 10). Format: date, what changed and why, files touched.


## 2026-11-21: Download button gets the real ZAP POS installer
- The Download buttons (navbar, hero, final CTA, `/account/`) now point to the newest **GitHub release** of `links.githubRepo` (default `Muneeb-akhtar/ZAP-POS`): the page asks `api.github.com/repos/<repo>/releases/latest`, takes the first `.exe` asset and shows "Windows 10 or 11, 64-bit · Version x · N MB" under the hero buttons (`hero.downloadNote`). Why: the installer is about 80 MB, over Supabase's 50 MB file limit and its 5 GB/month free data; GitHub has no such limit, resumes broken downloads and needs no server.
- Safe before anything is published: with no release (or GitHub unreachable) the buttons keep the old link (`links.windowsInstaller`, `#`) and no version line shows. A link typed in admin → Links → Windows installer link still wins.
- New versions: draft a release on GitHub, tag `vX.Y.Z`, attach the exe named `ZAP-POS-Setup.exe`, publish. The site updates by itself (no deploy). Automatic updates inside shops still use admin → Releases (Supabase), a separate flow.
- Files: `src/lib/release.js` (new), `App.jsx`, `components/Hero.jsx`, `account/AccountApp.jsx`, `content/landing-content.json` (`links.githubRepo`, `hero.downloadNote`), `admin/sections.js`, `styles.css` (`.dl-note`), `vercel.json` (CSP `connect-src` adds `https://api.github.com`).

## 2026-11-20: Richer dark theme ("Dark glow")
- Dark only: soft blue/violet light behind the page (landing and admin), glass cards with a light edge, a blue-to-cyan line on top of stat tiles and gradient numbers, glowing selected menu item. No new motion. Owner approved a preview first.
- Files: end of `src/admin/admin.css` and `src/styles.css` (blocks named "Dark glow").

## 2026-11-20: Dark theme is the default
- Website, `/admin/`, `/account/` and `/invoice/` open in the dark theme unless the visitor chose light with the toggle (the device's light/dark setting is no longer followed). Why: owner wants the dark look everywhere.
- Files: the four `index.html` theme scripts, `src/components/Sections.jsx` (`useTheme`), `docs/ARCHITECTURE.md`.

## 2026-11-20: ZAP POS setup uses the licence key and makes the owner's account
- **Supabase (schema §20, applied and tested):** `licence_lookup(code)` (anon, flood-limited 30/3000 an hour): the shop, owner, plan and whether it already has an account, for the exact key text only. `link_signup()` now links a sign-up that carries `plan_code` (from the POS setup screen) to that key's shop first, whatever email or phone was typed; `ZAP_ACCOUNT_EXISTS` still stops a second account for a shop. Tested (rolled back): lookup, wrong key, sign-up with another email linked by key.
- Why: ZAP POS 1.9.85 asks for the licence key first, then creates the owner's account (email + password + PIN); the same email and password log in on the website `/account` page.
- Files: `supabase/schema.sql`, docs.

## 2026-11-20: Invoices you can send to clients
- **Admin → Bills is now an invoice maker:** several lines per invoice (item, qty, price) with quick-add items, discount, tax %, live total; numbers show as INV-1006 / EST-1003 (old bills keep their number). **Invoice details** (business name, your name, phone, email, address, how to pay) print on every invoice. Viewing an invoice shows exactly what the client sees, with Send on WhatsApp (message includes the private link), Email, Copy link, Download PDF and a link on/off switch; `sent_at` records the first send.
- **Client page `/invoice/?t=…`** (no login): the invoice, Download PDF (print), and Upload payment screenshot, which marks the bill "Proof received" in the admin. A PAID stamp appears once settled. Paper-white in both themes; checked at 1366 and 390 px, light and dark, no sideways scroll.
- **Account page:** a "Your invoices" table with View links.
- **Supabase (schema §19, applied and tested):** `bills.items/discount/tax_pct/share_token/share_on/sent_at`, trigger `bills_total` computes the amount from the lines, `invoice_settings`, `invoice_view()` and `invoice_proof()` (anon, flood-limited), storage policy for `bill-proofs/shared/<token>/`, `my_account()` returns `invoices`. Tested: totals, wrong token, cancelled bill, anon can't read `bills`.
- Removed the old `.adm-print` bill styles (replaced by `invoice.css`).
- Files: `supabase/schema.sql`, `src/zappos-web/invoice/index.html`, `src/zappos-web/src/invoice/*`, `src/admin/Bills.jsx`, `src/admin/admin.css`, `src/admin/sections.js`, `src/account/AccountApp.jsx`, `src/content/landing-content.json`, `vite.config.js`, `vercel.json`, docs.

## 2026-11-20: Security review (website, admin, Supabase)
- **Flood protection** (schema §18, applied): the public entry points (demo form `submit_lead`, `send_help_request`, `report_release`) could be called without limit. Triggers on `leads` (insert and update), `help_requests` and `release_installs` now count visitors' (role anon) requests per sender address (stored only as a sha256, kept one hour, `rate_limits`, no API access) and in all: leads 5/200 per hour, help 10/300, version reports 60/2000. Over the limit: refused with "Too many requests", nothing stored. Admins are never limited. Tested with 12 requests from one address: 10 stored, 2 refused.
- **Security headers** (`vercel.json`): every page sends `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Strict-Transport-Security` (2 years) and a `Permissions-Policy` (no camera, microphone, location, payment). `/admin` and `/account` also send `X-Frame-Options: DENY` and a Content-Security-Policy: own scripts only (plus the inline theme script by its sha256: **if that script in an index.html changes, update its hash in vercel.json**), Supabase as the only outside connection, no framing, no plugins. Checked in Chrome: no CSP errors.
- Supabase security advisor: no table without row-level security. Its remaining warnings are the intended public functions (each checks the caller) and "leaked password protection" (turn on in the dashboard: Authentication → Passwords).
- Files: `supabase/schema.sql`, `src/zappos-web/vercel.json`, docs.

## 2026-11-20: Top bar fits every screen
- On the owner's laptop (about 1280 px wide at his zoom) the last quick link was cut off. The quick links are tighter, "View site" moved to an icon button on the right, link icons hide below 1440 px and the links hide below 1180 px (all pages stay in the sidebar). Checked at 1100, 1280, 1366, 1536 and 1920 px: nothing overflows. Stat cards fit six in a row from about 1280 px; page-bar buttons stay right-aligned when they wrap.
- Files: `src/admin/AdminApp.jsx`, `src/admin/admin.css`, docs.

## 2026-11-20: Top bar and background tweaks (owner request)
- Background: the yellow glow is gone (second blob is now a pale sky blue, `--blob-sky`).
- Top bar: "ZAP POS Admin" stays on one line at the left; the owner chip on the right is replaced by a **Log out** button (theme toggle kept); the quick-links pill scrolls instead of squeezing the brand.
- The ZAP logo in the top bar zaps once every 2 minutes (about 3 s: the bolt turns yellow with a soft glow and a small tilt; `admLogo`, `admBolt`; off with reduced motion).
- Sidebar menu gets a thin blue scrollbar; the date-range buttons don't wrap on phones; on phones the sidebar profile card is hidden (Log out is in the top bar).
- Files: `src/admin/AdminApp.jsx`, `src/admin/admin.css`, docs.

## 2026-11-20: Earnings page
- Owner asked for one place to see all earnings and every customer ranked by what they paid. New **Earnings** page (menu after Payments, and in the top bar): total earned (all time / this year / last 12 months / this month), this month vs last, paying customers (with an account), average per customer, top customer, best month; "Earned per month" line chart; customers ranked by total paid (gold/silver/bronze for the top three) with account status, payments, settled bills, paying since, total and share of earnings; filter by account, search, CSV export; a row opens the lead. Money in = payments + settled bills, shown in separate columns.
- Fix: the line chart (`Area`) could stop part-way in Chrome (dash animation + non-scaling stroke); it now reveals with a clip-path.
- Files: `src/admin/Earnings.jsx`, `src/admin/AdminApp.jsx`, `src/admin/Charts.jsx`, `src/admin/admin.css`, docs.

## 2026-11-20: Bills, Team, Help desk and System health pages
- The owner asked for the same features as the reference admin, under ZAP's own names: Merchant documents → **Bills** (bills and estimates, numbered BIL-/EST-, payment-proof upload, Open now / Coming up / Late 30+ days / Collected / Average a month / Bills open cards, tabs, date range, customer filter, search, Settle, Make bill, print or save PDF, send on WhatsApp, Cancel), Users → **Team** (add/remove admins by email), Support → **Help desk** (requests from shops with status, priority, notes, call/WhatsApp), Database status → **System health** (database size, rows per table, storage, shops' versions). The sidebar follows the reference order.
- Schema §14–17: `bills` (+ `bills_no_seq`, bucket `bill-proofs`), `admin_team()`, `add_admin()`, `remove_admin()`, `help_requests` + `send_help_request()`, `admin_health()`. Checked as anon (can only send a help request), non-admin and admin. Applied to Supabase.
- Files: `supabase/schema.sql`, `src/admin/Bills.jsx`, `Team.jsx`, `HelpDesk.jsx`, `Health.jsx`, `AdminApp.jsx`, `admin.css`, `src/components/Icons.jsx` (`id` icon), docs.

## 2026-11-20: Admin layout restructured (owner's reference layout)
- New structure, same colours and glass: a top bar across the page (logo, quick links in a pill, the signed-in owner); the sidebar gets an "Admin console" badge, small capital labels, the open page as a blue pill with a chevron, and a profile card with Log out at the bottom (theme toggle moved to the top bar); page headers get an icon tile, a big title with the yellow squiggle and a small capital line (`PageBar icon`); stat cards: icon tile, change badge, big number, small capital label (`Stat`); filter bars are one glass card with segmented chips; tables get small capital headings and a "Showing N · Live from Supabase" foot (`TableFoot`). Dashboard gains "Active licence keys" and "New leads" cards (6 in a row).
- Files: `src/admin/AdminApp.jsx`, `src/admin/ui.jsx`, `src/admin/Charts.jsx`, `src/admin/Dashboard.jsx`, `src/admin/Payments.jsx`, `src/admin/PlanCodes.jsx`, `src/admin/Releases.jsx`, `src/admin/Leads.jsx`, `src/admin/Analytics.jsx`, `src/admin/admin.css` (Layout block), docs.

## 2026-11-19: Admin look: website colours with glass
- The owner chose the website's colours (white, ZAP blue, electric yellow) with a glass effect. Every admin page: white ground with two faint slow-drifting blobs (blue, yellow), frosted glass cards, tables, page bar and sidebar; the open page is a blue pill with a yellow dot; page titles get the website's yellow squiggle (drawn once, `PageBar` in `ui.jsx`); stat icons on pale blue tiles; the money card ("Received this month", `Stat hero`) is solid blue with a yellow icon and badge; today's bar is yellow. Dark mode uses the website's navy.
- Animations (calm, once per page, off with reduced motion): numbers count up (`CountUp`), bars grow, the income line draws, the licence ring fills, pages rise in.
- Dashboard: "Income, last 6 months" line chart (`Area`) and "Licence keys" ring (`Donut`); title "Good evening, welcome back"; your initial in the sidebar.
- Files: `src/admin/admin.css` (look block before the mobile rules), `src/admin/Charts.jsx`, `src/admin/Dashboard.jsx`, `src/admin/AdminApp.jsx`, `src/admin/ui.jsx`, docs.

## 2026-11-19: Admin V15 look undone
- The owner didn't like the V15 glass look once it was live, so it is reverted (admin.css V15 block, `CountUp`/`Area`/`Donut`, Dashboard income and key cards, sidebar initial). New style options will be previewed before anything is built. Files: `src/admin/admin.css`, `src/admin/Charts.jsx`, `src/admin/Dashboard.jsx`, `src/admin/AdminApp.jsx`, docs.

## 2026-11-19: Plans page (licence keys)
- New **Plans** page in the admin: every licence key with its state (active, ending in ≤ 7 days, expired, replaced, revoked), filter chips, Copy / Renew / Revoke / Restore, and **New key**: pick the client, shop code, counters and a duration (1, 3, 6, 12 months or a date). A new key starts when the shop's current key ends, and replaces it (`plan_codes_replace` trigger). ZAP POS (1.9.79) fetches the newest key and revocations itself every 30 minutes through `licence_status()`, warns from 7 days before the end and locks the day after.
- Schema §13: `plan_codes.starts_on`, `status` (active/replaced/revoked), `changed_at`; admins may update status; `licence_status(p_branch, p_code)` answers only a caller holding one of that shop's keys. `make-plan-code` accepts `starts_on`.
- Files: `supabase/schema.sql`, `supabase/functions/make-plan-code/index.ts`, `src/admin/PlanCodes.jsx`, `src/admin/AdminApp.jsx`, `src/admin/admin.css`, docs.

## 2026-11-19: Admin sign-in fits small screens
- The sign-in box was taller than a laptop screen (or a zoomed-in browser) and its bottom was cut off. Tighter spacing, and on screens under 860 px tall a compact layout (no lock icon, smaller heading and fields). Files: `src/admin/admin.css`.

## 2026-11-19: Releases (automatic ZAP POS updates)
- Owner request: shops' PCs update ZAP POS by themselves. New admin page **Releases**: choose ZapPos.exe (the version is read from the file), write what's new, send to all shops or one shop first, Publish. The page hashes the file, gets it signed by the new edge function `sign-release` ("ZAPREL1|version|sha256", same secret key `PLAN_SIGNING_KEY` as plan codes), uploads it to the public bucket `releases` in 40 MB parts (Supabase's limit is 50 MB) and records it. "Stop sending" takes a version back. "x of y shops updated" comes from `release_installs`.
- **Supabase:** tables `releases` (admins only) and `release_installs` (admins read); `latest_release(p_branch)` and `report_release(p_branch, p_version)` callable without login (a shop's main PC asks them); storage bucket `releases` (public read, admin upload). Applied to the live project.
- ZAP POS (desktop repo, v1.9.78) downloads, checks the signature and installs it when ZAP POS is closed or on Update now.
- Files: `supabase/schema.sql` (§12), `supabase/functions/sign-release/index.ts`, `src/admin/Releases.jsx`, `src/admin/AdminApp.jsx`, `src/admin/admin.css`, `docs/ARCHITECTURE.md` (§8, §9), `CLAUDE.md`.

## 2026-11-19: Plan codes for ZAP POS (Customers → Plan code)
- Owner request: a proper way to give a shop the plan it bought (how many counters, paid until) without scripts. The admin makes a signed **plan code**; the shop owner pastes it into ZAP POS → Settings → Plan (works offline). Signing is ECDSA P-256 in a new Supabase edge function, so the secret key never reaches the browser or the repo; ZAP POS checks codes with the matching public key, so shops can't forge, edit or swap codes.
- **Supabase:** `leads.pos_branch_code`; new table `plan_codes` (admins read/insert only); edge function `make-plan-code` (admin-only, records each code, remembers the shop code). Secret `PLAN_SIGNING_KEY` must be set in Supabase → Edge Functions → Secrets. Applied to the live project.
- **Admin:** Customers rows get a **Plan code** button → `PlanCodeSheet` (shop code, counters, paid until; Copy / Send on WhatsApp; history of codes made).
- Files: `supabase/schema.sql` (§11), `supabase/functions/make-plan-code/index.ts`, `supabase/functions/make-plan-code/plancode.ts`, `src/admin/PlanCodes.jsx`, `src/admin/Payments.jsx`, `src/admin/AdminApp.jsx`, `src/admin/admin.css`, `docs/ARCHITECTURE.md` (§8, §9), `CLAUDE.md`.

## 2026-11-13: Customer accounts (sign up / log in) + who signed up vs who paid
- Owner request: shops that buy will sign up, so the owner can see who signed up and who paid. Sign-up on the website **and** in the POS app (same login); matched to leads **by email**.
- **New page `/account/`** (`account/index.html`, `src/account/main.jsx`, `src/account/AccountApp.jsx`): Log in / Sign up (name, mobile, shop, city, email, password) / Forgot password / set new password, and "My account": plan card (active until / expired on), Download, "Pay or renew on WhatsApp", payment history. Text in new JSON key `account` (admin tab "Customer account"). Landing "Log in" (`links.portal`) now points to `/account/`.
- **Supabase:** `leads` gets `email` (unique, case-insensitive), `user_id` (→ auth.users, unique), `signed_up_at`. Trigger `link_signup()` on `auth.users` links each new login to the lead with the same email, else the same mobile number, else creates a lead (source "Sign-up"); a shop that already has an account can't sign up twice. `my_account()` returns only the signed-in shop's plan and payments (customers get no table access). `submit_lead()` takes `p_email` and matches on email first, then mobile.
- **Demo form:** optional Email field (`leadForm.emailLabel`, `emailPlaceholder`).
- **Admin:** lead rows show "Account" (paid) / "Not paid" chips; new filters "Signed up, not paid" and "Has account" (`#leads/unpaid`, `#leads/account`); lead detail shows Email + Account; Email field in Add/Edit lead (duplicate email refused); Customers tab shows has/no account; Dashboard "Needs your attention" counts sign-ups that haven't paid; CSV adds Email, Signed up, Paid.
- Vite builds a third page; `vercel.json` rewrites `/account` and sends `noindex` for it.
- Files: `supabase/schema.sql` (§6 accounts columns, `submit_lead`, §10), `account/index.html`, `src/account/*`, `components/LeadForm.jsx`, `content/landing-content.json`, `admin/Leads.jsx`, `admin/Payments.jsx`, `admin/Dashboard.jsx`, `admin/biz.js`, `admin/sections.js`, `admin/admin.css`, `vite.config.js`, `vercel.json`, `CLAUDE.md`, `docs/ARCHITECTURE.md` (§1, §2, §8, §10).

## 2026-11-13: No duplicate leads, no double payments, one plan per shop
- Owner request: no duplicate client records, no "multi buying", no multi-tenant leaks.
- **Leads:** one lead per mobile number. New generated column `phone_key` (`phone_key()`: 0300-1234567, +92 300 1234567, 923001234567 → 03001234567) with a unique index. The demo form now calls `submit_lead()` instead of inserting: a repeat request updates the existing lead (fills empty fields, adds a dated note, Lost → New). Visitors lost direct insert on `leads`. Adding/editing a lead in the admin with a number another lead has is refused with that lead's name.
- **Payments:** new `starts_on` ("Covers from"). Monthly/yearly payments need it and a later `paid_until`; a shop's periods can never overlap (`payments_no_overlap`, btree_gist), so one plan at a time and no paying twice for the same days. Renewals auto-start on the current paid-until date. Same customer + date + amount + billing, or the same method + reference, can't be recorded twice. Database errors show plain-language messages.
- **Tenancy:** single owner; everything stays behind `is_admin()`. (Sign-ups stay on: see the customer accounts entry above.)
- Applied to the live Supabase project and tested (16 checks, rolled back). Security advisor fixes: trigger functions pinned `search_path = ''`; `is_admin()` no longer callable by anon; `submit_lead()` anon-only.
- Files: `supabase/schema.sql`, `components/LeadForm.jsx`, `admin/biz.js`, `admin/Leads.jsx`, `admin/Payments.jsx`, `CLAUDE.md` (rule 1e), `docs/ARCHITECTURE.md` (§2, §8, §9).

## 2026-11-13: Admin dashboard, leads, payments, analytics; .NET API removed
- **Dashboard** (first screen after login): visitors and demo requests this week (vs last week), money received this month (vs last month), customers; "Needs your attention" (new leads, call-backs due, overdue/upcoming renewals, website placeholders); visitors chart (30 days); latest leads; renewals; **website checklist** (placeholder phone/email/address, empty links and socials, placeholder reviews, unpublished content) with Fix buttons.
- **Leads**: "Book a free demo" requests from the website plus leads you add yourself (calls, walk-ins). Search, filter tabs with counts (Open, Call back today, New, Contacted, Demo booked, Customer, Lost, All), one-tap status, call-back date, private notes, Call / WhatsApp (pre-written greeting) buttons, edit, delete (blocked while the lead has payments), CSV export.
- **Payments**: record what each shop paid (cash, bank, JazzCash, Easypaisa, card), with plan, monthly/yearly/setup billing, branches, reference and "paid until". Amount and paid-until fill in from the plan price (per-branch plans × branches) until you type your own. Totals (this month, last month, this year, all time), received per month (12 months), by method, by plan, month filter, search, CSV export. Recording a payment marks the lead as Customer.
- **Customers & renewals**: every customer with plan, paid-until, status (Active / Due in N days / N days overdue), total paid, estimated monthly income; WhatsApp renewal reminder button.
- **Analytics** (7/30/90 days): visitors, visits, demo requests, conversion with change vs the previous period; visitors and requests per day; journey funnel (visited → saw pricing → clicked demo/WhatsApp/download → sent request → customer → paid); button clicks; devices; referrer sites; utm ad campaigns; leads by plan, city, source and outcome.
- **Landing page**: every "Book a demo" button (hero, pricing receipts with their plan pre-selected, final section) opens a demo request form (name, mobile, shop, city, plan, branches, message; phone validation, bot honeypot, success state; falls back to "message us on WhatsApp" if sending fails). `links.demo` is now `#demo`. Its text is the new `leadForm` JSON key (admin tab "Demo form").
- **Anonymous tracking** (`lib/track.js`): one visit per page load, clicks on `[data-track]` buttons, and "saw pricing". Stores a random browser id, device type, referrer site and utm campaign; no cookies, nothing personal. Skipped in dev, for bots, Do Not Track, and in any browser where the admin signed in.
- **Supabase**: new tables `leads` (visitors may only insert a few columns), `payments`, `events` (visitors may only insert), helper `is_admin()`, and `admin_stats(days)` (Pakistan-time daily stats). Tested on Postgres 16: anon can't read leads/events/payments or call stats, non-admins see nothing, leads with payments can't be deleted, re-running the script is safe.
- **Removed the unused .NET API** (`src/ZapPos.Api`, `ZapPos.sln`), the Vite `/api` proxy and wwwroot build output; `npm run build` now writes `dist/` (Vercel uses plain `npm run build`). `.gitignore`, `.claude/settings.json` (dotnet permissions, bin/obj/wwwroot denies) and README cleaned up.
- Fixed while testing: the admin's mobile layout overflowed (grid column sized by the nav strip); demo modal class renamed to `lead-modal` because the hero paragraph already uses `.lead`.
- Files: `supabase/schema.sql`, `src/App.jsx`, `src/lib/track.js` (new), `components/LeadForm.jsx` (new), `components/Hero.jsx`, `Pricing.jsx`, `Faq.jsx`, `Sections.jsx` (`data-track`), `components/Icons.jsx` (`grid`, `download`, `calendar`, `edit`), `styles.css` (demo form block), `content/landing-content.json` (`leadForm`, `links.demo`), `admin/AdminApp.jsx` (panel + routing), `admin/biz.js`, `admin/ui.jsx`, `admin/Charts.jsx`, `admin/Dashboard.jsx`, `admin/Leads.jsx`, `admin/Payments.jsx`, `admin/Analytics.jsx` (new), `admin/sections.js`, `admin/Fields.jsx`, `admin/admin.css`, `vite.config.js`, `vercel.json`, `.gitignore`, `.claude/settings.json`, `README.md`.

## 2026-11-13: Admin panel (Supabase)
- New admin panel at **`/admin/`** to edit everything on the landing page without touching code: brand & contact, links, top menu, hero text, ticker, day timeline, counter demo, hardware, pricing (plans, prices, compare table), reviews, FAQ, final section, footer. One admin (the owner). Matches the ZAP POS look, works in light/dark and on phones.
- Content is stored in **Supabase** (table `site_content`, one row `id = 'landing'`, column `data` jsonb). Login is Supabase Auth (email + password); Row Level Security lets anyone read but only users listed in `admins` write. SQL in `supabase/schema.sql`.
- Landing page now reads the published content straight from Supabase (REST, no SDK on the landing bundle), caches it in localStorage (`zap-content`) for instant repeat visits, and merges it over the bundled `landing-content.json` (so the page still works if Supabase is down or not configured, and new JSON fields show up automatically). The old `/api/landing` fetch and `VITE_API_URL` are no longer used by the page.
- Editor features: sidebar per section with unsaved-change dots, Publish (also Ctrl+S), Discard, "View site", unload warning, add/reorder/delete list items (2-step delete), icon pickers, ✓/–/text cells for the compare table, hints (e.g. yearly price = yearly total, shown to customers per month only), reset to built-in content.
- Vite builds two pages (`index.html`, `admin/index.html`); Vercel rewrites `/admin` and sends `noindex` for admin.
- New dependency: `@supabase/supabase-js` 2.45.4 (admin bundle only). New env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (template `src/zappos-web/.env.example`; `.gitignore` now keeps `.env.example`).
- Files: `src/zappos-web/admin/index.html`, `src/admin/{main.jsx,AdminApp.jsx,Fields.jsx,sections.js,admin.css}`, `src/lib/content.js`, `src/App.jsx`, `components/Icons.jsx` (`iconNames` export; `plus`, `logout`, `external`, `lock` icons), `components/Sections.jsx` (`ThemeToggle` exported for admin), `vite.config.js`, `vercel.json`, `package.json`, `package-lock.json`, `.env.example`, `supabase/schema.sql`, `.gitignore`.

## 2026-11-13: Pricing receipts level
- Receipts no longer tilt or sit at different heights: all three stand straight and stretch to equal height (paper is a flex column, `.rp-lines` grows), so headers, TOTAL lines, barcodes and buttons line up across plans. Descriptions reserve 3 lines and the price block reserves room for period + "billed yearly", so TOTAL lines and barcodes align in both Monthly and Yearly. Hover lifts a receipt 10px with a small zoom (scale 1.035). File: `styles.css`.

## 2026-11-13: Yearly total hidden
- Owner request: never show customers the big yearly total. Yearly view now shows only "Rs 2,499 /month" + "billed yearly" (no "· Rs 29,988"); compare table Yearly row shows only the per-month price. Files: `components/Pricing.jsx`.

## 2026-11-13: Fixed "save up to 30%" label
- Owner wants the toggle note to read "save up to 30% yearly". Added optional `pricing.saveLabel` (overrides the computed `bestSaving` text; remove it to go back to the computed value). Actual savings with current prices: Dukaan 28.6%, Brand 22.2%. Files: `content/landing-content.json`, `components/Pricing.jsx`.

## 2026-11-13: Monthly prices + yearly shown per month
- Monthly prices from owner: **Dukaan Rs 3,499/month**, **Brand Rs 8,999/branch/month**.
- Rs 2,499 / Rs 6,999 are the per-month prices **when billed yearly** (a yearly total of Rs 2,499 would be cheaper than one month). Stored as yearly totals: Dukaan `annual` 29,988, Brand `annual` 83,988 (per branch).
- Yearly view shows the per-month equivalent big ("Rs 2,499 /month") with "billed yearly · Rs 29,988" underneath; compare table Yearly row "Rs 2,499/month · Rs 29,988/yr". Saving note computes to "save up to 29% yearly" (Dukaan 29%, Brand 22%).
- Files: `content/landing-content.json`, `components/Pricing.jsx` (`perMonth`, `periodOf`, `priceText`), `styles.css` (`.billed`).

## 2026-11-13: Yearly prices + price rows in comparison (superseded)
- Rs 2,499 (Dukaan) and Rs 6,999/branch (Brand) are the **yearly** totals: shown as "Rs 2,499 /year" and "Rs 6,999 /branch/year". Monthly prices pending from the owner (`monthly: null` → receipt shows "On request" until set).
- Comparison table starts with a **Price** group: Monthly and Yearly rows for every plan; the row matching the toggle is highlighted.
- The "2 months free" note is now computed from the data ("save up to N% yearly", best saving across plans) and hidden when it can't be computed. Removed `pricing.annualLabel`.
- Files: `content/landing-content.json`, `components/Pricing.jsx` (`amountOf`, `periodOf`, `priceText`, `bestSaving`), `styles.css` (`.cmp-price`).

## 2026-11-13: Plans + comparison table audit
- Branch ranges no longer overlap: **Dukaan** 1 branch, **Brand** 1–3 branches (priced per branch), **Enterprise** 4+ branches (custom). Enterprise tag now "Premium brands · 4+ branches".
- Brand receipt adds "1–3 Branches, priced per branch" and "Everything in Dukaan". Enterprise receipt no longer repeats Brand features; it lists what it adds (central warehouse, on-site setup & training, custom reports, priority support, dedicated account manager), so it never looks weaker than Brand.
- Comparison table rebuilt to match the receipts exactly (19 rows): added LAN multi-PC, analytics & daily reports, fraud alerts & access control, custom reports, multi-branch cloud dashboard; renamed rows to the receipt wording; Support: Standard / Dedicated + onboarding / Priority + account manager.
- FAQ answer still said "Business plan" → "Brand plan".
- Receipt quantity column widened (26px → 36px) so "1–3" doesn't touch its label.
- Files: `content/landing-content.json`, `styles.css`.

## 2026-11-13: 12-hour times (Pakistani clock)
- All times on the page now use 12-hour format: timeline stops 9:00 AM, 1:30 PM, 3:00 PM, 6:00 PM, 11:00 PM (`day.stops[].time` is now e.g. "9:00 AM"; `Day.jsx` renders the AM/PM as a smaller `.ampm` label next to the big clock); offline card 3:00 PM / 3:52 PM / 4:10 PM; hero receipt 3:04 PM; FAQ chat timestamps "10:12 am".
- Files: `content/landing-content.json`, `components/Day.jsx`, `components/Hero.jsx`, `components/Faq.jsx`, `styles.css`.

## 2026-11-13: Enterprise plan details
- Enterprise receipt: tag "Premium brands · 3+ branches", description "For clothing chains, shoe brands and premium retail groups. Priced on your actual branch count.", CTA "Get a custom quote". Lines: 3+ Branches (priced per count), Everything in Brand, Mobile app + web portal, Central warehouse, Dedicated onboarding, Priority support, Account manager. Price stays "Custom". File: `content/landing-content.json`.

## 2026-11-13: Middle plan renamed "Brand"
- Owner preferred "Brand" over "Bazaar" (matches "Book a brand demo" / "built for growing brands"). `id` → `brand`; Enterprise line "Everything in Brand". File: `content/landing-content.json`.

## 2026-11-13: Middle plan renamed "Bazaar" + new details (name replaced same day)
- Plan "Business" → **"Bazaar"** (featured, "Most picked"): **Rs 6,999 per branch / month** (Rs 69,990 per branch / year). Lines: ∞ POS counters per branch, Multi-branch cloud dashboard, Live sales app (iOS + Android), Web portal (every branch), Server + unlimited LAN PCs, Cashier logins & roles, Real-time inter-branch stock, Fraud alerts & access control, Dedicated support & onboarding. Description: "Multi-branch cloud dashboard, mobile app & web portal. Built for retail chains and growing brands." CTA "Book a brand demo".
- New optional plan field `unit` (e.g. `"branch"`) → price suffix "/branch/month" (`Pricing.jsx`).
- Enterprise line "Everything in Bazaar"; compare table: Branches "Any (per branch)", Support "Dedicated + onboarding".
- Files: `content/landing-content.json`, `components/Pricing.jsx`.

## 2026-11-13: First plan renamed "Dukaan" + new details
- Plan "Solo" → **"Dukaan"** (own name, not a competitor's), tag "1 shop · 1 counter", description "Single location, single counter. Full offline billing, no internet needed."
- Receipt lines: 1 PC (server mode), Full offline billing, Barcode & thermal printer, Inventory, purchases & ledger, Analytics & daily reports, Daily cloud backup. Business plan line now "Everything in Dukaan". Price unchanged (Rs 2,499/mo). File: `content/landing-content.json`.

## 2026-11-13: Shooting stars start with the section
- Shooting stars now start the moment the final CTA scrolls into view (IntersectionObserver adds `.final.in-view`): the first streaks across the glow right away, a second one at a different angle follows, and both repeat (6.5s / 8s). More visible: longer fading tail + glowing head. Reduced-motion visitors don't get them. Files: `components/Sections.jsx`, `styles.css`.

## 2026-11-13: Jeans icon in counter demo
- Each till's product tile now shows a white jeans icon on the blue gradient (new `jeans` icon in `Icons.jsx`). Product renamed "Denim Jacket · Size M" → "Denim Jeans · Size 32" (`counters.product`) so the label matches the icon. Works in light and dark. Files: `components/Counters.jsx`, `components/Icons.jsx`, `content/landing-content.json`, `styles.css` (`.till-thumb`).

## 2026-11-13: Fewer stars in final CTA
- Owner feedback: too many stars. `StarField` now has 7 hand-placed, well-spaced stars around the glow (each glows and dims at its own pace) plus the occasional shooting star. Removed the 90-star generator and the 4-point sparkles (`.sparkle` CSS). Files: `components/Sections.jsx`, `styles.css`.

## 2026-11-13: Star field around the final CTA glow
- Replaced the 7 static dots with a `StarField` (in `Sections.jsx`): 90 deterministic stars, ~60% clustered in an ellipse around the blue glow, each one glowing (bright with a blue-white halo) and dimming almost out at its own pace; 7 bright 4-point sparkles near the glow; an occasional shooting star (every ~9s). Disabled automatically for reduced-motion visitors. Files: `components/Sections.jsx`, `styles.css` (`.final-stars`, `.star`, `.sparkle`, `.shooting`).

## 2026-11-13: Dark mode
- Sun/moon toggle in the navbar (`ThemeToggle` in `Sections.jsx`). First visit follows the device's light/dark setting; the visitor's choice is remembered (`localStorage` key `zap-theme`). An inline script in `index.html` sets the theme before first paint (no white flash). Switching uses a circular reveal from the button (View Transitions API; instant where unsupported or with reduced motion).
- Dark palette: deep navy base `#070b16` (not pure black), cards one step lighter (`--surface #0f1829`), brand blue lifted (`#2b95ff`), yellow kept as the lightning accent, black-based shadows.
- Section details: dark-glass navbar; hero blue glow (amber when offline); the POS screen and WhatsApp chat use their own dark UIs; day timeline becomes a quiet dawn-to-night gradient; counter demo wires/dots dimmed; receipts, sticky notes and stickers stay paper-colored (slightly dimmed) with a blue offset shadow on stickers; pricing toggle and compare table themed; footer/final CTA stay one step darker than the page.
- Refactor so themes work: new tokens `--surface`, `--solid`, `--on-paper`, `--sticker-shadow`; hard-coded `background: #fff` on cards replaced by `var(--surface)`.
- Files: `styles.css`, `components/Sections.jsx`, `index.html`. New rule 5c in `CLAUDE.md`.

## 2026-11-13: Reviews handwritten note
- Note under the review cards changed from the internal "placeholders, add real reviews…" to customer-facing copy: "real shops, real counters, taking their business to the next level" (`reviewsSection.note`). The review texts themselves are still placeholders until real reviews are added.

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
