import { Kicker, Stars, Scribble } from './Bits.jsx'

const tints = ['yellow', 'blue', 'mint']

export default function Reviews({ section, reviews }) {
  if (!reviews?.length) return null
  return (
    <section id="reviews" className="section reviews-sec">
      <div className="container">
        <div className="reviews-head">
          <div>
            <Kicker icon="star">{section.kicker}</Kicker>
            <h2>{section.title} <span className="hl">{section.titleHighlight}</span></h2>
          </div>
          <div className="rating-stamp">
            <b>{section.rating}</b>
            <Stars size={13} />
          </div>
        </div>

        <div className="cork">
          {reviews.map((r, i) => (
            <figure className={`note ${tints[i % tints.length]} n${i}`} key={i}>
              <span className="tape" aria-hidden="true" />
              <Stars size={13} />
              <blockquote>{r.text}</blockquote>
              <figcaption><b>{r.name}</b><small>{r.business}</small></figcaption>
            </figure>
          ))}
        </div>
        <Scribble dir="up" className="cork-note">{section.note}</Scribble>
      </div>
    </section>
  )
}
