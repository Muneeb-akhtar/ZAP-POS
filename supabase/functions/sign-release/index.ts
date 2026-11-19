// sign-release: the admin panel calls this when you upload a new ZAP POS version (Releases page).
// Signs "ZAPREL1|<version>|<sha256 of ZapPos.exe>" with ZAP's secret key (Edge Function secret PLAN_SIGNING_KEY,
// the same key as plan codes). ZAP POS installs an update only when the file's SHA-256 and this signature match
// the public key built into it, so nobody else can push a program to the shops. Signed-in admins only.
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return reply(405, { error: 'Use POST.' })
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: isAdmin } = await db.rpc('is_admin')
  if (isAdmin !== true) return reply(403, { error: 'Only ZAP admins can publish versions. Sign in to the admin panel again.' })
  const secret = Deno.env.get('PLAN_SIGNING_KEY')
  if (!secret) return reply(500, { error: 'The signing key is not set up yet (Edge Function secret PLAN_SIGNING_KEY).' })

  let body: { version?: string; sha256?: string }
  try { body = await req.json() } catch { return reply(400, { error: 'Send the version and the file\'s SHA-256.' }) }
  const version = (body.version ?? '').trim()
  const sha = (body.sha256 ?? '').trim().toLowerCase()
  if (!/^\d+\.\d+\.\d+$/.test(version)) return reply(400, { error: 'Version must look like 1.9.80.' })
  if (!/^[0-9a-f]{64}$/.test(sha)) return reply(400, { error: 'The file\'s SHA-256 is missing.' })

  try {
    const der = Uint8Array.from(atob(secret.trim()), (c) => c.charCodeAt(0))
    const key = await crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
    const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(`ZAPREL1|${version}|${sha}`)))
    return reply(200, { signature: btoa(String.fromCharCode(...sig)) })
  } catch (e) {
    return reply(500, { error: `Couldn't sign: ${(e as Error).message}` })
  }
})
