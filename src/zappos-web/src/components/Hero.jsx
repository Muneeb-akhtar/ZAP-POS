import { useEffect, useRef, useState } from 'react'
import Icon from './Icons.jsx'
import { Monitor, PosBillingScreen } from './Mockups.jsx'
import { Kicker, Scribble, Squiggle } from './Bits.jsx'

const receiptItems = [
  ['Denim Jacket', '3,450'],
  ['Cotton Shirt ×2', '2,980'],
  ['Leather Shoes', '5,990'],
  ['Sports Cap', '890'],
]

function Receipt({ phase, bills }) {
  return (
    <div className="hero-receipt" aria-hidden="true">
      <div className="paper zz">
        <div className="r-head">
          <b>ZAP POS</b>
          <small>Lahore Main · Counter 01</small>
          <small>12-11-2026 · 3:04 PM</small>
        </div>
        <div className="r-rule" />
        {receiptItems.map(([n, p], i) => (
          <div className="r-line" key={n} style={{ animationDelay: `${0.6 + i * 0.35}s` }}><span>{n}</span><span>{p}</span></div>
        ))}
        <div className="r-rule" />
        <div className="r-total"><span>TOTAL</span><span>Rs 13,310</span></div>
        <div className={`r-status ${phase}`}>
          {phase === 'offline' ? `SAVED OFFLINE · #${1042 + bills}` : phase === 'syncing' ? 'SYNCING…' : `SYNCED · #${1042 + bills}`}
        </div>
      </div>
    </div>
  )
}

// Internet demo phases: online → (switch off) offline → (auto, or switch on) syncing → synced → online.
// It's a visual demo: after a few offline bills the internet comes back by itself.
const OFFLINE_MS = 5600
const SYNCED_MS = 2600
const FLY_GAP = 0.38 // seconds between paper planes
const slipAmounts = ['2,980', '890', '5,990', '3,450', '1,490', '2,250']

