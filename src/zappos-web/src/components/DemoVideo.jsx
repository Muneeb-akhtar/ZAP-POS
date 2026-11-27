import { useState } from 'react'
import Icon from './Icons.jsx'
import { Kicker } from './Bits.jsx'

// "See ZAP POS at work": the demo video. The file is only downloaded after the visitor taps play
// (preload="none" until then), so the page stays light on a mobile connection.
export default function DemoVideo({ data, links }) {
  const [playing, setPlaying] = useState(false)
  if (!data.src) return null

  return (
    <section id="video" className="section video-sec">
      <div className="container">
        <div className="video-head">
          <Kicker icon="video">{data.kicker}</Kicker>
          <h2>{data.title} <span className="hl">{data.titleHighlight}</span></h2>
          <p>{data.description}</p>
        </div>

        <div className="video-frame">
          {playing ? (
            <video src={data.src} poster={data.poster} controls autoPlay playsInline aria-label={data.videoLabel} onEnded={() => setPlaying(false)} />
          ) : (
            <button type="button" className="video-play" onClick={() => setPlaying(true)} data-track="demo-video-play" aria-label={`${data.playLabel}: ${data.playNote}`}>
              <img src={data.poster} alt={data.posterAlt ?? ''} width="1280" height="720" loading="lazy" decoding="async" />
              <span className="video-badge"><Icon name="play" size={34} fill /></span>
              <span className="video-note">{data.playNote}</span>
            </button>
          )}
        </div>

        <ul className="video-points">
          {data.points.map((t) => <li key={t}><Icon name="check" size={16} />{t}</li>)}
        </ul>
        <div className="video-cta">
          <a className="btn btn-primary btn-lg" href={links.demo} data-track="demo">{data.cta}<Icon name="arrow" size={18} /></a>
        </div>
      </div>
    </section>
  )
}
