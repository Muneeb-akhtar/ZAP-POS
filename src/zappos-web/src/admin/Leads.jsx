import { useEffect, useMemo, useState } from 'react'
import Icon from '../components/Icons.jsx'
import { STATUSES, dateFmt, daysUntil, downloadCsv, statusLabel, telLink, timeAgo, today, toDay, useBiz, waLink } from './biz.js'
import { ConfirmButton, Field, PageBar, Sheet, StatusPill, useNotify } from './ui.jsx'

const SOURCES = ['Website', 'Phone call', 'WhatsApp', 'Walk-in', 'Referral', 'Facebook', 'Instagram']
const blank = { name: '', phone: '', shop: '', city: '', plan: '', branches: 1, message: '', source: 'Phone call', status: 'new', follow_up: null, notes: '' }
const clean = (l) => Object.fromEntries(Object.entries(l).map(([k, v]) => [k, typeof v === 'string' ? v.trim() || null : v]))

// Add / edit a lead (all fields).
export function LeadSheet({ lead, plans, onClose }) {
  const { saveLead } = useBiz()
  const notify = useNotify()
  const [f, setF] = useState(() => ({ ...blank, ...lead }))
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await saveLead(clean({ ...f, branches: Number(f.branches) || null, follow_up: f.follow_up || null }))
      notify(lead?.id ? 'Lead updated' : 'Lead added'); onClose()
    } catch (err) { notify(err.message, 'error'); setBusy(false) }
  }
  return (
    <Sheet title={lead?.id ? 'Edit lead' : 'Add a lead'} onClose={onClose}>
      <form className="adm-form" onSubmit={submit}>
        <div className="adm-grid">
          <Field label="Name"><input type="text" required minLength={2} maxLength={80} value={f.name ?? ''} onChange={set('name')} /></Field>
          <Field label="Mobile number"><input type="tel" required minLength={7} maxLength={20} value={f.phone ?? ''} onChange={set('phone')} placeholder="03XX XXXXXXX" /></Field>
          <Field label="Shop name"><input type="text" maxLength={100} value={f.shop ?? ''} onChange={set('shop')} /></Field>
          <Field label="City"><input type="text" maxLength={60} value={f.city ?? ''} onChange={set('city')} /></Field>
          <Field label="Plan">
            <select value={f.plan ?? ''} onChange={set('plan')}>
              <option value="">Not sure</option>
              {plans.map((p) => <option key={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Branches"><input type="number" min={1} max={999} value={f.branches ?? ''} onChange={set('branches')} /></Field>
          <Field label="Status">
            <select value={f.status} onChange={set('status')}>{STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
          </Field>
          <Field label="Came from">
            <input type="text" list="adm-sources" maxLength={120} value={f.source ?? ''} onChange={set('source')} />
            <datalist id="adm-sources">{SOURCES.map((s) => <option key={s} value={s} />)}</datalist>
          </Field>
          <Field label="Call back on"><input type="date" value={f.follow_up ?? ''} onChange={set('follow_up')} /></Field>
          <Field label="Their message" wide><textarea rows={2} maxLength={1000} value={f.message ?? ''} onChange={set('message')} /></Field>
          <Field label="Your notes" wide><textarea rows={3} value={f.notes ?? ''} onChange={set('notes')} placeholder="Only you see this" /></Field>
        </div>
        <div className="adm-form-actions">
          <button type="button" className="btn btn-quiet btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" disabled={busy}>{busy ? 'Saving…' : lead?.id ? 'Save changes' : 'Add lead'}</button>
        </div>
      </form>
    </Sheet>
  )
}

function LeadDetail({ lead, onEdit, onPay }) {
  const { saveLead, deleteLead, payments } = useBiz()
  const notify = useNotify()
  const [notes, setNotes] = useState(lead.notes ?? '')
  const paid = payments.filter((p) => p.lead_id === lead.id)
  const update = async (patch, msg = 'Saved') => {
    try { await saveLead({ ...lead, ...patch }); notify(msg) } catch (err) { notify(err.message, 'error') }
  }
  const remove = async () => {
    if (paid.length) { notify('This customer has payments. Delete those first (Payments page).', 'error'); return }
    try { await deleteLead(lead.id); notify('Lead deleted') } catch (err) { notify(err.message, 'error') }
  }
  const hello = `Assalam o Alaikum ${lead.name}, this is ZAP POS. Thank you for your interest${lead.plan ? ` in the ${lead.plan} plan` : ''}. When is a good time for a quick demo?`

  return (
    <div className="adm-lead-detail">
      <div className="adm-seg" role="group" aria-label="Status">
        {STATUSES.map((s) => (
          <button key={s.id} type="button" className={`s-${s.id} ${lead.status === s.id ? 'on' : ''}`} onClick={() => lead.status !== s.id && update({ status: s.id }, `Marked as ${s.label}`)}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="adm-lead-cols">
        <dl className="adm-dl">
          <div><dt>Phone</dt><dd><a href={telLink(lead.phone)}>{lead.phone}</a></dd></div>
          <div><dt>Shop</dt><dd>{lead.shop || '–'}</dd></div>
          <div><dt>City</dt><dd>{lead.city || '–'}</dd></div>
          <div><dt>Plan</dt><dd>{lead.plan || 'Not sure'}{lead.branches ? ` · ${lead.branches} branch${lead.branches > 1 ? 'es' : ''}` : ''}</dd></div>
          <div><dt>Came from</dt><dd>{lead.source || '–'}</dd></div>
          <div><dt>Received</dt><dd>{dateFmt(toDay(lead.created_at))}</dd></div>
          {lead.message && <div className="wide"><dt>Their message</dt><dd className="adm-quote">{lead.message}</dd></div>}
          {paid.length > 0 && <div className="wide"><dt>Payments</dt><dd>{paid.length} recorded · Rs {paid.reduce((s, p) => s + p.amount, 0).toLocaleString('en-PK')}</dd></div>}
        </dl>

        <div className="adm-lead-side">
          <Field label="Call back on">
            <input type="date" value={lead.follow_up ?? ''} onChange={(e) => update({ follow_up: e.target.value || null }, e.target.value ? `Reminder set for ${dateFmt(e.target.value)}` : 'Reminder removed')} />
          </Field>
          <Field label="Your notes">
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Called, wants demo Saturday 4 PM" />
          </Field>
          {notes !== (lead.notes ?? '') && <button type="button" className="btn btn-primary btn-sm" onClick={() => update({ notes: notes.trim() || null }, 'Notes saved')}>Save notes</button>}
        </div>
      </div>

      <div className="adm-lead-actions">
        <a className="btn btn-outline btn-sm" href={telLink(lead.phone)}><Icon name="call" size={14} /> Call</a>
        <a className="btn btn-outline btn-sm" href={waLink(lead.phone, hello)} target="_blank" rel="noreferrer"><Icon name="whatsapp" size={14} /> WhatsApp</a>
        <button type="button" className="btn btn-outline btn-sm" onClick={onPay}><Icon name="card" size={14} /> Record payment</button>
        <button type="button" className="btn btn-quiet btn-sm" onClick={onEdit}><Icon name="edit" size={14} /> Edit</button>
        <ConfirmButton className="push" onConfirm={remove} />
      </div>
    </div>
  )
}

export default function Leads({ focus, plans, onPay }) {
  const { leads } = useBiz()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState(focus ? 'all' : 'open')
  const [openId, setOpenId] = useState(focus ?? null)
  const [sheet, setSheet] = useState(null) // null | {} (new) | lead (edit)
  useEffect(() => { if (focus) document.getElementById(`lead-${focus}`)?.scrollIntoView({ block: 'center' }) }, [focus])

  const counts = useMemo(() => {
    const c = { all: leads.length, open: 0, followup: 0 }
    for (const l of leads) {
      c[l.status] = (c[l.status] ?? 0) + 1
      if (['new', 'contacted', 'demo'].includes(l.status)) c.open++
      if (l.follow_up && daysUntil(l.follow_up) <= 0 && l.status !== 'won' && l.status !== 'lost') c.followup++
    }
    return c
  }, [leads])

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase()
    return leads.filter((l) => {
      if (filter === 'open' && !['new', 'contacted', 'demo'].includes(l.status)) return false
      if (filter === 'followup' && !(l.follow_up && daysUntil(l.follow_up) <= 0 && l.status !== 'won' && l.status !== 'lost')) return false
      if (!['all', 'open', 'followup'].includes(filter) && l.status !== filter) return false
      return !t || [l.name, l.phone, l.shop, l.city, l.plan, l.notes].some((v) => v?.toLowerCase().includes(t))
    })
  }, [leads, q, filter])

  const tabs = [
    { id: 'open', label: 'Open' },
    { id: 'followup', label: 'Call back today' },
    ...STATUSES,
    { id: 'all', label: 'All' },
  ]

  const exportCsv = () => downloadCsv(`zap-pos-leads-${today()}.csv`, [
    { label: 'Received', get: (l) => toDay(l.created_at) }, { label: 'Name', get: (l) => l.name }, { label: 'Phone', get: (l) => l.phone },
    { label: 'Shop', get: (l) => l.shop }, { label: 'City', get: (l) => l.city }, { label: 'Plan', get: (l) => l.plan },
    { label: 'Branches', get: (l) => l.branches }, { label: 'Status', get: (l) => statusLabel(l.status) }, { label: 'Call back on', get: (l) => l.follow_up },
    { label: 'Came from', get: (l) => l.source }, { label: 'Message', get: (l) => l.message }, { label: 'Notes', get: (l) => l.notes },
  ], shown)

  return (
    <>
      <PageBar title="Leads" sub={`${counts.new ?? 0} new · ${counts.open} open · ${counts.won ?? 0} customers`}>
        <button className="btn btn-quiet btn-sm" onClick={exportCsv} disabled={!shown.length}><Icon name="download" size={14} /> Export CSV</button>
        <button className="btn btn-primary btn-sm" onClick={() => setSheet({})}><Icon name="plus" size={14} /> Add lead</button>
      </PageBar>

      <div className="adm-panel wide">
        <div className="adm-toolbar">
          <div className="adm-search"><Icon name="search" size={16} /><input type="search" placeholder="Search name, phone, shop, city…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div className="adm-chips" role="tablist">
            {tabs.map((t) => (
              <button key={t.id} role="tab" aria-selected={filter === t.id} className={`${filter === t.id ? 'on' : ''} ${t.id === 'followup' && counts.followup ? 'alert' : ''}`} onClick={() => setFilter(t.id)}>
                {t.label} <em>{counts[t.id] ?? 0}</em>
              </button>
            ))}
          </div>
        </div>

        {!shown.length ? (
          <div className="adm-blank">
            <Icon name="users" size={28} />
            <p>{leads.length ? 'No leads match this filter.' : 'No leads yet. Demo requests from the website land here, and you can add calls and walk-ins yourself.'}</p>
          </div>
        ) : (
          <ul className="adm-rows">
            {shown.map((l) => {
              const open = openId === l.id
              const due = l.follow_up && l.status !== 'won' && l.status !== 'lost' ? daysUntil(l.follow_up) : null
              return (
                <li key={l.id} id={`lead-${l.id}`} className={`adm-row ${open ? 'open' : ''} ${l.status === 'new' ? 'is-new' : ''}`}>
                  <button type="button" className="adm-row-head" onClick={() => setOpenId(open ? null : l.id)} aria-expanded={open}>
                    <span className="adm-avatar">{l.name.trim()[0]?.toUpperCase()}</span>
                    <span className="adm-row-main">
                      <b>{l.name}{l.shop && <small> · {l.shop}</small>}</b>
                      <small>{l.phone}{l.city && ` · ${l.city}`}{l.plan && ` · ${l.plan}`}</small>
                    </span>
                    {due != null && <span className={`adm-due ${due < 0 ? 'late' : due === 0 ? 'today' : ''}`}><Icon name="calendar" size={12} /> {due < 0 ? `${-due} d late` : due === 0 ? 'Today' : dateFmt(l.follow_up)}</span>}
                    <StatusPill status={l.status} />
                    <span className="adm-row-time">{timeAgo(l.created_at)}</span>
                    <Icon name="chevD" size={16} className="adm-chev" />
                  </button>
                  {open && <LeadDetail lead={l} onEdit={() => setSheet(l)} onPay={() => onPay(l.id)} />}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {sheet && <LeadSheet lead={sheet} plans={plans} onClose={() => setSheet(null)} />}
    </>
  )
}
