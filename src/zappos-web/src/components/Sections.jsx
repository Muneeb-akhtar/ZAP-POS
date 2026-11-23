import { useEffect, useRef, useState } from 'react'
import Icon, { Logo } from './Icons.jsx'
import { Scribble } from './Bits.jsx'
import DownloadLink from './DownloadLink.jsx'

// "ZAP POS" → "ZAP" in the heading color, "POS" in brand blue (never all-white on a light bar).
function BrandName({ name }) {
  const [first, ...rest] = name.split(' ')
  return <span>{first}{rest.length > 0 && <> <span className="brand-accent">{rest.join(' ')}</span></>}</span>
}

// Theme: index.html sets data-theme before first paint (saved choice, else dark: the site's default look).
// The toggle saves the visitor's choice.
const THEME_KEY = 'zap-theme'
const saveTheme = (t) => { try { localStorage.setItem(THEME_KEY, t) } catch { /* private mode etc. */ } }

function useTheme() {
  // Starts as dark (the same on the server-made page and in the browser, so the page can hydrate), then reads the real value.
  const [theme, setTheme] = useState('dark')
  useEffect(() => { setTheme(document.documentElement.dataset.theme || 'dark') }, [])
  return [theme, setTheme]
}

export function ThemeToggle() {
  const [theme, setTheme] = useTheme()
  const toggle = (e) => {
    const next = theme === 'dark' ? 'light' : 'dark'
    const apply = () => { document.documentElement.dataset.theme = next; setTheme(next); saveTheme(next) }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!document.startViewTransition || reduce) return apply()
    // Reveal the new theme in a circle growing from the button
    const r = e.currentTarget.getBoundingClientRect()
    const x = r.left + r.width / 2, y = r.top + r.height / 2
    const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
    document.startViewTransition(apply).ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
        { duration: 650, easing: 'cubic-bezier(.6,.1,.2,1)', pseudoElement: '::view-transition-new(root)' }
      )
    })
  }
  return (
    <button className="theme-toggle" onClick={toggle} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
      <Icon name="sun" size={18} />
      <Icon name="moon" size={17} />
    </button>
  )
}

// On inner pages (/plans …) the section links (#pricing) point back to the home page.
const onHome = (href, home) => (home || !href.startsWith('#') || href === '#demo' ? href : `/${href}`)

export function Navbar({ brand, nav, links, home = true }) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 20)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  return (
    <header className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="nav-pill">
        <a href={home ? '#home' : '/'} className="brand"><Logo size={32} /><BrandName name={brand.name} /></a>
        <nav className={`nav-links ${open ? 'open' : ''}`}>
          {nav.map((n) => <a key={n.href} href={onHome(n.href, home)} onClick={() => setOpen(false)}>{n.label}</a>)}
          <a href={links.portal} data-track="portal" className="nav-mobile-only" onClick={() => setOpen(false)}>Portal login</a>
        </nav>
        <div className="nav-actions">
          <ThemeToggle />
          <a href={links.portal} data-track="portal" className="nav-login">Log in</a>
          <DownloadLink href={links.windowsInstaller} className="btn btn-primary btn-sm" startText="Starting…" doneText="Downloading…"><Icon name="windows" size={13} fill /> Download</DownloadLink>
        </div>
        <button className="menu-btn" onClick={() => setOpen(!open)} aria-label="Toggle menu"><Icon name={open ? 'close' : 'menu'} size={20} /></button>
      </div>
    </header>
  )
}

export function Ticker({ items }) {
  const row = [...items, ...items]
  return (
    <div className="ticker" aria-label="Made for every kind of shop">
      <div className="ticker-track">
        {row.map((t, i) => <span key={i}>{t}<Icon name="zap" size={16} fill /></span>)}
      </div>
    </div>
  )
}

export function Hardware({ data }) {
  return (
    <section className="hardware">
      <div className="container hw-inner">
        <h2>{data.title}</h2>
        <div className="stickers">
          {data.items.map((h, i) => (
            <span key={h.label} className={`sticker s${i}`}><Icon name={h.icon} size={18} />{h.label}</span>
          ))}
          <Scribble dir="left" className="hw-note">{data.note}</Scribble>
        </div>
      </div>
    </section>
  )
}

