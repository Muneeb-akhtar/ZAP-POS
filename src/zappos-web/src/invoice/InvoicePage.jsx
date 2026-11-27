import { useEffect, useRef, useState } from 'react'
import Icon, { Logo } from '../components/Icons.jsx'
import { defaultContent } from '../lib/defaults.js'
import { fetchPublishedContent, mergeContent, SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from '../lib/content.js'
import InvoiceDoc, { invoiceNo } from './InvoiceDoc.jsx'

// /invoice/?t=<token>: the invoice a client opens from the link you send (no login). It asks Supabase for this one
// invoice by its private token (invoice_view(), flood-limited), shows it, prints it as a PDF, and takes a payment
// screenshot: the file goes to bill-proofs/shared/<token>/ (allowed only for that unpaid invoice), then invoice_proof()
// marks it "proof received" in your admin. Plain fetch calls, no Supabase SDK, so the page stays small.
const headers = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
const rpc = async (name, body) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || `error ${r.status}`)
  return r.json()
}

export default function InvoicePage() {
  const token = new URLSearchParams(location.search).get('t') ?? ''
  const [t, setT] = useState(defaultContent.invoice)
  const [inv, setInv] = useState(undefined)   // undefined: loading, null: not found
  const [upload, setUpload] = useState({ state: 'idle', error: '' })
  const file = useRef(null)

  useEffect(() => { fetchPublishedContent().then((c) => c && setT(mergeContent(defaultContent, c).invoice)).catch(() => {}) }, [])
  const load = () => {
    if (!supabaseConfigured || token.length !== 48) { setInv(null); return }
    rpc('invoice_view', { p_token: token }).then((d) => setInv(d ?? null)).catch(() => setInv(null))
  }
  useEffect(load, [token])
  useEffect(() => { if (inv) document.title = `${invoiceNo(inv)} · ${inv.from?.business || 'ZAP POS'}` }, [inv])

  const sendProof = async (f) => {
    if (!f) return
    if (f.size > 8 * 1024 * 1024) { setUpload({ state: 'error', error: 'file over 8 MB' }); return }
    setUpload({ state: 'busy', error: '' })
    try {
      const path = `shared/${token}/${Date.now()}-${f.name.replace(/[^\w.-]+/g, '_').slice(-60)}`
      const r = await fetch(`${SUPABASE_URL}/storage/v1/object/bill-proofs/${path}`, { method: 'POST', headers: { ...headers, 'Content-Type': f.type || 'application/octet-stream' }, body: f })
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || `error ${r.status}`)
      if (!(await rpc('invoice_proof', { p_token: token, p_path: path }))) throw new Error('not accepted')
      setUpload({ state: 'done', error: '' })
      load()
    } catch (e) { setUpload({ state: 'error', error: e.message }) }
  }

  if (inv === undefined) return <main className="invp"><p className="invp-msg">{t.loading}</p></main>
  if (inv === null) return <main className="invp"><div className="invp-brand"><Logo size={34} /> ZAP <span>POS</span></div><p className="invp-msg">{t.notFound}</p></main>

  const canUpload = inv.kind === 'bill' && (inv.status === 'unpaid' || inv.status === 'proof')
  return (
    <main className="invp">
      <InvoiceDoc inv={inv} t={t} />
      <div className="invp-actions">
        {canUpload && upload.state !== 'done' && (
          <button className="btn btn-primary" disabled={upload.state === 'busy'} onClick={() => { file.current.value = ''; file.current.click() }}>
            <Icon name="arrow" size={16} /> {upload.state === 'busy' ? t.uploading : t.uploadButton}
          </button>
        )}
        <button className="btn btn-outline" onClick={() => window.print()}><Icon name="download" size={16} /> {t.downloadButton}</button>
        <input ref={file} type="file" accept="image/*,application/pdf" hidden onChange={(e) => sendProof(e.target.files[0])} />
      </div>
      {upload.state === 'done' && <p className="invp-ok"><Icon name="check" size={16} /> {t.uploaded}</p>}
      {upload.state === 'error' && <p className="invp-err">{t.uploadError.replace('{error}', upload.error)}</p>}
    </main>
  )
}