export default function Hero({ hero, brand, links }) {
  const [phase, setPhase] = useState('online')
  const [bills, setBills] = useState(0)
  const stage = useRef(null)
  const offline = phase === 'offline'
  const slips = Math.min(bills, slipAmounts.length)

  // Hover: tilt the monitor toward the cursor; floating pieces move at different depths.
  const onMove = (e) => {
    const el = stage.current
    if (!el || e.pointerType === 'touch') return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5).toFixed(3))
    el.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5).toFixed(3))
  }
  const onLeave = () => {
    stage.current?.style.setProperty('--px', 0)
    stage.current?.style.setProperty('--py', 0)
  }

  // Offline: the counter keeps billing locally, one bill every 1.6s.
  useEffect(() => {
    if (!offline) return
    const t = setInterval(() => setBills((b) => b + 1), 1600)
    return () => clearInterval(t)
  }, [offline])

  // Offline for a few seconds, then the internet comes back by itself (timer depends on phase only).
  useEffect(() => {
    if (phase !== 'offline') return
    const t = setTimeout(() => setPhase('syncing'), OFFLINE_MS)
    return () => clearTimeout(t)
  }, [phase])

  // Back online: planes fly (sync), then "all synced", then return to normal.
  useEffect(() => {
    if (phase === 'syncing') {
      const t = setTimeout(() => setPhase('synced'), (1.3 + FLY_GAP * Math.max(0, slips - 1)) * 1000 + 300)
      return () => clearTimeout(t)
    }
    if (phase === 'synced') {
      const t = setTimeout(() => { setPhase('online'); setBills(0) }, SYNCED_MS)
      return () => clearTimeout(t)
    }
  }, [phase, slips])

  const toggle = () => {
    if (offline) setPhase(bills > 0 ? 'syncing' : 'online')
    else if (phase === 'online') { setBills(0); setPhase('offline') }
    // while syncing / synced the demo finishes on its own
  }

  const status = {
    online: <span className="app-user"><i className="live" /> Online · synced</span>,
    offline: <span className="app-user off"><Icon name="wifiOff" size={11} /> Offline · {bills} bills saved</span>,
    syncing: <span className="app-user sync"><Icon name="cloud" size={11} /> Syncing {bills} bills…</span>,
    synced: <span className="app-user"><i className="live" /> All {bills} bills synced</span>,
  }[phase]

  const chip = {
    online: { icon: 'cloud', title: '3 branches synced', sub: 'Last sync 2s ago' },
    offline: { icon: 'wifiOff', title: 'Internet down', sub: `${bills} bills saved, will sync later` },
    syncing: { icon: 'cloud', title: 'Back online', sub: `Syncing ${bills} bills…` },
    synced: { icon: 'check', title: `All ${bills} bills synced`, sub: 'Nothing lost' },
  }[phase]

  const note = offline ? hero.offlineNote : phase === 'online' ? hero.switchNote : hero.syncedNote

  return (
    <section id="home" className={`hero is-${phase}`}>
      <div className="container hero-grid">
        <div className="hero-copy">
          <Kicker>{hero.kicker}</Kicker>

          {/* Headline: what the POS does; the yellow line draws under the last row */}
          <h1 className="h-rows">
            {hero.rows.map((r, i) => (
              <span className="hr-row" key={r.accent}>
                {r.lead} <span className="hl">{r.accent}</span>
                {i === hero.rows.length - 1 && <Squiggle />}
              </span>
            ))}
          </h1>

          <p className="lead">{hero.description}</p>

          <div className="hero-actions">
            <a href={links.windowsInstaller} data-track="download" className="btn btn-primary btn-lg"><Icon name="windows" size={16} fill /> {hero.primaryCta}</a>
            <a href={links.demo} data-track="demo" className="btn btn-quiet btn-lg">{hero.secondaryCta} <Icon name="arrow" size={16} /></a>
          </div>

          {/* Internet switch: turn it off and the POS on the right keeps billing offline */}
          <div className="net-toggle-row">
            <button
              className={`net-toggle ${offline ? 'off' : 'on'}`}
              onClick={toggle}
              role="switch"
              aria-checked={!offline}
            >
              <Icon name={offline ? 'wifiOff' : 'wifi'} size={16} />
              <span>{hero.switchLabel}</span>
              <span className="nt-track"><span className="nt-knob" /></span>
              <b>{offline ? 'OFF' : 'ON'}</b>
            </button>
            <Scribble dir="left" className="net-note">{note}</Scribble>
          </div>

          <ul className="trust">
            {hero.trust.map((t) => <li key={t}><Icon name="check" size={13} />{t}</li>)}
          </ul>
        </div>

        <div className="hero-stage" ref={stage} onPointerMove={onMove} onPointerLeave={onLeave}>
          <Monitor className="hero-monitor"><PosBillingScreen status={status} /></Monitor>
          <Receipt phase={phase} bills={bills} />
          <div className={`hero-chip ${phase}`}>
            <span className="chip-ic"><Icon name={chip.icon} size={15} /></span>
            <div>
              <b>{chip.title}</b>
              <small>{chip.sub}</small>
              {phase === 'syncing' && <span className="sync-bar"><i /></span>}
            </div>
            {offline && bills > 0 && <span className="chip-count" key={bills}>{bills}</span>}
          </div>
          {/* Offline bills pile up as paper slips; when the internet is back they fold into paper planes and fly to the cloud */}
          {(offline || phase === 'syncing') && slips > 0 && (
            <div className={`slip-stack ${phase}`} aria-hidden="true">
              {Array.from({ length: slips }, (_, i) => (
                <span
                  className="slip paper"
                  key={i}
                  style={{ '--i': i, animationDelay: phase === 'syncing' ? `${(slips - 1 - i) * FLY_GAP}s` : '0s' }}
                >
                  <small>BILL #{1043 + i}</small>
                  <b>Rs {slipAmounts[i]}</b>
                </span>
              ))}
            </div>
          )}
          {phase === 'syncing' && (
            <div className="plane-layer" aria-hidden="true">
              {Array.from({ length: slips }, (_, i) => (
                <span className="plane" key={i} style={{ animationDelay: `${i * FLY_GAP}s` }}><Icon name="plane" size={24} /></span>
              ))}
            </div>
          )}
          <div className="hero-phone-tag"><Icon name="call" size={14} /> {brand.phone}</div>
        </div>
      </div>
    </section>
  )
}
