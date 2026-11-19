import { useEffect, useMemo, useState } from 'react'
import Icon from '../components/Icons.jsx'
import { dateFmt, supabase, timeAgo } from './biz.js'
import { Card, ConfirmButton, Field, PageBar, useNotify, TableFoot } from './ui.jsx'

// Releases: put a new ZAP POS version out to the shops. Upload ZapPos.exe once; each shop's main PC downloads it
// (it is checked against ZAP's signature first), its counters get it from the main PC, and every PC installs it
// when ZAP POS is closed or when someone presses Update now. Files go to the public bucket 'releases' in parts of
// 40 MB (Supabase's upload limit is 50 MB); the version is signed by the edge function sign-release.
const PART = 40 * 1024 * 1024
const VERSION = /^\d+\.\d+\.\d+$/

// The version Windows shows for the file (its ProductVersion), read from the program's own header.
function versionOf(bytes) {
  const look = bytes   // .NET programs keep their own version deep in the file (about 10 MB in), after the runtime's
  for (const key of ['ProductVersion', 'FileVersion']) {
    const pat = new Uint8Array([...key].flatMap((c) => [c.charCodeAt(0), 0]))
    outer: for (let i = look.indexOf(pat[0]); i >= 0 && i <= look.length - pat.length; i = look.indexOf(pat[0], i + 1)) {
      for (let j = 1; j < pat.length; j++) if (look[i + j] !== pat[j]) continue outer
      let p = i + pat.length
      while (p < look.length - 1 && look[p] === 0 && look[p + 1] === 0) p += 2
      let text = ''
      for (; p < look.length - 1 && text.length < 40; p += 2) {
        const c = look[p] | (look[p + 1] << 8)
        if (c === 0) break
        text += String.fromCharCode(c)
      }
      const m = text.match(/\d+\.\d+\.\d+/)
      if (m) return m[0]
    }
  }
  return ''
}

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
const newer = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]; return false }

