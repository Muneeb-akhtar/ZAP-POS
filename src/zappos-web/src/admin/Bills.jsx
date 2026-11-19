import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../components/Icons.jsx'
import { Stat } from './Charts.jsx'
import { addMonths, dateFmt, daysUntil, rs, rsShort, supabase, today, useBiz, waLink } from './biz.js'
import defaultContent from '../content/landing-content.json'
import InvoiceDoc, { invoiceNo, rupees, totals } from '../invoice/InvoiceDoc.jsx'
import '../invoice/invoice.css'
import { ConfirmButton, Field, PageBar, Sheet, TableFoot, useNotify } from './ui.jsx'

// Bills page: bills and estimates you send to shops, and the payment proof they send back (screenshot of a bank
// transfer, JazzCash, …). Numbers never repeat (BIL-1001 / EST-1002) and nothing is deleted: a wrong one is cancelled.
// Open / coming up / late are worked out from the dates; "proof" means the shop sent proof and you still have to check it.

export const billNo = invoiceNo   // INV-1006 / EST-1003

export function billState(b) {
  if (b.status === 'cancelled') return { id: 'cancelled', text: 'Cancelled' }
  if (b.status === 'paid') return { id: 'paid', text: 'Settled' }
  if (b.status === 'proof') return { id: 'proof', text: 'Proof received' }
  if (b.kind === 'estimate') return { id: 'estimate', text: 'Estimate' }
  if (b.issued_on > today()) return { id: 'upcoming', text: 'Coming up' }
  const left = daysUntil(b.due_on)
  if (left < 0) return { id: 'late', text: `${-left} d late` }
  return { id: 'open', text: left === 0 ? 'Due today' : 'Open' }
}

const TABS = [['all', 'All'], ['open', 'Open'], ['upcoming', 'Coming up'], ['proof', 'Proof received'], ['late', 'Late'], ['paid', 'Settled']]
const RANGES = [['all', 'All time'], ['today', 'Today'], ['month', 'This month'], ['year', 'This year'], ['custom', 'Pick dates']]
const KINDS = [['all', 'All'], ['bill', 'Bills'], ['estimate', 'Estimates']]

function inRange(d, range, from, to) {
  const t = today()
  if (range === 'today') return d === t
  if (range === 'month') return d.slice(0, 7) === t.slice(0, 7)
  if (range === 'year') return d.slice(0, 4) === t.slice(0, 4)
  if (range === 'custom') return (!from || d >= from) && (!to || d <= to)
  return true
}

