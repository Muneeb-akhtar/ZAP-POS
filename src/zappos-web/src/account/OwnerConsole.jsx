import { useEffect, useMemo, useState } from 'react'
import Icon, { Logo } from '../components/Icons.jsx'
import { ThemeToggle } from '../components/Sections.jsx'
import { rs, supabase, timeAgo } from '../admin/biz.js'
import { Area, Donut, Stat } from '../admin/Charts.jsx'
import { Card, PageBar } from '../admin/ui.jsx'

// The shop owner's console at /account/: today's sales of every branch, each branch on its own, and the plan.
// Same frame and parts as the admin panel (top bar, sidebar, stat cards, charts), phone first: on a phone the sidebar
// becomes a row of branch chips and every table turns into labelled cards.
// Data: my_branches() (only this shop's branches, see supabase/schema.sql §23 and the desktop repo's cloud/*.sql).
// Each branch's main PC sends its daily totals (sales, bills, cash, refunds, discounts, cancelled) every 30 s when online,
// and from 1.9.148 today's top sellers (branch.top) and what is out or low (branch.stock).
// Text: account.owner in landing-content.json.

const fill = (text, vals) => text.replace(/\{(\w+)\}/g, (_, k) => vals[k] ?? '')
const TONES = ['blue', 'amber', 'red', 'green', 'violet', 'pink']
const ONLINE_MS = 10 * 60 * 1000
const pkDay = (d = new Date()) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' })
const addDays = (day, n) => { const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const shortL = (n) => (n >= 1e5 ? `Rs ${(n / 1e5).toFixed(n >= 1e6 ? 0 : 1)}L` : rs(n))   // lakh, as shops say it
const isOnline = (b) => b.lastSeen && Date.now() - new Date(b.lastSeen).getTime() < ONLINE_MS
const greet = (o) => { const h = Number(new Date().toLocaleString('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Karachi' })); return h < 12 ? o.morning : h < 17 ? o.afternoon : o.evening }

function SyncPill({ b, o }) {
  if (!b.lastSeen) return <span className="own-sync wait"><i />{o.waitingFirst}</span>
  return isOnline(b)
    ? <span className="own-sync ok"><i />{fill(o.synced, { ago: timeAgo(b.lastSeen) })}</span>
    : <span className="own-sync off"><i />{fill(o.internetOff, { ago: timeAgo(b.lastSeen) })}</span>
}

// Today's top sellers and what is running low, sent by each branch's main PC from ZAP POS 1.9.148 (null before: not shown).
const qty = (n) => Number(n).toLocaleString('en-PK', { maximumFractionDigits: 3 })
function TopCard({ items, o }) {
  const max = Math.max(1, ...items.map((x) => Number(x.amount)))
  return (
    <Card title={o.topTitle} className="own-top">
      {items.length ? (
        <ol className="own-list">{items.map((x, i) => (
          <li key={x.name} style={{ '--i': i }}>
            <span className="own-list-row"><b>{x.name}</b><small>{qty(x.qty)} · {rs(Number(x.amount))}</small></span>
            <span className="own-bar"><i style={{ '--w': `${Math.max(4, (Number(x.amount) / max) * 100)}%` }} /></span>
          </li>
        ))}</ol>
      ) : <p className="adm-muted">{o.topEmpty}</p>}
      {items.length > 0 && <p className="own-note">{fill(o.topNote, { n: items.length })}</p>}
    </Card>
  )
}
function LowCard({ stock, o }) {
  const shown = stock.items.slice(0, 8), more = Number(stock.out) + Number(stock.low) - shown.length
  return (
    <Card title={o.lowTitle} className="own-low" action={<span className="own-note">{fill(o.lowCount, { out: stock.out, low: stock.low })}</span>}>
      {shown.length ? (
        <ul className="own-list">{shown.map((x, i) => (
          <li key={x.name} style={{ '--i': i }} className="own-list-row">
            <b>{x.name}</b>
            {Number(x.stock) <= 0 ? <span className="own-chip out">{o.outChip}</span> : <span className="own-chip low">{fill(o.leftChip, { n: qty(x.stock) })}</span>}
          </li>
        ))}</ul>
      ) : <p className="adm-muted">{o.lowEmpty}</p>}
      {more > 0 && <p className="own-note">{fill(o.lowMore, { n: more })}</p>}
    </Card>
  )
}
const stockChip = (b, o) => !b.stock ? <span className="adm-muted">–</span>
  : Number(b.stock.out) + Number(b.stock.low) === 0 ? <span className="own-chip ok">{o.stockOk}</span>
  : <span className={`own-chip ${Number(b.stock.out) ? 'out' : 'low'}`}>{fill(o.lowCount, { out: b.stock.out, low: b.stock.low })}</span>

