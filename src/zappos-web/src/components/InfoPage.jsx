import Icon from './Icons.jsx'
import { Kicker, Scribble, Squiggle, Barcode } from './Bits.jsx'
import Pricing from './Pricing.jsx'
import DownloadLink from './DownloadLink.jsx'
import { FinalCta } from './Sections.jsx'
import { sizeLabel } from '../lib/release.js'

// One template for every inner page (/fbr-invoicing, /plans, /download …), drawn in ZAP's own look: the page's
// facts print on a receipt, problems are sticky notes, steps are paper tickets, needs are stickers, the FAQ is a
// WhatsApp chat and the page ends with the night section. All text comes from the `pages` content key; each block
// shows only when filled. Everything is plain HTML (no clicks needed), so search engines read every answer.

const TINTS = ['yellow', 'blue', 'mint']

function PageHero({ page, links }) {
  const receipt = page.stats?.length > 0
  return (
    <section className="ip-hero">
      <div className={`container ${receipt ? 'ip-hero-grid' : 'ip-hero-solo'}`}>
        <div className="ip-hero-copy">
          <nav className="ip-crumbs" aria-label="Breadcrumb"><a href="/">Home</a><Icon name="arrow" size={12} /><span>{page.menu}</span></nav>
          <Kicker icon={page.icon}>{page.kicker}</Kicker>
          <h1>{page.title} <span className="ip-hl">{page.titleHighlight}<Squiggle /></span></h1>
          <p className="ip-lead">{page.description}</p>
          <div className="ip-actions">
            <a href={links.demo} data-track="demo" className="btn btn-primary btn-lg">Book a free demo <Icon name="arrow" size={16} /></a>
            <a href={links.whatsapp} data-track="whatsapp" className="btn btn-outline btn-lg"><Icon name="whatsapp" size={16} /> Ask on WhatsApp</a>
          </div>
        </div>
        {receipt && (
          <div className="ip-receipt paper zz zz-top" aria-label={`${page.menu} at a glance`}>
            <div className="rp-head">
              <span className="rp-logo"><Icon name="zap" size={14} fill /></span>
              <b>ZAP POS</b>
              <small>{page.menu.toUpperCase()}</small>
            </div>
            <div className="r-rule" />
            <div className="ip-rlines">
              {page.stats.map((s) => <div key={s.label}><b>{s.value}</b><span>{s.label}</span></div>)}
            </div>
            <div className="r-rule" />
            <div className="ip-rtotal"><span>TOTAL</span><b>✓ ALL INCLUDED</b></div>
            <Barcode seed={page.slug} />
            <small className="ip-rthanks">*** zappos.pk ***</small>
          </div>
        )}
      </div>
    </section>
  )
}

function DownloadCard({ page, links, release }) {
  return (
    <section className="ip-block">
      <div className="container">
        <div className="ip-download glow">
          <span className="ip-dl-icon"><Icon name="windows" size={34} fill /></span>
          <div>
            <h2>{page.downloadTitle}</h2>
            <p>{page.downloadNote}{release ? ` · Version ${release.version} · ${sizeLabel(release.size)}` : ''}</p>
          </div>
          <DownloadLink href={links.windowsInstaller} className="btn btn-primary btn-lg"><Icon name="download" size={16} /> Download ZAP-POS-Setup.exe</DownloadLink>
        </div>
      </div>
    </section>
  )
}

const Head = ({ title, text }) => (
  <div className="ip-head"><h2>{title}</h2>{text && <p>{text}</p>}</div>
)