export default function Bills() {
  const { leads } = useBiz()
  const notify = useNotify()
  const [bills, setBills] = useState(null)
  const [kind, setKind] = useState('all')
  const [tab, setTab] = useState('all')
  const [range, setRange] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [who, setWho] = useState('')
  const [q, setQ] = useState('')
  const [sheet, setSheet] = useState(null)
  const byLead = useMemo(() => Object.fromEntries(leads.map((l) => [l.id, l])), [leads])

  const load = () => supabase.from('bills').select('*').order('no', { ascending: false }).then(({ data, error }) => {
    if (error) notify(error.message, 'error'); else setBills(data ?? [])
  })
  useEffect(() => { load() }, [])
  // your details printed on every invoice (Invoice details)
  const [settings, setSettings] = useState(null)
  const loadSettings = () => supabase.from('invoice_settings').select('*').maybeSingle().then(({ data }) => setSettings(data ?? {}))
  useEffect(() => { loadSettings() }, [])

  const all = bills ?? []
  const real = all.filter((b) => b.kind === 'bill' && b.status !== 'cancelled')
  const sum = (list) => list.reduce((s, b) => s + b.amount, 0)
  const unpaid = real.filter((b) => b.status !== 'paid')
  const openNow = unpaid.filter((b) => b.issued_on <= today())
  const comingUp = unpaid.filter((b) => b.issued_on > today())
  const veryLate = unpaid.filter((b) => b.status === 'unpaid' && daysUntil(b.due_on) < -30)
  const settled = real.filter((b) => b.status === 'paid')
  const firstPaid = settled.map((b) => b.paid_on).sort()[0]
  const months = firstPaid ? Math.max(1, (Number(today().slice(0, 4)) - Number(firstPaid.slice(0, 4))) * 12 + Number(today().slice(5, 7)) - Number(firstPaid.slice(5, 7)) + 1) : 0

  const shown = all.filter((b) => {
    const s = billState(b).id
    if (kind !== 'all' && b.kind !== kind) return false
    if (tab === 'all' ? s === 'cancelled' && kind !== 'all' : tab === 'open' ? !['open', 'late'].includes(s) : s !== tab) return false
    if (!inRange(b.issued_on, range, from, to)) return false
    if (who && b.lead_id !== who) return false
    const l = byLead[b.lead_id]
    const text = `${billNo(b)} ${b.title} ${l?.name ?? ''} ${l?.shop ?? ''} ${l?.phone ?? ''}`.toLowerCase()
    return !q || text.includes(q.toLowerCase())
  })
  const count = (id) => all.filter((b) => (id === 'all' ? true : id === 'open' ? ['open', 'late'].includes(billState(b).id) : billState(b).id === id)).length

  const update = async (b, patch, done) => {
    const { error } = await supabase.from('bills').update(patch).eq('id', b.id)
    if (error) notify(error.message, 'error'); else { notify(done); load() }
  }
  const settle = (b) => update(b, { status: 'paid', paid_on: today() }, `${billNo(b)} marked settled`)
  const reopen = (b) => update(b, { status: b.proof_path ? 'proof' : 'unpaid', paid_on: null }, `${billNo(b)} is open again`)
  const cancel = (b) => update(b, { status: 'cancelled', paid_on: null }, `${billNo(b)} cancelled`)
  const toBill = (b) => update(b, { kind: 'bill' }, `${billNo(b)} is now a bill`)

  const upload = useRef(null)
  const [uploading, setUploading] = useState(null)
  const pickProof = (b) => { setUploading(b); upload.current.value = ''; upload.current.click() }
  const sendProof = async (file) => {
    const b = uploading
    if (!file || !b) return
    if (file.size > 8 * 1024 * 1024) { notify('The file is over 8 MB. Send a smaller photo or PDF.', 'error'); return }
    const path = `${b.id}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, '_')}`
    const { error } = await supabase.storage.from('bill-proofs').upload(path, file, { contentType: file.type })
    if (error) { notify(error.message, 'error'); return }
    update(b, { proof_path: path, status: b.status === 'unpaid' ? 'proof' : b.status }, 'Payment proof saved. Check it, then mark the bill settled.')
  }
  const viewProof = async (b) => {
    const { data, error } = await supabase.storage.from('bill-proofs').createSignedUrl(b.proof_path, 120)
    if (error) notify(error.message, 'error'); else window.open(data.signedUrl, '_blank', 'noopener')
  }
  // the client's private link to this invoice (they open it without logging in; you can switch it off)
  const linkOf = (b) => `${location.origin}/invoice/?t=${b.share_token}`
  const message = (b) => {
    const l = byLead[b.lead_id]
    const est = b.kind === 'estimate'
    return `Assalam o Alaikum ${l?.name ?? ''}, here is your ${est ? 'estimate' : 'invoice'} ${billNo(b)} from ${settings?.business || 'ZAP POS'}:\n\n` +
      `${b.title}\nTotal: ${rs(b.amount)}\n${est ? `Valid until: ${dateFmt(b.due_on)}` : `Due by: ${dateFmt(b.due_on)}`}\n\n` +
      `View or download it here:\n${linkOf(b)}${est ? '' : '\n\nOnce paid, you can upload the payment screenshot on that page.'}\n\nThank you!`
  }
  const markSent = (b) => { if (!b.sent_at) supabase.from('bills').update({ sent_at: new Date().toISOString() }).eq('id', b.id).then(() => load()) }


  return (
    <>
      <PageBar icon="receipt" title="Bills" sub="Bills, estimates and payment proofs">
        <div className="adm-range">{KINDS.map(([id, t]) => <button key={id} className={kind === id ? 'on' : ''} onClick={() => setKind(id)}>{t}</button>)}</div>
        <button className="btn btn-quiet btn-sm" onClick={() => setSheet({ type: 'settings' })}><Icon name="settings" size={14} /> Invoice details</button>
        <button className="btn btn-primary btn-sm" onClick={() => setSheet({ type: 'new' })}><Icon name="plus" size={14} /> New invoice</button>
      </PageBar>

      <div className="adm-panel wide">
        <div className="adm-stats">
          <Stat icon="calendar" label="Open now" value={bills ? rs(sum(openNow)) : '…'} sub={`${openNow.length} bill${openNow.length === 1 ? '' : 's'} to collect`} onClick={() => setTab('open')} />
          <Stat icon="arrow" label="Coming up" value={bills ? rs(sum(comingUp)) : '…'} sub="issued for later dates" onClick={() => setTab('upcoming')} />
          <Stat icon="close" label="Late 30+ days" value={bills ? rs(sum(veryLate)) : '…'} sub={veryLate.length ? `${veryLate.length} need a call` : 'nothing badly late'} onClick={() => setTab('late')} />
          <Stat hero icon="check" label="Collected" value={bills ? rs(sum(settled)) : '…'} sub={`${settled.length} settled`} onClick={() => setTab('paid')} />
          <Stat icon="chart" label="Average a month" value={bills ? rsShort(months ? sum(settled) / months : 0) : '…'} sub={firstPaid ? `over ${months} month${months === 1 ? '' : 's'}` : 'after the first settled bill'} />
          <Stat icon="receipt" label="Bills open" value={bills ? unpaid.length : '…'} sub={`${all.filter((b) => b.status === 'proof').length} with proof to check`} onClick={() => setTab('proof')} />
        </div>

        <div className="adm-toolbar adm-toolbar-bills">
          <div className="adm-chips">{TABS.map(([id, t]) => <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{t} <em>{count(id)}</em></button>)}</div>
          <div className="adm-chips">{RANGES.map(([id, t]) => <button key={id} className={range === id ? 'on' : ''} onClick={() => setRange(id)}>{id === 'custom' && <Icon name="calendar" size={13} />}{t}</button>)}</div>
          {range === 'custom' && <span className="adm-dates"><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From" /><span>to</span><input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} aria-label="To" /></span>}
          <select className="adm-select" value={who} onChange={(e) => setWho(e.target.value)} aria-label="Customer">
            <option value="">All customers</option>
            {[...leads].sort((a, b) => (a.shop || a.name).localeCompare(b.shop || b.name)).map((l) => <option key={l.id} value={l.id}>{l.shop || l.name}</option>)}
          </select>
          <div className="adm-search"><Icon name="search" size={16} /><input type="search" placeholder="Search bill number or shop…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        </div>

        <input ref={upload} type="file" accept="image/*,application/pdf" hidden onChange={(e) => sendProof(e.target.files[0])} />
        {!bills ? <div className="adm-skel" /> : !shown.length ? (
          <div className="adm-blank"><Icon name="receipt" size={28} /><p>{all.length ? 'No bills match these filters.' : 'No bills yet. Make one with New bill: it gets its own number, and you can send it on WhatsApp.'}</p></div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead><tr><th>Number</th><th>Shop</th><th>Dates</th><th className="num">Amount</th><th>Payment proof</th><th>Status</th><th className="adm-th-actions">Actions</th></tr></thead>
              <tbody>
                {shown.map((b) => {
                  const l = byLead[b.lead_id]
                  const s = billState(b)
                  return (
                    <tr key={b.id} className={s.id === 'cancelled' ? 'adm-row-faded' : ''}>
                      <td data-label="Number"><b className="adm-mono">{billNo(b)}</b><span className={`adm-kind ${b.kind}`}>{b.kind === 'estimate' ? 'Estimate' : 'Bill'}</span></td>
                      <td data-label="Shop" className="lead-cell"><b>{l?.shop || l?.name || 'Unknown'}</b><small>{b.title}</small></td>
                      <td data-label="Dates" className="adm-td-dates"><small>Issued {dateFmt(b.issued_on)}</small><small>{b.kind === 'estimate' ? 'Valid to' : 'Due'} {dateFmt(b.due_on)}</small></td>
                      <td data-label="Amount" className="num"><b>{rs(b.amount)}</b></td>
                      <td data-label="Payment proof">
                        {b.proof_path ? <button className="btn btn-outline btn-sm" onClick={() => viewProof(b)}><Icon name="external" size={13} /> View</button>
                          : b.kind === 'bill' && s.id !== 'cancelled' && s.id !== 'paid' ? <button className="btn btn-quiet btn-sm" onClick={() => pickProof(b)}><Icon name="arrow" size={13} /> Upload</button> : <small>–</small>}
                      </td>
                      <td data-label="Status"><span className={`adm-bill ${s.id}`}>{s.text}</span></td>
                      <td className="adm-td-actions">
                        {b.kind === 'estimate' && s.id !== 'cancelled' && <button className="btn btn-outline btn-sm" onClick={() => toBill(b)}>Make bill</button>}
                        {b.kind === 'bill' && !['paid', 'cancelled'].includes(s.id) && <button className="btn btn-outline btn-sm" onClick={() => settle(b)}><Icon name="check" size={13} /> Settle</button>}
                        {s.id === 'paid' && <button className="btn btn-quiet btn-sm" onClick={() => reopen(b)}>Reopen</button>}
                        <button className="adm-icon-btn" title="View and print" onClick={() => setSheet({ type: 'view', bill: b })}><Icon name="receipt" size={15} /></button>
                        {l?.phone && <a className="adm-icon-btn" title="Send on WhatsApp (with the invoice link)" href={waLink(l.phone, message(b))} target="_blank" rel="noreferrer" onClick={() => markSent(b)}><Icon name="whatsapp" size={15} /></a>}
                        {!['paid', 'cancelled'].includes(s.id) && <ConfirmButton onConfirm={() => cancel(b)} confirmText="Sure? Cancel">Cancel</ConfirmButton>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <TableFoot count={shown.length} noun="bills" />
          </div>
        )}
      </div>

      {sheet?.type === 'new' && <BillSheet kind={kind === 'estimate' ? 'estimate' : 'bill'} onClose={() => setSheet(null)} onSaved={() => { setSheet(null); load() }} />}
      {sheet?.type === 'view' && <BillView bill={sheet.bill} lead={byLead[sheet.bill.lead_id]} settings={settings} link={linkOf(sheet.bill)} message={message(sheet.bill)}
        onSent={() => markSent(sheet.bill)} onChanged={(b) => { setSheet({ type: 'view', bill: b }); load() }} onClose={() => setSheet(null)} />}
      {sheet?.type === 'settings' && <InvoiceSettingsSheet settings={settings} onClose={() => setSheet(null)} onSaved={() => { setSheet(null); loadSettings() }} />}
    </>
  )
}

// New invoice or estimate: lines (item, quantity, price), a discount and a tax %. The total is worked out here as you type
// and again by the database (bill_total), so they always agree. Due date defaults to a week (estimates: valid a month).
const QUICK = [
  { desc: 'ZAP POS yearly licence', price: 36000 },
  { desc: 'ZAP POS monthly plan', price: 4500 },
  { desc: 'Extra counter (yearly)', price: 12000 },
  { desc: 'Setup and staff training', price: 10000 },
  { desc: 'Thermal receipt printer', price: 9500 },
  { desc: 'Barcode scanner', price: 6500 },
]
const blankLine = () => ({ desc: '', qty: 1, price: '' })

function BillSheet({ kind: startKind, onClose, onSaved }) {
  const { leads } = useBiz()
  const notify = useNotify()
  const [f, setF] = useState({ kind: startKind, lead_id: '', issued_on: today(), due_on: '', discount: '', tax_pct: '', note: '' })
  const [lines, setLines] = useState([blankLine()])
  const [busy, setBusy] = useState(false)
  const due = f.due_on || (f.kind === 'estimate' ? addMonths(f.issued_on, 1) : addDays(f.issued_on, 7))
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const setLine = (i, k, v) => setLines(lines.map((l, j) => (j === i ? { ...l, [k]: v } : l)))
  const addQuick = (q) => setLines([...lines.filter((l) => l.desc.trim() || l.price !== ''), { desc: q.desc, qty: 1, price: q.price }])
  const filled = lines.filter((l) => l.desc.trim())
  const sum = totals({ items: filled.map((l) => ({ desc: l.desc, qty: Number(l.qty) || 0, price: Number(l.price) || 0 })), discount: Number(f.discount) || 0, tax_pct: Number(f.tax_pct) || 0, amount: 0 })

  const submit = async (e) => {
    e.preventDefault()
    if (!f.lead_id) { notify('Choose the client.', 'error'); return }
    if (!filled.length) { notify('Add at least one line.', 'error'); return }
    if (filled.some((l) => !(Number(l.qty) > 0) || Number(l.price) < 0 || l.price === '')) { notify('Each line needs a quantity above 0 and a price.', 'error'); return }
    if (!(sum.total > 0)) { notify('The total must be above Rs 0. Check the discount.', 'error'); return }
    if (due < f.issued_on) { notify('The due date must be on or after the issue date.', 'error'); return }
    setBusy(true)
    const items = filled.map((l) => ({ desc: l.desc.trim().slice(0, 200), qty: Number(l.qty), price: Math.round(Number(l.price)) }))
    const title = items.map((l) => l.desc).join(', ').slice(0, 200)
    const { error } = await supabase.from('bills').insert({
      kind: f.kind, lead_id: f.lead_id, title, items, amount: Math.max(1, sum.total), discount: Math.round(Number(f.discount) || 0),
      tax_pct: Number(f.tax_pct) || 0, issued_on: f.issued_on, due_on: due, note: f.note.trim() || null,
    })
    setBusy(false)
    if (error) { notify(error.code === '23505' ? 'This client already has the same invoice for that day. Open it from the list instead.' : error.message, 'error'); return }
    notify(f.kind === 'estimate' ? 'Estimate made' : 'Invoice made. Send it from the list (WhatsApp) or open it.')
    onSaved()
  }

  return (
    <Sheet title={f.kind === 'estimate' ? 'New estimate' : 'New invoice'} onClose={onClose}>
      <form className="adm-form" onSubmit={submit}>
        <div className="adm-grid">
          <Field label="Type" wide>
            <div className="adm-chips">{[['bill', 'Invoice'], ['estimate', 'Estimate']].map(([id, t]) => <button type="button" key={id} className={f.kind === id ? 'on' : ''} onClick={() => setF({ ...f, kind: id })}>{t}</button>)}</div>
          </Field>
          <Field label="Client" wide>
            <select required value={f.lead_id} onChange={set('lead_id')}>
              <option value="" disabled>Choose a client…</option>
              {[...leads].sort((a, b) => (a.shop || a.name).localeCompare(b.shop || b.name)).map((l) => <option key={l.id} value={l.id}>{l.shop || l.name}{l.shop ? ` · ${l.name}` : ''}</option>)}
            </select>
          </Field>
          <Field label="Items" wide hint="Tap a quick item or type your own. Prices in whole rupees.">
            <div className="adm-chips adm-quick">{QUICK.map((q) => <button type="button" key={q.desc} onClick={() => addQuick(q)}><Icon name="plus" size={12} /> {q.desc}</button>)}</div>
            <div className="adm-lines">
              <div className="adm-lines-head"><span>Item</span><span>Qty</span><span>Price (Rs)</span><span>Amount</span><span /></div>
              {lines.map((l, i) => (
                <div key={i} className="adm-lines-row">
                  <input type="text" maxLength={200} placeholder="What it's for" value={l.desc} onChange={(e) => setLine(i, 'desc', e.target.value)} aria-label="Item" />
                  <input type="number" min={0.01} step="any" value={l.qty} onChange={(e) => setLine(i, 'qty', e.target.value)} aria-label="Quantity" />
                  <input type="number" min={0} step={1} placeholder="0" value={l.price} onChange={(e) => setLine(i, 'price', e.target.value)} aria-label="Price" />
                  <b>{rupees((Number(l.qty) || 0) * (Number(l.price) || 0))}</b>
                  <button type="button" className="adm-icon-btn plain" title="Remove line" disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, j) => j !== i))}><Icon name="close" size={14} /></button>
                </div>
              ))}
              <button type="button" className="adm-add" onClick={() => setLines([...lines, blankLine()])}><Icon name="plus" size={13} /> Add a line</button>
            </div>
          </Field>
          <Field label="Discount (Rs)"><input type="number" min={0} step={1} placeholder="0" value={f.discount} onChange={set('discount')} /></Field>
          <Field label="Tax %" hint="Leave empty if no tax."><input type="number" min={0} max={100} step="0.01" placeholder="0" value={f.tax_pct} onChange={set('tax_pct')} /></Field>
          <Field label="Issue date"><input type="date" required value={f.issued_on} onChange={set('issued_on')} /></Field>
          <Field label={f.kind === 'estimate' ? 'Valid until' : 'Due by'}><input type="date" required min={f.issued_on} value={due} onChange={set('due_on')} /></Field>
          <Field label="Note on this invoice" hint="Optional, shown at the bottom (for example the licence period)." wide><textarea rows={2} value={f.note} onChange={set('note')} /></Field>
        </div>
        <div className="adm-inv-sum">
          <span>Subtotal {rupees(sum.sub)}{sum.discount > 0 && ` · discount – ${rupees(sum.discount)}`}{sum.taxPct > 0 && ` · tax ${rupees(sum.tax)}`}</span>
          <b>Total {rupees(sum.total)}</b>
        </div>
        <div className="adm-form-actions">
          <button type="button" className="btn btn-quiet btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" disabled={busy}>{busy ? 'Saving…' : f.kind === 'estimate' ? 'Make estimate' : 'Make invoice'}</button>
        </div>
      </form>
    </Sheet>
  )
}

const addDays = (d, n) => { const x = new Date(`${d}T00:00:00`); x.setDate(x.getDate() + n); return x.toLocaleDateString('en-CA') }

// One invoice: exactly what the client sees, and the ways to send it. The private link can be switched off (the client's
// page then says the link is no longer valid); Download PDF prints only the invoice.
function BillView({ bill: b, lead: l, settings, link, message, onSent, onChanged, onClose }) {
  const notify = useNotify()
  const inv = { ...b, client: { name: l?.name, shop: l?.shop, phone: l?.phone, city: l?.city }, from: settings ?? {} }
  const copy = async () => { try { await navigator.clipboard.writeText(link); notify('Link copied'); onSent() } catch { notify('Select the link and copy it by hand.', 'error') } }
  const toggle = async () => {
    const { data, error } = await supabase.from('bills').update({ share_on: !b.share_on }).eq('id', b.id).select().single()
    if (error) notify(error.message, 'error'); else { notify(data.share_on ? 'Link switched on' : 'Link switched off: the client can no longer open it'); onChanged(data) }
  }
  const mail = `mailto:${l?.email ?? ''}?subject=${encodeURIComponent(`${billNo(b)} from ${settings?.business || 'ZAP POS'}`)}&body=${encodeURIComponent(message)}`
  return (
    <Sheet title={billNo(b)} onClose={onClose}>
      <div className="adm-inv-view"><InvoiceDoc inv={inv} t={defaultContent.invoice} /></div>
      <div className="adm-inv-link">
        <span className={`adm-bill ${b.share_on ? 'paid' : 'cancelled'}`}>{b.share_on ? 'Link on' : 'Link off'}</span>
        <code>{b.share_on ? link : 'The client can’t open this invoice.'}</code>
        <button type="button" className="adm-link" onClick={toggle}>{b.share_on ? 'Switch off' : 'Switch on'}</button>
      </div>
      {b.sent_at && <p className="adm-hint">Sent {dateFmt(b.sent_at)}.</p>}
      <div className="adm-form-actions">
        <button type="button" className="btn btn-quiet btn-sm" onClick={() => window.print()}><Icon name="download" size={14} /> Download PDF</button>
        {b.share_on && <button type="button" className="btn btn-quiet btn-sm" onClick={copy}><Icon name="layers" size={14} /> Copy link</button>}
        {b.share_on && <a className="btn btn-quiet btn-sm" href={mail} onClick={onSent}><Icon name="mail" size={14} /> Email</a>}
        {b.share_on && l?.phone && <a className="btn btn-primary btn-sm" href={waLink(l.phone, message)} target="_blank" rel="noreferrer" onClick={onSent}><Icon name="whatsapp" size={14} /> Send on WhatsApp</a>}
      </div>
    </Sheet>
  )
}

// Your details on every invoice. Kept in invoice_settings (admins only); a client sees them only inside their own invoice.
function InvoiceSettingsSheet({ settings, onClose, onSaved }) {
  const notify = useNotify()
  const [f, setF] = useState({ business: 'ZAP POS', owner_name: '', phone: '', email: '', address: '', pay_details: '', note: '', ...(settings ?? {}) })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const save = async (e) => {
    e.preventDefault()
    const row = { id: true, business: f.business.trim() || 'ZAP POS', owner_name: f.owner_name?.trim() || null, phone: f.phone?.trim() || null,
                  email: f.email?.trim() || null, address: f.address?.trim() || null, pay_details: f.pay_details?.trim() || null, note: f.note?.trim() || null,
                  updated_at: new Date().toISOString() }
    const { error } = await supabase.from('invoice_settings').upsert(row)
    if (error) notify(error.message, 'error'); else { notify('Invoice details saved. Every invoice shows them, also ones already sent.'); onSaved() }
  }
  return (
    <Sheet title="Invoice details" onClose={onClose}>
      <form className="adm-form" onSubmit={save}>
        <p className="adm-hint">Printed at the top of every invoice and estimate. Use your real details only.</p>
        <div className="adm-grid">
          <Field label="Business name"><input type="text" required maxLength={80} value={f.business} onChange={set('business')} /></Field>
          <Field label="Your name"><input type="text" maxLength={80} value={f.owner_name ?? ''} onChange={set('owner_name')} /></Field>
          <Field label="Phone"><input type="tel" maxLength={30} value={f.phone ?? ''} onChange={set('phone')} /></Field>
          <Field label="Email"><input type="email" maxLength={120} value={f.email ?? ''} onChange={set('email')} /></Field>
          <Field label="Address" wide><input type="text" maxLength={200} value={f.address ?? ''} onChange={set('address')} /></Field>
          <Field label="How to pay" hint="Bank account, JazzCash, Easypaisa: one per line. Shown on unpaid invoices." wide><textarea rows={3} value={f.pay_details ?? ''} onChange={set('pay_details')} /></Field>
          <Field label="Bottom note" hint="Optional: terms, thanks." wide><textarea rows={2} value={f.note ?? ''} onChange={set('note')} /></Field>
        </div>
        <div className="adm-form-actions">
          <button type="button" className="btn btn-quiet btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm">Save details</button>
        </div>
      </form>
    </Sheet>
  )
}
