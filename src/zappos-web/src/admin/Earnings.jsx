import { useEffect, useMemo, useState } from 'react'
import Icon from '../components/Icons.jsx'
import { Area, Stat } from './Charts.jsx'
import { dateFmt, downloadCsv, rs, rsShort, supabase, today, useBiz } from './biz.js'
import { PageBar, TableFoot, useNotify } from './ui.jsx'

// Earnings: everything shops have paid you, and every customer ranked by how much.
// Money in = payments you recorded (Payments page) + bills you marked settled (Bills page). They are kept apart in
// the table, so a bill you also entered as a payment is easy to spot.
const RANGES = [['all', 'All time'], ['year', 'This year'], ['12m', 'Last 12 months'], ['month', 'This month']]
const monthKey = (d) => d.slice(0, 7)
const monthLabel = (k, short) => new Date(`${k}-01T00:00:00`).toLocaleDateString('en-GB', short ? { month: 'short' } : { month: 'long', year: 'numeric' })

export default function Earnings({ onOpenLead }) {
  const { leads, payments } = useBiz()
  const notify = useNotify()
  const [bills, setBills] = useState(null)
  const [range, setRange] = useState('all')
  const [who, setWho] = useState('all')
  const [q, setQ] = useState('')

  useEffect(() => {
    supabase.from('bills').select('lead_id, amount, paid_on').eq('status', 'paid').then(({ data, error }) => { if (error) notify(error.message, 'error'); else setBills(data ?? []) })
  }, [])

  // every rupee that came in, with its date and shop
  const money = useMemo(() => [
    ...payments.map((p) => ({ lead_id: p.lead_id, amount: p.amount, on: p.paid_on, from: 'payment' })),
    ...(bills ?? []).map((b) => ({ lead_id: b.lead_id, amount: b.amount, on: b.paid_on, from: 'bill' })),
  ], [payments, bills])

  const t = today()
  const from = range === 'year' ? `${t.slice(0, 4)}-01-01` : range === 'month' ? `${t.slice(0, 7)}-01` : range === '12m' ? (() => { const d = new Date(`${t.slice(0, 7)}-01T00:00:00`); d.setMonth(d.getMonth() - 11); return d.toLocaleDateString('en-CA') })() : ''
  const inRange = money.filter((m) => !from || m.on >= from)
  const sum = (list) => list.reduce((s, m) => s + m.amount, 0)

  // ranked customers
  const ranked = useMemo(() => {
    const by = new Map()
    for (const m of inRange) {
      const r = by.get(m.lead_id) ?? { lead_id: m.lead_id, total: 0, payments: 0, bills: 0, count: 0, first: m.on, last: m.on }
      r.total += m.amount; r.count++
      if (m.from === 'payment') r.payments += m.amount; else r.bills += m.amount
      if (m.on < r.first) r.first = m.on
      if (m.on > r.last) r.last = m.on
      by.set(m.lead_id, r)
    }
    const byLead = Object.fromEntries(leads.map((l) => [l.id, l]))
    return [...by.values()].map((r) => ({ ...r, lead: byLead[r.lead_id] })).sort((a, b) => b.total - a.total).map((r, i) => ({ ...r, rank: i + 1 }))
  }, [inRange, leads])

  const total = sum(inRange)
  const top = ranked[0]?.total ?? 0
  const shown = ranked.filter((r) => {
    if (who === 'account' && !r.lead?.user_id) return false
    if (who === 'noaccount' && r.lead?.user_id) return false
    return !q || `${r.lead?.name ?? ''} ${r.lead?.shop ?? ''} ${r.lead?.phone ?? ''} ${r.lead?.city ?? ''}`.toLowerCase().includes(q.toLowerCase())
  })

  // per month, last 12 months
  const months = Array.from({ length: 12 }, (_, i) => { const d = new Date(`${t.slice(0, 7)}-01T00:00:00`); d.setMonth(d.getMonth() - (11 - i)); return d.toLocaleDateString('en-CA').slice(0, 7) })
  const perMonth = months.map((k) => ({ key: k, short: monthLabel(k, true), label: monthLabel(k), value: sum(money.filter((m) => monthKey(m.on) === k)) }))
  const best = [...perMonth].sort((a, b) => b.value - a.value)[0]
  const thisMonth = sum(money.filter((m) => monthKey(m.on) === monthKey(t)))
  const lastKey = months[10]
  const lastMonth = sum(money.filter((m) => monthKey(m.on) === lastKey))
  const withAccount = ranked.filter((r) => r.lead?.user_id).length

  const exportCsv = () => downloadCsv(`zap-pos-earnings-${t}.csv`, [
    { label: 'Rank', get: (r) => r.rank }, { label: 'Shop', get: (r) => r.lead?.shop }, { label: 'Name', get: (r) => r.lead?.name },
    { label: 'Phone', get: (r) => r.lead?.phone }, { label: 'Account', get: (r) => (r.lead?.user_id ? 'Yes' : 'No') },
    { label: 'Payments (Rs)', get: (r) => r.payments }, { label: 'Settled bills (Rs)', get: (r) => r.bills }, { label: 'Total (Rs)', get: (r) => r.total },
    { label: 'First paid', get: (r) => r.first }, { label: 'Last paid', get: (r) => r.last },
  ], shown)

  return (
    <>
      <PageBar icon="star" title="Earnings" sub="Everything shops have paid you, and who paid the most">
        <div className="adm-range">{RANGES.map(([id, label]) => <button key={id} className={range === id ? 'on' : ''} onClick={() => setRange(id)}>{label}</button>)}</div>
        <button className="btn btn-quiet btn-sm" onClick={exportCsv} disabled={!shown.length}><Icon name="download" size={14} /> Export CSV</button>
      </PageBar>

      <div className="adm-panel wide">
        <div className="adm-stats">
          <Stat hero icon="star" label={range === 'all' ? 'Total earned' : `Earned, ${RANGES.find((r) => r[0] === range)[1].toLowerCase()}`} value={bills ? rs(total) : '…'} sub={`${inRange.length} payment${inRange.length === 1 ? '' : 's'}`} />
          <Stat icon="calendar" label="This month" value={bills ? rs(thisMonth) : '…'} cur={thisMonth} prev={lastMonth} sub="vs last month" />
          <Stat icon="users" label="Paying customers" value={ranked.length} sub={`${withAccount} with an account`} />
          <Stat icon="chart" label="Average per customer" value={ranked.length ? rsShort(total / ranked.length) : 'Rs 0'} sub="in this period" />
          <Stat icon="check" label="Top customer" value={ranked[0] ? rsShort(top) : '–'} sub={ranked[0] ? (ranked[0].lead?.shop || ranked[0].lead?.name) : 'no payments yet'} />
          <Stat icon="arrow" label="Best month" value={best?.value ? rsShort(best.value) : '–'} sub={best?.value ? best.label : 'last 12 months'} />
        </div>

        <section className="adm-block">
          <div className="adm-block-head"><h2>Earned per month</h2><small className="adm-muted">Last 12 months · payments + settled bills</small></div>
          <Area data={perMonth} name="earned" format={rs} height={170} />
        </section>

        <div className="adm-toolbar">
          <div className="adm-chips">
            {[['all', 'All customers', ranked.length], ['account', 'With account', withAccount], ['noaccount', 'No account', ranked.length - withAccount]].map(([id, label, n]) => (
              <button key={id} className={who === id ? 'on' : ''} onClick={() => setWho(id)}>{label} <em>{n}</em></button>
            ))}
          </div>
          <div className="adm-search"><Icon name="search" size={16} /><input type="search" placeholder="Search shop, name, phone or city…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        </div>

        {!bills ? <div className="adm-skel" /> : !shown.length ? (
          <div className="adm-blank"><Icon name="star" size={28} /><p>{ranked.length ? 'No customers match.' : 'No money in yet for this period. Record payments on the Payments page, or settle bills on the Bills page.'}</p></div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead><tr><th>Rank</th><th>Customer</th><th>Account</th><th className="num">Payments</th><th className="num">Settled bills</th><th>Paying since</th><th className="num">Total paid</th></tr></thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.lead_id} className="adm-rank-row" onClick={() => r.lead && onOpenLead(r.lead.id)}>
                    <td data-label="Rank"><span className={`adm-rank r${Math.min(r.rank, 4)}`}>{r.rank}</span></td>
                    <td data-label="Customer" className="lead-cell"><b>{r.lead?.shop || r.lead?.name || 'Deleted lead'}</b><small>{[r.lead?.shop ? r.lead.name : null, r.lead?.phone, r.lead?.city].filter(Boolean).join(' · ')}</small></td>
                    <td data-label="Account">{r.lead?.user_id ? <span className="adm-bill paid">Has account</span> : <span className="adm-bill cancelled">No account</span>}</td>
                    <td data-label="Payments" className="num">{r.payments ? rs(r.payments) : '–'}</td>
                    <td data-label="Settled bills" className="num">{r.bills ? rs(r.bills) : '–'}</td>
                    <td data-label="Paying since" className="adm-td-dates"><small>{dateFmt(r.first)}</small><small>last {dateFmt(r.last)} · {r.count}×</small></td>
                    <td data-label="Total paid" className="num adm-rank-total"><b>{rs(r.total)}</b><span className="adm-share"><i style={{ width: `${top ? (r.total / top) * 100 : 0}%` }} /></span><small>{total ? Math.round((r.total / total) * 100) : 0}% of earnings</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <TableFoot count={shown.length} noun="customers" />
          </div>
        )}
      </div>
    </>
  )
}
