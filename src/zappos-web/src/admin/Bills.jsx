import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../components/Icons.jsx'
import { Stat } from './Charts.jsx'
import { addMonths, dateFmt, daysUntil, rs, rsShort, supabase, today, useBiz, waLink } from './biz.js'
import { ConfirmButton, Field, PageBar, Sheet, TableFoot, useNotify } from './ui.jsx'

// Bills page: bills and estimates you send to shops, and the payment proof they send back (screenshot of a bank
// transfer, JazzCash, …). Numbers never repeat (BIL-1001 / EST-1002) and nothing is deleted: a wrong one is cancelled.
// Open / coming up / late are worked out from the dates; "proof" means the shop sent proof and you still have to check it.

export const billNo = (b) => `${b.kind === 'estimate' ? 'EST' : 'BIL'}-${b.no}`

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
  const message = (b) => {
    const l = byLead[b.lead_id]
    return `Assalam o Alaikum ${l?.name ?? ''}, your ZAP POS ${b.kind === 'estimate' ? 'estimate' : 'bill'} ${billNo(b)}:\n\n${b.title}\nAmount: ${rs(b.amount)}\n${b.kind === 'estimate' ? `Valid until: ${dateFmt(b.due_on)}` : `Due by: ${dateFmt(b.due_on)}`}\n\nPlease send a screenshot of the payment here once paid. Thank you!`
  }

  return (
    <>
      <PageBar icon="receipt" title="Bills" sub="Bills, estimates and payment proofs">
        <div className="adm-range">{KINDS.map(([id, t]) => <button key={id} className={kind === id ? 'on' : ''} onClick={() => setKind(id)}>{t}</button>)}</div>
        <button className="btn btn-primary btn-sm" onClick={() => setSheet({ type: 'new' })}><Icon name="plus" size={14} /> New bill</button>
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
                        {l?.phone && <a className="adm-icon-btn" title="Send on WhatsApp" href={waLink(l.phone, message(b))} target="_blank" rel="noreferrer"><Icon name="whatsapp" size={15} /></a>}
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
      {sheet?.type === 'view' && <BillView bill={sheet.bill} lead={byLead[sheet.bill.lead_id]} onClose={() => setSheet(null)} />}
    </>
  )
}

// New bill or estimate. Due date defaults to a week after issue (estimates: valid for a month).
function BillSheet({ kind: startKind, onClose, onSaved }) {
  const { leads } = useBiz()
  const notify = useNotify()
  const [f, setF] = useState({ kind: startKind, lead_id: '', title: '', amount: '', issued_on: today(), due_on: '', note: '' })
  const [busy, setBusy] = useState(false)
  const due = f.due_on || (f.kind === 'estimate' ? addMonths(f.issued_on, 1) : addDays(f.issued_on, 7))
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    const amount = Math.round(Number(f.amount))
    if (!f.lead_id) { notify('Choose the shop.', 'error'); return }
    if (!(amount > 0)) { notify('Enter an amount in whole rupees.', 'error'); return }
    if (due < f.issued_on) { notify('The due date must be on or after the issue date.', 'error'); return }
    setBusy(true)
    const { error } = await supabase.from('bills').insert({ kind: f.kind, lead_id: f.lead_id, title: f.title.trim(), amount, issued_on: f.issued_on, due_on: due, note: f.note.trim() || null })
    setBusy(false)
    if (error) { notify(error.code === '23505' ? 'This shop already has the same bill for that day. Open it from the list instead.' : error.message, 'error'); return }
    notify(f.kind === 'estimate' ? 'Estimate made' : 'Bill made')
    onSaved()
  }

  return (
    <Sheet title={f.kind === 'estimate' ? 'New estimate' : 'New bill'} onClose={onClose}>
      <form className="adm-form" onSubmit={submit}>
        <div className="adm-grid">
          <Field label="Type" wide>
            <div className="adm-chips">{[['bill', 'Bill'], ['estimate', 'Estimate']].map(([id, t]) => <button type="button" key={id} className={f.kind === id ? 'on' : ''} onClick={() => setF({ ...f, kind: id })}>{t}</button>)}</div>
          </Field>
          <Field label="Shop" wide>
            <select required value={f.lead_id} onChange={set('lead_id')}>
              <option value="" disabled>Choose a shop…</option>
              {[...leads].sort((a, b) => (a.shop || a.name).localeCompare(b.shop || b.name)).map((l) => <option key={l.id} value={l.id}>{l.shop || l.name}{l.shop ? ` · ${l.name}` : ''}</option>)}
            </select>
          </Field>
          <Field label="What it's for" wide><input type="text" required minLength={2} maxLength={200} value={f.title} onChange={set('title')} placeholder="ZAP POS yearly plan, 3 counters" /></Field>
          <Field label="Amount (Rs)"><input type="number" required min={1} step={1} value={f.amount} onChange={set('amount')} placeholder="25000" /></Field>
          <Field label="Issue date"><input type="date" required value={f.issued_on} onChange={set('issued_on')} /></Field>
          <Field label={f.kind === 'estimate' ? 'Valid until' : 'Due by'}><input type="date" required min={f.issued_on} value={due} onChange={set('due_on')} /></Field>
          <Field label="Note" hint="Shown on the printed bill (bank details, terms)." wide><textarea rows={2} value={f.note} onChange={set('note')} /></Field>
        </div>
        <div className="adm-form-actions">
          <button type="button" className="btn btn-quiet btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" disabled={busy}>{busy ? 'Saving…' : f.kind === 'estimate' ? 'Make estimate' : 'Make bill'}</button>
        </div>
      </form>
    </Sheet>
  )
}

const addDays = (d, n) => { const x = new Date(`${d}T00:00:00`); x.setDate(x.getDate() + n); return x.toLocaleDateString('en-CA') }

// A clean bill to print or save as PDF (the browser's print → Save as PDF).
function BillView({ bill: b, lead: l, onClose }) {
  const s = billState(b)
  return (
    <Sheet title={billNo(b)} onClose={onClose}>
      <div className="adm-print">
        <div className="adm-print-head">
          <div><b className="adm-print-brand">ZAP <i>POS</i></b><small>{b.kind === 'estimate' ? 'Estimate' : 'Bill'} {billNo(b)}</small></div>
          <span className={`adm-bill ${s.id}`}>{s.text}</span>
        </div>
        <div className="adm-print-cols">
          <div><small>For</small><b>{l?.shop || l?.name}</b>{l?.shop && <span>{l.name}</span>}{l?.phone && <span>{l.phone}</span>}{l?.city && <span>{l.city}</span>}</div>
          <div><small>Issued</small><b>{dateFmt(b.issued_on)}</b><small>{b.kind === 'estimate' ? 'Valid until' : 'Due by'}</small><b>{dateFmt(b.due_on)}</b></div>
        </div>
        <table className="adm-print-lines"><tbody><tr><td>{b.title}</td><td className="num">{rs(b.amount)}</td></tr></tbody>
          <tfoot><tr><td>Total</td><td className="num">{rs(b.amount)}</td></tr></tfoot></table>
        {b.note && <p className="adm-print-note">{b.note}</p>}
        {b.paid_on && <p className="adm-print-note">Settled on {dateFmt(b.paid_on)}. Thank you.</p>}
      </div>
      <div className="adm-form-actions">
        <button type="button" className="btn btn-quiet btn-sm" onClick={onClose}>Close</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => window.print()}><Icon name="download" size={14} /> Print or save PDF</button>
      </div>
    </Sheet>
  )
}

