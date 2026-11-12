import { useState } from 'react'
import Icon from './Icons.jsx'
import { Kicker, Barcode, Scribble, formatRs } from './Bits.jsx'

function ReceiptPlan({ p, annual, links }) {
  const amount = annual ? p.annual : p.monthly
  return (
    <div className={`rplan ${p.featured ? 'featured' : ''}`}>
      {p.featured && <span className="stamp">{p.tag}</span>}
      <div className="paper zz zz-top">
        <div className="rp-head">
          <span className="rp-logo"><Icon name="zap" size={14} fill /></span>
          <b>ZAP POS</b>
          <small>PLAN · {p.name.toUpperCase()}</small>
          {!p.featured && <small className="rp-tag">{p.tag}</small>}
        </div>
        <div className="r-rule" />
        <div className="rp-lines">
          {p.lines.map(([q, l]) => (
            <div className="rp-line" key={l}><span className="q">{q}</span><span className="l">{l}</span><span className="dots" /></div>
          ))}
        </div>
        <div className="r-rule" />
        <div className="rp-total">
          <span>TOTAL</span>
          <span className="amt">
            {amount == null ? <b>{p.priceLabel}</b> : <><b>{formatRs(amount)}</b><small>/{annual ? 'year' : 'month'}</small></>}
          </span>
        </div>
        <p className="rp-desc">{p.description}</p>
        <div className="scan"><Barcode seed={p.name} /><span className="laser" aria-hidden="true" /></div>
        <small className="rp-thanks">*** THANK YOU, COME AGAIN ***</small>
      </div>
      <a href={links.demo} className={`btn ${p.featured ? 'btn-primary' : 'btn-outline'} btn-block rp-cta`}>{p.cta} <Icon name="arrow" size={15} /></a>
    </div>
  )
}

export default function Pricing({ data, links }) {
  const [annual, setAnnual] = useState(false)
  const [open, setOpen] = useState(false)
  const cell = (v) =>
    v === true ? <Icon name="check" size={16} className="yes" /> :
    v === false ? <Icon name="minus" size={16} className="no" /> : <span>{v}</span>

  return (
    <section id="pricing" className="section pricing-sec">
      <div className="container">
        <div className="pricing-head">
          <Kicker icon="tag">{data.kicker}</Kicker>
          <h2>{data.title} <span className="hl">{data.titleHighlight}</span></h2>
          <p>{data.description}</p>
          <div className="toggle-row">
            <div className="toggle" role="tablist">
              <button className={!annual ? 'on' : ''} onClick={() => setAnnual(false)}>Monthly</button>
              <button className={annual ? 'on' : ''} onClick={() => setAnnual(true)}>Yearly</button>
            </div>
            <Scribble dir="left" className="toggle-note">{data.annualLabel} yearly</Scribble>
          </div>
        </div>

        <div className="rplans">
          {data.plans.map((p) => <ReceiptPlan key={p.id} p={p} annual={annual} links={links} />)}
        </div>

        <div className={`compare-wrap ${open ? 'open' : ''}`}>
          <button className="compare-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
            <span><Icon name="layers" size={16} /> Compare every feature</span>
            <Icon name="chevD" size={18} className={open ? 'flip' : ''} />
          </button>
          {open && (
            <div className="compare" role="table">
              <div className="cmp-row cmp-headrow" role="row">
                <span role="columnheader" />
                {data.plans.map((p) => <span key={p.id} role="columnheader" className={`cmp-cell ${p.featured ? 'featured' : ''}`}>{p.name}</span>)}
              </div>
              {data.compare.map((r, i) =>
                r.group ? (
                  <div className="cmp-group" role="row" key={i}><span role="cell">{r.group}</span></div>
                ) : (
                  <div className="cmp-row" role="row" key={i}>
                    <span className="cmp-label" role="cell">{r.label}</span>
                    {r.values.map((v, j) => (
                      <span key={j} role="cell" className={`cmp-cell ${data.plans[j].featured ? 'featured' : ''}`} data-plan={data.plans[j].name}>{cell(v)}</span>
                    ))}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
