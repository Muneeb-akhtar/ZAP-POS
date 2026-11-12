import Icon from './Icons.jsx'
import { Kicker } from './Bits.jsx'

// Small illustrative visuals for each moment of the day.
const visuals = {
  open: () => (
    <div className="dv dv-open">
      <div><small>Opening cash</small><b>Rs 5,000</b></div>
      <div><small>Yesterday</small><b>Rs 182,400</b></div>
      <span className="dv-tag"><Icon name="check" size={12} /> Till open</span>
    </div>
  ),
  counters: () => (
    <div className="dv dv-counters">
      {['01', '02', '03'].map((c, i) => (
        <div key={c} className={i === 1 ? 'busy' : ''}>
          <Icon name="monitor" size={15} />
          <b>Counter {c}</b>
          <small>{i === 1 ? 'Billing…' : 'In sync'}</small>
        </div>
      ))}
    </div>
  ),
  offline: () => (
    <div className="dv dv-offline">
      <div className="dv-row"><Icon name="wifiOff" size={15} /><span>Internet down</span><em>15:00</em></div>
      <div className="dv-bar"><i /></div>
      <div className="dv-row"><Icon name="receipt" size={15} /><span>46 bills saved locally</span><em>15:52</em></div>
      <div className="dv-row ok"><Icon name="cloud" size={15} /><span>Back online, all synced</span><em>16:10</em></div>
    </div>
  ),
  stock: () => (
    <div className="dv dv-stock">
      {[['Cotton Shirt', 7, 22], ['Sneakers', 3, 10], ['Denim Jacket', 42, 100]].map(([n, q, pct]) => (
        <div key={n}>
          <span>{n}</span>
          <div className="dv-meter"><i style={{ width: `${pct}%` }} className={pct < 30 ? 'low' : ''} /></div>
          <em className={pct < 30 ? 'low' : ''}>{q} left</em>
        </div>
      ))}
    </div>
  ),
  phone: () => (
    <div className="dv dv-phone">
      <div className="dv-notif">
        <span className="dv-app"><Icon name="zap" size={13} fill /></span>
        <div><b>Today's sales: Rs 1.24M</b><small>3 branches · 412 bills · +18% vs last week</small></div>
      </div>
      <div className="dv-bars">{[30, 55, 42, 70, 60, 85, 66, 92].map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}</div>
    </div>
  ),
}

const periodIcon = { Morning: 'sun', 'Rush hour': 'users', 'Load shedding': 'wifiOff', Evening: 'box', Night: 'moon' }

export default function Day({ data }) {
  return (
    <section id="day" className="day">
      <div className="container">
        <div className="day-head">
          <Kicker icon="sun">{data.kicker}</Kicker>
          <h2>{data.title} <span className="hl">{data.titleHighlight}</span></h2>
          <p>{data.description}</p>
        </div>

        <ol className="timeline">
          {data.stops.map((s, i) => {
            const V = visuals[s.visual]
            return (
              <li key={s.time} className={`stop stop-${i} ${i % 2 ? 'right' : 'left'}`}>
                <div className="stop-time">
                  <span className="clock">{s.time}</span>
                  <span className="period"><Icon name={periodIcon[s.period] ?? 'zap'} size={13} /> {s.period}</span>
                </div>
                <span className="stop-dot" aria-hidden="true" />
                <article className="stop-card glow">
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                  {V && <V />}
                </article>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
