// make-plan-code: the admin panel calls this to make a shop's licence key (Plans → New licence key, or Customers → Plan code).
// A new key replaces the shop's old one (trigger plan_codes_replace).
// Only signed-in admins (public.admins) may use it. The secret signing key lives only in the Edge Function
// secret PLAN_SIGNING_KEY (base64 PKCS#8, ECDSA P-256); ZAP POS checks codes with the matching public key.
// Every code made is recorded in public.plan_codes (as the admin, so RLS applies), and the shop's ZAP POS
// branch code is remembered on the lead.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { importKey, makeCode } from './plancode.ts'

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
  const { data: isAdmin, error: adminError } = await db.rpc('is_admin')
  if (adminError || isAdmin !== true) return reply(403, { error: 'Only ZAP admins can make plan codes. Sign in to the admin panel again.' })

  const secret = Deno.env.get('PLAN_SIGNING_KEY')
  if (!secret) return reply(500, { error: 'The signing key is not set up yet (Edge Function secret PLAN_SIGNING_KEY).' })

  let body: { lead_id?: string; branch_code?: string; counters?: number; paid_until?: string; starts_on?: string }
  try { body = await req.json() } catch { return reply(400, { error: 'Send the customer, shop code, counters and paid-until date.' }) }
  const branch = (body.branch_code ?? '').trim().toUpperCase()
  const counters = Number(body.counters)
  const paidUntil = (body.paid_until ?? '').slice(0, 10)
  const startsOn = (body.starts_on ?? '').slice(0, 10) || null
  if (!body.lead_id) return reply(400, { error: 'Choose the customer.' })
  if (!/^[A-Z0-9]{2,20}$/.test(branch)) return reply(400, { error: 'Shop code: 2 to 20 letters or digits, as shown in their ZAP POS (Settings → Plan).' })
  if (!Number.isInteger(counters) || counters < 1 || counters > 50) return reply(400, { error: 'Counters must be a whole number from 1 to 50.' })
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidUntil)) return reply(400, { error: 'Choose the paid-until date.' })
  if (startsOn && (!/^\d{4}-\d{2}-\d{2}$/.test(startsOn) || startsOn >= paidUntil)) return reply(400, { error: 'The key must end after it starts.' })

  let code: string
  try { code = await makeCode(await importKey(secret), branch, counters, paidUntil) }
  catch (e) { return reply(500, { error: `Couldn't sign the code: ${(e as Error).message}` }) }

  const { error: saveError } = await db.from('plan_codes').insert({ lead_id: body.lead_id, branch_code: branch, counters, paid_until: paidUntil, starts_on: startsOn, code })
  if (saveError) return reply(400, { error: `Couldn't record the code: ${saveError.message}` })
  await db.from('leads').update({ pos_branch_code: branch }).eq('id', body.lead_id)

  return reply(200, { code, branch_code: branch, counters, paid_until: paidUntil })
})