export default function InfoPage({ page, pages, pricing, finalCta, brand, links, release }) {
  // Up to 6 other pages, starting after this one, so links are spread across the whole site.
  const at = pages.items.findIndex((p) => p.slug === page.slug)
  const related = [...pages.items.slice(at + 1), ...pages.items.slice(0, at)].slice(0, 6)
  return (
    <>
      <PageHero page={page} links={links} />
      {page.shortAnswer && (
        <section className="ip-block ip-short-wrap">
          <div className="container">
            <div className="ip-short paper zz zz-top">
              <span className="ip-short-label">{page.shortLabel ?? pages.shortLabel}</span>
              <p>{page.shortAnswer}</p>
            </div>
          </div>
        </section>
      )}
      {page.showDownload && <DownloadCard page={page} links={links} release={release} />}
      {page.showPricing && <Pricing data={pricing} links={links} />}

      {page.article?.length > 0 && (
        <section className="ip-block">
          <article className="container ip-article">
            {page.article.map((sec) => (
              <div key={sec.h}>
                <h2>{sec.h}</h2>
                {sec.p.map((t) => <p key={t}>{t}</p>)}
              </div>
            ))}
          </article>
        </section>
      )}

      {page.problems?.length > 0 && (
        <section className="ip-block">
          <div className="container">
            <Head title={page.problemsTitle} />
            <div className="ip-notes">
              {page.problems.map((t, i) => (
                <figure key={t} className={`note ${TINTS[i % TINTS.length]} n${i % 3}`}>
                  <span className="tape" aria-hidden="true" />
                  <blockquote>{t}</blockquote>
                </figure>
              ))}
            </div>
            {page.solvedLine && <div className="ip-solved"><Scribble dir="up">{page.solvedLine}</Scribble></div>}
          </div>
        </section>
      )}

      {page.features?.length > 0 && (
        <section className="ip-block">
          <div className="container">
            <Head title={page.featuresTitle} text={page.featuresText} />
            <div className="ip-grid">
              {page.features.map((f) => (
                <div key={f.title} className="ip-card glow">
                  <span className="ip-ic"><Icon name={f.icon} size={20} /></span>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {page.steps?.length > 0 && (
        <section className="ip-block">
          <div className="container">
            <Head title={page.stepsTitle} />
            <ol className="ip-tickets">
              {page.steps.map((st, i) => (
                <li key={st.title} className={`paper zz zz-top t${i % 4}`}>
                  <span className="ip-tnum">STEP #{String(i + 1).padStart(2, '0')}</span>
                  <div className="r-rule" />
                  <h3>{st.title}</h3>
                  <p>{st.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {page.specs?.length > 0 && (
        <section className="ip-block">
          <div className="container">
            <Head title={page.specsTitle} />
            <div className="stickers ip-stickers">
              {page.specs.map((s, i) => (
                <span key={s.label} className={`sticker s${i % 6}`}><Icon name={s.icon} size={18} /><span><small>{s.label}</small>{s.value}</span></span>
              ))}
            </div>
          </div>
        </section>
      )}

      {page.faq?.length > 0 && (
        <section className="ip-block">
          <div className="container">
            <Head title={page.faqTitle} />
            <div className="chat ip-chat">
              <div className="chat-top">
                <span className="chat-avatar"><Icon name="zap" size={18} fill /><i className="chat-presence" /></span>
                <div className="chat-who"><b>ZAP POS Support</b><small><i className="dot" /> {brand.phone}</small></div>
                <a href={links.whatsapp} data-track="whatsapp" className="ip-chat-wa" aria-label="Message us on WhatsApp"><Icon name="whatsapp" size={19} /></a>
              </div>
              <div className="chat-body">
                {page.faq.map((f) => (
                  <div key={f.q} className="exchange">
                    <h3 className="bubble out">{f.q}</h3>
                    <p className="bubble in">{f.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {related.length > 0 && (
        <div className="container ip-related">
          <h4>{pages.relatedTitle}</h4>
          <div>{related.map((p) => <a key={p.slug} href={`/${p.slug}`} className="ip-rel"><Icon name={p.icon} size={16} />{p.menu}<Icon name="arrow" size={14} /></a>)}</div>
        </div>
      )}

      <FinalCta data={{ ...finalCta, title: page.ctaTitle, titleHighlight: '', description: page.ctaText }} links={links} brand={brand} />
    </>
  )
}
