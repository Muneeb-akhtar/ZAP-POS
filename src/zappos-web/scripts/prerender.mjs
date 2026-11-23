// Runs after `vite build` and the server build (see "build" in package.json). Puts the landing page's real HTML
// into dist/index.html so search engines and AI crawlers that do not run JavaScript still read the page text.
// The published content is fetched from Supabase (same public read the browser does); if that is not possible the
// built-in content is used and a warning is printed.
import { readFile, writeFile, rm } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { loadEnv } from 'vite'

const root = fileURLToPath(new URL('..', import.meta.url))
const env = { ...loadEnv('production', root, 'VITE_'), ...process.env }
const url = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_ANON_KEY

async function published() {
  if (!url || !key) { console.warn('prerender: no Supabase settings, using the built-in content'); return null }
  try {
    const res = await fetch(`${url}/rest/v1/site_content?id=eq.landing&select=data`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) throw new Error(`Supabase answered ${res.status}`)
    return (await res.json())[0]?.data ?? null
  } catch (e) {
    console.warn(`prerender: could not read the published content (${e.message}), using the built-in content`)
    return null
  }
}

const { render } = await import(pathToFileURL(resolve(root, '.ssr/entry-server.js')).href)
const { html, content } = render(await published())

const file = resolve(root, 'dist/index.html')
const page = await readFile(file, 'utf8')
if (!page.includes('<div id="root"></div>')) throw new Error('prerender: <div id="root"></div> not found in dist/index.html')
// "<" and the two line-separator characters are escaped so the content can never end the script tag early.
const json = JSON.stringify(content).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
await writeFile(file, page.replace('<div id="root"></div>', `<div id="root">${html}</div>\n    <script id="zap-content" type="application/json">${json}</script>`))
await rm(resolve(root, '.ssr'), { recursive: true, force: true })
console.log(`prerender: dist/index.html now holds ${html.length} characters of page HTML`)
