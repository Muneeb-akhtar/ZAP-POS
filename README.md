# ZAP POS

Offline-first point of sale for shops in Pakistan.
This repo contains the public landing page and the admin panel (React + Vite), backed by Supabase.

Developer docs: `CLAUDE.md` (rules + commands), `docs/ARCHITECTURE.md` (code map), `docs/CHANGELOG.md` (history).

```
ZAP POS/
├─ supabase/schema.sql            ← database setup (run once in Supabase → SQL Editor)
└─ src/zappos-web/                ← React + Vite
   ├─ index.html / admin/index.html   ← landing page / admin panel (/admin)
   └─ src/
      ├─ content/landing-content.json ← built-in page content (the admin edits the live copy)
      ├─ components/                  ← landing page sections + demo request form
      ├─ admin/                       ← dashboard, leads, payments, analytics, website editor
      ├─ lib/                         ← content loading + anonymous visit tracking
      └─ styles.css                   ← colors at the top (:root)
```

## Requirements
- Node.js LTS (https://nodejs.org)
- A free Supabase project (https://supabase.com)

## Setup (once)
1. Supabase → SQL Editor: run `supabase/schema.sql`.
2. Supabase → Authentication → Users → Add user (tick "Auto Confirm"), then run the admin statement at the end of `schema.sql` with your email.
3. Copy `src/zappos-web/.env.example` to `src/zappos-web/.env.local` and fill in your Project URL and anon key (Supabase → Project Settings → API).
4. Vercel → Settings → Environment Variables: add the same two values, then redeploy.

## Run locally
```
cd src/zappos-web
npm install
npm run dev
```
Landing page: http://localhost:5173 · Admin: http://localhost:5173/admin/

## Production
Vercel builds `src/zappos-web` (`npm run build` → `dist/`) on every push to `main`.