// Star field for the night CTA: 7 well-spaced stars around the glow, each glowing and dimming at its own pace,
// plus shooting stars that start as soon as the section scrolls into view.
const STARS = [
  { x: 22, y: 14, s: 4, d: 3.6, delay: 0 },
  { x: 36, y: 34, s: 3, d: 4.4, delay: -1.2 },
  { x: 41, y: 6, s: 3, d: 5.0, delay: -2.6 },
  { x: 60, y: 9, s: 4, d: 4.0, delay: -0.6 },
  { x: 65, y: 31, s: 3, d: 3.2, delay: -1.9 },
  { x: 79, y: 17, s: 4, d: 4.8, delay: -3.1 },
  { x: 88, y: 40, s: 3, d: 3.9, delay: -2.2 },
]

function StarField() {
  return (
    <div className="final-stars" aria-hidden="true">
      {STARS.map((st, i) => (
        <i key={i} className="star" style={{ left: `${st.x}%`, top: `${st.y}%`, width: st.s, height: st.s, animationDuration: `${st.d}s`, animationDelay: `${st.delay}s` }} />
      ))}
      <i className="shooting s1" />
      <i className="shooting s2" />
    </div>
  )
}

export function FinalCta({ data, links, brand }) {
  // Tap or click the bolt to spin it.
  const [spin, setSpin] = useState(false)
  // Start the sky (shooting stars) the moment the section comes into view.
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) return setInView(true)
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect() } }, { threshold: 0.3 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <section className={`final ${inView ? 'in-view' : ''}`} ref={ref}>
      <StarField />
      <div className="container final-inner">
        <button
          className={`final-bolt ${spin ? 'spin' : ''}`}
          onClick={() => setSpin(true)}
          onAnimationEnd={(e) => e.animationName === 'boltTap' && setSpin(false)}
          aria-label="Spin the lightning bolt"
        >
          <Icon name="zap" size={44} fill />
        </button>
        <h2>{data.title} <span className="hl">{data.titleHighlight}</span></h2>
        <p>{data.description}</p>
        <div className="final-actions">
          <DownloadLink href={links.windowsInstaller} className="btn btn-primary btn-lg"><Icon name="windows" size={16} fill /> {data.primary}</DownloadLink>
          <a href={links.demo} data-track="demo" className="btn btn-glass btn-lg">{data.secondary} <Icon name="arrow" size={16} /></a>
        </div>
        <div className="final-stores">
          <a href={links.googlePlay} data-track="android" className="store"><Icon name="gplay" size={18} fill /><span><small>Owner app on</small>Google Play</span></a>
          <a href={links.appStore} data-track="ios" className="store"><Icon name="apple" size={18} fill /><span><small>Owner app on the</small>App Store</span></a>
          <a href={links.whatsapp} data-track="whatsapp" className="store wa"><Icon name="whatsapp" size={18} /><span><small>WhatsApp us</small>{brand.phone}</span></a>
        </div>
      </div>
    </section>
  )
}

export function Footer({ brand, footer, links }) {
  const year = new Date().getFullYear()
  const socials = ['linkedin', 'facebook', 'instagram', 'x']
  return (
    <footer className="footer" id="contact">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <a href="/" className="brand"><Logo size={32} /><BrandName name={brand.name} /></a>
            <p>{brand.about}</p>
            <div className="footer-contact-list">
              <span><Icon name="call" size={14} /> {brand.phone}</span>
              <span><Icon name="mail" size={14} /> <a href={`mailto:${brand.email}`} data-track="email">{brand.email}</a></span>
              <span><Icon name="pin" size={14} /> {brand.address}</span>
            </div>
          </div>
          {footer.groups.map((g) => (
            <div className="footer-col" key={g.title}>
              <h4>{g.title}</h4>
              {g.links.map((l) => <a key={l.href} href={l.href}>{l.label}</a>)}
            </div>
          ))}
        </div>
        <div className="footer-bottom">
          <span>© {year} {footer.copyright}</span>
          <div className="socials">{socials.map((s) => <a key={s} href={links.social[s]} aria-label={s}><Icon name={s} size={15} /></a>)}</div>
          <span className="legal"><a href="#">Privacy</a><a href="#">Terms</a></span>
        </div>
      </div>
      <div className="wordmark" aria-hidden="true">ZAP POS</div>
    </footer>
  )
}
