import { renderToString } from 'react-dom/server'
import App from './App.jsx'
import { defaultContent } from './lib/defaults.js'
import { mergeContent } from './lib/content.js'

// Used only at build time by scripts/prerender.mjs: merges the published content over the built-in defaults (like the
// browser does), then draws any page of the site to HTML. `content(published)` once, `render(content, path)` per page.
export const content = (published) => mergeContent(defaultContent, published)
export const render = (merged, path) => renderToString(<App initialContent={merged} path={path} />)
