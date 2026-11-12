import { useRef, useState } from 'react'
import Icon from './Icons.jsx'
import { Kicker, Scribble } from './Bits.jsx'

// Interactive demo: selling on one counter updates stock on all counters.
export default function Counters({ data }) {
  const [stock, setStock] = useState(data.stock)
  const [last, setLast] = useState(null) // { i, n } – which counter sold, n forces re-animation
  const n = useRef(0)

  const sell = (i) => {
    if (stock === 0) return
    setStock((s) => s - 1)
    n.current += 1
    setLast({ i, n: n.current })
  }
  const restock = () => { setStock(data.stock); setLast(null) }

  return (
    <section id="counters" className="section counters-sec">
      <div className="container">
        <div className="counters-head">
          <div>
            <Kicker icon="monitor">{data.kicker}</Kicker>
            <h2>{data.title} <span className="hl">{data.titleHighlight}</span></h2>
          </div>
          <p>{data.description}</p>
        </div>

        <div className="lan">
          <div className={`lan-master ${last ? 'ping' : ''}`} key={last ? `m${last.n}` : 'm'}>
            <span className="lan-ic"><Icon name="server" size={20} /></span>
            <div><b>Master PC</b><small>Stock · Prices · Bills</small></div>
            <span className="lan-stock"><small>Stock</small><b>{stock}</b></span>
          </div>

          <svg className="lan-wires" viewBox="0 0 900 70" preserveAspectRatio="none" aria-hidden="true">
            {/* Always-on: dashes flow from the master to every counter, with small "data packets" riding along */}
            <path d="M450 0 V30 H150 V70 M450 30 V70 M450 30 H750 V70" className="wire" />
            <path d="M450 0 V30 H150 V70 M450 30 V70 M450 30 H750 V70" className="flow" />
            {last && (
              <path
                key={last.n}
                className="pulse"
                d={['M150 70 V30 H450 V0 M450 30 H750 V70 M450 30 V70', 'M450 70 V0 M450 30 H150 V70 M450 30 H750 V70', 'M750 70 V30 H450 V0 M450 30 H150 V70 M450 30 V70'][last.i]}
              />
            )}
          </svg>

          <div className="lan-row">
            {[0, 1, 2].map((i) => {
              const sold = last?.i === i
              const synced = last && !sold
              return (
                <div className={`till glow ${sold ? 'sold' : ''} ${synced ? 'synced' : ''}`} key={`${i}-${last?.n ?? 0}`}>
                  <div className="till-top">
                    <span><Icon name="monitor" size={14} /> Counter 0{i + 1}</span>
                    <span className="till-flag">{sold ? 'Sold!' : synced ? 'Synced' : 'Ready'}</span>
                  </div>
                  <div className="till-item">
                    <span className="till-thumb" />
                    <div><b>{data.product}</b><small>Rs 3,450</small></div>
                  </div>
                  <div className="till-stock">
                    <small>In stock</small>
                    <b className={stock <= 3 ? 'low' : ''}>{stock}</b>
                  </div>
                  <button className="btn btn-primary btn-block" onClick={() => sell(i)} disabled={stock === 0}>
                    {stock === 0 ? 'Out of stock' : <>Sell one <Icon name="cart" size={14} /></>}
                  </button>
                </div>
              )
            })}
          </div>
          <Scribble dir="up" className="lan-note">{stock === 0 ? 'nobody sold it twice' : data.note}</Scribble>
          {stock < data.stock && <button className="restock" onClick={restock}><Icon name="box" size={13} /> Restock demo</button>}
        </div>

        <ul className="counters-points">
          {data.points.map((p) => <li key={p}><Icon name="check" size={15} />{p}</li>)}
        </ul>
      </div>
    </section>
  )
}
