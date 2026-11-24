// ZAP POS owner console: makes /account/ installable and opens the page shell fast.
// It stores only the app's own files (page + /assets). Sales, plan and invoices come from Supabase,
// which is a different origin and is never cached here, so no business data is kept on the phone.
const CACHE = 'zap-account-v2'
// On install, save the page and the script/style files it names, so the app opens even the first time it's offline.
const precache = async () => {
  const c = await caches.open(CACHE)
  const res = await fetch('/account/', { cache: 'reload' })
  const html = await res.clone().text()
  await c.put('/account/', res)
  await c.addAll([...new Set(html.match(/\/assets\/[^"'\s>]+/g) ?? [])])
}
self.addEventListener('install', (e) => { e.waitUntil(precache().then(() => self.skipWaiting())) })
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
})
self.addEventListener('fetch', (e) => {
  const r = e.request
  const u = new URL(r.url)
  if (r.method !== 'GET' || u.origin !== location.origin) return
  if (r.mode === 'navigate' && u.pathname.startsWith('/account')) {
    // Newest page when online; the saved shell when the phone has no internet.
    e.respondWith(fetch(r).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('/account/', copy)); return res }).catch(() => caches.match('/account/')))
    return
  }
  if (u.pathname.startsWith('/assets/')) {
    // Built files have a hash in their name, so a cached copy is never stale.
    e.respondWith(caches.match(r).then((hit) => hit || fetch(r).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(r, copy)); return res })))
  }
})
