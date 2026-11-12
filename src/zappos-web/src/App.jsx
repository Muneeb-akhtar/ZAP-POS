import { useEffect, useState } from 'react'
import fallbackContent from './content/landing-content.json'
import { Navbar, Ticker, Hardware, FinalCta, Footer } from './components/Sections.jsx'
import Hero from './components/Hero.jsx'
import Day from './components/Day.jsx'
import Counters from './components/Counters.jsx'
import Pricing from './components/Pricing.jsx'
import Reviews from './components/Reviews.jsx'
import Faq from './components/Faq.jsx'

// Content comes from the ASP.NET Core API (GET /api/landing).
// If the API isn't running, the bundled JSON is used so the page still renders.
export default function App() {
  const [c, setC] = useState(fallbackContent)

  useEffect(() => {
    fetch('/api/landing')
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setC)
      .catch(() => console.info('ZAP POS API not reachable, using bundled content.'))
  }, [])

  // Hover glow: cards with class "glow" get a soft light that follows the cursor.
  useEffect(() => {
    const move = (e) => {
      const card = e.target.closest?.('.glow')
      if (!card) return
      const r = card.getBoundingClientRect()
      card.style.setProperty('--mx', `${e.clientX - r.left}px`)
      card.style.setProperty('--my', `${e.clientY - r.top}px`)
    }
    document.addEventListener('pointermove', move, { passive: true })
    return () => document.removeEventListener('pointermove', move)
  }, [])

  return (
    <>
      <Navbar brand={c.brand} nav={c.nav} links={c.links} />
      <main>
        <Hero hero={c.hero} brand={c.brand} links={c.links} />
        <Ticker items={c.ticker} />
        <Day data={c.day} />
        <Counters data={c.counters} />
        <Hardware data={c.hardware} />
        <Pricing data={c.pricing} links={c.links} />
        <Reviews section={c.reviewsSection} reviews={c.reviews} />
        <Faq data={c.faq} brand={c.brand} links={c.links} />
        <FinalCta data={c.finalCta} links={c.links} brand={c.brand} />
      </main>
      <Footer brand={c.brand} footer={c.footer} links={c.links} />
    </>
  )
}
