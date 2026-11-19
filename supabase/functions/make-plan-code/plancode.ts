// ZAP plan code: the exact format ZAP POS reads (src/Zap.Core/PlanCode.cs in the ZAP-POS-Desktop-App repo).
// Keep the two in step. Bytes: version 1, branch length, branch (ASCII), counters, paid-until as days since
// 1 Jan 2020 (2 bytes), issued at as minutes since 1970 (4 bytes), then a 64-byte ECDSA P-256 / SHA-256 signature.
// Written as "ZAP1-" plus groups of 5 Crockford base32 characters.

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const DAY_ZERO = Date.UTC(2020, 0, 1)

function base32(bytes: Uint8Array): string {
  let out = '', buffer = 0, bits = 0
  for (const b of bytes) {
    buffer = ((buffer << 8) | b) & 0xffff; bits += 8
    while (bits >= 5) { out += ALPHABET[(buffer >> (bits - 5)) & 31]; bits -= 5 }
  }
  if (bits > 0) out += ALPHABET[(buffer << (5 - bits)) & 31]
  return out
}

export function payload(branchCode: string, counters: number, paidUntil: string, issuedAt: Date): Uint8Array {
  const branch = new TextEncoder().encode(branchCode.trim().toUpperCase())
  if (branch.length < 1 || branch.length > 20) throw new Error('Branch code must be 1 to 20 letters.')
  if (!Number.isInteger(counters) || counters < 1 || counters > 50) throw new Error('Counters must be 1 to 50.')
  const [y, m, d] = paidUntil.split('-').map(Number)
  const days = Math.round((Date.UTC(y, m - 1, d) - DAY_ZERO) / 864e5)
  if (!(days >= 0 && days <= 0xffff)) throw new Error('Paid-until date is out of range.')
  const b = new Uint8Array(2 + branch.length + 1 + 2 + 4)
  const v = new DataView(b.buffer)
  b[0] = 1; b[1] = branch.length; b.set(branch, 2)
  const p = 2 + branch.length
  b[p] = counters
  v.setUint16(p + 1, days)
  v.setUint32(p + 3, Math.floor(issuedAt.getTime() / 60000))
  return b
}

export async function importKey(pkcs8Base64: string): Promise<CryptoKey> {
  const der = Uint8Array.from(atob(pkcs8Base64.trim()), (c) => c.charCodeAt(0))
  return await crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
}

export async function makeCode(key: CryptoKey, branchCode: string, counters: number, paidUntil: string, issuedAt = new Date()): Promise<string> {
  const data = payload(branchCode, counters, paidUntil, issuedAt)
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, data)) // raw r||s, 64 bytes
  const all = new Uint8Array(data.length + sig.length)
  all.set(data); all.set(sig, data.length)
  const text = base32(all)
  return 'ZAP1-' + (text.match(/.{1,5}/g) ?? []).join('-')
}
