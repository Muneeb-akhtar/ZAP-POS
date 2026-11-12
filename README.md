# ZAP POS

Offline-first point of sale for shops in Pakistan.
This repo contains the public landing page (React) and its backend API (ASP.NET Core 8).

```
ZAP POS/
├─ ZapPos.sln                     ← open in Visual Studio
└─ src/
   ├─ ZapPos.Api/                 ← ASP.NET Core 8 Web API
   │  └─ Controllers/LandingController.cs   GET /api/landing
   └─ zappos-web/                 ← React + Vite landing page
      └─ src/
         ├─ content/landing-content.json    ← all page text, prices, links
         ├─ components/                     ← page sections
         └─ styles.css                      ← colors at the top (:root)
```

## Requirements
- Node.js LTS (https://nodejs.org)
- Visual Studio 2022 with "ASP.NET and web development" (only needed for the API)

## Run the landing page
```
cd src/zappos-web
npm install
npm run dev
```
Open http://localhost:5173

The API is optional during development: open `ZapPos.sln` in Visual Studio and press F5 (runs on http://localhost:5080).
Without it, the page uses the bundled `landing-content.json`.

## Edit content
Change `src/zappos-web/src/content/landing-content.json`. The admin panel (coming next) will manage this from a database.

## Production build
```
cd src/zappos-web
npm run build
```
Outputs into `src/ZapPos.Api/wwwroot`, so publishing the API hosts both the site and the API.
