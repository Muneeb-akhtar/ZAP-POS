# Changelog

Newest first. Every change gets an entry (see CLAUDE.md rule 10). Format: date, what changed and why, files touched.

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
