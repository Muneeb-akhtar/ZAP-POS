// Runs after `vite build` and the server build (see "build" in package.json). Writes real HTML for the home page
// (dist/index.html) and for every inner page in the `pages` content key (dist/<slug>/index.html, each with its own
// title, description, canonical, share tags and structured data), then writes dist/sitemap.xml. Search engines and
// AI crawlers that do not run JavaScript then still read every page's text.
// The published content is fetched from Supabase (same public read the browser does); if that is not possible the
// built-in content is used and a warning is printed.
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
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

const { content, render } = await import(pathToFileURL(resolve(root, '.ssr/entry-server.js')).href)
const merged = content(await published())

const template = await readFile(resolve(root, 'dist/index.html'), 'utf8')
if (!template.includes('<div id="root"></div>')) throw new Error('prerender: <div id="root"></div> not found in dist/index.html')
// The site address comes from the home page's canonical link in index.html, so it is changed in one place only.
const site = template.match(/<link rel="canonical" href="(https:\/\/[^"]+?)\/?"/)?.[1]
if (!site) throw new Error('prerender: canonical link not found in index.html')

// "<" and the two line-separator characters are escaped so JSON can never end its script tag early.
const json = (v) => JSON.stringify(v).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
const attr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
const fill = (page, html) => page.replace('<div id="root"></div>',
  `<div id="root">${html}</div>\n    <script id="zap-content" type="application/json">${json(merged)}</script>`)

// Home page
await writeFile(resolve(root, 'dist/index.html'), fill(template, render(merged, '/')))

