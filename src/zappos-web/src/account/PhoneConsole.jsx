import { useEffect, useRef, useState } from 'react'
import Icon, { Logo } from '../components/Icons.jsx'
import { ThemeToggle } from '../components/Sections.jsx'
import { rs, supabase, timeAgo } from '../admin/biz.js'
import InstallHint from './InstallHint.jsx'
import { addDays, clock, fill, isOnline, pkDay, qty } from './ownerData.js'

// The owner console on a phone (and when installed on the home screen): built like a shop's register, not a dashboard.
// Four tabs at the bottom: Today (all branches), Branches (each branch, tap for its day), Stock (out / low / on the way), Plan.
// Pull down to refresh; without internet it shows the last figures it loaded, with their time (OwnerConsole keeps them).
// Data and texts come from OwnerConsole.jsx (account.owner.ph* in landing-content.json). Styles: "Owner console on a phone" in admin.css.

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const digits = (n) => Math.round(n ?? 0).toLocaleString('en-PK')

// The big figure settles slowly from the last value it showed, like a counter, instead of jumping.
function useSettle(value) {
  const [shown, setShown] = useState(value)
  const from = useRef(0)
  useEffect(() => {
    if (reduced()) { setShown(value); from.current = value; return }
    const start = performance.now(), a = from.current, ms = 1100
    let raf
    const step = (now) => {
      const p = Math.min(1, (now - start) / ms), e = 1 - (1 - p) ** 3
      setShown(a + (value - a) * e)
      if (p < 1) raf = requestAnimationFrame(step); else from.current = value
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return shown
}

function Figure({ label, value }) {
  const shown = useSettle(value)
  return <p className="ph-figure" aria-label={`${label}: ${rs(value)}`}><small>Rs</small>{digits(shown)}</p>
}

// "18% more than last Wednesday (Rs 4,08,000)": the comparison an owner actually says out loud.
function Compare({ cur, prev, day, o }) {
  if (!prev) return <p className="ph-compare">{fill(o.phNoLast, { day })}</p>
  const p = Math.round(((cur - prev) / prev) * 100)
  if (p === 0) return <p className="ph-compare">{fill(o.phSame, { day })}</p>
  return (
    <p className="ph-compare">
      <b className={p > 0 ? 'up' : 'down'}>{fill(p > 0 ? o.phUp : o.phDown, { p: Math.abs(p) })}</b> {fill(o.phThan, { day, amt: rs(prev) })}
    </p>
  )
}

function Week({ days, o }) {
  const max = Math.max(1, ...days.map((d) => d.value))
  return (
    <section className="ph-sec">
      <h2 className="ph-h">{o.phWeek}</h2>
      <div className="ph-week">
        {days.map((d, i) => (
          <span key={d.day} className={i === days.length - 1 ? 'today' : ''} style={{ '--h': `${Math.max(3, (d.value / max) * 100)}%`, '--i': i }} title={`${d.label}: ${rs(d.value)}`}>
            <i /><small>{i === days.length - 1 ? o.phTodayShort : d.short}</small>
          </span>
        ))}
      </div>
    </section>
  )
}

function Ledger({ rows }) {
  return <dl className="ph-ledger">{rows.filter(Boolean).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
}

function Status({ b, o }) {
  if (!b.lastSeen) return <small className="ph-status">{o.waitingFirst}</small>
  return isOnline(b)
    ? <small className="ph-status">{fill(o.synced, { ago: timeAgo(b.lastSeen) })}</small>
    : <small className="ph-status off">{fill(o.internetOff, { ago: timeAgo(b.lastSeen) })}</small>
}

const stockLine = (b, o) => !b.stock ? null
  : Number(b.stock.out) + Number(b.stock.low) === 0 ? o.stockOk : fill(o.lowCount, { out: b.stock.out, low: b.stock.low })

// Pull down at the top of the page to load fresh figures (an installed iPhone app has no browser refresh).
function usePull(refresh) {
  const [pull, setPull] = useState(0)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let y0 = null, d = 0
    const start = (e) => { y0 = window.scrollY <= 0 && !busy ? e.touches[0].clientY : null }
    const move = (e) => { if (y0 === null) return; d = Math.max(0, Math.min(110, (e.touches[0].clientY - y0) * 0.5)); setPull(d) }
    const end = async () => {
      if (y0 === null) return
      y0 = null
      if (d >= 64) { setBusy(true); setPull(56); await refresh().catch(() => {}); setBusy(false) }
      setPull(0); d = 0
    }
    window.addEventListener('touchstart', start, { passive: true })
    window.addEventListener('touchmove', move, { passive: true })
    window.addEventListener('touchend', end)
    return () => { window.removeEventListener('touchstart', start); window.removeEventListener('touchmove', move); window.removeEventListener('touchend', end) }
  }, [refresh, busy])
  return { pull, busy }
}

const TABS = [['all', 'grid', 'phTabToday'], ['branches', 'server', 'phTabBranches'], ['stock', 'box', 'phTabStock'], ['plan', 'card', 'phTabPlan']]

export default function PhoneConsole({ acc, o, t, links, data, transfers, loadedAt, offline, refresh, view, go, children }) {
  const { pull, busy } = usePull(refresh)
  const branches = data?.branches ?? []
  const branch = branches.find((b) => b.id === view)
  const tab = branch ? 'branches' : TABS.some(([id]) => id === view) ? view : 'all'
  const today = pkDay(), lastWeek = addDays(today, -7)
  const weekday = new Date(`${lastWeek}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' })
  const rows = (b) => (data?.days ?? []).filter((d) => !b || d.branch === b.id)
  const sum = (b, day, k) => rows(b).filter((d) => d.businessDay === day).reduce((s, d) => s + Number(d[k] ?? 0), 0)
  const week = (b) => Array.from({ length: 7 }, (_, i) => {
    const day = addDays(today, i - 6), d = new Date(`${day}T12:00:00Z`)
    return { day, value: sum(b, day, 'sales'), short: d.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' }).slice(0, 2), label: d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' }) }
  })
  const stamp = loadedAt ? clock(loadedAt) : ''

  // Sales today, compared with the same weekday last week, then the day's other figures as a short ledger.
  const day = (b) => {
    const sales = sum(b, today, 'sales'), cancelled = sum(b, today, 'cancelledOrders')
    return (
      <>
        <section className="ph-today">
          <h2 className="ph-label">{b ? o.salesBranch : o.salesAll}</h2>
          <Figure label={o.salesAll} value={sales} />
          <Compare cur={sales} prev={sum(b, lastWeek, 'sales')} day={weekday} o={o} />
        </section>
        <Ledger rows={[
          [o.phBills, sum(b, today, 'bills')],
          [o.phCash, rs(sum(b, today, 'cash'))],
          [o.phRefunds, rs(sum(b, today, 'refunds'))],
          [o.phDiscounts, rs(sum(b, today, 'discounts'))],
          cancelled > 0 && [o.phCancelled, cancelled],
        ]} />
        <Week days={week(b)} o={o} />
      </>
    )
  }

  const branchList = (detail) => {
    const max = Math.max(1, ...branches.map((b) => sum(b, today, 'sales')))
    return (
      <ul className="ph-list">
        {[...branches].sort((a, b) => sum(b, today, 'sales') - sum(a, today, 'sales')).map((b, i) => {
          const v = sum(b, today, 'sales')
          return (
            <li key={b.id} style={{ '--i': i }}>
              <button className="ph-row" onClick={() => go(b.id)}>
                <span className="ph-row-main"><b>{b.name}</b><Status b={b} o={o} />{detail && stockLine(b, o) && <small className="ph-status">{stockLine(b, o)}</small>}</span>
                <span className="ph-row-amt">{rs(v)}{detail && <small>{fill(o.phBillsN, { n: sum(b, today, 'bills') })}</small>}</span>
                <Icon name="chevD" size={16} className="ph-chev" />
                <span className="ph-share"><i style={{ '--w': `${(v / max) * 100}%` }} /></span>
              </button>
            </li>
          )
        })}
      </ul>
    )
  }

  let body
  if (tab === 'plan') {
    body = (
      <div className="ph-plan">
        {children}
        <div className="ph-plan-foot">
          <a className="btn btn-outline btn-block" href={links.whatsapp}><Icon name="whatsapp" size={16} /> {o.help}</a>
          <div className="ph-plan-row"><span>{acc.email}</span><ThemeToggle /></div>
          <button className="btn btn-quiet btn-block" onClick={() => supabase.auth.signOut()}><Icon name="logout" size={15} /> {t.signOut}</button>
        </div>
      </div>
    )
  } else if (!data) {
    body = offline ? <p className="ph-empty">{o.phOfflineNone}</p> : <div className="ph-wait"><i /><i /><i /></div>
  } else if (!branches.length) {
    body = (
      <section className="ph-sec ph-first">
        <h2 className="ph-h">{o.emptyTitle}</h2>
        <p>{o.emptyText}</p>
        <ol>{o.emptySteps.map((s) => <li key={s}>{s}</li>)}</ol>
        <a className="btn btn-outline btn-block" href={links.whatsapp}><Icon name="whatsapp" size={16} /> {o.help}</a>
      </section>
    )
  } else if (branch) {
    const top = branch.top ?? [], stock = branch.stock
    body = (
      <>
        {day(branch)}
        {top.length > 0 && (
          <section className="ph-sec">
            <h2 className="ph-h">{o.topTitle}</h2>
            <ol className="ph-top">{top.map((x, i) => (
              <li key={x.name} style={{ '--i': i }}><span>{i + 1}</span><b>{x.name}</b><small>{qty(x.qty)} × </small><em>{rs(Number(x.amount))}</em></li>
            ))}</ol>
          </section>
        )}
        {stock && stock.items.length > 0 && (
          <section className="ph-sec">
            <h2 className="ph-h">{o.lowTitle}</h2>
            <ul className="ph-stock">{stock.items.map((x) => (
              <li key={x.name}><b>{x.name}</b>{Number(x.stock) <= 0 ? <em className="out">{o.outChip}</em> : <em>{fill(o.leftChip, { n: qty(x.stock) })}</em>}</li>
            ))}</ul>
          </section>
        )}
      </>
    )
  } else if (tab === 'branches') {
    body = <section className="ph-sec ph-first"><h2 className="ph-h">{fill(o.phBranchesN, { n: branches.length })}</h2>{branchList(true)}</section>
  } else if (tab === 'stock') {
    const withStock = branches.filter((b) => b.stock)
    const items = withStock.flatMap((b) => b.stock.items.map((x) => ({ ...x, where: b.name })))
    const out = items.filter((x) => Number(x.stock) <= 0), low = items.filter((x) => Number(x.stock) > 0)
    const moving = transfers.filter((x) => x.status === 'sent')
    const list = (xs, isOut) => (
      <ul className="ph-stock">{xs.map((x) => (
        <li key={`${x.where}-${x.name}`}><span><b>{x.name}</b><small>{x.where}</small></span>{isOut ? <em className="out">{o.outChip}</em> : <em>{fill(o.leftChip, { n: qty(x.stock) })}</em>}</li>
      ))}</ul>
    )
    body = (
      <>
        {!withStock.length && <p className="ph-empty">{o.phStockOld}</p>}
        {withStock.length > 0 && !items.length && <p className="ph-empty">{o.phStockNone}</p>}
        {out.length > 0 && <section className="ph-sec ph-first"><h2 className="ph-h">{o.phOut} <span>{out.length}</span></h2>{list(out, true)}</section>}
        {low.length > 0 && <section className="ph-sec"><h2 className="ph-h">{o.lowTitle} <span>{low.length}</span></h2>{list(low, false)}</section>}
        {moving.length > 0 && (
          <section className="ph-sec">
            <h2 className="ph-h">{o.trSent} <span>{moving.length}</span></h2>
            <ul className="ph-stock">{moving.map((x) => (
              <li key={x.id}><span><b>{x.no}</b><small>{x.from.name} → {x.to.name}</small></span><em className="plain">{fill(o.phUnits, { n: qty(x.units) })}</em></li>
            ))}</ul>
          </section>
        )}
      </>
    )
  } else {
    body = (
      <>
        {day(null)}
        {branches.length > 1 && <section className="ph-sec"><h2 className="ph-h">{o.phBranchesToday}</h2>{branchList(false)}</section>}
      </>
    )
  }

  const title = tab === 'plan' ? o.planTab : branch ? branch.name : tab === 'stock' ? o.phTabStock : tab === 'branches' ? o.phTabBranches : (acc.shop || acc.name)
  const date = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Karachi' })
  return (
    <div className="ph">
      <div className={`ph-pull${busy ? ' busy' : ''}`} style={{ '--pull': `${pull}px` }} aria-live="polite">
        <i />{busy ? o.phRefreshing : pull >= 64 ? o.phRelease : o.phPull}
      </div>
      <header className="ph-head">
        {branch
          ? <button className="ph-back" onClick={() => go('branches')} aria-label={o.phBack}><Icon name="chevL" size={20} /></button>
          : <a href="/" className="ph-logo" aria-label="ZAP POS"><Logo size={30} /></a>}
        <div>
          <h1>{title}</h1>
          <p>{branch ? <Status b={branch} o={o} /> : date}</p>
        </div>
      </header>
      {offline && data && <p className="ph-offline" role="status"><Icon name="wifiOff" size={16} /> {fill(o.phOffline, { time: stamp })}</p>}
      {!offline && stamp && tab !== 'plan' && <p className="ph-stamp">{fill(o.phAsOf, { time: stamp })}</p>}
      {tab === 'all' && <InstallHint o={o} />}
      <main className="ph-body">{body}</main>
      <nav className="ph-tabs" aria-label={o.console}>
        {TABS.map(([id, icon, key]) => (
          <button key={id} className={tab === id ? 'on' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => go(id)}>
            <Icon name={icon} size={21} /><span>{o[key]}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
