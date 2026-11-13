import { useMemo, useState } from 'react'
import Icon from '../components/Icons.jsx'
import { BILLING, METHODS, addMonths, customersOf, dateFmt, downloadCsv, rs, rsShort, telLink, today, useBiz, waLink } from './biz.js'
import { BarList, Bars, Stat } from './Charts.jsx'
import { Card, ConfirmButton, Field, PageBar, Sheet, useNotify } from './ui.jsx'

const monthKey = (d) => d.slice(0, 7)
const monthName = (k, short) => new Date(`${k}-01T00:00:00`).toLocaleDateString('en-GB', short ? { month: 'short' } : { month: 'long', year: 'numeric' })
const lastMonths = (n) => {
  const out = []
  const d = new Date(`${today().slice(0, 7)}-01T00:00:00`)
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d); x.setMonth(d.getMonth() - i)
    out.push(x.toLocaleDateString('en-CA').slice(0, 7))
  }
  return out
}
const coverOf = (billing, paidOn) => (billing === 'monthly' ? addMonths(paidOn, 1) : billing === 'yearly' ? addMonths(paidOn, 12) : '')

// Record or edit a payment. Amount and "paid until" fill in from the plan, until you type your own.
export function PaymentSheet({ payment, plans, onClose, onAddLead }) {
  const { leads, savePayment } = useBiz()
  const notify = useNotify()
  const lead0 = leads.find((l) => l.id === payment.lead_id)
  const [f, setF] = useState(() => {
    const base = { lead_id: '', amount: '', paid_on: today(), method: 'cash', plan: lead0?.plan ?? plans[0]?.name ?? '', billing: 'monthly', branches: lead0?.branches ?? 1, paid_until: '', reference: '', note: '', ...payment }
    return {
      ...base,
      paid_until: payment.id ? payment.paid_until ?? '' : coverOf(base.billing, base.paid_on),
      amount: payment.id ? base.amount : priceFor(plans, base),
    }
  })
  const [touched, setTouched] = useState({ amount: Boolean(payment.id), paid_until: Boolean(payment.id) })
  const [busy, setBusy] = useState(false)

  const change = (k) => (e) => {
    const v = e.target.value
    const next = { ...f, [k]: v }
    if (k === 'amount' || k === 'paid_until') setTouched({ ...touched, [k]: true })
    if (k === 'lead_id') { const l = leads.find((x) => x.id === v); if (l?.plan) next.plan = l.plan; if (l?.branches) next.branches = l.branches }
    if (!touched.amount && k !== 'amount') next.amount = priceFor(plans, next)
    if (!touched.paid_until && (k === 'billing' || k === 'paid_on')) next.paid_until = coverOf(next.billing, next.paid_on)
    setF(next)
  }

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await savePayment({
        ...f, amount: Math.round(Number(f.amount)), branches: Number(f.branches) || 1, paid_until: f.paid_until || null,
        plan: f.plan || null, reference: (f.reference ?? '').trim() || null, note: (f.note ?? '').trim() || null,
      })
      notify(payment.id ? 'Payment updated' : 'Payment recorded'); onClose()
    } catch (err) { notify(err.message, 'error'); setBusy(false) }
  }

  const sorted = [...leads].sort((a, b) => (a.status === 'won') === (b.status === 'won') ? a.name.localeCompare(b.name) : a.status === 'won' ? -1 : 1)

  return (
    <Sheet title={payment.id ? 'Edit payment' : 'Record a payment'} onClose={onClose}>
      {!leads.length ? (
        <div className="adm-blank small"><p>Add the customer as a lead first, then record their payment.</p><button className="btn btn-primary btn-sm" onClick={onAddLead}>Add lead</button></div>
      ) : (
        <form className="adm-form" onSubmit={submit}>
          <div className="adm-grid">
            <Field label="Customer" wide>
              <select required value={f.lead_id} onChange={change('lead_id')}>
                <option value="" disabled>Choose a customer…</option>
                {sorted.map((l) => <option key={l.id} value={l.id}>{l.name}{l.shop ? ` · ${l.shop}` : ''}{l.status !== 'won' ? ' (lead)' : ''}</option>)}
              </select>
            </Field>
            <Field label="Plan">
              <select value={f.plan ?? ''} onChange={change('plan')}>
                <option value="">Other</option>
                {plans.map((p) => <option key={p.name}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Billing">
              <select value={f.billing} onChange={change('billing')}>{Object.entries(BILLING).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            </Field>
            <Field label="Branches"><input type="number" min={1} max={999} value={f.branches} onChange={change('branches')} /></Field>
            <Field label="Amount (Rs)" hint={touched.amount ? null : 'Filled from the plan price. Change it if they paid something else.'}>
              <input type="number" required min={1} step={1} value={f.amount} onChange={change('amount')} />
            </Field>
            <Field label="Paid on"><input type="date" required value={f.paid_on} onChange={change('paid_on')} /></Field>
            <Field label="Method">
              <select value={f.method} onChange={change('method')}>{Object.entries(METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            </Field>
            <Field label="Paid until (renewal date)" hint="Leave empty for one-time payments.">
              <input type="date" value={f.paid_until ?? ''} onChange={change('paid_until')} />
            </Field>
            <Field label="Reference"><input type="text" maxLength={80} value={f.reference ?? ''} onChange={change('reference')} placeholder="Transaction ID, cheque no…" /></Field>
            <Field label="Note" wide><textarea rows={2} maxLength={500} value={f.note ?? ''} onChange={change('note')} /></Field>
          </div>
          <div className="adm-form-actions">
            <button type="button" className="btn btn-quiet btn-sm" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary btn-sm" disabled={busy}>{busy ? 'Saving…' : payment.id ? 'Save changes' : 'Record payment'}</button>
          </div>
        </form>
      )}
    </Sheet>
  )
}

function priceFor(plans, f) {
  const p = plans.find((x) => x.name === f.plan)
  const n = Number(f.branches) || 1
  const unit = f.billing === 'monthly' ? p?.monthly : f.billing === 'yearly' ? p?.annual : null
  return unit ? String(unit * (p.unit ? n : 1)) : ''
}

const stateText = (c) => c.state === 'overdue' ? `${-c.left} d overdue` : c.state === 'due' ? (c.left === 0 ? 'Due today' : `Due in ${c.left} d`) : c.state === 'active' ? 'Active' : 'No renewal date'

export function Customers({ onPay, onOpenLead }) {
  const { leads, payments } = useBiz()
  const [q, setQ] = useState('')
  const all = useMemo(() => customersOf(leads, payments).sort((a, b) => (a.left ?? 1e9) - (b.left ?? 1e9)), [leads, payments])
  const shown = all.filter((c) => !q.trim() || [c.lead.name, c.lead.shop, c.lead.phone, c.lead.city].some((v) => v?.toLowerCase().includes(q.trim().toLowerCase())))
  const live = all.filter((c) => c.state === 'active' || c.state === 'due')
  const mrr = live.reduce((s, c) => s + (c.last?.billing === 'yearly' ? c.last.amount / 12 : c.last?.billing === 'monthly' ? c.last.amount : 0), 0)
  const remind = (c) => `Assalam o Alaikum ${c.lead.name}, a reminder from ZAP POS: your ${c.plan ?? ''} plan ${c.left < 0 ? 'expired' : 'renews'} on ${dateFmt(c.paidUntil)}. Please let us know when you've paid. Thank you!`

  return (
    <>
      <div className="adm-stats">
        <Stat icon="users" label="Customers" value={all.length} sub={`${live.length} active`} />
        <Stat icon="calendar" label="Due in 7 days" value={all.filter((c) => c.state === 'due').length} sub="renewals coming up" />
        <Stat icon="close" label="Overdue" value={all.filter((c) => c.state === 'overdue').length} sub="past their paid-until date" />
        <Stat icon="chart" label="Monthly income (est.)" value={rsShort(mrr)} sub="active plans, yearly ÷ 12" />
      </div>
      <div className="adm-toolbar">
        <div className="adm-search"><Icon name="search" size={16} /><input type="search" placeholder="Search customers…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>
      {!shown.length ? (
        <div className="adm-blank"><Icon name="users" size={28} /><p>{all.length ? 'No customers match.' : 'No customers yet. Mark a lead as Customer or record their first payment.'}</p></div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead><tr><th>Customer</th><th>Plan</th><th>Paid until</th><th>Status</th><th className="num">Total paid</th><th /></tr></thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.lead.id}>
                  <td className="lead-cell"><button className="adm-tlink" onClick={() => onOpenLead(c.lead.id)}><b>{c.lead.name}</b></button><small>{[c.lead.shop, c.lead.city].filter(Boolean).join(' · ') || c.lead.phone}</small></td>
                  <td data-label="Plan">{c.plan ?? '–'}{c.branches > 1 && <small>{c.branches} branches</small>}</td>
                  <td data-label="Paid until">{dateFmt(c.paidUntil)}</td>
                  <td data-label="Status"><span className={`adm-renew ${c.state}`}>{stateText(c)}</span></td>
                  <td data-label="Total paid" className="num">{rs(c.total)}<small>{c.count} payment{c.count === 1 ? '' : 's'}</small></td>
                  <td className="adm-td-actions">
                    {(c.state === 'due' || c.state === 'overdue') && <a className="btn btn-outline btn-sm" href={waLink(c.lead.phone, remind(c))} target="_blank" rel="noreferrer"><Icon name="whatsapp" size={14} /> Remind</a>}
                    <a className="adm-icon-btn plain" href={telLink(c.lead.phone)} title="Call"><Icon name="call" size={15} /></a>
                    <button className="btn btn-quiet btn-sm" onClick={() => onPay(c.lead.id)}><Icon name="plus" size={14} /> Payment</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

export default function Payments({ tab, go, onPay, onEditPayment, onOpenLead }) {
  const { leads, payments, deletePayment } = useBiz()
  const notify = useNotify()
  const [month, setMonth] = useState('all')
  const [q, setQ] = useState('')
  const name = useMemo(() => Object.fromEntries(leads.map((l) => [l.id, l])), [leads])

  const now = today()
  const sum = (ps) => ps.reduce((s, p) => s + p.amount, 0)
  const thisMonth = payments.filter((p) => monthKey(p.paid_on) === monthKey(now))
  const prevKey = lastMonths(2)[0]
  const prevMonth = payments.filter((p) => monthKey(p.paid_on) === prevKey)
  const thisYear = payments.filter((p) => p.paid_on.slice(0, 4) === now.slice(0, 4))
  const months = lastMonths(12)
  const byMonth = months.map((k) => ({ key: k, label: monthName(k), short: monthName(k, true), value: sum(payments.filter((p) => monthKey(p.paid_on) === k)) }))
  const group = (key, labels) => {
    const m = new Map()
    for (const p of payments) { const k = labels ? labels[p[key]] ?? p[key] : p[key] ?? 'Other'; m.set(k, (m.get(k) ?? 0) + p.amount) }
    return [...m].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
  }
  const monthsWithPayments = [...new Set(payments.map((p) => monthKey(p.paid_on)))].sort().reverse()

  const shown = payments.filter((p) => {
    if (month !== 'all' && monthKey(p.paid_on) !== month) return false
    const t = q.trim().toLowerCase(); const l = name[p.lead_id]
    return !t || [l?.name, l?.shop, p.reference, p.note, p.plan].some((v) => v?.toLowerCase().includes(t))
  })

  const exportCsv = () => downloadCsv(`zap-pos-payments-${month === 'all' ? today() : month}.csv`, [
    { label: 'Paid on', get: (p) => p.paid_on }, { label: 'Customer', get: (p) => name[p.lead_id]?.name }, { label: 'Shop', get: (p) => name[p.lead_id]?.shop },
    { label: 'Phone', get: (p) => name[p.lead_id]?.phone }, { label: 'Plan', get: (p) => p.plan }, { label: 'Billing', get: (p) => BILLING[p.billing] },
    { label: 'Branches', get: (p) => p.branches }, { label: 'Amount (Rs)', get: (p) => p.amount }, { label: 'Method', get: (p) => METHODS[p.method] },
    { label: 'Paid until', get: (p) => p.paid_until }, { label: 'Reference', get: (p) => p.reference }, { label: 'Note', get: (p) => p.note },
  ], shown)

  const remove = async (id) => {
    try { await deletePayment(id); notify('Payment deleted') } catch (err) { notify(err.message, 'error') }
  }

  return (
    <>
      <PageBar title={tab === 'customers' ? 'Customers' : 'Payments'} sub={`${rs(sum(thisMonth))} received in ${monthName(monthKey(now))}`}>
        {tab !== 'customers' && <button className="btn btn-quiet btn-sm" onClick={exportCsv} disabled={!shown.length}><Icon name="download" size={14} /> Export CSV</button>}
        <button className="btn btn-primary btn-sm" onClick={() => onPay(null)}><Icon name="plus" size={14} /> Record payment</button>
      </PageBar>

      <div className="adm-panel wide">
        <div className="adm-tabs" role="tablist">
          <button role="tab" aria-selected={tab !== 'customers'} className={tab !== 'customers' ? 'on' : ''} onClick={() => go('payments')}>Payments</button>
          <button role="tab" aria-selected={tab === 'customers'} className={tab === 'customers' ? 'on' : ''} onClick={() => go('customers')}>Customers &amp; renewals</button>
        </div>

        {tab === 'customers' ? <Customers onPay={onPay} onOpenLead={onOpenLead} /> : (
          <>
            <div className="adm-stats">
              <Stat icon="card" label="This month" value={rs(sum(thisMonth))} cur={sum(thisMonth)} prev={sum(prevMonth)} sub={`${thisMonth.length} payments`} />
              <Stat icon="calendar" label={monthName(prevKey)} value={rs(sum(prevMonth))} sub={`${prevMonth.length} payments`} />
              <Stat icon="chart" label={`This year (${now.slice(0, 4)})`} value={rs(sum(thisYear))} sub={`${thisYear.length} payments`} />
              <Stat icon="receipt" label="All time" value={rs(sum(payments))} sub={`${payments.length} payments`} />
            </div>

            <div className="adm-two">
              <Card title="Received per month" className="span2">
                <Bars data={byMonth} name="received" format={rsShort} />
              </Card>
              <Card title="By payment method"><BarList items={group('method', METHODS)} format={rsShort} empty="No payments yet." /></Card>
              <Card title="By plan"><BarList items={group('plan')} format={rsShort} empty="No payments yet." /></Card>
            </div>

            <div className="adm-toolbar">
              <div className="adm-search"><Icon name="search" size={16} /><input type="search" placeholder="Search customer, reference, note…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
              <select className="adm-select" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Month">
                <option value="all">All months</option>
                {monthsWithPayments.map((k) => <option key={k} value={k}>{monthName(k)}</option>)}
              </select>
            </div>

            {!shown.length ? (
              <div className="adm-blank"><Icon name="card" size={28} /><p>{payments.length ? 'No payments match.' : 'No payments yet. When a shop pays you, record it here: cash, bank, JazzCash or Easypaisa.'}</p></div>
            ) : (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead><tr><th>Date</th><th>Customer</th><th>Plan</th><th>Method</th><th>Paid until</th><th className="num">Amount</th><th /></tr></thead>
                  <tbody>
                    {shown.map((p) => (
                      <tr key={p.id}>
                        <td data-label="Date">{dateFmt(p.paid_on)}</td>
                        <td className="lead-cell"><button className="adm-tlink" onClick={() => onOpenLead(p.lead_id)}><b>{name[p.lead_id]?.name ?? 'Unknown'}</b></button><small>{name[p.lead_id]?.shop}</small></td>
                        <td data-label="Plan">{p.plan ?? '–'}<small>{BILLING[p.billing]}{p.branches > 1 ? ` · ${p.branches} branches` : ''}</small></td>
                        <td data-label="Method">{METHODS[p.method]}{p.reference && <small>{p.reference}</small>}</td>
                        <td data-label="Paid until">{dateFmt(p.paid_until)}</td>
                        <td data-label="Amount" className="num"><b>{rs(p.amount)}</b></td>
                        <td className="adm-td-actions">
                          <button className="adm-icon-btn plain" title="Edit" onClick={() => onEditPayment(p)}><Icon name="edit" size={15} /></button>
                          <ConfirmButton onConfirm={() => remove(p.id)}><Icon name="close" size={14} /></ConfirmButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr><td colSpan={5}>{shown.length} payment{shown.length === 1 ? '' : 's'}</td><td className="num"><b>{rs(sum(shown))}</b></td><td /></tr></tfoot>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}