// Inner pages: same shell, own head tags.
const swap = (html, re, value) => {
  if (!re.test(html)) throw new Error(`prerender: ${re} not found in index.html`)
  return html.replace(re, (m, a, b) => `${a}${attr(value)}${b}`)
}
for (const p of merged.pages.items) {
  const address = `${site}/${p.slug}`
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', '@id': `${address}#page`, url: address, name: p.seoTitle, description: p.seoDescription, isPartOf: { '@id': `${site}/#website` } },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${site}/` },
        { '@type': 'ListItem', position: 2, name: p.menu, item: address },
      ] },
      ...(p.article?.length ? [{ '@type': 'Article', headline: p.seoTitle, description: p.seoDescription, mainEntityOfPage: { '@id': `${address}#page` }, author: { '@id': `${site}/#organization` }, publisher: { '@id': `${site}/#organization` }, ...(p.published ? { datePublished: p.published } : {}) }] : []),
      ...(p.faq?.length ? [{ '@type': 'FAQPage', mainEntity: p.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }] : []),
    ],
  }
  let html = template
  if (p.lang) html = html.replace('<html lang="en">', `<html lang="${attr(p.lang)}">`)
  html = swap(html, /(<title>)[^<]*(<\/title>)/, p.seoTitle)
  html = swap(html, /(<meta name="description" content=")[^"]*(")/, p.seoDescription)
  html = swap(html, /(<link rel="canonical" href=")[^"]*(")/, address)
  html = swap(html, /(<meta property="og:url" content=")[^"]*(")/, address)
  html = swap(html, /(<meta property="og:title" content=")[^"]*(")/, p.seoTitle)
  html = swap(html, /(<meta property="og:description" content=")[^"]*(")/, p.seoDescription)
  html = swap(html, /(<meta name="twitter:title" content=")[^"]*(")/, p.seoTitle)
  html = swap(html, /(<meta name="twitter:description" content=")[^"]*(")/, p.seoDescription)
  // A page marked noindex gets "noindex, follow" in place of the site-wide robots tag (never two conflicting tags).
  if (p.noindex) html = html.replace(/<meta name="robots" content="[^"]*" \/>/, '<meta name="robots" content="noindex, follow" />')
  // Own share image when scripts/make-og-images.py has made one for this page; otherwise the site-wide one stays.
  if (existsSync(resolve(root, `public/og/${p.slug}.jpg`))) {
    html = swap(html, /(<meta property="og:image" content=")[^"]*(")/, `${site}/og/${p.slug}.jpg`)
    html = swap(html, /(<meta name="twitter:image" content=")[^"]*(")/, `${site}/og/${p.slug}.jpg`)
    html = swap(html, /(<meta property="og:image:alt" content=")[^"]*(")/, p.seoTitle)
  }
  html = html.replace('</head>', `  <script type="application/ld+json">${json(ld)}</script>\n  </head>`)
  await mkdir(resolve(root, `dist/${p.slug}`), { recursive: true })
  await writeFile(resolve(root, `dist/${p.slug}/index.html`), fill(html, render(merged, `/${p.slug}`)))
}

// 404 page. Vercel serves dist/404.html (with a 404 status) for any address that is not a page. It is plain HTML with
// the site's own styles and no script bundle, so it never tries to draw the home page at a wrong address.
{
  const label = (slug) => merged.pages.items.find((p) => p.slug === slug)?.menu
  const links = ['plans', 'download', 'fbr-invoicing', 'offline-billing', 'best-pos-software-pakistan', 'pharmacy-pos', 'restaurant-pos', 'supermarket-pos', 'pos-software-lahore']
    .filter(label).map((s) => [`/${s}`, label(s)])
  let html = template
    .replace(/\s*<script type="module"[^>]*><\/script>/, '')
    .replace(/\s*<link rel="modulepreload"[^>]*>/g, '')
    .replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '')
    .replace(/\s*<!-- Structured data[\s\S]*?-->/, '')
    .replace(/\s*<link rel="canonical"[^>]*>/, '')
    .replace(/\s*<meta (?:property="og:|name="twitter:)[^>]*>/g, '')
    .replace('<meta name="robots" content="index, follow, max-image-preview:large" />', '<meta name="robots" content="noindex, follow" />')
  html = swap(html, /(<title>)[^<]*(<\/title>)/, `Page not found | ${merged.brand.name}`)
  html = swap(html, /(<meta name="description" content=")[^"]*(")/, 'This page was not found. Go to the ZAP POS home page or pick one of the main pages.')
  const body = `<main class="nf"><a class="nf-brand" href="/">${attr(merged.brand.name)}</a><p class="nf-code" aria-hidden="true">404</p><h1>That page is not here.</h1><p class="nf-text">The address may be mistyped, or the page may have moved. These pages will get you going again.</p><a class="btn btn-primary" href="/">Go to the home page</a><ul class="nf-links">${links.map(([h, t]) => `<li><a href="${h}">${attr(t)}</a></li>`).join('')}</ul></main>`
  await writeFile(resolve(root, 'dist/404.html'), html.replace('<div id="root"></div>', `<div id="root">${body}</div>`))
}

// Sitemap: home + every inner page.
const indexed = merged.pages.items.filter((p) => !p.noindex)
// lastmod only where the page carries a real publish date; a made-up date would teach Google to ignore the field.
const lastmod = new Map(indexed.filter((p) => p.published).map((p) => [`${site}/${p.slug}`, p.published]))
const urls = [`${site}/`, ...indexed.map((p) => `${site}/${p.slug}`)]
await writeFile(resolve(root, 'dist/sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc>${lastmod.get(u) ? `<lastmod>${lastmod.get(u)}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`)

// llms.txt: a plain guide to the site for AI tools (the llms.txt convention), built from the same page list.
const facts = merged.pages.items.find((p) => p.slug === 'zap-pos-facts')
const llms = [
  `# ${merged.brand.name}`,
  '',
  `> ${facts?.shortAnswer ?? merged.brand.about}`,
  '',
  ...(facts?.article ?? []).flatMap((s) => [`## ${s.h}`, '', ...s.p, '']),
  '## Pages',
  '',
  `- [Home](${site}/): ${merged.brand.about}`,
  ...indexed.map((p) => `- [${p.menu}](${site}/${p.slug}): ${p.seoDescription}`),
  '',
].join('\n')
await writeFile(resolve(root, 'dist/llms.txt'), llms)

await rm(resolve(root, '.ssr'), { recursive: true, force: true })
console.log(`prerender: home + ${merged.pages.items.length} pages written, sitemap has ${urls.length} addresses (${site})`)
