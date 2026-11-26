# Changelog

Newest first. Every change gets an entry (see CLAUDE.md rule 10). Format: date, what changed and why, files touched.

## 2026-11-26: 12-character licence codes
- Owner request: a short code to type instead of the long `ZAP1-…` key. `plan_codes.short_code` (schema §26): 12 characters from `A–Z` (no I, O) and `2–9`, made by trigger `plan_codes_short` (`make_short_code()`), unique, back-filled for old keys. `activate_licence()` accepts the short code or the long key, and returns the signed key (`key`) only after its checks pass, so ZAP POS never holds a licence before ZAP's yes. Long keys still work in Settings → Plan and `licence_status()`.
- Admin → Plans: the new-key sheet shows the 12-character code (big, selectable), Copy code and the WhatsApp message use it; the list shows it under each client. `make-plan-code` returns `short_code` (deployed, version 6). Desktop 1.9.153 asks for it at setup.
- Files: `supabase/schema.sql`, `supabase/functions/make-plan-code/index.ts`, `admin/PlanCodes.jsx`, `admin/admin.css`, docs.

## 2026-11-26: ZAP POS setup checks the typed licence key online (`activate_licence`)
- Owner decision: setup must always ask for the key and never fill it in; ZAP's cloud decides. New schema §25 `activate_licence(p_code)`: signed-in users only (anon refused), flood-limited (`rate_ok`, 20 per 2000 s). Answers `ok` with the key's shop code, PCs and paid-until, or a reason: `login`, `unknown`, `revoked`, `replaced`, `ended`, `other_account` (the shop belongs to another login), `other_shop` (this login already has a different shop). A shop with no login yet is linked to the caller (same as `claim_shop`). Applied as migration `activate_licence`; tested in a rolled-back transaction. Desktop 1.9.153 uses it; `licence_lookup()` stays for older versions.
- Files: `supabase/schema.sql`, docs.

## 2026-11-26: Licence keys only for 2–6 character shop codes
- Bug: a key made for shop code BALOCHAUTO (10 letters) stopped the client's ZAP POS setup at "Creating the shop database"; ZAP POS's database only accepts 2 to 6 letters or digits. Admin → New licence key now allows only 2 to 6 (`maxLength`, `pattern`, hint) and the `make-plan-code` edge function refuses anything else (deployed, version 5). The BALOCHAUTO key was revoked. Desktop 1.9.152 also refuses such keys with a plain message.
- Files: `admin/PlanCodes.jsx`, `supabase/functions/make-plan-code/index.ts`, docs.

