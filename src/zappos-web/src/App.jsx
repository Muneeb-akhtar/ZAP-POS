import { useEffect, useMemo, useRef, useState } from 'react'
import { defaultContent, mergeContent, fetchPublishedContent, readCachedContent, writeCachedContent } from './lib/content.js'
import { Navbar, Ticker, Hardware, FinalCta, Footer } from './components/Sections.jsx'
import Hero from './components/Hero.jsx'
import Day from './components/Day.jsx'
import DemoVideo from './components/DemoVideo.jsx'
import Counters from './components/Counters.jsx'
import Pricing from './components/Pricing.jsx'
import Reviews from './components/Reviews.jsx'
import Faq from './components/Faq.jsx'
import WhatsAppFloat from './components/WhatsAppFloat.jsx'
import InfoPage from './components/InfoPage.jsx'
import { trackClick, trackView, trackVisit } from './lib/track.js'
import { installerLink, useLatestRelease } from './lib/release.js'

// 03390035603 → 923390035603 for wa.me links
const waNumber = (p = '') => { const d = p.replace(/\D/g, ''); return d.startsWith('0') ? `92${d.slice(1)}` : d }

// Where content comes from:
// - Supabase (edited in the admin panel at /admin), when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set.
// - Until it loads: the copy this browser saw last time, else the bundled landing-content.json.
// - If Supabase is unreachable or not configured: the bundled JSON.

// `initialContent` is the content the page was pre-rendered with (see scripts/prerender.mjs). The first browser render
// must match that HTML exactly so React can reuse it; the saved copy and the live copy are applied right after.
// `path` is the page's address ('/' = home, '/plans' = an inner page from the `pages` content key).
export default function App({ initialContent, path = '/' }) {
  const [c, setC] = useState(() => initialContent ?? mergeContent(defaultContent, readCachedContent()))

  const release = useLatestRelease(c.links.githubRepo)
  const links = useMemo(() => ({ ...c.links, windowsInstaller: installerLink(c.links, release) }), [c.links, release])

  useEffect(() => {
    if (initialContent) {
      const cached = readCachedContent()
      if (cached) setC(mergeContent(defaultContent, cached))
    }
    fetchPublishedContent()
      .then((data) => {
        if (!data) return
        writeCachedContent(data)
        setC(mergeContent(defaultContent, data))
      })
      .catch(() => console.info('ZAP POS: content service not reachable, using built-in content.'))
  }, [])

  // Free demo: every link to #demo opens WhatsApp to the shop's number (owner request, 26 Nov 2026); pricing buttons add their plan.
  const demoRef = useRef(null)
  demoRef.current = (plan) => {
    const d = c.demoWhatsApp
    const text = plan ? d.planMessage.replace('{plan}', plan) : d.message
    return `https://wa.me/${waNumber(c.brand.phone)}?text=${encodeURIComponent(text)}`
  }

  // Analytics: one visit per page load, clicks on [data-track] links, and whether pricing was seen.
  useEffect(() => {
    trackVisit()
    const click = (e) => {
      const tracked = e.target.closest?.('[data-track]')
      if (tracked) trackClick(tracked.dataset.track)
      const demo = e.target.closest?.('a[href="#demo"]')
      if (demo) { e.preventDefault(); window.open(demoRef.current(demo.dataset.plan ?? null), '_blank', 'noopener') }
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

  const page = path === '/' ? null : c.pages.items.find((p) => `/${p.slug}` === path)

  if (page) return (
    <>
      <Navbar brand={c.brand} nav={c.nav} links={links} home={false} homeLabel={c.pages.homeLabel} />
      <main className="inner-page"><InfoPage page={page} pages={c.pages} pricing={c.pricing} finalCta={c.finalCta} brand={c.brand} links={links} release={release} /></main>
      <Footer brand={c.brand} footer={c.footer} links={links} />
      <WhatsAppFloat data={c.whatsappButton} links={links} />
    </>
  )

  return (
    <>
      <Navbar brand={c.brand} nav={c.nav} links={links} homeLabel={c.pages.homeLabel} />
      <main>
        <Hero hero={c.hero} brand={c.brand} links={links} release={release} />
        <Ticker items={c.ticker} />
        <Day data={c.day} />
        <DemoVideo data={c.video} links={links} />
        <Counters data={c.counters} />
        <Hardware data={c.hardware} />
        <Pricing data={c.pricing} links={links} />
        <Reviews section={c.reviewsSection} reviews={c.reviews} />
        <Faq data={c.faq} brand={c.brand} links={links} />
        <FinalCta data={c.finalCta} links={links} brand={c.brand} />
      </main>
      <Footer brand={c.brand} footer={c.footer} links={links} />
      <WhatsAppFloat data={c.whatsappButton} links={links} />
    </>
  )
}
