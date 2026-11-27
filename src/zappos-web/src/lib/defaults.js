// The built-in site text (landing-content.json) as one object. Imported by admin, account, invoice and the build step,
// never by the public pages: those get their text from the content snapshot in the built HTML (see scripts/prerender.mjs)
// and, in `npm run dev`, from main.jsx, which loads this file on demand.
import defaults from '../content/landing-content.json'

export const defaultContent = defaults
