import { SUPABASE_URL, SUPABASE_ANON_KEY, supabaseConfigured } from './content.js'

// Anonymous visit/click counts for the admin Analytics page.
// No cookies and nothing personal: a random id kept in this browser, the device type,
// the site the visitor came from and the ad campaign (utm_ tags), if any.
// Not sent in `npm run dev`, from bots, with Do Not Track on, or from a browser where
// the admin has signed in (the admin sets `zap-no-track`, so your own visits don't count).

const store = {
  get: (k) => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k, v) => { try { localStorage.setItem(k, v) } catch { /* storage unavailable */ } },
}

export const NO_TRACK_KEY = 'zap-no-track'

const enabled = () =>
  supabaseConfigured && !import.meta.env.DEV && !store.get(NO_TRACK_KEY) &&
  navigator.doNotTrack !== '1' && !/bot|crawl|spider|slurp|headless|lighthouse/i.test(navigator.userAgent)

const visitorId = () => {
  let id = store.get('zap-vid')
  if (!id) { id = crypto.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`; store.set('zap-vid', id) }
  return id
}

const device = () => {
  const ua = navigator.userAgent
  if (/iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobi/i.test(ua))) return 'tablet'
  return /Mobi|iPhone|Android/i.test(ua) ? 'mobile' : 'desktop'
}

const referrer = () => {
  try {
    const host = new URL(document.referrer).hostname.replace(/^www\./, '')
    return host && host !== location.hostname.replace(/^www\./, '') ? host.slice(0, 120) : null
  } catch { return null }
}

const campaign = () => {
  const q = new URLSearchParams(location.search)
  const parts = [q.get('utm_source'), q.get('utm_campaign')].filter(Boolean)
  return parts.length ? parts.join(' / ').slice(0, 80) : null
}

function send(type, name = null, extra = {}) {
  if (!enabled()) return
  fetch(`${SUPABASE_URL}/rest/v1/events`, {
    method: 'POST',
    keepalive: true, // still delivered when the click navigates away
    headers: {
      apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json', Prefer: 'return=minimal',
    },
    body: JSON.stringify({ type, name, visitor: visitorId(), device: device(), ...extra }),
  }).catch(() => { /* analytics must never break the page */ })
}

export const trackVisit = () => send('visit', null, { referrer: referrer(), campaign: campaign() })
export const trackClick = (name) => send('click', String(name).slice(0, 40))

const viewed = new Set()
export const trackView = (name) => { if (!viewed.has(name)) { viewed.add(name); send('view', name) } }

// Where a lead came from, saved with the demo request: ad campaign, else referring site, else "Website".
export const leadSource = () => campaign() ?? referrer() ?? 'Website'
