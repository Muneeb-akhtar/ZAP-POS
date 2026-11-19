import { useState } from 'react'
import Icon from '../components/Icons.jsx'

// Small, dependency-free charts for the admin. One series each (brand blue), recessive grid,
// hover/tap tooltips, values always available as text.

// Headline number with an optional change vs the previous period.
export function Stat({ label, value, sub, cur, prev, icon, onClick }) {
  const delta = prev ? Math.round(((cur - prev) / prev) * 100) : null
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className={`adm-stat ${onClick ? 'link' : ''}`} onClick={onClick}>
      <span className="adm-stat-label">{icon && <Icon name={icon} size={15} />} {label}</span>
      <b className="adm-stat-value">{value}</b>
      <span className="adm-stat-sub">
        {delta != null && (
          <em className={delta > 0 ? 'up' : delta < 0 ? 'down' : ''}>
            {delta > 0 ? '▲' : delta < 0 ? '▼' : '•'} {Math.abs(delta)}%
          </em>
        )}
        {sub}
      </span>
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
              <i style={{ height: `${(d.value / max) * 100}%` }} className={d.value ? '' : 'zero'} />
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