function Empty({ o, links }) {
  return (
    <Card title={o.emptyTitle} className="own-empty">
      <p>{o.emptyText}</p>
      <ol className="own-steps">{o.emptySteps.map((s, i) => <li key={s} style={{ '--i': i }}><span>{i + 1}</span>{s}</li>)}</ol>
      <p className="adm-muted">{o.emptyNote}</p>
      <a className="btn btn-outline btn-sm" href={links.whatsapp}><Icon name="whatsapp" size={14} /> {o.help}</a>
    </Card>
  )
}

export default function OwnerConsole({ acc, t, links, children }) {
  const o = t.owner
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [view, setView] = useState(() => location.hash.slice(1) || 'all')   // 'all' | 'plan' | a branch id
  const go = (v) => { setView(v); history.replaceState(null, '', `#${v}`); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  useEffect(() => {
    let live = true
    const load = () => supabase.rpc('my_branches', { p_days: 35 }).then(({ data: d, error: e }) => {
      if (!live) return
      if (e) setError(e.message); else { setError(''); setData(d) }
    })
    load()
    const timer = setInterval(load, 60000)   // branches sync every 30 s; a minute keeps the page fresh without hammering
    return () => { live = false; clearInterval(timer) }
  }, [])

  const branches = data?.branches ?? []
  const today = pkDay(), lastWeek = addDays(today, -7)
  const branch = branches.find((b) => b.id === view)
  const scope = useMemo(() => (data?.days ?? []).filter((d) => !branch || d.branch === branch.id), [data, branch])
  const sum = (day, k) => scope.filter((d) => d.businessDay === day).reduce((s, d) => s + Number(d[k] ?? 0), 0)
  const series = useMemo(() => Array.from({ length: 30 }, (_, i) => {
    const day = addDays(today, i - 29), d = new Date(`${day}T12:00:00Z`)
    return { key: day, short: String(d.getUTCDate()), label: d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }), value: sum(day, 'sales') }
  }), [scope, today])   // eslint-disable-line react-hooks/exhaustive-deps
  const todayOf = (b, k) => (data?.days ?? []).filter((d) => d.branch === b.id && d.businessDay === today).reduce((s, d) => s + Number(d[k] ?? 0), 0)
  const online = branches.filter(isOnline).length

  const nav = (
    <>
      <span className="adm-nav-group">{o.myBranches}</span>
      <button className={view === 'all' ? 'on' : ''} onClick={() => go('all')}><Icon name="grid" size={16} /> {o.allBranches}<Icon name="chevL" size={14} className="adm-nav-chev" /></button>
      {branches.map((b) => (
        <button key={b.id} className={view === b.id ? 'on' : ''} onClick={() => go(b.id)}>
          <Icon name="server" size={16} /> {b.name}{b.lastSeen && !isOnline(b) && <em className="adm-badge amber">{o.offline}</em>}<Icon name="chevL" size={14} className="adm-nav-chev" />
        </button>
      ))}
      <span className="adm-nav-group">{o.accountGroup}</span>
      <button className={view === 'plan' ? 'on' : ''} onClick={() => go('plan')}><Icon name="card" size={16} /> {o.planTab}<Icon name="chevL" size={14} className="adm-nav-chev" /></button>
    </>
  )

  let main
  if (view === 'plan') main = <div className="adm-panel wide own-plan">{children}</div>
  else if (error) main = <div className="adm-panel wide"><p className="adm-error">{t.error}</p></div>
  else if (!data) main = <div className="adm-panel wide"><div className="adm-skel" /><div className="adm-skel short" /></div>
  else if (!branches.length) main = <div className="adm-panel wide"><Empty o={o} links={links} /></div>
  else {
    const sales = sum(today, 'sales')
    main = (
      <div className="adm-panel wide own">
        <div className="adm-stats">
          <Stat hero icon="card" label={branch ? o.salesBranch : o.salesAll} value={rs(sales)} cur={sales} prev={sum(lastWeek, 'sales')} sub={o.vsLastWeek} />
          <Stat icon="receipt" label={o.bills} value={sum(today, 'bills')} cur={sum(today, 'bills')} prev={sum(lastWeek, 'bills')} sub={sum(today, 'cancelledOrders') ? fill(o.cancelled, { n: sum(today, 'cancelledOrders') }) : o.vsLastWeek} />
          <Stat icon="drawer" label={o.cash} value={rs(sum(today, 'cash'))} sub={o.cashSub} />
          <Stat icon="minus" label={o.refunds} value={rs(sum(today, 'refunds'))} />
          <Stat icon="tag" label={o.discounts} value={rs(sum(today, 'discounts'))} />
          {branch
            ? <Stat icon="server" label={o.lastSync} value={branch.lastSeen ? timeAgo(branch.lastSeen) : o.neverSynced} sub={branch.code} />
            : <Stat icon="server" label={o.online} value={`${online} / ${branches.length}`} sub={o.onlineSub} />}
        </div>

        <div className={branch ? '' : 'adm-wide-two'}>
          <Card title={o.salesChart}><Area data={series} name="" format={rs} height={150} /></Card>
          {!branch && (
            <Card title={o.byBranch}>
              <Donut sub={o.soldToday} middle={shortL(sales)}
                parts={branches.map((b, i) => ({ label: b.name, value: todayOf(b, 'sales'), show: shortL(todayOf(b, 'sales')), tone: TONES[i % TONES.length] }))} />
            </Card>
          )}
        </div>

        {branch && (branch.top || branch.stock) && (
          <div className="adm-wide-two own-pair">
            {branch.top && <TopCard items={branch.top} o={o} />}
            {branch.stock && <LowCard stock={branch.stock} o={o} />}
          </div>
        )}

        {branch ? (
          <Card title={o.weekTable}>
            <div className="adm-table-wrap"><table className="adm-table own-table">
              <thead><tr><th>{o.colDay}</th><th className="num">{o.colSales}</th><th className="num">{o.colBills}</th><th className="num">{o.colCash}</th><th className="num">{o.colRefunds}</th></tr></thead>
              <tbody>{Array.from({ length: 7 }, (_, i) => addDays(today, -i)).map((day, i) => (
                <tr key={day} style={{ '--i': i }}>
                  <td data-label={o.colDay}><b>{new Date(`${day}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</b></td>
                  <td data-label={o.colSales} className="num"><b>{rs(sum(day, 'sales'))}</b></td>
                  <td data-label={o.colBills} className="num">{sum(day, 'bills')}</td>
                  <td data-label={o.colCash} className="num">{rs(sum(day, 'cash'))}</td>
                  <td data-label={o.colRefunds} className="num">{rs(sum(day, 'refunds'))}</td>
                </tr>
              ))}</tbody>
            </table></div>
          </Card>
        ) : (
          <Card title={o.branchTable}>
            <div className="adm-table-wrap"><table className="adm-table own-table">
              <thead><tr><th>{o.colBranch}</th><th className="num">{o.colSales}</th><th className="num">{o.colBills}</th><th className="num">{o.colCash}</th><th className="num">{o.colRefunds}</th><th>{o.colStock}</th><th>{o.colSync}</th></tr></thead>
              <tbody>{branches.map((b, i) => (
                <tr key={b.id} style={{ '--i': i }} className="own-row" onClick={() => go(b.id)}>
                  <td data-label={o.colBranch}><b>{b.name}</b><small>{b.code}</small></td>
                  <td data-label={o.colSales} className="num"><b>{rs(todayOf(b, 'sales'))}</b></td>
                  <td data-label={o.colBills} className="num">{todayOf(b, 'bills')}</td>
                  <td data-label={o.colCash} className="num">{rs(todayOf(b, 'cash'))}</td>
                  <td data-label={o.colRefunds} className="num">{rs(todayOf(b, 'refunds'))}</td>
                  <td data-label={o.colStock}>{stockChip(b, o)}</td>
                  <td data-label={o.colSync}><SyncPill b={b} o={o} /></td>
                </tr>
              ))}</tbody>
            </table></div>
          </Card>
        )}
      </div>
    )
  }

  const title = view === 'plan' ? o.planTab : branch ? branch.name : `${greet(o)}, ${(acc.name ?? '').split(' ')[0]}`
  const sub = view === 'plan' ? acc.shop : `${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Karachi' })} · ${o.updates}`
  return (
    <div className="adm own-console">
      <header className="adm-top">
        <a className="adm-top-brand" href="/"><Logo size={38} /><span><b>ZAP <i>POS</i></b><small>{acc.shop || o.console}</small></span></a>
        <nav className="adm-top-nav" aria-label={o.console}>
          <button className={view !== 'plan' ? 'on' : ''} onClick={() => go('all')}><Icon name="grid" size={15} /> {o.today}</button>
          <button className={view === 'plan' ? 'on' : ''} onClick={() => go('plan')}><Icon name="card" size={15} /> {o.planTab}</button>
        </nav>
        <span className="adm-top-me">
          <ThemeToggle />
          <button className="adm-top-logout" onClick={() => supabase.auth.signOut()}><Icon name="logout" size={16} /> {t.signOut}</button>
        </span>
      </header>
      <aside className="adm-side">
        <span className="adm-console"><Icon name="zap" size={14} /> {o.console}</span>
        <nav className="adm-nav">{nav}</nav>
        <div className="adm-side-foot">
          <span className="adm-me"><span className="adm-me-badge">{(acc.name ?? '?')[0]?.toUpperCase()}</span><span><b>{acc.shop || acc.name}</b><span className="adm-user">{acc.email}</span></span></span>
          <a className="adm-logout" href={links.whatsapp}><Icon name="whatsapp" size={15} /> {o.help}</a>
        </div>
      </aside>
      <main className="adm-main">
        <PageBar icon={view === 'plan' ? 'card' : branch ? 'server' : 'grid'} title={title} sub={sub} />
        {main}
      </main>
    </div>
  )
}
