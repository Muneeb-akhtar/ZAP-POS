import { useEffect, useRef, useState } from 'react'
import Icon from '../components/Icons.jsx'

// Small, dependency-free charts for the admin. One series each (brand blue), recessive grid,
// hover/tap tooltips, values always available as text.

const calm = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Counts the number inside a value ("Rs 38,500", 1250, "42") up from where it was, slowly (2 s, eases out).
// Anything around the number (Rs, %, …) stays as it is. With reduced motion the final value shows at once.
export function CountUp({ value, ms = 2000 }) {
  const text = String(value ?? '')
  const m = text.match(/-?[\d,]*\d(\.\d+)?/)
  const target = m ? Number(m[0].replace(/,/g, '')) : null
  const [shown, setShown] = useState(calm() || target == null ? target : 0)
  const from = useRef(0)
  useEffect(() => {
    if (target == null || calm()) { setShown(target); return }
    const start = performance.now(), a = from.current
    let raf
    const step = (now) => {
      const p = Math.min(1, (now - start) / ms), q = 1 - (1 - p) ** 3
      setShown(a + (target - a) * q)
      if (p < 1) raf = requestAnimationFrame(step); else from.current = target
    }
    raf = requestAnimationFrame(step)
    return () => { cancelAnimationFrame(raf); from.current = target }
  }, [target, ms])
  if (!m) return text
  const decimals = m[1] ? m[1].length - 1 : 0
  const num = Number(shown ?? 0).toLocaleString('en-PK', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  return <>{text.slice(0, m.index)}{num}{text.slice(m.index + m[0].length)}</>
}

// Headline number with an optional change vs the previous period.
export function Stat({ label, value, sub, cur, prev, icon, onClick, hero }) {
  const delta = prev ? Math.round(((cur - prev) / prev) * 100) : null
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className={`adm-stat ${onClick ? 'link' : ''} ${hero ? 'hero' : ''}`} onClick={onClick}>
      <span className="adm-stat-top">
        {icon && <span className="adm-stat-ic"><Icon name={icon} size={18} /></span>}
        {delta != null && (
          <em className={`adm-delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : ''}`}>
            {delta > 0 ? '▲' : delta < 0 ? '▼' : '•'} {Math.abs(delta)}%
          </em>
        )}
      </span>
      <b className="adm-stat-value"><CountUp value={value} /></b>
      <span className="adm-stat-label">{label}</span>
      {sub && <span className="adm-stat-sub">{sub}</span>}
    </Tag>
  )
}

const niceMax = (v) => {
  if (v <= 4) return 4
  const p = 10 ** Math.floor(Math.log10(v))
  return [1, 2, 2.5, 5, 10].map((m) => m * p).find((m) => m >= v)
}

// Vertical bars, e.g. visitors per day. data: [{ key, label, short, value }]
export function Bars({ data, name, format = (v) => v.toLocaleString('en-PK'), height = 170 }) {
  const [hover, setHover] = useState(null)
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)))
  const ticks = [max, max / 2, 0]
  const labelEvery = Math.ceil(data.length / 6)
  const h = hover != null ? data[hover] : null
  return (
    <div className="adm-bars" style={{ '--h': `${height}px` }}>
      <div className="adm-bars-plot" onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <span key={t} className="adm-bars-tick" style={{ bottom: `${(t / max) * 100}%` }}><small>{format(t)}</small></span>
        ))}
        <div className="adm-bars-cols" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}>
          {data.map((d, i) => (
            <button
              key={d.key} type="button" className={`adm-bars-col ${hover === i ? 'on' : ''}`}
              onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onClick={() => setHover(i)}
              aria-label={`${d.label}: ${format(d.value)} ${name}`}
            >
              <i style={{ height: `${(d.value / max) * 100}%`, '--i': i }} className={d.value ? '' : 'zero'} />
            </button>
          ))}
        </div>
        {h && (
          <div className="adm-tip" style={{ left: `${((hover + 0.5) / data.length) * 100}%` }}>
            <small>{h.label}</small><b>{format(h.value)}</b> {name}
          </div>
        )}
      </div>
      <div className="adm-bars-x" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}>
        {data.map((d, i) => <small key={d.key}>{i % labelEvery === 0 || i === data.length - 1 ? d.short : ''}</small>)}
      </div>
    </div>
  )
}

