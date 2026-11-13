import { useCallback, useEffect, useState } from 'react'
import { defaultContent, mergeContent, fetchPublishedContent, readCachedContent, writeCachedContent } from './lib/content.js'
import { Navbar, Ticker, Hardware, FinalCta, Footer } from './components/Sections.jsx'
import Hero from './components/Hero.jsx'
import Day from './components/Day.jsx'
import Counters from './components/Counters.jsx'
import Pricing from './components/Pricing.jsx'
import Reviews from './components/Reviews.jsx'
import Faq from './components/Faq.jsx'
import LeadForm from './components/LeadForm.jsx'
import { trackClick, trackView, trackVisit } from './lib/track.js'

// Where content comes from:
// - Supabase (edited in the admin panel at /admin), when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set.
// - Until it loads: the copy this browser saw last time, else the bundled landing-content.json.
// - If Supabase is unreachable or not configured: the bundled JSON.

export default function App() {
  const [c, setC] = useState(() => mergeContent(defaultContent, readCachedContent()))

  useEffect(() => {
    fetchPublishedContent()
      .then((data) => {
        if (!data) return
        writeCachedContent(data)
        setC(mergeContent(defaultContent, data))
      })
      .catch(() => console.info('ZAP POS: content service not reachable, using built-in content.'))
  }, [])

  // Demo form: any link to #demo opens it (pricing buttons pass their plan). Opening the page at /#demo opens it too.
  const [lead, setLead] = useState(() => (location.hash === '#demo' ? { plan: null } : null))
  const closeLead = useCallback(() => {
    setLead(null)
    if (location.hash === '#demo') history.replaceState(null, '', location.pathname + location.search)
  }, [])

  // Analytics: one visit per page load, clicks on [data-track] links, and whether pricing was seen.
  useEffect(() => {
    trackVisit()
    const click = (e) => {
      const tracked = e.target.closest?.('[data-track]')
      if (tracked) trackClick(tracked.dataset.track)
      const demo = e.target.closest?.('a[href="#demo"]')
      if (demo) { e.preventDefault(); setLead({ plan: demo.dataset.plan ?? null }) }
    }
    document.addEventListener('click', click)
    const pricing = document.getElementById('pricing')
    const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { trackView('pricing'); io.disconnect() } }, { threshold: 0.3 })
    if (pricing) io.observe(pricing)
    return () => { document.removeEventListener('click', click); io.disconnect() }
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
      {lead && <LeadForm plan={lead.plan} plans={c.pricing.plans} data={c.leadForm} links={c.links} brand={c.brand} onClose={closeLead} />}
    </>
  )
}
