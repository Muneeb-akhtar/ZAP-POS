---
description: Add a new section to the landing page following the project conventions
---
Add a new landing page section: $ARGUMENTS

Follow `docs/ARCHITECTURE.md` §6 exactly:
1. Put all visible text in `src/zappos-web/src/content/landing-content.json` (new top-level key). Never invent real reviews, prices or phone numbers; mark placeholders clearly.
2. Create `src/zappos-web/src/components/<Name>.jsx` (default export, data via props), reusing `Kicker`, `Scribble`, `Icon`, etc. from `Bits.jsx` / `Icons.jsx`.
3. Render it in `App.jsx` at the right position; add an `id` and a `nav` entry if it should be linkable.
4. Add a CSS block in section order in `styles.css`, using the existing tokens (`--brand-*`, `--yellow`, `--night`, fonts). Add responsive rules in the existing breakpoints and hover effects only inside the hover media block at the end.
5. Tag its main buttons with `data-track="name"` if clicks should show in Analytics (add the label to `CLICK_LABELS` in `admin/Analytics.jsx`). Verify at desktop and 390px widths with no horizontal scroll; run `npm run build`.
6. Add the new top-level key to a section in `src/zappos-web/src/admin/sections.js` (`SECTIONS`, with labels/hints as needed) so it gets its own admin tab instead of "Other".
7. Update `docs/ARCHITECTURE.md` §3 and §4 and add a `docs/CHANGELOG.md` entry.
