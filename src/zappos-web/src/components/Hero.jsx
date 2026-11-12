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

  // While "load shedding" is on, keep billing: one bill every 1.6s.
  useEffect(() => {
    if (!offline) return
    const t = setInterval(() => setBills((b) => b + 1), 1600)
    return () => clearInterval(t)
  }, [offline])

  // Let the navbar know so it can go dark with the hero.
  useEffect(() => {
    document.documentElement.dataset.power = offline ? 'off' : 'on'
  }, [offline])

  const status = offline ? (
    <span className="app-user off"><Icon name="wifiOff" size={11} /> Offline · {bills} bills saved</span>
  ) : (
    <span className="app-user"><i className="live" /> Online · synced</span>
  )

  return (
    <section id="home" className={`hero ${offline ? 'night' : ''}`}>
      <div className="hero-glow" aria-hidden="true" />
      <div className="container hero-grid">
        <div className="hero-copy">
          <Kicker light={offline}>{hero.kicker}</Kicker>
          <h1>
            <span className="h-top">{hero.titleTop}</span>
            <span className="h-bottom">
              {hero.titleBottom}
              <Squiggle />
            </span>
          </h1>
          <p className="lead">{hero.description}</p>

          <div className="hero-actions">
            <a href={links.windowsInstaller} className="btn btn-primary btn-lg"><Icon name="windows" size={16} fill /> {hero.primaryCta}</a>
            <a href={links.demo} className="btn btn-quiet btn-lg">{hero.secondaryCta} <Icon name="arrow" size={16} /></a>
          </div>

          <div className="switch-row">
            <button
              className={`power-switch ${offline ? 'on' : ''}`}
              onClick={() => setOffline(!offline)}
              role="switch"
              aria-checked={offline}
            >
              <span className="ps-track"><span className="ps-knob"><Icon name="zap" size={12} fill /></span></span>
              <span className="ps-label">{hero.switchLabel}: <b>{offline ? 'ON' : 'OFF'}</b></span>
            </button>
            <Scribble dir="left" className="switch-note">{offline ? 'still billing, see?' : hero.switchNote}</Scribble>
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
              <small>{offline ? `${bills} bills saved on this PC` : 'Last sync 2s ago'}</small>
            </div>
          </div>
          <div className="hero-phone-tag"><Icon name="call" size={14} /> {brand.phone}</div>
        </div>
      </div>
    </section>
  )
}
