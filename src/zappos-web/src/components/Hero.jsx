import { useEffect, useRef, useState } from 'react'
import Icon from './Icons.jsx'
import { Monitor, PosBillingScreen } from './Mockups.jsx'
import { Kicker, Scribble } from './Bits.jsx'

const receiptItems = [
  ['Denim Jacket', '3,450'],
  ['Cotton Shirt ×2', '2,980'],
  ['Leather Shoes', '5,990'],
  ['Sports Cap', '890'],
]

function Receipt({ offline, bills }) {
  return (
    <div className="hero-receipt" aria-hidden="true">
      <div className="paper zz">
        <div className="r-head">
          <b>ZAP POS</b>
          <small>Lahore Main · Counter 01</small>
          <small>12-11-2026 · 15:04</small>
        </div>
        <div className="r-rule" />
        {receiptItems.map(([n, p], i) => (
          <div className="r-line" key={n} style={{ animationDelay: `${0.6 + i * 0.35}s` }}><span>{n}</span><span>{p}</span></div>
        ))}
        <div className="r-rule" />
        <div className="r-total"><span>TOTAL</span><span>Rs 13,310</span></div>
        <div className={`r-status ${offline ? 'off' : ''}`}>
          {offline ? `SAVED OFFLINE · #${1042 + bills}` : 'SYNCED · #1042'}
        </div>
      </div>
    </div>
  )
}

export default function Hero({ hero, brand, links }) {
  const [offline, setOffline] = useState(false)
  const [bills, setBills] = useState(0)
  const stage = useRef(null)

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

  // While the internet is off, the counter keeps billing locally: one bill every 1.6s.
  useEffect(() => {
    if (!offline) return
    const t = setInterval(() => setBills((b) => b + 1), 1600)
    return () => clearInterval(t)
  }, [offline])

  const status = offline ? (
    <span className="app-user off"><Icon name="wifiOff" size={11} /> Offline · {bills} bills saved</span>
  ) : (
    <span className="app-user"><i className="live" /> Online · synced</span>
  )

  return (
    <section id="home" className={`hero ${offline ? 'is-offline' : ''}`}>
      <div className="container hero-grid">
        <div className="hero-copy">
          <Kicker>{hero.kicker}</Kicker>

          {/* Headline: what the POS does */}
          <h1 className="h-rows">
            {hero.rows.map((r) => (
              <span className="hr-row" key={r.accent}>{r.lead} <span className="hl">{r.accent}</span></span>
            ))}
          </h1>

          <p className="lead">{hero.description}</p>

          <div className="hero-actions">
            <a href={links.windowsInstaller} className="btn btn-primary btn-lg"><Icon name="windows" size={16} fill /> {hero.primaryCta}</a>
            <a href={links.demo} className="btn btn-quiet btn-lg">{hero.secondaryCta} <Icon name="arrow" size={16} /></a>
          </div>

          {/* Internet switch: turn it off and the POS on the right keeps billing offline */}
          <div className="net-toggle-row">
            <button
              className={`net-toggle ${offline ? 'off' : 'on'}`}
              onClick={() => setOffline(!offline)}
              role="switch"
              aria-checked={!offline}
            >
              <Icon name={offline ? 'wifiOff' : 'wifi'} size={16} />
              <span>{hero.switchLabel}</span>
              <span className="nt-track"><span className="nt-knob" /></span>
              <b>{offline ? 'OFF' : 'ON'}</b>
            </button>
            <Scribble dir="left" className="net-note">{offline ? hero.offlineNote : hero.switchNote}</Scribble>
          </div>

          <ul className="trust">
            {hero.trust.map((t) => <li key={t}><Icon name="check" size={13} />{t}</li>)}
          </ul>
        </div>

        <div className="hero-stage" ref={stage} onPointerMove={onMove} onPointerLeave={onLeave}>
          <Monitor className="hero-monitor"><PosBillingScreen status={status} /></Monitor>
          <Receipt offline={offline} bills={bills} />
          <div className={`hero-chip ${offline ? 'warn' : ''}`}>
            <Icon name={offline ? 'wifiOff' : 'cloud'} size={15} />
            <div>
              <b>{offline ? 'Internet down' : '3 branches synced'}</b>
              <small>{offline ? `${bills} bills saved, will sync later` : 'Last sync 2s ago'}</small>
            </div>
          </div>
          <div className="hero-phone-tag"><Icon name="call" size={14} /> {brand.phone}</div>
        </div>
      </div>
    </section>
  )
}
