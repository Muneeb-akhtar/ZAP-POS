---
description: Update landing page content (text, prices, links, reviews, contact details)
---
Update the landing page content: $ARGUMENTS

- Edit only `src/zappos-web/src/content/landing-content.json` unless the change truly needs code.
- Keep the JSON shape documented in `docs/ARCHITECTURE.md` §4 (the API and the future admin panel rely on it).
- Prices are numbers in PKR (`monthly`, `annual`); `monthly: null` + `priceLabel` for custom plans.
- When real data replaces a placeholder, remove the placeholder wording, and remove the `_note` once nothing is a placeholder anymore.
- Run `npm run build` to confirm the JSON is valid.
- Add a `docs/CHANGELOG.md` entry (and update `docs/ARCHITECTURE.md` §4 if the JSON shape changed), then summarize what changed.