// Horizontal ranked list with bars. items: [{ label, value, sub? }]
export function BarList({ items, format = (v) => v.toLocaleString('en-PK'), empty = 'Nothing yet.' }) {
  const max = Math.max(0, ...items.map((i) => i.value))
  const total = items.reduce((s, i) => s + i.value, 0)
  if (!items.length || !total) return <p className="adm-empty">{empty}</p>
  return (
    <ul className="adm-barlist">
      {items.map((it) => (
        <li key={it.label} title={`${it.label}: ${format(it.value)} (${Math.round((it.value / total) * 100)}%)`}>
          <span className="adm-barlist-bar" style={{ width: `${(it.value / max) * 100}%` }} />
          <span className="adm-barlist-label">{it.label}{it.sub && <small>{it.sub}</small>}</span>
          <b>{format(it.value)}</b>
        </li>
      ))}
    </ul>
  )
}

// Funnel: each step as a share of the first, plus the step-to-step rate.
export function Funnel({ steps }) {
  const top = steps[0]?.value || 0
  return (
    <ol className="adm-funnel">
      {steps.map((s, i) => {
        const prev = steps[i - 1]?.value
        return (
          <li key={s.label}>
            <div className="adm-funnel-head">
              <span>{s.label}</span>
              <b>{s.value.toLocaleString('en-PK')}</b>
            </div>
            <div className="adm-funnel-track"><i style={{ width: `${top ? Math.max((s.value / top) * 100, s.value ? 1.5 : 0) : 0}%` }} /></div>
            <small>{i === 0 ? s.hint : prev ? `${Math.round((s.value / prev) * 100)}% of the step before · ${s.hint}` : s.hint}</small>
          </li>
        )
      })}
    </ol>
  )
}

// Smooth line with a soft area under it, e.g. income per month. The line draws itself once (CSS, .adm-area).
// data: [{ key, short, label, value }]
export function Area({ data, name, format = (v) => v.toLocaleString('en-PK'), height = 150 }) {
  const [hover, setHover] = useState(null)
  const W = 600, H = 160, max = niceMax(Math.max(0, ...data.map((d) => d.value)))
  const pts = data.map((d, i) => [data.length < 2 ? W / 2 : (i / (data.length - 1)) * W, H - 8 - (d.value / max) * (H - 24)])
  const line = pts.map(([x, y], i) => {
    if (!i) return `M${x},${y}`
    const [px, py] = pts[i - 1], c = (x - px) / 2
    return `C${px + c},${py} ${x - c},${y} ${x},${y}`
  }).join(' ')
  const h = hover != null ? data[hover] : null
  return (
    <div className="adm-area" style={{ '--h': `${height}px` }} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
        <defs><linearGradient id="admAreaFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style={{ stopColor: 'var(--brand-500)', stopOpacity: 0.32 }} /><stop offset="1" style={{ stopColor: 'var(--brand-500)', stopOpacity: 0 }} /></linearGradient></defs>
        {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} className="adm-area-grid" />)}
        {pts.length > 1 && <path className="adm-area-fill" d={`${line} L${W},${H} L0,${H}Z`} />}
        {pts.length > 1 && <path className="adm-area-line" d={line} vectorEffect="non-scaling-stroke" />}
      </svg>
      <div className="adm-area-hits" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}>
        {data.map((d, i) => (
          <button key={d.key} type="button" className={hover === i ? 'on' : ''} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onClick={() => setHover(i)}
            aria-label={`${d.label}: ${format(d.value)} ${name}`}><small>{d.short}</small></button>
        ))}
      </div>
      {h && <div className="adm-tip" style={{ left: `${((hover + 0.5) / data.length) * 100}%`, top: 0 }}><small>{h.label}</small><b>{format(h.value)}</b> {name}</div>}
    </div>
  )
}

// Ring with a number in the middle; segments fill in once. parts: [{ label, value, tone, show? }] (tone = a CSS class; show = how the value is written in the key).
export function Donut({ parts, middle, sub }) {
  const total = parts.reduce((s, p) => s + p.value, 0)
  const R = 38, C = 2 * Math.PI * R
  let at = 0
  return (
    <div className="adm-donut">
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r={R} className="adm-donut-track" />
        {total > 0 && parts.filter((p) => p.value).map((p) => {
          const len = (p.value / total) * C, seg = <circle key={p.label} cx="50" cy="50" r={R} className={`adm-donut-seg ${p.tone}`}
            style={{ '--len': len, '--c': C, strokeDashoffset: -at }} transform="rotate(-90 50 50)" />
          at += len
          return seg
        })}
      </svg>
      <div className="adm-donut-mid"><b><CountUp value={middle ?? total} /></b>{sub && <small>{sub}</small>}</div>
      <ul className="adm-donut-key">{parts.map((p) => <li key={p.label}><i className={p.tone} />{p.label} <b>{p.show ?? p.value}</b></li>)}</ul>
    </div>
  )
}
