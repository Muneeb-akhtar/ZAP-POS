import { renderToString } from 'react-dom/server'
import App from './App.jsx'
import { defaultContent, mergeContent } from './lib/content.js'

// Used only at build time by scripts/prerender.mjs: draws the landing page to HTML with the published content
// (merged over the built-in defaults, like the browser does) and hands back the content it used.
export function render(published) {
  const content = mergeContent(defaultContent, published)
  return { html: renderToString(<App initialContent={content} />), content }
}
