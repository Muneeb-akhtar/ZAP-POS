import defaults from '../content/landing-content.json'

// Supabase settings come from env vars (.env.local in dev, Vercel → Environment Variables in production).
// The anon key is public by design; Row Level Security in supabase/schema.sql decides who can write.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? ''
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

export const CONTENT_ID = 'landing'
export const defaultContent = defaults

// Stored content is merged over the built-in defaults, so fields added to the site later
// still have a value even if the saved copy is older. Objects merge key by key; arrays and
// plain values from the saved copy win as a whole.
export function mergeContent(base, saved) {
  if (saved === undefined || saved === null) return base
  if (Array.isArray(base) || Array.isArray(saved)) return saved
  if (typeof base === 'object' && base !== null && typeof saved === 'object') {
    const out = { ...base }
    for (const k of Object.keys(saved)) out[k] = mergeContent(base[k], saved[k])
    return out
  }
  return saved
}

// Landing page: one lightweight REST call (no Supabase SDK in the public bundle).
export async function fetchPublishedContent() {
  if (!supabaseConfigured) return null
  const res = await fetch(`${SUPABASE_URL}/rest/v1/site_content?id=eq.${CONTENT_ID}&select=data`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  })
  if (!res.ok) throw new Error(`Supabase ${res.status}`)
  const rows = await res.json()
  return rows[0]?.data ?? null
}

// Visitors' browsers keep the last published content so returning visitors see it instantly.
const CACHE_KEY = 'zap-content'
export const readCachedContent = () => {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)) } catch { return null }
}
export const writeCachedContent = (data) => {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)) } catch { /* storage unavailable */ }
}
