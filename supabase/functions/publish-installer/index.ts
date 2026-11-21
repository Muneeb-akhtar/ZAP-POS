// publish-installer: the admin panel calls this (Releases -> "Put on the website") to put a published ZAP POS version
// on the website's Download buttons. It starts the GitHub workflow .github/workflows/publish-installer.yml, which
// downloads the uploaded parts, checks the SHA-256 and publishes a GitHub release with ZAP-POS-Setup.exe.
// Needs the Edge Function secret GITHUB_DISPATCH_TOKEN (a fine-grained GitHub token for the ZAP-POS repo only, with
// "Actions: Read and write"). The token never leaves this function. Signed-in admins only.
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
  if (isAdmin !== true) return reply(403, { error: 'Only ZAP admins can update the website download. Sign in to the admin panel again.' })
  const token = Deno.env.get('GITHUB_DISPATCH_TOKEN')
  if (!token) return reply(500, { error: 'The website link to GitHub is not set up yet. Add the Edge Function secret GITHUB_DISPATCH_TOKEN (see the Releases page note).' })

  let body: { version?: string }
  try { body = await req.json() } catch { return reply(400, { error: 'Send the version.' }) }
  const version = (body.version ?? '').trim()
  if (!/^\d+\.\d+\.\d+$/.test(version)) return reply(400, { error: 'Version must look like 1.9.80.' })

  // only a version that is published to every shop goes on the website (a one-shop trial must not)
  const { data: row, error } = await db.from('releases').select('version, sha256, parts, notes, target_branch, published').eq('version', version).maybeSingle()
  if (error || !row) return reply(404, { error: `Version ${version} has not been published in Releases yet.` })
  if (!row.published) return reply(400, { error: `Version ${version} is stopped. Publish it again first.` })
  if (row.target_branch) return reply(400, { error: `Version ${version} was sent to one shop only. Publish it to all shops before putting it on the website.` })
  if (!Array.isArray(row.parts) || row.parts.length === 0) return reply(400, { error: 'This version has no uploaded file.' })

  const repo = Deno.env.get('GITHUB_REPO') ?? 'Muneeb-akhtar/ZAP-POS'
  const res = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/publish-installer.yml/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'zap-pos-admin',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ref: 'main',
      inputs: {
        version,
        sha256: row.sha256,
        base: `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/releases/${version}`,
        parts: String(row.parts.length),
        notes: (row.notes ?? '').slice(0, 1500),
      },
    }),
  })
  if (res.status === 204) return reply(200, { started: true })
  const why: Record<number, string> = {
    401: 'GitHub did not accept the token. It may have expired: make a new one and replace GITHUB_DISPATCH_TOKEN.',
    403: 'The GitHub token is not allowed to start workflows. It needs "Actions: Read and write" on the ZAP-POS repository.',
    404: 'GitHub could not find the workflow or the repository for this token. Check the token is for the ZAP-POS repository with "Actions: Read and write", and that publish-installer.yml is on the main branch.',
    422: 'GitHub refused the request (the workflow may not be on the main branch yet).',
  }
  return reply(502, { error: why[res.status] ?? `GitHub answered ${res.status}.` })
})
