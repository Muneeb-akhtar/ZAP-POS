import { useCallback, useEffect, useMemo, useState } from 'react'
import Icon, { Logo } from '../components/Icons.jsx'
import { ThemeToggle } from '../components/Sections.jsx'
import { dateFmt, rs, supabase, timeAgo } from '../admin/biz.js'
import InstallHint from './InstallHint.jsx'
import { addDays, clock, fill, greet, isOnline, pkDay, qty } from './ownerData.js'

// The owner app on a phone (and when installed on the home screen). Card layout with five tabs at the bottom:
// Home (the day at a glance), Branches, Sales (every bill, by dates), Stock, Me (shifts, transfers, support, plan, log out).
// A branch picker under the title narrows Home, Sales and Stock to one branch.
// Data: my_branches / my_transfers come from OwnerConsole (kept on the phone for offline use); this screen also asks for
// my_sales, my_shifts, my_support and my_licence (supabase/schema.sql §24), which need internet.
// Texts: account.owner.app in landing-content.json. Styles: "Owner app on a phone" block at the end of admin/admin.css.

const TABS = [['all', 'home'], ['branches', 'server'], ['sales', 'receipt'], ['stock', 'box'], ['me', 'user']]
const TYPES = [null, 'standard', 'weighted', 'variant']   // product filter pills (a.types)
const SUBS = ['plan', 'shifts', 'transfers', 'support', 'customers', 'suppliers', 'purchases', 'categories']   // screens opened from Me, with a back button
const pkDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' }) : '')
const dayTitle = (day) => new Date(`${day}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })

// One RPC whose answer depends on some arguments; `key` changes when they do. Returns [data, reload].
function useRpc(name, args, key, on = true) {
  const [res, setRes] = useState(null)
  const load = useCallback(() => (on ? supabase.rpc(name, args).then(({ data, error }) => setRes(error ? { error: true } : { data })) : Promise.resolve()),
    [name, key, on])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setRes(null); load() }, [load])
  return [res, load]
}

function Empty({ icon, title, text }) {
  return <div className="pa-empty"><Icon name={icon} size={44} /><b>{title}</b><p>{text}</p></div>
}

function Sheet({ title, onClose, children }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])
  return (
    <div className="own-sheet" onClick={onClose}>
      <div className="own-sheet-card" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <span className="own-sheet-grab" />
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  )
}

// Pull down at the top to load fresh figures (an installed iPhone app has no browser refresh).
function usePull(refresh) {
  const [pull, setPull] = useState(0)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let y0 = null, d = 0
    const start = (e) => { y0 = window.scrollY <= 0 && !busy && !document.querySelector('.own-sheet') ? e.touches[0].clientY : null }
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

function Row({ icon, tone, label, value, onClick, href, danger }) {
  const inner = <><i className={`pa-ico ${tone ?? ''}`}><Icon name={icon} size={17} /></i><span>{label}</span>{value != null && <em>{value}</em>}{(onClick || href) && <Icon name="chevD" size={16} className="pa-chev" />}</>
  return href
    ? <a className={`pa-row${danger ? ' danger' : ''}`} href={href}>{inner}</a>
    : <button className={`pa-row${danger ? ' danger' : ''}`} onClick={onClick}>{inner}</button>
}

export default function PhoneConsole({ acc, o, t, links, data, transfers, loadedAt, offline, refresh, view, go, children }) {
  const a = o.app
  const branches = data?.branches ?? []
  const branch = branches.find((b) => b.id === view)
  const partyId = view.startsWith('party:') ? view.slice(6) : null   // a customer's or supplier's ledger
  const sub = SUBS.includes(view) ? view : partyId ? 'ledger' : null
  const tab = branch ? 'branches' : sub ? 'me' : TABS.some(([id]) => id === view) ? view : 'all'
  const [pick, setPick] = useState(null)   // branch id the figures are narrowed to, null = all
  const [picker, setPicker] = useState(false)
  const [openForm, setOpenForm] = useState(null)    // { branchId, code, cash } while the Open shift sheet is up
  const [closeForm, setCloseForm] = useState(null)  // { shift, cash } while the Close shift sheet is up
  const [cmd, setCmd] = useState(null)              // the command just sent: { id, status, result, error }
  const [prodQ, setProdQ] = useState('')
  const [prodQd, setProdQd] = useState('')          // the search, a moment after typing stops
  const [prodType, setProdType] = useState(0)
  const [prodStock, setProdStock] = useState(null)
  const [partyQ, setPartyQ] = useState('')
  const [buyAll, setBuyAll] = useState(false)
  const [buy, setBuy] = useState(null)              // a purchase open in its sheet
  const [salesAll, setSalesAll] = useState(false)
  const [range, setRange] = useState(0)    // index into a.ranges: Today, Week, Month, All, Pick dates
  const today = pkDay()
  const [custom, setCustom] = useState({ from: addDays(today, -6), to: today })
  const [bill, setBill] = useState(null)
  useEffect(() => { const t = setTimeout(() => setProdQd(prodQ.trim()), 350); return () => clearTimeout(t) }, [prodQ])
  const [copied, setCopied] = useState(false)
  const picked = branches.find((b) => b.id === pick)
  const scope = picked ? [picked] : branches

  const from = [today, addDays(today, -6), `${today.slice(0, 8)}01`, null, custom.from][range]
  const to = range === 3 ? null : range === 4 ? custom.to : today
  const online = !offline
  const [sales, reloadSales] = useRpc('my_sales', { p_from: from, p_to: to, p_branch: pick, p_limit: 300 }, `${from}|${to}|${pick}`, online && tab === 'sales')
  const [recent, reloadRecent] = useRpc('my_sales', { p_from: today, p_to: today, p_branch: pick, p_limit: 5 }, `${today}|${pick}`, online && tab === 'all')
  const [allTime, reloadAllTime] = useRpc('my_sales', { p_from: null, p_to: null, p_branch: pick, p_limit: 1 }, `all|${pick}`, online && tab === 'all' && salesAll)
  const [shifts, reloadShifts] = useRpc('my_shifts', { p_days: 1, p_branch: pick }, `${pick}`, online)
  const [support, reloadSupport] = useRpc('my_support', { p_limit: 30 }, 'x', online)
  const [licence, reloadLicence] = useRpc('my_licence', {}, 'x', online && tab === 'me')
  const [products, reloadProducts] = useRpc('my_products', { p_branch: pick, p_q: prodQd || null, p_type: TYPES[prodType], p_stock: prodStock, p_limit: 200 },
    `${pick}|${prodQd}|${prodType}|${prodStock}`, online && (tab === 'stock' || tab === 'all'))
  const partyKind = sub === 'suppliers' ? 'supplier' : 'customer'
  const [parties, reloadParties] = useRpc('my_parties', { p_kind: partyKind, p_q: partyQ.trim() || null, p_limit: 300 }, `${partyKind}|${partyQ.trim()}`, online && (sub === 'customers' || sub === 'suppliers'))
  const [ledger, reloadLedger] = useRpc('my_ledger', { p_party: partyId, p_limit: 200 }, `${partyId}`, online && !!partyId)
  const monthStart = `${today.slice(0, 8)}01`
  const [purchases, reloadPurchases] = useRpc('my_purchases', { p_from: buyAll ? null : monthStart, p_to: null, p_branch: pick, p_limit: 200 }, `${buyAll}|${pick}`, online && sub === 'purchases')
  const [categories, reloadCategories] = useRpc('my_categories', { p_branch: pick }, `${pick}`, online && sub === 'categories')

  // A command to a branch's main PC (open or close a shift). The main PC picks it up at its next sync (within about 30 s),
  // so the sheet watches its status for up to 2 minutes, then refreshes the drawers.
  const send = async (kind, branchId, payload) => {
    setCmd({ status: 'sending' })
    const { data: id, error } = await supabase.rpc('my_command', { p_branch: branchId, p_kind: kind, p_payload: payload })
    if (error) { setCmd({ status: 'error', error: error.message }); return }
    setCmd({ id, status: 'waiting' })
    const started = Date.now()
    const poll = async () => {
      const { data: list } = await supabase.rpc('my_commands', { p_limit: 10 })
      const c = (list ?? []).find((x) => x.id === id)
      if (c && c.status !== 'waiting') { setCmd({ id, status: c.status, result: c.result }); reloadShifts(); return }
      if (Date.now() - started > 120000) { setCmd({ id, status: 'slow' }); return }
      setTimeout(poll, 3000)
    }
    setTimeout(poll, 3000)
  }

  const refreshAll = useCallback(() => Promise.all([refresh(), reloadSales(), reloadRecent(), reloadAllTime(), reloadShifts(), reloadSupport(), reloadLicence(),
    reloadProducts(), reloadParties(), reloadLedger(), reloadPurchases(), reloadCategories()]),
    [refresh, reloadSales, reloadRecent, reloadAllTime, reloadShifts, reloadSupport, reloadLicence, reloadProducts, reloadParties, reloadLedger, reloadPurchases, reloadCategories])
  const { pull, busy } = usePull(refreshAll)

  const rows = (bs) => (data?.days ?? []).filter((d) => bs.some((b) => b.id === d.branch))
  const sum = (bs, day, k) => rows(bs).filter((d) => d.businessDay === day).reduce((s, d) => s + Number(d[k] ?? 0), 0)
  const week = (bs) => Array.from({ length: 7 }, (_, i) => {
    const day = addDays(today, i - 6)
    return { day, value: sum(bs, day, 'sales'), short: new Date(`${day}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' }).slice(0, 2) }
  })
  const stockItems = useMemo(() => scope.filter((b) => b.stock).flatMap((b) => b.stock.items.map((x) => ({ ...x, where: b.name }))), [scope])
  const outN = stockItems.filter((x) => Number(x.stock) <= 0).length, lowN = stockItems.length - outN
  const openShifts = (shifts?.data?.shifts ?? []).filter((s) => s.status === 'open')
  const waiting = (support?.data ?? []).filter((s) => s.status !== 'closed' && !s.last?.fromZap).length
  const stamp = loadedAt ? clock(loadedAt) : ''
  const needNet = <Empty icon="wifiOff" title={a.needsNetTitle} text={a.needsNet} />

  const counterList = shifts?.data?.counterList ?? []
  const startOpen = () => {
    setCmd(null)
    const free = counterList.find((c) => !c.open && (!pick || c.branchId === pick)) ?? counterList[0]
    setOpenForm({ branchId: free?.branchId ?? branches[0]?.id, code: free?.code ?? '', cash: '' })
  }
  const balance = (n) => { const v = Number(n ?? 0); return v === 0 ? a.settled : fill(v > 0 ? a.owesYou : a.youOwe, { amt: rs(Math.abs(v)) }) }

  // ---------- the screens ----------
  const weekCard = (bs) => {
    const w = week(bs), max = Math.max(1, ...w.map((d) => d.value))
    return (
      <section className="pa-card">
        <h3 className="pa-h">{a.week}</h3>
        <div className="pa-week">{w.map((d, i) => (
          <span key={d.day} className={i === 6 ? 'today' : ''} style={{ '--h': `${Math.max(4, (d.value / max) * 100)}%`, '--i': i }} title={`${d.day}: ${rs(d.value)}`}>
            <i /><small>{i === 6 ? a.today : d.short}</small>
          </span>
        ))}</div>
      </section>
    )
  }

  const billRow = (b) => (
    <button key={b.id} className="pa-bill" onClick={() => setBill(b)}>
      <span><b>{b.no}</b><small>{clock(new Date(b.at).getTime())} · {[b.branch, b.counter, a.service[b.service], b.customer].filter(Boolean).join(' · ')}</small></span>
      <span className="pa-bill-amt"><em>{rs(b.total)}</em><small>{b.methods.map((m) => a.methods[m] ?? m).join(', ')}</small></span>
    </button>
  )

  const billList = (bills) => {
    const days = []
    bills.forEach((b) => { const d = pkDate(b.at); const last = days[days.length - 1]; if (last?.day === d) last.bills.push(b); else days.push({ day: d, bills: [b] }) })
    return days.map((g) => (
      <section key={g.day} className="pa-group">
        <h3 className="pa-day">{g.day === today ? a.today : dayTitle(g.day)}</h3>
        <div className="pa-card pa-list">{g.bills.map(billRow)}</div>
      </section>
    ))
  }

  let body
  if (sub === 'plan') {
    body = <div className="pa-plan">{children}</div>
  } else if (sub === 'shifts') {
    const list = shifts?.data?.shifts ?? []
    const open = list.filter((s) => s.status === 'open'), closed = list.filter((s) => s.status !== 'open')
    body = !online ? needNet : !shifts ? <div className="pa-wait"><i /><i /></div> : (
      <>
        <button className="pa-action wide" onClick={() => startOpen()}><Icon name="plus" size={18} /> {a.openButton}</button>
        <h3 className="pa-day">{a.openNow}</h3>
        {open.length ? <div className="pa-card pa-list">{open.map((s) => (
          <div key={s.id} className="pa-shift">
            <span><b><i className="pa-live" />{s.branch} · {s.counter ?? '–'}</b><small>{fill(a.openedAt, { time: clock(new Date(s.openedAt).getTime()), cash: rs(s.openingCash) })} · {fill(a.cashTaken, { cash: rs(s.cashTaken) })}</small></span>
            <span className="pa-bill-amt"><em>{rs(Number(s.openingCash) + Number(s.cashTaken))}</em><small>{a.inDrawer}</small>
              <button className="pa-mini" onClick={() => { setCmd(null); setCloseForm({ shift: s, cash: '' }) }}>{a.closeButton}</button></span>
          </div>
        ))}</div> : <p className="pa-note">{a.noOpen}</p>}
        <p className="pa-note"><Icon name="zap" size={13} /> {a.phoneNote}</p>
        {closed.length > 0 && (
          <>
            <h3 className="pa-day">{a.closedToday}</h3>
            <div className="pa-card pa-list">{closed.map((s) => {
              const v = Number(s.variance ?? 0)
              return (
                <div key={s.id} className="pa-shift">
                  <span><b>{s.branch} · {s.counter ?? '–'}</b><small>{fill(a.closedLine, { time: s.closedAt ? clock(new Date(s.closedAt).getTime()) : '', counted: rs(s.counted), expected: rs(s.expected) })}</small></span>
                  <span className="pa-bill-amt"><em className={v < 0 ? 'bad' : v > 0 ? 'good' : ''}>{v === 0 ? a.exact : `${v < 0 ? '−' : '+'}${rs(Math.abs(v))}`}</em><small>{v < 0 ? a.short : v > 0 ? a.over : ''}</small></span>
                </div>
              )
            })}</div>
          </>
        )}
      </>
    )
  } else if (sub === 'customers' || sub === 'suppliers') {
    const res = parties?.data
    body = (
      <>
        <label className="pa-search"><Icon name="search" size={18} /><input type="search" value={partyQ} onChange={(e) => setPartyQ(e.target.value)} placeholder={a.partySearch} /></label>
        {!online ? needNet : !parties ? <div className="pa-wait"><i /><i /></div> : parties.error ? <Empty icon="users" title={a.needsNetTitle} text={t.error} /> : (
          <>
            <div className="pa-grid">
              <div className="pa-stat amber"><small>{sub === 'customers' ? a.theyOweYou : a.youOweThem}</small><b>{rs(sub === 'customers' ? res.owed : res.owing)}</b></div>
              <div className="pa-stat"><small>{sub === 'customers' ? a.customersN : a.suppliersN}</small><b>{res.count}</b></div>
            </div>
            {res.items.length ? <div className="pa-card pa-list">{res.items.map((x) => (
              <button key={x.id} className="pa-bill" onClick={() => go(`party:${x.id}`)}>
                <span><b>{x.name}</b><small>{[x.code, x.phone, branches.length > 1 ? x.branch : null].filter(Boolean).join(' · ')}</small></span>
                <span className="pa-bill-amt"><em className={Number(x.balance) > 0 ? 'bad' : Number(x.balance) < 0 ? 'good' : ''}>{rs(Math.abs(Number(x.balance)))}</em><small>{Number(x.balance) > 0 ? a.owesYouShort : Number(x.balance) < 0 ? a.youOweShort : a.settled}</small></span>
              </button>
            ))}</div> : <Empty icon="users" title={sub === 'customers' ? a.noCustomersTitle : a.noSuppliersTitle} text={a.noPartiesText} />}
          </>
        )}
      </>
    )
  } else if (sub === 'ledger') {
    const res = ledger?.data
    body = !online ? needNet : !ledger ? <div className="pa-wait"><i /><i /></div> : !res ? <Empty icon="users" title={a.notFound} text={a.notFoundText} /> : (
      <>
        <div className="pa-hero"><small>{res.party.name}{res.party.phone ? ` · ${res.party.phone}` : ''}</small><b>{rs(Math.abs(Number(res.party.balance)))}</b><span>{balance(res.party.balance)}</span></div>
        {res.entries.length ? <div className="pa-card pa-list">{res.entries.map((e) => (
          <div key={e.id} className="pa-shift">
            <span><b>{a.ledgerKinds[e.kind] ?? e.kind}{e.ref ? ` · ${e.ref}` : ''}</b><small>{dateFmt(pkDate(e.at))}{e.method ? ` · ${a.methods[e.method] ?? e.method}` : ''}{e.note ? ` · ${e.note}` : ''}</small></span>
            <span className="pa-bill-amt"><em className={Number(e.debit) > 0 ? 'bad' : 'good'}>{Number(e.debit) > 0 ? `+${rs(e.debit)}` : `−${rs(e.credit)}`}</em><small>{fill(a.runningN, { amt: rs(e.running) })}</small></span>
          </div>
        ))}</div> : <Empty icon="receipt" title={a.noEntries} text={a.noEntriesText} />}
      </>
    )
  } else if (sub === 'purchases') {
    const res = purchases?.data
    body = (
      <>
        <div className="pa-pills">{a.buyRanges.map((r, i) => <button key={r} className={buyAll === (i === 1) ? 'on' : ''} onClick={() => setBuyAll(i === 1)}>{r}</button>)}</div>
        {!online ? needNet : !purchases ? <div className="pa-wait"><i /><i /></div> : purchases.error ? <Empty icon="cart" title={a.needsNetTitle} text={t.error} /> : (
          <>
            <div className="pa-grid">
              <div className="pa-stat tint"><small>{fill(a.purchasesN, { n: res.count })}</small><b>{rs(res.total)}</b></div>
              <div className="pa-stat amber"><small>{a.unpaid}</small><b>{rs(res.unpaid)}</b></div>
            </div>
            {res.items.length ? <div className="pa-card pa-list">{res.items.map((x) => (
              <button key={x.id} className="pa-bill" onClick={() => setBuy(x)}>
                <span><b>{x.supplier}</b><small>{[x.billNo, dateFmt(x.receivedOn), branches.length > 1 ? x.branch : null].filter(Boolean).join(' · ')}</small></span>
                <span className="pa-bill-amt"><em>{rs(x.total)}</em><small>{Number(x.paid) >= Number(x.total) ? a.paidFull : fill(a.leftToPay, { amt: rs(Number(x.total) - Number(x.paid)) })}</small></span>
              </button>
            ))}</div> : <Empty icon="cart" title={a.noPurchasesTitle} text={a.noPurchasesText} />}
          </>
        )}
      </>
    )
  } else if (sub === 'categories') {
    body = !online ? needNet : !categories ? <div className="pa-wait"><i /><i /></div> : categories.data?.length ? (
      <div className="pa-card pa-list">{categories.data.map((c) => (
        <div key={c.name} className="pa-shift"><span><b>{c.name}</b>{branches.length > 1 && <small>{c.branches.join(', ')}</small>}</span><span className="pa-chip">{fill(a.productsN, { n: c.products })}</span></div>
      ))}</div>) : <Empty icon="layers" title={a.noCategoriesTitle} text={a.noUpdateText} />
  } else if (sub === 'transfers') {
    const chip = (x) => x.status === 'sent' ? <span className="pa-chip low">{o.trSent}</span>
      : x.status === 'received' ? (Number(x.units) - Number(x.received) > 0 ? <span className="pa-chip out">{fill(o.trShort, { n: qty(Number(x.units) - Number(x.received)) })}</span> : <span className="pa-chip ok">{o.trReceived}</span>)
      : <span className="pa-chip">{x.status === 'returned' ? o.trReturned : o.trCancelled}</span>
    body = transfers.length ? <div className="pa-card pa-list">{transfers.map((x) => (
      <div key={x.id} className="pa-shift">
        <span><b>{x.no} · {fill(a.units, { n: qty(x.units) })}</b><small>{x.from.name} → {x.to.name} · {timeAgo(x.updatedAt ?? x.createdAt)}</small></span>{chip(x)}
      </div>
    ))}</div> : <Empty icon="swap" title={a.transfers} text={a.noTransfers} />
  } else if (sub === 'support') {
    const list = support?.data ?? []
    body = !online ? needNet : !support ? <div className="pa-wait"><i /><i /></div> : list.length ? <div className="pa-card pa-list">{list.map((s) => (
      <div key={s.id} className="pa-shift">
        <span><b>#{s.no} {s.subject}</b><small>{s.branch} · {timeAgo(s.updatedAt)}{s.last?.body ? ` · ${s.last.fromZap ? a.zapSaid : ''}${s.last.body}` : ''}</small></span>
        <span className={`pa-chip ${s.status === 'closed' ? '' : s.last?.fromZap ? 'ok' : 'low'}`}>{s.status === 'closed' ? a.stClosed : s.last?.fromZap ? a.stAnswered : a.stWaiting}</span>
      </div>
    ))}</div> : <Empty icon="headset" title={a.support} text={a.noSupport} />
  } else if (!data) {
    body = offline ? <Empty icon="wifiOff" title={a.needsNetTitle} text={a.offlineNone} /> : <div className="pa-wait"><i /><i /><i /></div>
  } else if (!branches.length && tab !== 'me') {
    body = (
      <section className="pa-card pa-first">
        <h3 className="pa-h">{o.emptyTitle}</h3>
        <p>{o.emptyText}</p>
        <ol>{o.emptySteps.map((s) => <li key={s}>{s}</li>)}</ol>
        <a className="btn btn-outline btn-block" href={links.whatsapp}><Icon name="whatsapp" size={16} /> {o.help}</a>
      </section>
    )
  } else if (branch) {
    const one = [branch], top = branch.top ?? [], stock = branch.stock
    body = (
      <>
        <div className="pa-hero"><small>{a.salesToday}</small><b>{rs(sum(one, today, 'sales'))}</b>
          <span>{fill(a.billsN, { n: sum(one, today, 'bills') })} · {fill(a.cashN, { cash: rs(sum(one, today, 'cash')) })}</span></div>
        <div className="pa-grid">
          <div className="pa-stat"><small>{a.refunds}</small><b>{rs(sum(one, today, 'refunds'))}</b></div>
          <div className="pa-stat"><small>{a.discounts}</small><b>{rs(sum(one, today, 'discounts'))}</b></div>
        </div>
        {weekCard(one)}
        {top.length > 0 && (
          <section className="pa-card">
            <h3 className="pa-h">{o.topTitle}</h3>
            <ol className="pa-top">{top.map((x, i) => (
              <li key={x.name}><span>{i + 1}</span><b>{x.name}</b><small>{qty(x.qty)} ×</small><em>{rs(Number(x.amount))}</em></li>
            ))}</ol>
          </section>
        )}
        {stock && stock.items.length > 0 && (
          <section className="pa-card pa-list">
            <h3 className="pa-h">{o.lowTitle}</h3>
            {stock.items.map((x) => (
              <div key={x.name} className="pa-shift"><span><b>{x.name}</b></span>{Number(x.stock) <= 0 ? <span className="pa-chip out">{o.outChip}</span> : <span className="pa-chip low">{fill(o.leftChip, { n: qty(x.stock) })}</span>}</div>
            ))}
          </section>
        )}
      </>
    )
  } else if (tab === 'branches') {
    body = <div className="pa-stack">{branches.map((b) => {
      const v = sum([b], today, 'sales')
      return (
        <button key={b.id} className="pa-card pa-branch" onClick={() => go(b.id)}>
          <span className="pa-branch-top"><b>{b.name}</b><small className={b.lastSeen && !isOnline(b) ? 'off' : ''}><i className={`pa-live${isOnline(b) ? '' : ' off'}`} />
            {!b.lastSeen ? o.waitingFirst : isOnline(b) ? fill(o.synced, { ago: timeAgo(b.lastSeen) }) : fill(o.internetOff, { ago: timeAgo(b.lastSeen) })}</small></span>
          <em>{rs(v)}</em>
          <span className="pa-branch-foot">
            <small>{fill(a.billsN, { n: sum([b], today, 'bills') })} · {b.code}</small>
            {b.stock && (Number(b.stock.out) + Number(b.stock.low) === 0 ? <span className="pa-chip ok">{o.stockOk}</span> : <span className={`pa-chip ${Number(b.stock.out) ? 'out' : 'low'}`}>{fill(o.lowCount, { out: b.stock.out, low: b.stock.low })}</span>)}
          </span>
        </button>
      )
    })}</div>
  } else if (tab === 'sales') {
    const res = sales?.data
    body = (
      <>
        <div className="pa-pills" role="tablist">{a.ranges.map((r, i) => <button key={r} role="tab" aria-selected={range === i} className={range === i ? 'on' : ''} onClick={() => setRange(i)}>{r}</button>)}</div>
        {range === 4 && (
          <div className="pa-dates">
            <label><span>{a.from}</span><input type="date" value={custom.from} max={custom.to} onChange={(e) => e.target.value && setCustom({ ...custom, from: e.target.value })} /></label>
            <label><span>{a.to}</span><input type="date" value={custom.to} min={custom.from} max={today} onChange={(e) => e.target.value && setCustom({ ...custom, to: e.target.value })} /></label>
          </div>
        )}
        {!online ? needNet : !sales ? <div className="pa-wait"><i /><i /></div> : sales.error ? <Empty icon="receipt" title={a.noSalesTitle} text={t.error} /> : (
          <>
            <div className="pa-grid">
              <div className="pa-stat"><i className="pa-ico"><Icon name="receipt" size={17} /></i><small>{a.bills}</small><b>{res.count}</b></div>
              <div className="pa-stat tint"><i className="pa-ico"><Icon name="card" size={17} /></i><small>{a.revenue}</small><b>{rs(res.total)}</b></div>
            </div>
            {res.bills.length ? billList(res.bills) : <Empty icon="receipt" title={a.noSalesTitle} text={a.noSalesText} />}
            {res.count > res.bills.length && <p className="pa-note">{fill(a.newest, { n: res.bills.length, total: res.count })}</p>}
          </>
        )}
      </>
    )
  } else if (tab === 'stock') {
    const res = products?.data
    const old = res && res.total === 0 && scope.some((b) => b.stock)   // main PCs older than 1.9.150 send only the low-stock list
    const moving = transfers.filter((x) => x.status === 'sent' && (!picked || x.from.code === picked.code || x.to.code === picked.code))
    body = (
      <>
        <div className="pa-grid three">
          <button className={`pa-stat${prodStock === null ? ' sel' : ''}`} onClick={() => setProdStock(null)}><small>{a.total}</small><b>{res ? res.total : '–'}</b></button>
          <button className={`pa-stat amber${prodStock === 'low' ? ' sel' : ''}`} onClick={() => setProdStock(prodStock === 'low' ? null : 'low')}><small>{a.low}</small><b>{res ? res.low : '–'}</b></button>
          <button className={`pa-stat red${prodStock === 'out' ? ' sel' : ''}`} onClick={() => setProdStock(prodStock === 'out' ? null : 'out')}><small>{a.out}</small><b>{res ? res.out : '–'}</b></button>
        </div>
        <label className="pa-search"><Icon name="search" size={18} /><input type="search" value={prodQ} onChange={(e) => setProdQ(e.target.value)} placeholder={a.search} /></label>
        <div className="pa-pills">{a.types.map((f, i) => <button key={f} className={prodType === i ? 'on' : ''} onClick={() => setProdType(i)}>{f}</button>)}</div>
        {!online ? needNet : !products ? <div className="pa-wait"><i /><i /></div> : products.error ? <Empty icon="box" title={a.needsNetTitle} text={t.error} />
          : old ? (
            <>
              <div className="pa-card pa-list">{stockItems.map((x) => (
                <div key={`${x.where}-${x.name}`} className="pa-shift"><span><b>{x.name}</b><small>{x.where}</small></span>
                  {Number(x.stock) <= 0 ? <span className="pa-chip out">{o.outChip}</span> : <span className="pa-chip low">{fill(o.leftChip, { n: qty(x.stock) })}</span>}</div>
              ))}</div>
              <p className="pa-note"><Icon name="zap" size={13} /> {a.noUpdateText}</p>
            </>
          )
          : res.items.length ? <div className="pa-card pa-list">{res.items.map((x) => (
            <div key={`${x.branch}-${x.id}`} className="pa-shift">
              <span><b>{x.name}</b><small>{[x.category, a.typeNames[x.type], branches.length > 1 ? x.branch : null].filter(Boolean).join(' · ')}</small></span>
              <span className="pa-bill-amt"><em>{rs(x.price)}</em>
                {x.state === 'none' ? <small>{a.notCounted}</small>
                  : <span className={`pa-chip ${x.state === 'out' ? 'out' : x.state === 'low' ? 'low' : 'ok'}`}>{x.state === 'out' ? o.outChip : fill(a.inStock, { n: qty(x.stock), unit: x.unit === 'pcs' ? '' : x.unit })}</span>}</span>
            </div>
          ))}</div> : <Empty icon="box" title={res.total ? a.noMatchTitle : a.noListTitle} text={res.total ? a.noMatchText : a.noUpdateText} />}
        {res && res.count > res.items.length && <p className="pa-note">{fill(a.newestProducts, { n: res.items.length, total: res.count })}</p>}
        {moving.length > 0 && <button className="pa-action wide" onClick={() => go('transfers')}><Icon name="swap" size={18} /> {fill(a.onWayN, { n: moving.length })}</button>}
      </>
    )
  } else if (tab === 'me') {
    const lic = licence?.data
    const copy = async () => { try { await navigator.clipboard.writeText(lic.code); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { /* no clipboard: the key is on screen */ } }
    const del = `${links.whatsapp}${links.whatsapp.includes('?') ? '&' : '?'}text=${encodeURIComponent(fill(a.deleteText, { email: acc.email }))}`
    body = (
      <>
        <div className="pa-me">
          <span className="pa-avatar">{(acc.name ?? acc.email ?? '?')[0].toUpperCase()}</span>
          <b>{acc.name || acc.shop}</b>
          <small>{acc.email}</small>
          <span className={`pa-chip ${acc.active ? 'ok' : 'out'}`}>{acc.plan ? `${acc.plan} · ${acc.paid_until ? fill(acc.active ? a.until : a.ended, { date: dateFmt(acc.paid_until) }) : ''}` : a.noPlan}</span>
        </div>
        <h3 className="pa-group-h">{a.shop}</h3>
        <div className="pa-card pa-menu">
          <Row icon="drawer" tone="green" label={a.shifts} value={shifts?.data ? fill(a.openN, { n: openShifts.length }) : null} onClick={() => go('shifts')} />
          <Row icon="users" tone="teal" label={a.customers} onClick={() => go('customers')} />
          <Row icon="cart" tone="pink" label={a.suppliers} onClick={() => go('suppliers')} />
          <Row icon="receipt" tone="violet" label={a.purchases} onClick={() => go('purchases')} />
          <Row icon="layers" tone="amber" label={a.categories} onClick={() => go('categories')} />
          <Row icon="swap" tone="blue" label={a.transfers} value={transfers.length || null} onClick={() => go('transfers')} />
          <Row icon="headset" tone="violet" label={a.support} value={waiting || null} onClick={() => go('support')} />
          <Row icon="server" tone="amber" label={a.tabs.branches} value={branches.length} onClick={() => go('branches')} />
        </div>
        <h3 className="pa-group-h">{a.account}</h3>
        <div className="pa-card pa-menu">
          <Row icon="card" tone="blue" label={a.plan} onClick={() => go('plan')} />
          {lic?.code && <Row icon="key" tone="amber" label={a.licence} value={copied ? a.copied : lic.code} onClick={copy} />}
          <Row icon="whatsapp" tone="green" label={o.help} href={links.whatsapp} />
        </div>
        <h3 className="pa-group-h">{a.more}</h3>
        <div className="pa-card pa-menu">
          <div className="pa-row static"><i className="pa-ico"><Icon name="moon" size={17} /></i><span>{a.theme}</span><ThemeToggle /></div>
          <Row icon="trash" tone="red" label={a.deleteAccount} href={del} />
          <Row icon="logout" tone="red" label={t.signOut} danger onClick={() => supabase.auth.signOut()} />
        </div>
        <p className="pa-foot"><Logo size={22} /> {a.footer}</p>
      </>
    )
  } else {
    // Home
    const bs = scope
    const todaySales = sum(bs, today, 'sales'), todayBills = sum(bs, today, 'bills')
    const shownSales = salesAll ? allTime?.data : { total: todaySales, count: todayBills }
    const first = (acc.name ?? '').split(' ')[0]
    body = (
      <>
        <h2 className="pa-hello">{greet(o)}<span>{first || acc.shop}</span></h2>
        <div className="pa-actions">
          <button className="pa-action green" onClick={() => go('shifts')}><Icon name="drawer" size={19} /> {a.cashDrawers}</button>
          <button className="pa-action blue" onClick={() => startOpen()}><Icon name="plus" size={19} /> {a.openShift}</button>
        </div>
        <InstallHint o={o} />
        <div className="pa-grid">
          <button className="pa-tile" onClick={() => go('branches')}>
            <span className="pa-tile-top"><i className="pa-ico green"><Icon name="server" size={17} /></i><small>{a.tabs.branches}</small></span>
            <b>{bs.length}</b><small>{shifts?.data ? fill(a.countersN, { n: shifts.data.counters }) : `${bs.filter(isOnline).length} ${a.onlineWord}`}</small>
          </button>
          <div className="pa-tile">
            <span className="pa-tile-top"><i className="pa-ico teal"><Icon name="card" size={17} /></i>
              <span className="pa-toggle"><button className={salesAll ? '' : 'on'} onClick={() => setSalesAll(false)}>{a.today}</button><button className={salesAll ? 'on' : ''} onClick={() => setSalesAll(true)}>{a.all}</button></span></span>
            <b>{shownSales ? rs(shownSales.total) : '…'}</b><small>{shownSales ? fill(a.billsN, { n: shownSales.count }) : ''}</small>
          </div>
          <button className="pa-tile" onClick={() => go('stock')}>
            <span className="pa-tile-top"><i className="pa-ico blue"><Icon name="box" size={17} /></i><small>{a.tabs.stock}</small></span>
            {products?.data?.total
              ? <><b>{products.data.total}</b><small>{fill(a.stockSub, { out: products.data.out, low: products.data.low })}</small></>
              : <><b>{outN + lowN}</b><small>{fill(a.stockSub, { out: outN, low: lowN })}</small></>}
          </button>
          <button className="pa-tile" onClick={() => go('shifts')}>
            <span className="pa-tile-top"><i className="pa-ico pink"><Icon name="drawer" size={17} /></i><small>{a.cashDrawers}</small></span>
            <b>{shifts?.data ? openShifts.length : '–'}</b><small>{shifts?.data ? fill(a.inDrawers, { cash: rs(openShifts.reduce((s, x) => s + Number(x.openingCash) + Number(x.cashTaken), 0)) }) : a.openWord}</small>
          </button>
          <button className="pa-tile" onClick={() => go('plan')}>
            <span className="pa-tile-top"><i className="pa-ico amber"><Icon name="key" size={17} /></i><small>{a.planWord}</small></span>
            <b>{acc.plan ?? '–'}</b><small>{acc.paid_until ? fill(acc.active ? a.until : a.ended, { date: dateFmt(acc.paid_until) }) : a.noPlan}</small>
          </button>
          <button className="pa-tile" onClick={() => go('support')}>
            <span className="pa-tile-top"><i className="pa-ico violet"><Icon name="headset" size={17} /></i><small>{a.supportWord}</small></span>
            <b>{support?.data ? waiting : '–'}</b><small>{a.waitingWord}</small>
          </button>
        </div>
        {weekCard(bs)}
        <div className="pa-h-row"><h3 className="pa-h">{a.recent}</h3>{recent?.data?.bills.length > 0 && <button onClick={() => { setRange(0); go('sales') }}>{a.seeAll}</button>}</div>
        {!online ? <p className="pa-note">{a.needsNet}</p> : !recent ? <div className="pa-wait"><i /></div>
          : recent.data?.bills.length ? <div className="pa-card pa-list">{recent.data.bills.map(billRow)}</div>
          : <Empty icon="receipt" title={a.noBillsTitle} text={a.noBillsText} />}
      </>
    )
  }

  const cmdState = cmd && (
    <div className={`pa-cmd ${cmd.status}`} role="status">
      {cmd.status === 'sending' || cmd.status === 'waiting' ? <><i className="pa-spin" />{a.cmdWaiting}</>
        : cmd.status === 'done' ? <><Icon name="check" size={18} />{cmd.result?.alreadyOpen ? a.cmdAlreadyOpen : cmd.result?.alreadyClosed ? a.cmdAlreadyClosed : a.cmdDone}</>
        : cmd.status === 'refused' ? <span>{a.cmdRefused} {cmd.result?.message}{cmd.result?.next ? `. ${cmd.result.next}` : ''}</span>
        : cmd.status === 'expired' ? <span>{a.cmdExpired}</span>
        : cmd.status === 'slow' ? <span>{a.cmdSlow}</span>
        : <span>{a.cmdError} {cmd.error}</span>}
    </div>
  )
  const titles = { all: a.tabs.home, branches: a.tabs.branches, sales: a.tabs.sales, stock: a.tabs.stock, me: a.tabs.me, plan: o.planTab, shifts: a.shifts, transfers: a.transfers, support: a.support,
    customers: a.customers, suppliers: a.suppliers, purchases: a.purchases, categories: a.categories, ledger: ledger?.data?.party?.name ?? a.ledger }
  const title = branch ? branch.name : titles[sub ?? tab]
  const back = branch ? 'branches' : sub === 'ledger' ? (ledger?.data?.party?.kind === 'supplier' ? 'suppliers' : 'customers') : sub ? 'me' : null
  const showPicker = !back && ['all', 'sales', 'stock'].includes(tab) && branches.length > 1
  return (
    <div className="pa">
      <div className={`pa-pull${busy ? ' busy' : ''}`} style={{ '--pull': `${pull}px` }} aria-live="polite">
        <i />{busy ? a.refreshing : pull >= 64 ? a.release : a.pull}
      </div>
      <header className="pa-head">
        {back && <button className="pa-back" onClick={() => go(back)} aria-label={a.back}><Icon name="chevL" size={20} /></button>}
        <div className="pa-head-text">
          <h1>{title}</h1>
          {showPicker
            ? <button className="pa-picker" onClick={() => setPicker(true)}><i className="pa-live" />{picked ? picked.name : a.allBranches}<Icon name="chevD" size={15} /></button>
            : <p>{branch ? branch.code : sub ? '' : acc.shop || ''}</p>}
        </div>
        <button className="pa-refresh" onClick={() => refreshAll()} aria-label={a.refreshing}><Logo size={30} /></button>
      </header>
      {offline && data && <p className="pa-offline" role="status"><Icon name="wifiOff" size={16} /> {fill(a.offline, { time: stamp })}</p>}
      <main className="pa-body" key={view}>{body}</main>
      {online && stamp && <p className="pa-stamp">{fill(a.asOf, { time: stamp })}</p>}
      <nav className="pa-tabs" aria-label={o.console} style={{ '--at': TABS.findIndex(([id]) => id === tab) }}>
        <span className="pa-tabs-pill" aria-hidden="true" />
        {TABS.map(([id, icon]) => (
          <button key={id} className={tab === id ? 'on' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => go(id)}>
            <Icon name={icon} size={21} /><span>{a.tabs[id === 'all' ? 'home' : id]}</span>
          </button>
        ))}
      </nav>
      {picker && (
        <Sheet title={a.pickBranch} onClose={() => setPicker(false)}>
          <div className="pa-card pa-menu">
            {[null, ...branches.map((b) => b.id)].map((id) => {
              const b = branches.find((x) => x.id === id)
              return <button key={id ?? 'all'} className={`pa-row${pick === id ? ' sel' : ''}`} onClick={() => { setPick(id); setPicker(false) }}>
                <i className="pa-ico"><Icon name={b ? 'server' : 'grid'} size={17} /></i><span>{b ? b.name : a.allBranches}</span>{pick === id && <Icon name="check" size={18} />}
              </button>
            })}
          </div>
        </Sheet>
      )}
      {openForm && (
        <Sheet title={a.openShift} onClose={() => setOpenForm(null)}>
          {cmd ? <>{cmdState}<button className="btn btn-outline btn-block" onClick={() => { setOpenForm(null); setCmd(null) }}>{a.close}</button></> : (
            <form className="pa-form" onSubmit={(e) => { e.preventDefault(); send('open_shift', openForm.branchId, { counter: openForm.code, openingCash: Number(openForm.cash || 0) }) }}>
              {branches.length > 1 && (
                <label><span>{a.branchLabel}</span>
                  <select value={openForm.branchId} onChange={(e) => setOpenForm({ ...openForm, branchId: e.target.value, code: counterList.find((c) => c.branchId === e.target.value && !c.open)?.code ?? '' })}>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select></label>
              )}
              <label><span>{a.counterLabel}</span>
                {counterList.some((c) => c.branchId === openForm.branchId)
                  ? <select required value={openForm.code} onChange={(e) => setOpenForm({ ...openForm, code: e.target.value })}>
                      <option value="" disabled>{a.pickCounter}</option>
                      {counterList.filter((c) => c.branchId === openForm.branchId).map((c) => <option key={c.code} value={c.code}>{c.code} · {c.name}{c.open ? ` (${a.alreadyOpenWord})` : ''}</option>)}
                    </select>
                  : <input required value={openForm.code} onChange={(e) => setOpenForm({ ...openForm, code: e.target.value.toUpperCase() })} placeholder="C1" maxLength={3} />}
              </label>
              <label><span>{a.openingCash}</span><input required inputMode="numeric" pattern="[0-9]*" value={openForm.cash} onChange={(e) => setOpenForm({ ...openForm, cash: e.target.value.replace(/[^0-9]/g, '') })} placeholder="5000" /></label>
              <p className="pa-sheet-p">{a.openHelp}</p>
              <button className="btn btn-primary btn-block" disabled={!online}>{a.openButton}</button>
            </form>
          )}
        </Sheet>
      )}
      {closeForm && (
        <Sheet title={`${a.closeShift} · ${closeForm.shift.branch} ${closeForm.shift.counter ?? ''}`} onClose={() => setCloseForm(null)}>
          {cmd ? <>{cmdState}<button className="btn btn-outline btn-block" onClick={() => { setCloseForm(null); setCmd(null) }}>{a.close}</button></> : (
            <form className="pa-form" onSubmit={(e) => { e.preventDefault(); send('close_shift', closeForm.shift.branchId, { shift: closeForm.shift.id, countedCash: Number(closeForm.cash || 0) }) }}>
              <dl className="pa-receipt">
                <div><dt>{a.openingCash}</dt><dd>{rs(closeForm.shift.openingCash)}</dd></div>
                <div><dt>{a.cashTakenWord}</dt><dd>{rs(closeForm.shift.cashTaken)}</dd></div>
                <div className="total"><dt>{a.shouldBe}</dt><dd>{rs(Number(closeForm.shift.openingCash) + Number(closeForm.shift.cashTaken))}</dd></div>
              </dl>
              <label><span>{a.countedCash}</span><input required inputMode="numeric" pattern="[0-9]*" value={closeForm.cash} onChange={(e) => setCloseForm({ ...closeForm, cash: e.target.value.replace(/[^0-9]/g, '') })} placeholder="0" /></label>
              <p className="pa-sheet-p">{a.closeHelp}</p>
              <button className="btn btn-primary btn-block" disabled={!online}>{a.closeButton}</button>
            </form>
          )}
        </Sheet>
      )}
      {buy && (
        <Sheet title={`${buy.supplier} · ${buy.billNo}`} onClose={() => setBuy(null)}>
          <dl className="pa-receipt">
            {buy.lines.map((l, i) => <div key={i}><dt>{l.name} · {qty(l.qty)} × {rs(l.unitCost)}</dt><dd>{rs(l.total)}</dd></div>)}
            {Number(buy.discount) > 0 && <div className="line"><dt>{a.discount}</dt><dd>−{rs(buy.discount)}</dd></div>}
            {Number(buy.tax) > 0 && <div><dt>{a.tax}</dt><dd>{rs(buy.tax)}</dd></div>}
            <div className="total"><dt>{a.total}</dt><dd>{rs(buy.total)}</dd></div>
            <div><dt>{a.paidWord}</dt><dd>{rs(buy.paid)}{buy.method ? ` · ${a.methods[buy.method] ?? buy.method}` : ''}</dd></div>
          </dl>
          <button className="btn btn-outline btn-block" onClick={() => setBuy(null)}>{a.close}</button>
        </Sheet>
      )}
      {bill && (
        <Sheet title={bill.no} onClose={() => setBill(null)}>
          <dl className="pa-receipt">
            <div><dt>{a.when}</dt><dd>{new Date(bill.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Karachi' })}</dd></div>
            <div><dt>{a.where}</dt><dd>{[bill.branch, bill.counter].filter(Boolean).join(' · ')}</dd></div>
            {bill.service && <div><dt>{a.type}</dt><dd>{a.service[bill.service] ?? bill.service}{bill.customer ? ` · ${bill.customer}` : ''}</dd></div>}
            <div className="line"><dt>{a.subtotal}</dt><dd>{rs(bill.subtotal)}</dd></div>
            {Number(bill.discount) > 0 && <div><dt>{a.discount}</dt><dd>−{rs(bill.discount)}</dd></div>}
            {Number(bill.tax) > 0 && <div><dt>{a.tax}</dt><dd>{rs(bill.tax)}</dd></div>}
            <div className="total"><dt>{a.total}</dt><dd>{rs(bill.total)}</dd></div>
            <div><dt>{a.paidBy}</dt><dd>{bill.methods.map((m) => a.methods[m] ?? m).join(', ') || '–'}</dd></div>
          </dl>
          <button className="btn btn-outline btn-block" onClick={() => setBill(null)}>{a.close}</button>
        </Sheet>
      )}
    </div>
  )
}