export default function Releases() {
  const notify = useNotify()
  const [list, setList] = useState(null)
  const [installs, setInstalls] = useState([])
  const [shops, setShops] = useState([])
  const [file, setFile] = useState(null)
  const [f, setF] = useState({ version: '', notes: '', target: '' })
  const [busy, setBusy] = useState('')

  const load = async () => {
    const [r, i, l] = await Promise.all([
      supabase.from('releases').select('*').order('created_at', { ascending: false }),
      supabase.from('release_installs').select('*'),
      supabase.from('leads').select('pos_branch_code, shop, name').not('pos_branch_code', 'is', null),
    ])
    setList(r.data ?? []); setInstalls(i.data ?? []); setShops(l.data ?? [])
  }
  useEffect(() => { load() }, [])

  const latest = useMemo(() => (list ?? []).filter((r) => r.published).map((r) => r.version).reduce((a, v) => (!a || newer(v, a) ? v : a), ''), [list])

  const pick = async (e) => {
    const x = e.target.files?.[0]
    if (!x) return
    setFile(x)
    const found = versionOf(new Uint8Array(await x.arrayBuffer()))
    setF((v) => ({ ...v, version: found || v.version }))
  }

  const publish = async (e) => {
    e.preventDefault()
    if (!file) { notify('Choose ZapPos.exe first.', 'error'); return }
    const version = f.version.trim()
    if (!VERSION.test(version)) { notify('Version must look like 1.9.80.', 'error'); return }
    if ((list ?? []).some((r) => r.version === version)) { notify(`Version ${version} is already here. Build a newer version first.`, 'error'); return }
    if (latest && !newer(version, latest)) { notify(`Shops already have ${latest}. A new release must be newer.`, 'error'); return }
    try {
      setBusy('Checking the file…')
      const bytes = await file.arrayBuffer()
      const sha256 = hex(await crypto.subtle.digest('SHA-256', bytes))
      setBusy('Signing…')
      const signed = await supabase.functions.invoke('sign-release', { body: { version, sha256 } })
      if (signed.error) { let m = signed.error.message; try { m = (await signed.error.context.json()).error ?? m } catch { /* plain error */ } throw new Error(m) }
      const parts = []
      const count = Math.ceil(bytes.byteLength / PART)
      for (let i = 0; i < count; i++) {
        setBusy(`Uploading part ${i + 1} of ${count}…`)
        const path = `${version}/ZapPos.exe.part${i}`
        const { error } = await supabase.storage.from('releases').upload(path, new Blob([bytes.slice(i * PART, (i + 1) * PART)]), { upsert: true, contentType: 'application/octet-stream' })
        if (error) throw new Error(`Upload failed: ${error.message}`)
        parts.push(path)
      }
      setBusy('Publishing…')
      const { error } = await supabase.from('releases').insert({
        version, sha256, size: bytes.byteLength, parts, signature: signed.data.signature, notes: f.notes.trim() || null,
        target_branch: f.target || null, published: true, published_at: new Date().toISOString(),
      })
      if (error) throw new Error(error.message)
      notify(`Version ${version} published${f.target ? ` to ${f.target}` : ' to every shop'}`)
      setFile(null); setF({ version: '', notes: '', target: '' }); e.target.reset()
      load()
    } catch (err) { notify(err.message, 'error') }
    setBusy('')
  }

  const stop = async (r) => {
    const { error } = await supabase.from('releases').update({ published: false }).eq('id', r.id)
    if (error) notify(error.message, 'error'); else { notify(`Version ${r.version} is no longer sent to shops`); load() }
  }

  const shopCodes = [...new Map(shops.map((s) => [s.pos_branch_code, s])).values()]

  return (
    <>
      <PageBar icon="download" title="Releases" sub="Put a new ZAP POS version out to the shops. They install it by themselves." />
      <Card title="Publish a new version">
        <form className="adm-form" onSubmit={publish}>
          <label className="adm-drop">
            <input type="file" accept=".exe" onChange={pick} />
            <Icon name="download" size={20} />
            <span>{file ? `${file.name} · ${(file.size / 1048576).toFixed(1)} MB` : 'Choose ZapPos.exe'}</span>
            <small>The version is read from the file.</small>
          </label>
          <div className="adm-grid">
            <Field label="Version" hint={latest ? `Shops have ${latest} now.` : null}>
              <input type="text" required pattern="\d+\.\d+\.\d+" value={f.version} onChange={(e) => setF({ ...f, version: e.target.value })} placeholder="1.9.80" />
            </Field>
            <Field label="Send to" hint="Try it on one shop first, then publish it for everyone.">
              <select value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })}>
                <option value="">All shops</option>
                {shopCodes.map((s) => <option key={s.pos_branch_code} value={s.pos_branch_code}>{s.pos_branch_code} · {s.shop || s.name}</option>)}
              </select>
            </Field>
            <Field label="What's new (shops see this)" wide>
              <textarea rows={3} maxLength={2000} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Sales update by themselves. Out-of-stock items can't be sold." />
            </Field>
          </div>
          <div className="adm-form-actions">
            <button className="btn btn-primary btn-sm" disabled={Boolean(busy)}>{busy || 'Publish'}</button>
          </div>
        </form>
      </Card>
      <Card title="Versions">
        {!list ? <p className="adm-hint">Loading…</p> : !list.length ? <p className="adm-hint">No version published yet.</p> : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead><tr><th>Version</th><th>Sent to</th><th>Shops updated</th><th>Published</th><th /></tr></thead>
              <tbody>
                {list.map((r) => {
                  const done = installs.filter((i) => i.version === r.version).length
                  const of = r.target_branch ? 1 : shopCodes.length
                  return (
                    <tr key={r.id}>
                      <td><b>{r.version}</b>{r.notes && <small>{r.notes}</small>}</td>
                      <td data-label="Sent to">{r.target_branch ?? 'All shops'}</td>
                      <td data-label="Shops updated">{done} of {of || '–'}</td>
                      <td data-label="Published">{r.published ? <>{dateFmt(r.published_at)}<small>{timeAgo(r.published_at)}</small></> : <span className="adm-hint">Stopped</span>}</td>
                      <td className="adm-td-actions">{r.published && <ConfirmButton onConfirm={() => stop(r)} confirmText="Sure? Stop it">Stop sending</ConfirmButton>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <TableFoot count={list.length} noun="versions" />
          </div>
        )}
      </Card>
    </>
  )
}
