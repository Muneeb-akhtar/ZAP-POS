---
description: Update landing page content (text, prices, links, reviews, contact details)
---
Update the landing page content: $ARGUMENTS

- The live site's content is edited by the owner in the admin panel (`/admin/`, stored in Supabase). This command changes the **built-in defaults**: edit only `src/zappos-web/src/content/landing-content.json` unless the change truly needs code. Remind the owner that if the field/array was already published, they must change it in the admin too (published content wins).
- New fields: add a friendly label/hint in `src/zappos-web/src/admin/sections.js` if the auto label isn't clear.
- Keep the JSON shape documented in `docs/ARCHITECTURE.md` §4 (the admin panel and the Supabase row rely on it).
- Prices are numbers in PKR (`monthly`, `annual`); `monthly: null` + `priceLabel` for custom plans.
- When real data replaces a placeholder, remove the placeholder wording, and remove the `_note` once nothing is a placeholder anymore.
- Run `npm run build` to confirm the JSON is valid.
- Add a `docs/CHANGELOG.md` entry (and update `docs/ARCHITECTURE.md` §4 if the JSON shape changed), then summarize what changed.
