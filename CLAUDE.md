# CLAUDE.md: ZAP POS

Read this first. For deeper detail see `docs/ARCHITECTURE.md`; for recent history see `docs/CHANGELOG.md`. Only open source files you actually need to change.

## What this is
ZAP POS: offline-first point of sale software for shops in Pakistan (owner: Muneeb Akhtar).
This repo currently holds the **public landing page** (React) and its **API** (ASP.NET Core 8).
Next planned piece: an **admin panel** to edit landing content (see "Roadmap").

## Stack
- `src/zappos-web/`: React 18 + Vite 5, plain CSS (no Tailwind, no UI library), fonts bundled via @fontsource.
- `src/ZapPos.Api/`: ASP.NET Core 8 Web API (controllers). `GET /api/landing` returns the page content.
- `ZapPos.sln`: open in Visual Studio. Dev machine: Windows, VS Code, PowerShell, Node 26, Git 2.56.

## Commands
```bash
cd src/zappos-web
npm install          # once
npm run dev          # http://localhost:5173 (proxies /api -> http://localhost:5080)
npm run build        # outputs to src/ZapPos.Api/wwwroot (gitignored)
```
API: open `ZapPos.sln` and press F5, or `dotnet run --project src/ZapPos.Api` (port 5080). The API is optional in dev: the page falls back to the bundled JSON.

## Deployment (Vercel)
- The landing page is hosted on **Vercel** as a static site, auto-deployed on every push to `main`.
- Vercel project **Root Directory = `src/zappos-web`**; build settings come from `src/zappos-web/vercel.json` (builds to `dist/`, not `wwwroot`).
- Vercel can't run the .NET API. In production the page uses the bundled JSON and makes **no** API request unless the env var `VITE_API_URL` is set (planned once the API is hosted elsewhere for the admin panel; the API will then need CORS for the Vercel domain).

## Where things are
| Need to change… | Edit |
|---|---|
| Any text, price, link, phone, review, FAQ | `src/zappos-web/src/content/landing-content.json` (single source of truth; the API serves this same file) |
| Brand colors / fonts | `:root` tokens at the top of `src/zappos-web/src/styles.css` |
| A section's layout/behaviour | its component in `src/zappos-web/src/components/` (map in ARCHITECTURE.md) |
| Hover animations | the `@media (hover: hover)…` block at the **end** of `styles.css` |
| Icons | `components/Icons.jsx` (`paths` map; use `<Icon name="…" />`) |

## Rules (follow these)
1. **Content lives in JSON, not in JSX.** New visible text → add a field to `landing-content.json` and read it via props.
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
9. Never commit `node_modules/`, `wwwroot/`, `.env*`, build output, zips (see `.gitignore`).
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
- A 500 on `/api/landing` in dev just means the API isn't running; the page uses the bundled JSON.

## Roadmap
1. Replace placeholders with real content (phone, prices, store links, reviews).
2. **Admin panel**: React admin (login) + API CRUD endpoints, move content from JSON into SQL Server (EF Core), keep `GET /api/landing` response shape identical so the landing page needs no changes.
3. Host the API (Azure App Service / Railway / similar), set `VITE_API_URL` on Vercel, add CORS for the Vercel domain.