## 2026-11-26: Owner app and WhatsApp number in the hero; demo buttons open WhatsApp
- Owner request (like Mint POS's top): under the hero's Download / Book a demo buttons, a row of badges: Owner app for Android, Owner app for iPhone (same links as the final section) and "Free demo on WhatsApp" with the number (Brand → phone, written 0339 0035603). Two badges side by side and the WhatsApp one full width on phones. New `hero` fields `appSmall, android, iphone, whatsappSmall`; CSS `.hero-stores`.
- Owner request: every "Book a free demo" button (hero, pricing, video, final section, extra pages) now opens WhatsApp to his number with a ready message (the plan name when clicked from a plan). The demo form was removed (`LeadForm.jsx`, its `lead-*` CSS, the `leadForm` content key and admin tab); new key `demoWhatsApp` with its admin tab "Demo on WhatsApp". Privacy page line about the form updated.
- Hero trust line changed from "Free trial · No card needed" to "Free demo · FBR integrated" (there is no free trial since 1.9.139). Published content updated (hero.trust, leadForm removed).
- Files: `Hero.jsx`, `App.jsx`, `components/LeadForm.jsx` (deleted), `styles.css`, `landing-content.json`, `admin/sections.js`, `CLAUDE.md`, docs.

## 2026-11-26: Admin pop-up windows were see-through
- Bug (owner screenshot, New licence key): the admin's pop-up sheets (new key, lead, payment) render outside `.adm`, so the glass colour variables were undefined there and the sheet had no background: dark text on the dimmed page. Now the glass variables are set on `:root` too (light and dark), so every admin pop-up, toast or page piece gets them wherever it is placed, and `.adm-sheet` falls back to `--surface`.
- Files: `admin/admin.css`, docs.

## 2026-11-26: Log in instead of Download in the phone header
- Owner request: on phones (≤720px) the top bar shows a blue **Log in** button (to `/account/`) in place of **Download**, since phones can't run the Windows app; tablets and computers keep Download. New classes `.nav-dl` / `.nav-login-phone` (rules next to `.nav-login` and in the 720px block of `styles.css`).
- Files: `components/Sections.jsx`, `styles.css`, docs.
## 2026-11-25: Light mode by default
- Owner request: every page (website, `/admin/`, `/account/`, `/invoice/`) now opens in light mode unless the visitor has picked dark with the theme button (saved in `zap-theme`); the device setting is still ignored. Replaces the dark-by-default rule of 20 Nov. Home page `theme-color` is now white.
- Files: `index.html`, `admin/index.html`, `account/index.html`, `invoice/index.html`, `components/Sections.jsx`, docs.

## 2026-11-25: Search data: site name and Dukaan offer
- Google showed "zappos.pk" with a plain globe in results (new domain; Google fetches the favicon and site name on its own schedule, often 1–3 weeks). The favicon setup was already correct (48x48 .ico, svg, 192 png on every page). Added `alternateName` to the WebSite data to help Google show "ZAP POS" as the site name, and removed "Free trial, no card required" from the Dukaan offer (there is no free trial since 1.9.139).
- Files: `index.html`, docs.

## 2026-11-25: Plans open on yearly prices
- Owner request: the pricing section's Monthly/Yearly switch now starts on Yearly (per-month equivalent, "billed yearly"); visitors can still switch to Monthly.
- Files: `components/Pricing.jsx`, docs.

## 2026-11-25: Quick ADD and Hira Akhtar reviews added
- Owner decision: added the Quick ADD and Hira Akhtar Google Maps reviews, word for word, labelled "Google review", above the two existing ones (4 in total). Both are now paying Brand customers (2 branches each, invoices #1003 and #1004, leads added with source "In person") and saw the full demo. Claude had held them back because they describe live cafe use across branches that hadn't started yet; the owner confirmed payment and asked for them to go up. Built-in JSON and published `site_content.reviews`.
- Files: `landing-content.json`, docs; Supabase `site_content`, `leads`, `bills`.

## 2026-11-25: First reviews on the home page
- Owner decision: the reviews section shows two of the Google Maps reviews in place of the three placeholders: Muneeb Khan ("Great software for billing and pharmacy ✅") and Sohaib Awan ("Good software"), each labelled "Google review" (no shop or city given, so none invented). The owner vouched for them; Claude had flagged that the first five Maps reviews came from accounts close to the owner. Built-in JSON and published `site_content.reviews`.
- Files: `landing-content.json`, docs; Supabase `site_content`.

## 2026-11-25: Footer icons hover and click properly
- Owner report: the footer's social icons didn't react on hover and the big "ZAP POS" wordmark lit up instead. The wordmark's huge letters (line-height .8) reach up over the icons, so the mouse was on the wordmark. `.footer > .container` now sits above it (`position: relative; z-index: 1`, wordmark `z-index: 0`); checked every icon at 1366px and 390px, top to bottom edge. Also the hover now moves only the icon (svg), not the button, so the mouse can't slip off a moving target.
- Files: `styles.css`, docs.

## 2026-11-25: Google Maps listing linked from the site
- The Google Business Profile is live ("ZAP POS- All-in-One POS & Billing Software", Gulberg III, Lahore). Its stable link `https://maps.google.com/?cid=7831547452859924468` is now `links.social.google` (built-in JSON and published `site_content`), shown as a map-pin icon in the footer ("ZAP POS on Google Maps"), and added to the Organization `sameAs` in `index.html`. The footer's social list is now `[key, icon, label]` triples and skips a link that isn't set.
- Not done on purpose: showing the listing's reviews on the site. The first five came within hours from the owner's own accounts, a former workplace and a relative, and two describe features no connected shop has used yet; rule 2 (never invent customer reviews) applies. Add real customer reviews later. No `aggregateRating` markup (Google ignores self-served ratings for a business's own site).
- Files: `Sections.jsx`, `index.html`, `landing-content.json`, docs; Supabase `site_content` (`links.social.google`).

## 2026-11-25: Hero badge bolt blinks blue
- Owner request: the bolt in the hero's "Made for shops in Pakistan" badge now glows and blinks blue slowly (2.6 s), like a live light. `Kicker` gets a `live` prop (class `kicker-live`, filled bolt; used only in `Hero.jsx`), CSS `.kicker-live svg` + `@keyframes kickerLive` next to `.kicker` in `styles.css` (brand tokens, so light and dark both work; reduced motion stops it by the global rule). Named `kicker-live`, not `live`, because `.live` is the small green dot.
- Files: `Bits.jsx`, `Hero.jsx`, `styles.css`, docs.

## 2026-11-25: WhatsApp logo on the floating button
- Owner request: the round button bottom-right showed a plain chat bubble (the outline `whatsapp` icon drawn filled loses its phone). New filled icon `whatsappLogo` in `Icons.jsx`, the standard WhatsApp glyph (Simple Icons path; a first hand-drawn version had the wrong phone shape and was replaced the same night), used by `WhatsAppFloat.jsx` and the final section's WhatsApp badge. The outline `whatsapp` icon stays for buttons that draw it as a line.
- Files: `Icons.jsx`, `WhatsAppFloat.jsx`, `Sections.jsx`, docs.

## 2026-11-25: The site now says the owner app is available on Android and iPhone
- Owner request: the app exists now (installable from `/account/` on both, with products, customers, ledger, purchases and shifts since ZAP POS 1.9.150), so the "coming soon" lines are gone. Night stop of the day timeline (`day`), the plan row (`pricing`: "Owner app for Android and iPhone"), the cloud-vs-offline guide and the facts page (new "Owner app: Android and iPhone" fact; it says plainly the app installs from the website and isn't in the Play Store or App Store yet). New FAQ "Is there an app for my phone?" with the install steps.
- Changed in the built-in JSON **and** the published Supabase `site_content` (`day`, `pricing`, `faq` are published; the FAQ array was extended there too).
- Files: `landing-content.json`, docs; Supabase `site_content`.

## 2026-11-25: Phone app step 2: products, customers, suppliers, ledger, purchases, categories, shifts from the phone
- Owner wants everything Mint POS's app has. Needs ZAP POS **1.9.150** on each main PC (desktop repo: `db/migrations/0039_owner_app.sql`, `CloudSync.CommandsOnceAsync`); cloud side `cloud/0008_owner_app.sql` in the desktop repo, applied to Supabase (migration `cloud_0008_owner_app`).
- **Products tab** (was Stock): Total / Low / Out cards (tap to filter), search by name or barcode, All / Standard / Weighted / Variant pills, each product with category, type, price and stock (`my_products`). With main PCs older than 1.9.150 it falls back to the low-stock list and says to update.
- **Me › Shop**: Customers and Suppliers (`my_parties`: search, what they owe you / you owe them, each with balance; tap = ledger via `my_ledger` with running balance), Purchases (`my_purchases`: this month / all, total and still to pay, tap = bill lines), Categories (`my_categories`, product counts).
- **Open and close a shift from the phone** (owner chose to allow it): Home's Open shift and Shifts & cash › Open a shift open a sheet (branch, counter from `my_shifts.counterList`, opening cash); each open shift has Close shift (shows what should be in the drawer, asks the cash the cashier counted). `my_command` queues it; the sheet watches `my_commands` (3 s, up to 2 min) and says Done, refused with the main PC's reason and next step, or expired (main PC offline over 10 min). `my_shifts` now also returns `counterList` and each shift's `branchId` (schema §24, migration `my_shifts_counter_list`).
- Texts `account.owner.app` (new keys; `gotIt`, `openShiftSoon`, `productsSoon`, `stockEmptyTitle`, `stockEmptyText`, `stockFilters`, `onWay`, `noListText` removed); CSS `.pa-form`, `.pa-mini`, `.pa-cmd`, `.pa-spin`.
- Files: `src/account/PhoneConsole.jsx`, `admin/admin.css`, `landing-content.json`, `supabase/schema.sql`, docs.

## 2026-11-25: Phone app rebuilt in card style (step 1 of the owner app)
- Owner sent screenshots of Mint POS (dashboard tiles, sales filters, products, profile menu, floating bottom bar) and asked for the same features and a similar layout without copying it. `PhoneConsole.jsx` is rewritten as a card-based app in ZAP blue (yellow only for today's bar): Home, Branches, Sales, Stock, Me, plus Shifts & cash, Stock transfers, Support from branches and Plan screens, a branch picker, a bill receipt sheet, and a floating bottom bar with a sliding blue pill (Mint POS uses a green bubble in a curved notch; ours is deliberately different).
- New Supabase functions (schema §24, applied as migration `owner_app_reads`): `my_sales` (bills by date range and branch, with totals), `my_shifts` (open drawers and today's closed shifts, cash taken, counters), `my_support` (help requests from the owner's branches). Signed-in only, owner's own branches only; tested with throwaway data in a rolled-back transaction (owner sees own bills, another login sees none, anon refused).
- Step 2 (needs a ZAP POS desktop update): opening/closing shifts from the phone (owner chose to allow it), and the full product list, parties, ledger, purchases and categories, which the cloud does not receive yet. The app says so where those would be.
- Old phone texts `account.owner.ph*` and the `.ph-*` CSS removed; new texts `account.owner.app`, CSS `.pa-*`. New icons `home`, `refresh`, `user`, `swap`, `headset`, `key`, `trash`.
- Files: `src/account/PhoneConsole.jsx`, `admin/admin.css`, `components/Icons.jsx`, `landing-content.json`, `supabase/schema.sql`, docs.

## 2026-11-25: The owner app installs on phones only
- Owner request: Windows (and Mac) users must not install the owner app. The manifest link is no longer in `account/index.html`; `src/account/main.jsx` adds it and registers `sw.js` only when `isPhone()` (`ownerData.js`: Android, iPhone, iPad), so Chrome/Edge on a computer never show "Install app". On a computer, a worker left from an earlier visit is unregistered. `InstallHint.jsx` shows nothing on a computer, except after the home page's Android/iPhone button, where it says to open zappos.pk/account on the phone (`account.owner.installOnPhone`).
- Files: `account/index.html`, `src/account/{main.jsx,ownerData.js,InstallHint.jsx}`, `landing-content.json`, docs.

## 2026-11-25: App buttons restyled as store-style badges
- Owner found the final section's Android / iPhone / WhatsApp buttons dull and sent the official Play Store / App Store badges as the look to follow. Restyled `.store` (`styles.css`) to that look: black, thin white border, small line over a big name in `--font-head`, large icons (green Android robot, white Apple, green WhatsApp). The official badges themselves are **not** used: Google and Apple allow them only for apps listed in their stores, and ZAP POS isn't yet (rule 5b: copy must stay true). Swap in the real badges once the store apps exist. Hover moved into the hover media block (rule 4); the old `.final .store` and dark-theme overrides removed (the section is always dark).
- Files: `styles.css`, `Sections.jsx`, docs.

## 2026-11-25: Android and iPhone buttons install the phone app
- Owner request: the final section's store buttons went nowhere (`#`) and said "Google Play" / "App Store", where there are no apps yet. They now read "Owner app for Android" / "Owner app for iPhone" (text in `finalCta.appSmall/android/iphone`, new `android` icon; the unused `gplay` icon removed) and open `/account/?install=android|iphone` (`links.googlePlay` / `links.appStore`, built-in JSON **and** published Supabase `site_content`). There the log-in page shows the install card for that phone: Chrome's Install button when Android offers it, otherwise "Show me how" with that phone's three steps (`installStepsAndroid` for Chrome's ⋮ menu, new `dots` icon; `installSteps` for Safari Share). The plain log-in page still shows no card (owner decision above). Admin labels and the dashboard checklist now say Android app / iPhone app.
- Files: `Sections.jsx`, `Icons.jsx`, `AccountApp.jsx`, `InstallHint.jsx`, `admin/admin.css` (`.acc-install`), `admin/sections.js`, `admin/Dashboard.jsx`, `landing-content.json`, docs; Supabase `site_content` (`links`).

## 2026-11-25: No install card on the log-in page (owner decision)
- Tried showing "Put ZAP POS on your phone" under the log-in box; the owner doesn't want it there, so it was taken back out. The card stays only inside a linked owner's console (Today tab). Anyone else installs from Chrome's ⋮ menu → Install app (Android) or Safari Share → Add to Home Screen (iPhone).

## 2026-11-25: Owner console as a phone app (PhoneConsole)
- Owner request ("make it a masterpiece, human, not AI-looking"). On a phone (≤700px, also when installed) `/account/` now shows `src/account/PhoneConsole.jsx` instead of the shrunken desktop console: built like a shop register, not a dashboard. Today = sales in the receipt font (`--font-mono`) that settles slowly to its value, the comparison in plain words ("2% less than last Wednesday (Rs …)"), a hairline ledger (bills, cash, refunds, discounts, cancelled), last 7 days as plain bars with today's in yellow, and a ranked branch list. Tabs at the bottom: Today, Branches (tap a branch for its day, top sellers numbered like a bill, running low), Stock (out, low, transfers on the way across all branches), Plan (the plan/invoices content plus help, theme and log out). Pull down to refresh (an installed iPhone app has no reload), and figures reload when the app is reopened.
- Offline (owner left it to me; chose the useful default): the last figures and account loaded are kept on the phone (`zap-owner-cache`, `zap-account-cache` in localStorage) and shown with "No internet on this phone. These are the figures from 9:38 pm." Both are removed on sign-out (`AccountApp.jsx`). This replaces the earlier "no business data on the phone" note. The service worker (`zap-account-v2`) now saves the page **and** the script/style files it names at install, so the app opens offline the first time too.
- iPhone install: the card's "Show me how" opens a bottom sheet with the three Add to Home Screen steps (new `share` icon). `viewport-fit=cover` for the notch and home bar.
- Desktop layout unchanged. Helpers shared by both layouts moved to `src/account/ownerData.js`.
- Files: `account/index.html`, `public/account/sw.js`, `src/account/{PhoneConsole.jsx,ownerData.js,OwnerConsole.jsx,AccountApp.jsx,InstallHint.jsx,main.jsx}`, `components/Icons.jsx`, `admin/admin.css` ("Owner console on a phone" block, install sheet), `landing-content.json` (`account.owner.ph*`, `install*`), docs.

## 2026-11-25: Owner console is installable on phones (PWA)
- Owner decision: no store apps yet (Android app "soon", iPhone later); until then `/account/` installs from the browser at no cost. Android/Chrome shows an "Install app" button; iPhone Safari has no prompt, so a hint explains Share → Add to Home Screen. Opens full screen with the ZAP icon.
- `public/account/manifest.webmanifest` (scope and start `/account/`, standalone, 192/512/maskable icons), `public/account/sw.js` (service worker, scope `/account/`: keeps only the page shell and hashed `/assets/`, never Supabase data, so no business data is stored on the phone; offline it opens the saved shell and the console says it can't load). `account/index.html` gets the manifest, theme-color and Apple meta tags; `src/account/main.jsx` registers the worker; `src/account/InstallHint.jsx` is the card (hidden when installed or dismissed, remembered in localStorage); text in `account.owner.install*`; CSS `.own-install*` at the end of `admin/admin.css`.
- No CSP change needed (`worker-src` and `manifest-src` fall back to `'self'`). Real store apps later could wrap this same page.
- Files: as above, `landing-content.json`, docs.

## 2026-11-24: X icon removed from the footer
- Owner request: no X (Twitter) icon. Removed it from the footer list in `Sections.jsx`, the now-unused `x` icon in `Icons.jsx`, and `links.social.x` in the built-in JSON and the published Supabase `site_content`. Footer social icons are now LinkedIn, Facebook and Instagram.
- Files: `Sections.jsx`, `Icons.jsx`, `landing-content.json`, docs; Supabase `site_content` (`links.social`).

## 2026-11-24: Instagram link
- Instagram account `zappos._.pk` added: footer social link (`links.social.instagram`, in the built-in JSON **and** the published Supabase `site_content`, since published text overrides the built-in) and the home page's `sameAs` in `index.html`. Facebook and X are still empty (`#`).
- Files: `landing-content.json`, `index.html`, docs; Supabase `site_content` (`links.social.instagram`).

## 2026-11-24: Owner app and dashboard wording (owner decision)
- Owner's decision: the dashboard of all branches is live through sign-in at `zappos.pk/account` on any phone or browser; a dedicated owner app is "coming soon" for Android (an iPhone app is planned for later, per the owner).
- Removed the old promises of an iPhone and Android app: the "Night" step of `day` ("Check sales from bed") and the plan feature row "Live sales app (iOS + Android)" (`pricing`), in the built-in JSON **and** in the published Supabase `site_content` (`day`, `pricing`; published text overrides the built-in). `zap-pos-facts` "What it doesn't do yet" no longer lists the owner app or the all-branch dashboard, and the cloud-vs-offline guide's "Where ZAP POS fits" says the same.
- Size and colour variants: settled as **live** (ZAP POS 1.9.147 added them, per the 2026-11-24 clothing and shoe pages entry; the stale "planned" lines in `zap-pos-facts` and the cloud-vs-offline guide were left over from before). Both now say they exist. The facts "doesn't do yet" section keeps only Mac or Android counters and an Urdu interface, plus the Android owner app.
- Files: `landing-content.json`, docs; Supabase `site_content` (`day`, `pricing`).

## 2026-11-24: 404 page and two more comparison pages (OneClickPOS, TransactFlow)
- **404 page:** `scripts/prerender.mjs` now writes `dist/404.html` (Vercel serves it with a 404 status for any address that is not a page; before, visitors saw Vercel's bare "NOT_FOUND"). It is plain HTML with the site styles and no script bundle (so it never tries to draw the home page at a wrong address), `noindex, follow`, no canonical, no share tags, no structured data, a home button and nine links to the main pages. Styles: block `.nf*` at the end of `styles.css` (hover twin inside a hover media query).
- **New pages** `/zap-pos-vs-oneclickpos` and `/zap-pos-vs-transactflow` (footer group "Compare", `related` lists of the Oscar and Moneypex pages updated, share images `public/og/*.jpg`). Competitor cells come only from each company's own pages and its own vendor listings (OneClickPOS: oneclickpos.pk blog and FBR pages plus its GoodFirms listing; TransactFlow: transactflow.pk pages plus its Product Hunt, GoodFirms and SourceForge listings). Where the sources disagree the cell says so (OneClickPOS calls itself cloud-based on its pages and offline without cloud dependency in its listing), and where nothing is stated it says "not stated". Its Urdu interface, 2018 start and 1000-business claims are quoted as its own claims, not verified. Sitemap now 44 addresses.
- **ZivoxPOS page not built:** its own site (zivoxpos.online) could not be opened from here and it is pharmacy-only, so only third-party listings were available.
- Still open for the owner: the `zap-pos-facts` contradiction (its "doesn't do yet" section lists size/colour variants, owner app and owner dashboard as planned, its own FAQ says yes), Search Console requests for the other pages, directories, reviews, PageSpeed.
- Files: `scripts/prerender.mjs`, `src/styles.css`, `landing-content.json`, `public/og/`, docs.

## 2026-11-24: SEO round 2 (screenshots, share images, orphans, byline)
- Home hero description now says "point of sale (POS) software in Pakistan" (also updated in the published Supabase `site_content`, since published text overrides the built-in; the locked headline and POS scene are untouched). The demo poster has alt text (`video.posterAlt`).
- Screenshot `public/media/zap-pos-billing-screen.jpg` (cropped from the demo poster) added with alt text to nine pages through the new `image` field (restaurant, supermarket, kiryana, bakery, offline billing, how it works, many counters, FBR invoicing, Lahore). One image repeated: more varied real screenshots would be better.
- Per-page share images: 41 files in `public/og/` (3.5 MB) made by `scripts/make-og-images.py`; prerender points `og:image` and `twitter:image` at them. Pages marked `noindex` have none.
- Orphan pages (Karachi, Islamabad, Rawalpindi, Faisalabad, Peshawar, About, Roman Urdu "kya hai") now get links from related lists of industry and other pages.
- Byline on pages with a publish date: "By the ZAP POS team · Published <date>" (no invented person).
- Still needs the owner: Search Console and Bing, backlinks and directories, verified Google profile, real reviews, PageSpeed check, YouTube demo, the `zap-pos-facts` contradiction.

## 2026-11-24: SEO clean-up (titles, links, offers, lastmod)
- Every indexed page now has a title of 60 characters or fewer and a description of 155 or fewer (the audit found about 25 titles and 30 descriptions over the limit; they would be cut off in results).
- Internal links: 28 pages got a curated `related` list (replacing the generic strip, which only repeated the footer), and 36 contextual links `[words](/slug)` were added in article text. New helper `withLinks` in `InfoPage.jsx`; link style `.ip-article p a`.
- Structured data: the home page `SoftwareApplication` now has two `offers` (Dukaan PKR 3,499, Brand PKR 8,999 per branch), matching the published plans (checked in Supabase). The home description was shortened to 155.
- Sitemap: `<lastmod>` is written for pages that have a real `published` date; none are invented.
- Still open (needs the owner): Search Console and Bing, backlinks and directories, the verified Google profile, real reviews, a PageSpeed check, a YouTube demo, and the contradiction between `zap-pos-facts` ("planned": variants, owner app, all-branch dashboard) and the plans and clothing pages.

## 2026-11-24: City pages made distinct, weak ones noindexed
- Following an SEO review (near-identical city pages risk Google's doorway and scaled-content policies), each city page now has its own description, headline, four-question FAQ and a "What to check before you choose in <city>" section; the repeated load-shedding and set-up sections were removed.
- New page field `noindex` (prerender writes `noindex, follow` in place of the site-wide robots tag; page dropped from `sitemap.xml` and `llms.txt`). Set on Multan, Sialkot, Gujranwala and Quetta, whose local detail is thinnest. Remove `noindex` once a page has real local content. Sitemap is now 42 addresses.
- Local facts (markets, authority notes) are general knowledge and unverified per city. Files: `landing-content.json`, `scripts/prerender.mjs`, docs.

## 2026-11-24: Comparison pages (Oscar POS, Moneypex)
- New pages `/zap-pos-vs-oscar-pos` and `/zap-pos-vs-moneypex` (footer group "Compare"), with a new `compare` block in `InfoPage` (table on desktop, stacked cards on mobile; `.ip-compare`). Every competitor cell comes from that company's own public pages (checked 24 Nov 2026); where their site is silent the cell says "not stated", never a cross. Each page has a "checked on" note. The first draft idea of copying Mint POS's table was dropped because its claims that Oscar has no offline mode and no FBR contradict Oscar's own site.
- CisePOS and LookPOS pages not built: only third-party listings found.
- **Open problem for the owner:** `zap-pos-facts` says size and colour variants, the owner app and the online all-branch dashboard are "planned", while `clothing-store-pos`, `shoe-store-pos` and the plans page say they exist. The comparison pages avoid those claims; fix whichever page is out of date, and re-check the Brand plan row.
- Files: `landing-content.json`, `InfoPage.jsx`, `styles.css`, docs.

## 2026-11-24: City pages
- Ten city pages `/pos-software-<city>` (lahore, karachi, islamabad, rawalpindi, faisalabad, multan, peshawar, sialkot, gujranwala, quetta) with a footer group "POS by city". Lahore is the main one and has two extra sections (made in Lahore, which Lahore shops use what). Each city has its own markets and shop types, tax authority note (PRA for Punjab, SRB for Karachi, KPRA for Peshawar, FBR for goods; Quetta and Islamabad say to check) and a local paragraph, plus the short Urdu box.
- Claims kept true: no on-site visit or local office promised (setup is "over WhatsApp"), no SRB/BRA integration claimed (only that the tax office prints on the receipt), power-cut rule kept. Market names are general knowledge, not verified per city: check them.
- Files: `landing-content.json`.

## 2026-11-24: Urdu summary on every page (replaces the separate Urdu pages)
- Owner asked for a few lines of Roman Urdu and Urdu on each page instead of separate pages, so the three extra pages (`fbr-pos-integration-kya-hai`, `cloud-pos-ya-offline-pos`, `fbr-pos-integration-urdu`) were reverted and every extra page got an `urdu` field: a card "Urdu mein · اردو میں" under the short answer with 1-2 sentences in Roman Urdu and in Urdu script.
- Files: `landing-content.json`, `InfoPage.jsx`, `styles.css` (`.ip-urdu`, `--urdu-font`), docs. The Urdu text was written by Claude: have a native reader check it. Not added to the home page.

## 2026-11-24: Cloud vs offline-first POS guide
- New guide `/cloud-pos-vs-offline-pos` (footer "Guides", sitemap, `llms.txt`): compares the two kinds of POS on internet drops, speed, branches, FBR/PRA, data and cost, with a buyer checklist. It names no competitor and makes no claims about any other product's features; it says to test each vendor. Keeps rule 5b (a power cut also stops the PC). File: `landing-content.json`.

## 2026-11-24: FBR integrator licence stated (owner confirmed)
- Owner confirmed ZAP POS holds an FBR integrator licence. `/fbr-pos-integration-guide` (fits section and the "Can any POS" FAQ) and the first FAQ of `/fbr-invoicing` now say so. The licence number is not shown; add it if the owner wants it. Keep this true: remove the claim if the licence lapses.

## 2026-11-24: FBR integration wording (owner decision)
- Owner confirmed ZAP POS does the FBR integration itself. `/fbr-pos-integration-guide` ("Where ZAP POS fits") and the first FAQ of `/fbr-invoicing` now say the integration is built in and we set it up with the shop. No claim of an FBR integrator licence is made: add it only if/when ZAP POS holds one.

## 2026-11-24: FBR POS integration guide
- New guide `/fbr-pos-integration-guide` (footer "Guides", sitemap, `llms.txt`, FAQ data): who must integrate (Tier-1 retailers and persons FBR notifies), what the electronic invoice carries (FBR invoice number, QR code), the licensed-integrator rule (PRAL can act as one), what the rules allow for non-integration (penalty, sealing until integrated), Punjab's separate PRA e-IMS for restaurants and hotels, a buyer's checklist, and a sources line. Written from FBR's POS pages and booklet, FBR's FAQs, SRO 69(I)/2025 and news reports (Dawn, Business Recorder, Express Tribune, ARY), checked 24 Nov 2026. It gives no penalty amounts from FBR (they are in the law and can change) and says it is not legal or tax advice.
- It says nothing about whether ZAP POS is itself a licensed integrator. **Open question for the owner:** FBR's rules say integration must go through a licensed integrator, while `/fbr-invoicing` says ZAP POS "works with FBR's POS integration" using the shop's own POS ID and token. Decide how the integration is set up and worded, and change `/fbr-invoicing` if needed.
- Files: `landing-content.json` (page and footer link). The published copy has no `pages` key, so it goes live with the deploy.

## 2026-11-24: Four more guide pages
- New guides (the `article` page type, with FAQ data, sitemap and `llms.txt` entries, linked from the footer group "Guides"): `/what-is-pos-software`, `/barcode-system-for-your-shop`, `/how-to-count-stock-in-a-shop` and, in Roman Urdu (`lang: ur-Latn`), `/pos-software-kya-hai`. The site now has 31 extra pages.
- Why these: the "how to choose a POS", "POS vs register and Excel", FBR and load-shedding pages already existed, so these cover the beginner and how-to searches that were missing. ZAP POS is only mentioned where it really does the thing (barcode labels, expiry and low-stock warnings, stock recount/breakage entries, Excel import, offline billing).
- Not written: a guide on FBR rules, because the legal details need a careful check first; the existing `/fbr-invoicing` page stays the reference.
- Files: `landing-content.json` (pages and footer links). The published copy has no `pages` key, so these go live with the deploy.

## 2026-11-24: Three more industry pages
- New pages `/cosmetics-store-pos`, `/mobile-accessories-shop-pos` and `/hardware-store-pos` (same template as the other shop-type pages, each with its own title, description, problems, features and FAQ, so each also feeds FAQPage data, the sitemap and `llms.txt`). Linked from the footer group "For your shop". There are now ten shop-type pages in all (pharmacy, restaurant, supermarket, kiryana, bakery, clothing, shoe, cosmetics, mobile accessories, hardware).
- Copy only uses what the desktop app does today: expiry dates, sizes and colours, packs, barcode labels, supplier ledger, returns with credit notes, floor price, quick sale, FBR, offline billing. The accessories page says plainly that IMEI/serial tracking is not part of ZAP POS yet.
- Not added: city pages (Lahore, Karachi, ...). Without real local content they would be thin "doorway" pages that search engines penalise.
- Speed check: home page JS about 80 KB compressed, video loads only on click, fonts bundled, cache headers set; nothing needed fixing.
- Files: `landing-content.json` (the pages and the footer links). The published copy in Supabase has no `pages` key, so these go live with the deploy; no admin republish is needed.

## 2026-11-24: Contact point in the search data
- The Organization data in `index.html` now has a `contactPoint` (phone +92 339 0035603, email zappos.contact@gmail.com, Pakistan, English/Urdu). Both are the real values already published in the admin (`brand`), so search engines can show them. No address is added (the site address is still just "Pakistan"), no prices and no ratings.
- If the phone or email changes in the admin, change them in `index.html` too.
- Files: `index.html`, `CLAUDE.md`.

## 2026-11-24: LinkedIn company page wired into the site
- The ZAP POS LinkedIn company page now exists (`linkedin.com/company/zap-pos`, logo, banner, About, three posts). `links.social.linkedin` points to it (footer icon), and the Organization data in `index.html` has `sameAs` with it, so search and AI answers can tie the site to the page.
- The published copy in Supabase (`site_content`, `links.social.linkedin`) was set to the same address, because published values replace the built-in ones. Facebook, Instagram and X are still `#`.
- Files: `landing-content.json`, `index.html`.

## 2026-11-24: Stock transfer linked from the footer; correction about republishing
- Footer group "ZAP POS" links to `/branch-stock-transfer`, so every page reaches it by an internal link.
- Correction to the entries above: the published copy in Supabase (`site_content`) holds no `pages` and no `account.owner`, so the new/changed pages, the owner-console texts and the footer come from the built-in JSON and go live with the Vercel deploy. **No republish in the admin is needed** (checked 24 Nov 2026).

## 2026-11-24: SEO/AEO answers for stock transfer and the owner console
- Why: the facts page and the Roman-Urdu Q&A page (what search and AI answers quote) did not mention branch stock transfer or the owner console. Added two questions to each (`zap-pos-facts`, `pos-software-sawal-jawab` in `landing-content.json`); they also feed FAQPage data and `llms.txt`. **Republish Extra pages in the admin.**

## 2026-11-24: Help desk reads the shops' Support threads from ZAP POS
- Why: ZAP POS's Support screen already sends its threads to ZAP cloud (`zap_support`), but nothing in the admin read them, so a shop's message and photo went unseen and replies could not be sent. Now they can.
- Cloud (desktop repo `cloud/0007_support_admin.sql`, applied to Supabase): admin-only `admin_support_threads()`, `admin_support_thread(id)` (messages with photos), `admin_support_reply(id, body, status, msg_id)` (a reply is a `from_zap` message, so `zap_support` returns it to the shop's main PC at its next sync; same `msg_id` twice is kept once; status only open/solved). Not granted to anon; non-admins get an error.
- Admin → Help desk now has two tabs: "From ZAP POS" (new `admin/HelpThreads.jsx`: filter Needs a reply / Open / Solved, search, thread sheet with photos, reply, mark solved/open again, refresh every 60 s) and "From the website" (the old `help_requests` list, unchanged). CSS `.adm-thread/.adm-msg` at the end of `admin/admin.css`.
- Not checked: the new tab with a real thread and an admin login (there were no threads yet), and the reply showing in the app's Support screen.

## 2026-11-24: Branches page no longer says the owner view is coming
- Why: the owner console at /account has been live since 1.9.148; the page still marked it "Soon". `multi-branch-pos` in `landing-content.json`: stat, feature (no `soon`), solved line and FAQ now say it is live. **Republish Extra pages in the admin** for the live site.

## 2026-11-24: branch stock transfer (ZAP POS 1.9.149): owner console card and info page
- Why: ZAP POS 1.9.149 lets a manager send stock from one branch to another (numbered slip, receiver counts, short counts recorded). The owner should see these on the web, and the site must say so only now that it is true.
- Owner console (`account/OwnerConsole.jsx`): new `TransfersCard` from `my_transfers(30)` (desktop repo `cloud/0006_stock_transfers.sql`, tenant-scoped like `my_branches()`): number, from → to, units, status chip (On the way / Received / Received, n short / Sent back / Cancelled), updated. On a branch's view only that branch's transfers. A failure of this call never hides the sales; no transfers means no card. Chip `own-chip.mute` (+ dark twin) in `admin/admin.css`. Texts: `account.owner` (`transfers*`, `col*`, `tr*`).
- New page `/branch-stock-transfer` ("Stock transfer", after Branches) in `pages.items`; the multi-branch page's "Stock across branches (soon)" item became "Send stock between branches" plus a FAQ. The "all branches on one screen" item there is still marked soon although the owner console exists (left for the owner to decide). **Published content replaces arrays wholesale: republish the pages in Admin → Extra pages or the live site keeps the old text.**
- Not checked here: the card with real data in light/dark at 1366px and 390px (needs a signed-in owner with transfers).

## 2026-11-24: site addresses switched to zappos.pk
- Why: `zappos.pk` and `www.zappos.pk` show Valid Configuration in Vercel (www redirects with 308), so the search and share tags now point to the real domain.
- `index.html` (canonical, og:url, share image, JSON-LD ids/urls/logo) and `public/robots.txt` (sitemap line) use `https://zappos.pk`; the pre-render builds the sitemap and `llms.txt` from that address. `zappos-web.vercel.app` keeps working.
- Docs: ARCHITECTURE SEO note and CLAUDE.md updated.

## 2026-11-24: Terms of Use page
- Why: a Terms page was on the to-do list next to Privacy. Plain-language terms: licence (one active plan, counters per plan), data stays the shop's, payments recorded not processed, owner's responsibilities, support, limits (no claim that billing works without power), Pakistan law.
- `landing-content.json`: new page `terms` after `privacy` in `pages.items`. `components/Sections.jsx`: footer bottom row now links Privacy and Terms. Pre-rendered like the other pages (24 sitemap addresses).
- Owner decision (same day): no refunds once a licence is purchased; the price shown is final. Added as a "No refunds" section.
- Text is a plain draft with no prices or phone numbers: the owner (or a lawyer) should read it before the domain goes live.

## 2026-11-24: owner's page shows top sellers and low stock
- Why: owners with branches want to see what sells and what is running out in each one (approved preview).
- `account/OwnerConsole.jsx`: a branch's view adds "Top sellers today" (top 10 by amount, bars grow in) and "Running low" (Out / n left chips, first 8, "+n more"); "All branches" table adds a Stock column ("2 out · 3 low" or "All stocked"). Data comes from `my_branches()` → `branch.top` / `branch.stock` (desktop repo `cloud/0005`, applied to Supabase; sent by ZAP POS 1.9.148). Older main PCs send none: the cards are not shown and the column shows "–".
- Texts: new keys in `account.owner` (`colStock`, `topTitle`, `topEmpty`, `topNote`, `lowTitle`, `lowCount`, `lowEmpty`, `lowMore`, `outChip`, `leftChip`, `stockOk`). CSS: owner block in `admin/admin.css` (`.own-pair`, `.own-list`, `.own-bar`, `.own-chip` with dark twins; animations off with reduced motion).
- Checked with sample data (pretend sign-in, local dev server): desktop 1366 px light and dark, phone 390 px dark; fixed a phone overflow from long product names (list column `minmax(0, 1fr)`, names cut with "…"). No console errors.

## 2026-11-24: clothing and shoe shop pages
- Why: ZAP POS 1.9.147 (desktop) added sizes and colours, so the site now targets garment, boutique and shoe shops too.
- New extra pages in `landing-content.json` → `pages.items` (after Bakeries): `/clothing-store-pos` ("Know every size, in every colour.") and `/shoe-store-pos` ("Find size 9 in black before you check the store room."), each with stats receipt, short answer, problems, features, FAQ (clothing also has 4 setup steps). Copy only describes what 1.9.147 really does: stock/barcode/price per size and colour, renamable options, counter picker (sizes in shop/number order, sold-out crossed out), tags with old price crossed out, returns with a manager's approval and a credit note, branches on the owner's page, offline billing. No branch-to-branch stock transfer claimed (not built).
- Footer "For your shop" links both pages. `zap-pos-facts`: clothing and shoe shops added to who it's for, and a new FAQ "Does ZAP POS handle sizes and colours?" (reaches `llms.txt`).
- Published Supabase content has no `pages` or `footer.groups`, so the built-in JSON is what goes live; nothing to publish in the admin.
- Checked: build writes 22 pages + home, sitemap 23 addresses; clothing page at 1366 px (light) and 390 px (dark), shoe page at 390 px: no sideways scroll, no console errors.

## 2026-11-23: zappos.pk domain + SEO foundation (step 1)
- Domain: `zappos.pk` registered at PKNIC (2 years, to 2028-11-23, owner "Muneeb Akhtar (ZAP POS)", technical contact 273992), nameservers set to Vercel (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`), added to the Vercel project `zappos-web`: `zappos.pk` = Production, `www.zappos.pk` = 308 redirect to it. Waiting for DNS to spread (Vercel showed "Invalid Configuration" at first).
- Head tags in `index.html`: title "ZAP POS | Best POS Software in Pakistan, Offline Billing", a 160-character description (no "free trial" wording: the owner has not decided it), canonical `https://zappos.pk/`, robots, theme colour, Open Graph + Twitter large-image tags, favicon links (ico, svg, 192 px png) and apple-touch icon.
- JSON-LD in `index.html`: Organization, WebSite and SoftwareApplication (Windows 10/11, BusinessApplication). No prices, ratings, phone, email or social links (placeholders; rule 2).
- New files in `public/`: `og-image.png` (1200x630, 270 KB), `favicon.ico`, `icon-192.png`, `apple-touch-icon.png`, `robots.txt` (allow all + sitemap), `sitemap.xml` (home page only). `/admin`, `/account`, `/invoice` stay out of search through their `X-Robots-Tag: noindex` header; they are not blocked in robots.txt so Google can see that header.
- Not done yet: shop-type and comparison pages, Urdu pages, switching the site's own links and the Supabase redirect addresses to zappos.pk (after the domain is live).
- Files: `index.html`, `public/*`, docs.

## 2026-11-23 (night): owner dashboard on /account/ (step 3 of the owner dashboard)
- A linked owner now gets the **owner console** (new `account/OwnerConsole.jsx`) instead of the single plan box: the admin panel's frame (top bar, sidebar "Owner console" with **My branches** and **Plan & invoices**, `PageBar`, `Stat`, `Area`, `Donut`, tables), phone first (owner approved the admin-panel look, asked for animations and phones).
- **All branches**: sales today (vs same weekday last week), bills (with cancelled), cash in drawers, refunds, discounts, branches online (synced in the last 10 min); 30-day sales line; today by branch ring (lakh amounts); branches table with a green pulsing "synced" / amber "internet off" pill, rows open the branch. **One branch**: same cards for that branch, its last sync, and a 7-day table. **No branch yet**: three steps to connect the main PC (Settings › Sign-in and PINs › ZAP cloud). Refreshes every minute. Data: `my_branches(35)`.
- The old plan, invoices and payments content is the **Plan & invoices** tab (`#plan`); views are kept in the address (`#all`, `#plan`, `#<branch id>`).
- Phone: stat cards two per row (first and last full width), chart dates every 5th day, smaller ring, tables become labelled cards (`data-label`), sidebar becomes branch chips. Animations: cards and rows rise in one after another, numbers count up, line draws, ring fills, "synced" dot pulses; all off with reduced motion.
- `Donut` parts take an optional `show` (how the value is written in the key); extra ring colours green/violet/pink. Removed the unused `account.hello`. New texts `account.owner`.
- Checked with sample data in headless Chrome: dark and light, 1366 and 390 px, all branches / one branch / no branch.
- Files: `account/OwnerConsole.jsx` (new), `account/AccountApp.jsx`, `admin/Charts.jsx`, `admin/admin.css` ("Owner console" block), `content/landing-content.json`, docs.

## 2026-11-23 (late): stable multi-tenancy
- Owner: "make multi tenant stable". Audit found one takeover path: a website sign-up was linked to any shop whose **mobile number** matched, so a stranger knowing a shop's number could sign up first and get its account, licence key and (with the dashboard) its sales.
- Fix (owner chose "you approve them"), schema §23: `link_signup()` links at once only by licence key or the lead's email; a phone-only match is stored as `leads.pending_user_id/pending_email/pending_at` and sees nothing (`my_account`, `my_licence`, `my_branches` return nothing). It links when the owner approves (`approve_signup(lead, approve)`, admins only) or when that person enters the shop's active licence key (`claim_shop(code)`, flood-limited; `zap_register_branch` tries it first, so ZAP POS setup keeps working for owners who registered with a new email). Only one sign-up can wait per shop. `my_signup_state()` tells the account page linked / pending / none.
- Branch tenant is now the **shop** (`zap_cloud.orgs.lead_id`), not a login, so fixing a link in Leads moves the branches with it. `zap_support` no longer reports another branch's message id as accepted.
- Admin: Leads shows a "Waiting approval" chip and filter, and a box in the lead with the sign-up's email, **Approve** and **Reject**; the dashboard's "Needs your attention" counts waiting sign-ups. Account page: "We're confirming your shop" + a licence-key box (texts `account.pending*`, `account.claim*`).
- Tested in rolled-back transactions: phone-only stranger sees nothing, can't self-approve, a made-up key fails; a second stranger gets nothing; the real owner with a new email links with their key and the stranger is removed; email and setup-key sign-ups link at once; a shop with an account refuses a phone sign-up; only admins approve.
- Files: `supabase/schema.sql` §23, `admin/Leads.jsx`, `admin/Dashboard.jsx`, `admin/admin.css`, `account/AccountApp.jsx`, `content/landing-content.json`, `CLAUDE.md` rule 1e, docs. Desktop repo: `cloud/0003_tenant_is_the_shop.sql`.

## 2026-11-23 (late): branch cloud + owner data in Supabase (step 1 of the owner dashboard)
- Applied the desktop repo's `cloud/0001_zap_cloud.sql` (schema `zap_cloud`, `zap_ingest`, `zap_support`) and new `cloud/0002_owner_dashboard.sql`: `zap_register_branch()` (signed-in owner + own active licence key → branch secret), trigger `plan_codes_follow_cloud` (cloud licence date always follows the newest active key, so a branch is never paused by a stale date), `my_branches(p_days)` (owner's own branches + daily totals). Tested for anon, two owners and an admin in a rolled-back transaction. Owner approved the dashboard design (admin-panel look, phone first, animations).
- Next: desktop app registers the main PC after setup; then the dashboard in `/account/`.

## 2026-11-23 (night): menu icons in the app's colours; Download button opens the Download page
- Owner: the menu icons should be in ZAP's own theme (picked style A of three previews: the colourful flat tiles of the ZAP POS app's Settings, white icon on a coloured rounded tile, same in light and dark; `.nav-tile.t0`–`t5`, colours from the desktop app's `Gloss.TileColours`). Only the icons changed.
- Owner: "Download" appeared twice (menu item + blue button). The menu item is removed, and the blue navbar **Download** button now opens `/download` (tracked as `download-page`, "Opened the Download page" in Analytics) instead of starting the installer. The hero and final section's "Download for Windows" buttons still download directly. Published `nav` updated to match.
- Files: `components/Sections.jsx`, `content/landing-content.json`, `styles.css`, `admin/Analytics.jsx`, docs.

## 2026-11-23 (night): Branches page and a compact top menu
- Owner: multi-branch is the major selling point and must be visible at the top. New page `/multi-branch-pos` ("Branches"): what works today (a main PC per branch that bills on its own, invoice series per branch, counters per branch, tax/FBR per branch, per-branch pricing) and, marked **Coming soon**, the owner's all-branches view and stock across branches (they need `zap_cloud` sync in Supabase and the owner dashboard, not built yet). New feature flag `soon` on page features (dashed card + yellow handwritten "Coming soon" label from `pages.soonLabel`).
- Top menu (owner showed the competitor's short menu with icons): now **Home · How it works · Branches · FBR · Plans · Download**, each with a small brand-blue icon (`nav[].icon`). Home is always first (on the home page it scrolls to the top and is shown as current). "Watch demo" and "FAQ" moved to the footer. Labels never wrap (`white-space: nowrap`), the pill is up to 1180 px wide, and the menu folds into ☰ below 1100 px (was 900 px). Fix: "Portal login" (phones only) no longer shows in the desktop menu. The published content's `nav` was updated to match.
- Files: `components/Sections.jsx` (Navbar), `components/InfoPage.jsx` (`soon`), `App.jsx`, `content/landing-content.json`, `styles.css`, `admin/sections.js`, docs.

## 2026-11-23 (night): "Home" link in the menu on extra pages
- Owner request: a Home button so visitors can get back to the main page from any extra page. On inner pages the menu starts with a blue "‹ Home" link (`Navbar` prop `homeLabel`, text in `pages.homeLabel`); the logo and breadcrumb also lead home. Not shown on the home page itself. On phones it is the first item in the menu.
- Files: `components/Sections.jsx`, `App.jsx`, `content/landing-content.json`, `styles.css` (`.nav-home`), `admin/sections.js`, docs.

## 2026-11-23 (night, AEO/GEO): answers that search and AI tools can quote
- Owner asked for AEO and GEO. Added:
  - `dist/llms.txt` (generated by `scripts/prerender.mjs`): the brand, the fact sheet's short answer and sections, and every page with its description, for AI tools.
  - `/zap-pos-facts` "ZAP POS at a glance": quotable facts (what it is, who it's for, what it does, how it keeps billing, **what it doesn't do yet**, plans), quick facts stickers and FAQ.
  - `shortAnswer` on guides and the fact sheet: a 2–3 sentence answer on a paper slip right under the hero (`.ip-short`), label from `pages.shortLabel` or the page's `shortLabel`.
  - `/pos-software-sawal-jawab`: nine Roman Urdu questions and answers (`lang: "ur-Latn"`, written into that page's `<html lang>` by the prerender).
  - Footer "Guides" column links both new pages.
- Files: `components/InfoPage.jsx`, `content/landing-content.json`, `styles.css`, `scripts/prerender.mjs`, `admin/sections.js`, docs.

## 2026-11-23 (night, last): six more pages + Privacy
- Owner: finish all pages on the Vercel address before moving to zappos.pk. New items in `pages`, each checked against the desktop app's docs: `/how-it-works` (main PC, counters, printers, cloud; four setup steps), `/offline-billing` (no internet to bill, counters bill for hours without the main PC, offline numbers and reserved invoice blocks, exactly-once sync, peer stock, licence offline, managers can't log in offline), `/multi-counter-pos` (live stock in seconds, no overselling, PIN logins, approvals, hide earnings/costs, drawer per shift), `/pos-hardware` (80/58 mm receipt printers USB or network, kitchen printers with backup, USB scanners, label sizes incl. weighing scale, drawer opened by the printer, Settings device check), `/about` (article) and `/privacy` (article: anonymous visit counts, demo form, account, what the app sends to the cloud and at setup, FBR, Vercel/Supabase, how to ask about data). Privacy text describes current practice; the owner should confirm it.
- Footer: "ZAP POS" column now links these pages; "Help" adds Our story and FAQ; bottom "Privacy" links to `/privacy` ("Terms" removed: there is no terms page). Top menu first item now `/how-it-works` (also in the published content).
- Still not written: an "All branches" page (needs the owner dashboard and the cloud sync applied in Supabase), clothing/shoe pages (need size/colour variants), a Terms page (needs the owner's terms).
- Files: `content/landing-content.json`, `components/Sections.jsx` (footer legal link), docs.

## 2026-11-23 (later night): guide articles for ranking
- Owner: "for ranking". Three guides in the `pages` key, written to answer what shop owners search and AI tools quote, without competitor names or invented numbers: `/best-pos-software-pakistan` (ten questions to ask before buying any POS, then an honest "where ZAP POS fits", naming what is still missing), `/pos-vs-register-excel`, `/billing-during-load-shedding` (power cut vs internet drop, what to put on a UPS; no claim of billing without power).
- Template: new `article` block in `InfoPage.jsx` (`article[{h, p[]}]`, readable column, CSS `.ip-article`), plus `published` date. Prerender adds an `Article` JSON-LD item for pages with an article.
- Related links now show up to 6 other pages, starting after the current one, so internal links spread across the site. Footer gets a "Guides" column (`.footer-top` 1.4fr + 5 columns).
- Found while starting the owner dashboard: the `zap_cloud` schema and `public.zap_ingest()` from the desktop repo's `cloud/0001_zap_cloud.sql` are **not applied** in Supabase, so branches don't sync to the cloud yet. Must be applied before an owner dashboard.
- Files: `components/InfoPage.jsx`, `content/landing-content.json`, `styles.css`, `scripts/prerender.mjs`, `admin/sections.js`, docs.

## 2026-11-23 (late night): shop-type pages + top menu — on branch `shop-pages` for review
- Five new pages in the `pages` key, written only from what the desktop app really does (checked against its CHANGELOG): `/pharmacy-pos` (expiry blocking ZP017, 30-day expiry list, strip/box packs, lowest allowed price, suppliers, FBR), `/restaurant-pos` (tables, takeaway, delivery, kitchen stations with backup printers, tax by payment method, cancelled orders, offline counters, after-midnight = next day), `/supermarket-pos` (live stock across counters, packs, bulk price, own barcodes and scale labels, add stock by scanning, counters sharing sales while the main PC is off), `/kiryana-store-pos` (fast billing, quick sale, low stock, shifts, supplier ledger) and `/bakery-pos` (sold by weight, expiry, packs, labels). Single-segment, keyword addresses so the existing `/:slug` rewrite serves them.
- **Not written yet, on purpose:** clothing and shoe pages. They need size/colour variants, which the app does not have yet (gap to build first).
- Footer: new "For your shop" column (`footer.groups`); `.footer-top` is now 1.6fr + 4 columns.
- Top menu (`nav`), also changed in the live published content on the owner's OK: How it works · Watch demo · FBR · Plans · Download · FAQ.
- Files: `content/landing-content.json`, `styles.css` (`.footer-top`), docs.

## 2026-11-23 (night): extra pages, batch 1 (FBR invoicing, Plans, Get ZAP POS) — on branch `seo-pages` for review
- Owner request: a multi-page site like the competitor's, with ZAP POS's own page names, built deeply for SEO. First three pages: `/fbr-invoicing` (FBR/PRA invoicing is already in the desktop app since 1.9.86; copy follows what it really does), `/plans` (the Pricing section plus "in every plan" and plan FAQ) and `/download` (installer box with version/size, what you get, four setup steps, what you need, FAQ). All text in the new `pages` content key (admin tab "Extra pages").
- One template, `components/InfoPage.jsx`, in ZAP's own look (owner: not the competitor's design): breadcrumb + h1 with the yellow squiggle, the page's facts printed on a paper receipt (`stats`), problems as taped sticky notes with a handwritten scribble, feature cards, steps as paper tickets, needs as stickers, the FAQ as a WhatsApp chat (all answers in the HTML), links to the other pages, then the home page's night section (`FinalCta`) with the page's own title and text. Each block shows only when filled.
- Routing: `main.jsx` passes `location.pathname` to `App` (`path`); an address matching a page's `slug` renders that page with the same navbar (section links go back to `/#…` on inner pages), footer, WhatsApp button and demo form.
- `scripts/prerender.mjs` now writes `dist/<slug>/index.html` for every page with its own title, description, canonical, Open Graph/Twitter text and JSON-LD (WebPage, BreadcrumbList, FAQPage), and generates `dist/sitemap.xml` (home + pages; the site address is read from the canonical in `index.html`). `public/sitemap.xml` removed. `vercel.json`: one rewrite `/:slug` → `/:slug/index.html` (admin/account/invoice/assets/media excluded).
- Footer: the old link columns and "Popular searches" chips pointed to `#` (dead links); replaced by `footer.groups` (title + links with real addresses). Removed `footer.columns`, `footer.searchesTitle`, `footer.searches`, `footer.downloadLink` and their CSS/labels. The published content still holds the old fields; they are no longer read.
- Checked in headless Chrome: dark and light, 1366 and 390 px, no console errors, no sideways scroll.
- Files: `components/InfoPage.jsx` (new), `App.jsx`, `main.jsx`, `entry-server.jsx`, `components/Sections.jsx` (Navbar `home`, Footer), `content/landing-content.json` (`pages`, `footer.groups`), `admin/sections.js`, `styles.css` ("Inner pages" block, 900/720 px rules, hover block, dark twins), `scripts/prerender.mjs`, `vercel.json`, `public/sitemap.xml` (removed), docs.

## 2026-11-23 (evening): search/share addresses pointed at the Vercel address for now
- Owner request: until `zappos.pk` answers (DNS still spreading), the canonical link, `og:url`, share image, Twitter image, JSON-LD addresses, `robots.txt` sitemap line and `sitemap.xml` use `https://zappos-web.vercel.app` so share previews work today. **Temporary:** when `zappos.pk` is live, replace that host with `https://zappos.pk` in `index.html`, `public/robots.txt` and `public/sitemap.xml` (one search-and-replace), rebuild and push, so Google only ever indexes the real domain.
- Files: `index.html`, `public/robots.txt`, `public/sitemap.xml`, docs.

## 2026-11-23 (later): SEO step 2, the landing page is pre-rendered into the HTML
- Why: the page was drawn only in the browser, so Google's first pass and AI crawlers that do not run JavaScript saw an empty page. Now `dist/index.html` already holds the whole landing page text (about 70 KB of HTML), made at build time from the **published** content (Supabase), so placeholders are not what crawlers read.
- How: `npm run build` runs `vite build`, a server build of `src/entry-server.jsx`, then `scripts/prerender.mjs` (see ARCHITECTURE §7 "SEO"). The browser hydrates the HTML (`main.jsx`), so visitors see no difference.
- Code changes for hydration: `App` takes `initialContent`; the `#demo` check and the theme button no longer read `document`/`location` while rendering.
- Tested in headless Chrome (desktop 1366 and phone 390 widths: same look, hero untouched), no console errors on first visit, with an old saved content copy, and with the light theme saved (button label correct). A change published in the admin reaches crawlers after the next deploy.
- Files: `scripts/prerender.mjs`, `src/entry-server.jsx` (new), `src/main.jsx`, `src/App.jsx`, `src/components/Sections.jsx`, `package.json` (build script), `.gitignore` (`.ssr/`), docs.

## 2026-11-22 (night, 5): `my_licence()` for the ZAP POS "Log in" page
- Owner request: an owner who already registered logs in from the ZAP POS setup instead of registering again. New function `my_licence()` (signed-in users only, not anon): the newest licence key made for the lead linked to the logged-in account, `{code, status, paid_until}`, or null. Only the owner's own key. Applied live as migration `my_licence` and added to `supabase/schema.sql` (§22). Tested with a throw-away user (null with no key, the key once made, null for another user), rolled back.
- Files: `supabase/schema.sql`, docs.

## 2026-11-22 (night, 4): leads from the ZAP POS setup (key step, "asked for a key")
- Owner request: when someone reaches the licence-key page of the ZAP POS setup, or presses "WhatsApp me for a key", the lead must show in Admin → Leads so the owner can follow up and set the status by hand. New column `leads.setup_stage` (`registered` → `at_key` → `asked_key` → `key_sent`, only ever forward) and anon RPC `setup_progress(name, phone, email, shop, stage)` (flood-limited through the `leads_limit` trigger, finds the lead by email, else mobile number, else creates it with source "ZAP POS setup", adds a dated line to Notes, never changes `status` except Lost → New when the person comes back). Making a key for a lead in Admin → Plans sets `key_sent` by itself (trigger `plan_codes_mark_sent`).
- Admin: a stage chip on each lead row ("At key step", "Asked for a key" in solid blue, "Key sent" in green), filters "Asked for a key" and "Waiting for a key", and a dashboard alert "N shops asked for a licence key" (opens that filter).
- Tested live as anon: one lead from three calls, stage only forward, `key_sent` refused from outside, anon can't read `leads`, signed-in non-admins can't call the function.
- Files: `supabase/schema.sql` (§21, also applied live as migration `setup_progress_leads`), `admin/Leads.jsx`, `admin/Dashboard.jsx`, `admin/admin.css`, docs.

## 2026-11-22 (night, 3): floating WhatsApp button
- Owner request: a WhatsApp button that stays on the right while the page scrolls. A round green button (the WhatsApp green already used by the FAQ) is fixed at the bottom-right of the landing page; on mouse devices it grows to show "Chat with us on WhatsApp" on hover. It opens the WhatsApp link in a new tab and is counted in Analytics as "WhatsApp". It stays hidden until a real WhatsApp link is set. Works in light and dark, 390 px (smaller, 14 px from the edge), no sideways scroll.
- Content key `whatsappButton.label` (Admin → Links, last field; an empty label hides the button).
- Files: `components/WhatsAppFloat.jsx` (new), `App.jsx`, `content/landing-content.json`, `styles.css` ("WhatsApp floating button" block, 720 px rule, label grow in the hover block), `admin/sections.js`.

## 2026-11-22 (night, 2): WhatsApp link set on the live site
- Owner request: the site's WhatsApp buttons (FAQ, footer, demo form, `/account/` "Pay or renew") pointed to `#`. The published content's `links.whatsapp` is now `https://wa.me/923390035603?text=…` (the owner's number already shown as `brand.phone`, with a short Roman Urdu starter message). Changed directly in the published `site_content` row, not in code; the built-in default in `landing-content.json` stays a placeholder. To change it later: Admin → Links → "WhatsApp link" → Publish.

## 2026-11-22 (night): demo video section on the landing page
- New section **"See ZAP POS in one minute"** (`#video`, menu item "Watch demo") between "A day at the counter" and the multi-counter demo. A 16:9 frame shows the poster with a yellow play button; tapping it plays the 62-second demo (real ZAP POS screens in the new clean look, music, English/Roman Urdu captions, ZAPPOS.pk at the end). The video file is only downloaded after the tap. Under it: three tick chips and a "Book a free demo" button. Works in light and dark, no sideways scroll at 390 px.
- Content in the new `video` key (admin tab "Demo video"); `src` empty hides the section. Files: `public/media/zap-pos-demo.mp4` (1280x720, about 5.4 MB, H.264 + AAC, faststart) and `zap-pos-demo-poster.jpg`. No voiceover yet; when one exists, make a new mp4 and replace the file.
- Analytics: clicks on play are counted as "Played the demo video" (`demo-video-play`).
- Files: `components/DemoVideo.jsx` (new), `components/Icons.jsx` (`play`), `App.jsx`, `content/landing-content.json` (`video`, nav "Watch demo"), `styles.css` ("Demo video" block, 720 px rules, hover scale in the hover block), `admin/sections.js`, `admin/Analytics.jsx`, `public/media/*`.

## 2026-11-22 (later): publishing a release no longer fails with "row-level security policy"
- Uploading a release part failed ("Upload failed: new row violates row-level security policy"): the admin page uploads with `upsert`, and Supabase then also needs a SELECT rule on `storage.objects`; only insert and update existed for the `releases` bucket. Added the admin-only policy "Admins read releases" (the bucket stays public for downloads). Applied to the live project (migration `releases_admin_select_policy`) and added to `supabase/schema.sql` section 12.
- Also found: the Edge Function secret `PLAN_SIGNING_KEY` had never been set (Releases and Plans both need it); the owner added it from `ZAP-plan-signing-key.txt`.

## 2026-11-22: put a version on the website from the admin panel
- **Releases now also updates the website's Download button.** Publishing a version for all shops has a switch "Also put it on the website's Download button" (on by default; hidden for a one-shop trial). A new "Website download" card shows the version the site offers (read from GitHub), the newest version for all shops, and a "Put x.y.z on the website" button when they differ. No more GitHub web page: the admin does it.
- How: the edge function `publish-installer` (signed-in admins only, `verify_jwt`) checks the version is published to every shop, then starts the GitHub workflow `.github/workflows/publish-installer.yml` with the version, SHA-256 and the public storage folder. The workflow downloads the uploaded 40 MB parts from the public `releases` bucket (the folder must be ZAP's own project), joins them, checks the SHA-256, and publishes a GitHub release `vX.Y.Z` titled "ZapPos Setup" with `ZAP-POS-Setup.exe` (marked latest), which `lib/release.js` and the buttons already serve. No big upload passes through an edge function.
- One-time setup (needed before the first use): a fine-grained GitHub token for the ZAP-POS repository only, permission "Actions: Read and write", saved as the Supabase Edge Function secret `GITHUB_DISPATCH_TOKEN`. The token never reaches the browser. Without it the button says so.
- Files: `src/admin/Releases.jsx`, `supabase/functions/publish-installer/index.ts`, `.github/workflows/publish-installer.yml`.

## 2026-11-21 (night, 2): the button goes back to normal when the person comes back
- A page is never told that a download finished, was cancelled or paused, so "Downloading…" now ends as soon as the person returns to the page (window focus, a tap or a key press, after a 1.5 s grace so the download box opening does not count), and at the latest after 25 s. Files: `components/DownloadLink.jsx`.

## 2026-11-21 (night): "Starting download…" then "Downloading…"
- The Download buttons now go Starting download… (spinner) → Downloading… (download icon) → back to normal after 25 s. A web page is never told when a browser really starts a download (GitHub's server does not allow the page to watch it), so "Downloading…" appears as soon as the browser reacts (the page loses focus when the download box or save window opens) or after 5 seconds, whichever comes first. It is a best guess, not a measured progress.
- Files: `components/DownloadLink.jsx` (props `startText`, `doneText`), `components/Sections.jsx`.

## 2026-11-21 (evening): Download buttons say "Starting download…"
- GitHub sends the browser on to its download server first, so the "save" box can take a few seconds to appear and the page looked frozen. The buttons now show a small spinner and "Starting download…" for 12 seconds after a tap (new `components/DownloadLink.jsx`, used by navbar, hero, final call-to-action and `/account/`). The file still comes from GitHub; the wait itself cannot be shortened. Light and dark, 1366 and 390 px, no sideways scroll; spinner stops moving with reduced-motion.
- Files: `components/DownloadLink.jsx` (new), `Hero.jsx`, `Sections.jsx`, `account/AccountApp.jsx`, `styles.css` (`.dl-spin`).

## 2026-11-21 (later): every Download button works even without the GitHub lookup
- All four Windows download buttons (navbar, hero, final call-to-action, `/account/`) plus the footer "Download" link now always have a working address: the release's exact file when GitHub answers, otherwise GitHub's `releases/latest/download/ZAP-POS-Setup.exe` for `links.githubRepo`. Before, a blocked or rate-limited lookup (many shops share one internet address) left the buttons on `#`. The version line still shows only when the lookup works. A link typed in the admin still wins.
- New `footer.downloadLink` (the footer link text that downloads; default "Download"). Keep the release file named `ZAP-POS-Setup.exe`.
- Files: `lib/release.js` (`installerLink`), `components/Sections.jsx` (Footer), `content/landing-content.json`, `admin/sections.js`.

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
