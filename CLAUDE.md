# CLAUDE.md: ZAP POS

Read this first. For deeper detail see `docs/ARCHITECTURE.md`; for recent history see `docs/CHANGELOG.md`. Only open source files you actually need to change.

## What this is
ZAP POS: offline-first point of sale software for shops in Pakistan (owner: Muneeb Akhtar).
This repo holds the **public landing page**, the **admin panel** at `/admin/` (dashboard, leads, payments, customers, analytics, website editor) and the **customer account page** at `/account/` (shop sign-up / log-in, plan and payments; same login as the POS app), all React, backed by **Supabase**. There is no custom server.

## Stack
- `src/zappos-web/`: React 18 + Vite 5, plain CSS (no Tailwind, no UI library), fonts bundled via @fontsource.
- **Supabase** (Postgres + Auth + Row Level Security): `site_content` (published page), `admins`, `leads` (demo requests), `payments`, `events` (anonymous visits/clicks), `admin_stats()` function. Schema: `supabase/schema.sql` (safe to re-run; run it again after changing it). The admin uses `@supabase/supabase-js`; the landing page uses plain REST fetches (keeps its bundle small).
- Dev machine: Windows, VS Code, PowerShell, Node 26, Git 2.56.

## Commands
```bash
cd src/zappos-web
npm install          # once, and again after pulling dependency changes
npm run dev          # http://localhost:5173 (landing), /admin/ (admin), /account/ (customer account)
npm run build        # outputs to dist/ (gitignored)
```
Env: copy `src/zappos-web/.env.example` to `.env.local` and fill `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (Supabase → Project Settings → API). Without them the landing page shows the bundled JSON and `/admin/` shows setup steps.

## Deployment (Vercel)
- The landing page is hosted on **Vercel** as a static site, auto-deployed on every push to `main`.
- Vercel project **Root Directory = `src/zappos-web`**; build settings come from `src/zappos-web/vercel.json` (`npm run build` → `dist/`).
- Vercel env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (redeploy after changing). `/admin` is rewritten to `/admin/index.html` and sent with `noindex`.

## Where things are
| Need to change… | Edit |
|---|---|
| Any text, price, link, phone, review, FAQ | Live site: the admin panel (`/admin/`) → Publish. Built-in defaults: `src/zappos-web/src/content/landing-content.json` (published Supabase content is merged over it) |
| Admin labels, hints, website-editor tabs | `src/zappos-web/src/admin/sections.js` |
| Admin dashboard / leads / payments / analytics | `src/zappos-web/src/admin/` (map in ARCHITECTURE.md §9) |
| Which buttons are tracked | `data-track="…"` on the link + a label in `CLICK_LABELS` (`admin/Analytics.jsx`) |
| Database tables, security, stats | `supabase/schema.sql` |
| Brand colors / fonts | `:root` tokens at the top of `src/zappos-web/src/styles.css` |
| A section's layout/behaviour | its component in `src/zappos-web/src/components/` (map in ARCHITECTURE.md) |
| Hover animations | the `@media (hover: hover)…` block at the **end** of `styles.css` |
| Icons | `components/Icons.jsx` (`paths` map; use `<Icon name="…" />`) |

## Rules (follow these)
1. **Content lives in JSON, not in JSX.** New visible text → add a field to `landing-content.json` and read it via props. The admin edits any field automatically; add a friendly label/hint in `admin/sections.js` (and a new top-level key to a section's `keys`, or it lands in "Other"). Published content replaces arrays wholesale, so new items added to a default array won't appear on the live site if that array was already published; add them in the admin too.
1b. **Admin security:** all protection is Supabase RLS (`is_admin()` / `admins` table). Visitors may only INSERT into `leads` and `events` (column grants). Never put the service-role key in the frontend or in `.env*` used by Vite; only the anon key. Test any schema change for anon, non-admin and admin.
1c. **Privacy:** tracking stays anonymous (random browser id, device, referrer host, utm). Never store names, IPs or full URLs in `events`; personal data belongs only in `leads`, which visitors can't read.
1d. **Money is recorded, not processed:** payments are entered by the owner; there is no online checkout. Amounts are whole rupees.
1e. **No duplicates, no multi-buying, single owner (owner request):** one lead per mobile number (`leads_phone_key`; the demo form goes through `submit_lead()`, which updates instead of duplicating); a payment can't be recorded twice (`payments_same_payment`, `payments_reference`); a shop has **one plan at a time**: monthly/yearly periods (`starts_on` → `paid_until`) never overlap (`payments_no_overlap`); to switch plans, end the current period first. Shops sign up (website `/account/` or the POS app) and are linked to their lead by **email**, else mobile number (`link_signup()` trigger); the admin sees who signed up and who paid. **Tenancy:** only users in `admins` see business data; a customer sees only their own account, through `my_account()`. Never add table policies for customers. Never weaken these guards; keep the DB rule and the admin's friendly check/message in sync.
2. **Never invent real customer reviews, ratings, phone numbers or prices.** Current values are placeholders; keep them clearly marked until Muneeb provides real ones.
3. **Keep the design system:** blue brand (`--brand-*`), electric yellow accent (`--yellow`) only for "lightning" moments, night navy (`--night`) for dark sections. Headings use `--font-head`, receipts/clocks `--font-mono`, handwritten notes `--font-hand`.
4. **Hover effects only inside the hover media block** (pointer devices only). Everything must still work on touch and with `prefers-reduced-motion`.
5. The final CTA bolt spins **on tap/click only, not on hover** (owner request).
    Hero layout is **locked by the owner**: left column = text (kicker, headline "Sell at every counter. / Track every item. / See every branch.", description, CTAs, Internet switch, trust); **right column = the POS scene, do NOT change it** (monitor with the Active Bill screen, receipt overlapping its bottom-left, "3 branches synced" chip top-right, yellow phone tag). Only the left text may change.
5b. **Product logic must hold up:** a power cut also turns off the PC, so never claim "billing works when the power goes out". The real benefit is **offline billing when the internet drops** (router off during load shedding, PC on UPS). Demos and copy must stay technically true.
5c. **Every change must work in light AND dark mode.** Never hard-code `#fff`/`--ink` for surfaces or object colors: use `--surface` (cards), `--solid` (bezels, phone frames, dark chips), `--on-paper` (text on paper/stickers/yellow). If a light-only color is unavoidable, add its dark twin in the "Dark theme: section-by-section" block at the end of `styles.css`. Receipts, sticky notes and stickers stay paper-colored in dark mode (owner-approved look). Check both themes at 1366px and 390px.
6. **Mobile first-class:** check 390px width; no horizontal scroll (`html/body overflow-x: clip` is set).
7. **No dead code.** The repo was audited clean before the first push. Remove anything you stop using (components, CSS rules, icons, JSON fields). Dynamic class names (`stop-N`, `sN`, `nN`, note tints, `icon-<name>`) are used; don't delete them.
8. Don't add dependencies without a clear reason; prefer plain CSS/React.
9. Never commit `node_modules/`, `dist/`, `.env*` (except `.env.example`), zips (see `.gitignore`).
10. **Keep the Claude docs current with EVERY change (mandatory, owner request).** In the same change, not later:
    - `docs/CHANGELOG.md`: add a dated entry (what changed and why, files touched).
    - `docs/ARCHITECTURE.md`: update any section affected (files, components, data flow, JSON schema, CSS blocks, endpoints).
    - `CLAUDE.md`: update if a rule, command, stack item, workflow or roadmap item changed.
    - `.claude/commands/*`: update if a workflow they describe changed.
    A change isn't done until these are updated.

## Git workflow
- Remote: `https://github.com/Muneeb-akhtar/ZAP-POS` (private). Work on **`main`**.
- Before committing: `npm run build` must succeed. Use short imperative messages, e.g. `Add admin login page`, `Update pricing content`.
- Use the `/ship` command (`.claude/commands/ship.md`) to build, review, update docs, commit and push.

## Windows gotchas
- PowerShell "running scripts is disabled" → `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` (already done on Muneeb's PC) or use `npm.cmd`.
- No Supabase keys in `.env.local` → the page shows the bundled JSON, the demo form shows the WhatsApp fallback, `/admin/` shows setup steps.

## Roadmap
1. Replace placeholders with real content (phone, prices, store links, reviews).
2. ~~Admin panel~~ done (Supabase, `/admin/`).
3. ~~Dashboard, leads, payments, analytics~~ done.
4. ~~Customer accounts~~ done (`/account/`). Next: the POS app signs in with the same Supabase login and checks `my_account()` (see ARCHITECTURE §10).
5. Ideas: email/WhatsApp alert on a new lead (Supabase webhook), online payments once a JazzCash/Easypaisa merchant account exists.
