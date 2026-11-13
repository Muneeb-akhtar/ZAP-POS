import { useEffect, useRef, useState } from 'react'
import Icon from './Icons.jsx'
import { Kicker } from './Bits.jsx'

const time = (i) => `10:${String(12 + i * 3).padStart(2, '0')} am`

// FAQ as a WhatsApp-style chat: tap a question and the answer "types" in.
export default function Faq({ data, brand, links }) {
  const [asked, setAsked] = useState([0])
  const [typing, setTyping] = useState(null)
  const body = useRef(null)
  const first = useRef(true)

  useEffect(() => {
    if (first.current) { first.current = false; return }
    const el = body.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [asked, typing])

  const ask = (i) => {
    if (typing !== null || asked.includes(i)) return
    setAsked((a) => [...a, i])
    setTyping(i)
    setTimeout(() => setTyping(null), 900)
  }

  const remaining = data.items.map((_, i) => i).filter((i) => !asked.includes(i))

  return (
    <section id="faq" className="section faq-sec">
      <div className="container faq-grid">
        <div className="faq-copy">
          <Kicker icon="whatsapp">{data.kicker}</Kicker>
          <h2>{data.title} <span className="hl">{data.titleHighlight}</span></h2>
          <p>{data.description}</p>
          <a href={links.whatsapp} className="wa-cta">
            <span className="wa-ic"><Icon name="whatsapp" size={20} /></span>
            <div><small>Message us on WhatsApp</small><b>{brand.phone}</b></div>
            <Icon name="arrow" size={16} />
          </a>
        </div>

        <div className="chat">
          <div className="chat-top">
            <span className="chat-back" aria-hidden="true"><Icon name="chevL" size={20} /></span>
            <span className="chat-avatar"><Icon name="zap" size={18} fill /><i className="chat-presence" /></span>
            <div className="chat-who">
              <b>ZAP POS Support <span className="bot-tag">BOT</span></b>
              <small className={typing !== null ? 'is-typing' : ''}>
                {typing !== null ? 'typing…' : <><i className="dot" /> Live · replies instantly</>}
              </small>
            </div>
            <span className="chat-actions" aria-hidden="true"><Icon name="video" size={19} /><Icon name="call" size={17} /></span>
          </div>
          <div className="chat-body" ref={body}>
            <span className="chat-day">Today</span>
            {asked.map((i, k) => (
              <div key={i} className="exchange">
                <div className="bubble out">{data.items[i].q}<em>{time(k)} <Icon name="check" size={11} /><Icon name="check" size={11} /></em></div>
                {typing === i ? (
                  <div className="bubble in typing"><i /><i /><i /></div>
                ) : (
                  <div className="bubble in">{data.items[i].a}<em>{time(k)}</em></div>
                )}
              </div>
            ))}
          </div>
          <div className="chat-chips">
            {remaining.length ? (
              remaining.map((i) => (
                <button key={i} onClick={() => ask(i)} disabled={typing !== null}>{data.items[i].q}</button>
              ))
            ) : (
              <span className="chat-done">That's everything. Message us for anything else!</span>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
