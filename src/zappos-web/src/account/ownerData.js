import { rs } from '../admin/biz.js'

// Small helpers shared by the owner console's desktop layout (OwnerConsole.jsx) and phone layout (PhoneConsole.jsx).
export const fill = (text, vals) => text.replace(/\{(\w+)\}/g, (_, k) => vals[k] ?? '')
export const ONLINE_MS = 10 * 60 * 1000
export const pkDay = (d = new Date()) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' })
export const addDays = (day, n) => { const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
export const shortL = (n) => (n >= 1e5 ? `Rs ${(n / 1e5).toFixed(n >= 1e6 ? 0 : 1)}L` : rs(n))   // lakh, as shops say it
export const isOnline = (b) => b.lastSeen && Date.now() - new Date(b.lastSeen).getTime() < ONLINE_MS
export const qty = (n) => Number(n).toLocaleString('en-PK', { maximumFractionDigits: 3 })
export const greet = (o) => { const h = Number(new Date().toLocaleString('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Karachi' })); return h < 12 ? o.morning : h < 17 ? o.afternoon : o.evening }
export const clock = (ms) => new Date(ms).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Karachi' }).replace(' ', ' ')
export const OWNER_CACHE = 'zap-owner-cache'   // last figures loaded on this phone (OwnerConsole), removed on sign-out (AccountApp)
