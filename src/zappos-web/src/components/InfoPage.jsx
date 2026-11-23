import Icon from './Icons.jsx'
import { Kicker } from './Bits.jsx'
import Pricing from './Pricing.jsx'
import DownloadLink from './DownloadLink.jsx'
import { sizeLabel } from '../lib/release.js'

// One template for every inner page (/fbr-invoicing, /plans, /download …). All text comes from the `pages` content key;
// each block shows only when its fields are filled, so a page can be as short or long as it needs.
// The FAQ uses <details>, so answers open without JavaScript and are in the page HTML for search engines.

function PageHero({ page, links }) {
  return (
    <section className="ip-hero">
      <div className="container">
        <nav className="ip-crumbs" aria-label="Breadcrumb"><a href="/">Home</a><Icon name="arrow" size={12} /><span>{page.menu}</span></nav>
        <Kicker icon={page.icon}>{page.kicker}</Kicker>
        <h1>{page.title} <span className="hl">{page.titleHighlight}</span></h1>
        <p className="ip-lead">{page.description}</p>
        <div className="ip-actions">
          <a href={links.demo} data-track="demo" className="btn btn-primary btn-lg">Book a free demo <Icon name="arrow" size={16} /></a>
          <a href={links.whatsapp} data-track="whatsapp" className="btn btn-outline btn-lg"><Icon name="whatsapp" size={16} /> Ask on WhatsApp</a>
        </div>
        {page.stats?.length > 0 && (
          <div className="ip-stats">
            {page.stats.map((s) => <div key={s.label} className="ip-stat"><b>{s.value}</b><span>{s.label}</span></div>)}
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
        <div className="ip-download">
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

export default function InfoPage({ page, pages, pricing, links, release }) {
  const related = pages.items.filter((p) => p.slug !== page.slug)
  return (
    <>
      <PageHero page={page} links={links} />
      {page.showDownload && <DownloadCard page={page} links={links} release={release} />}
      {page.showPricing && <Pricing data={pricing} links={links} />}

      {page.problems?.length > 0 && (
        <section className="ip-block">
          <div className="container ip-narrow">
            <Head title={page.problemsTitle} />
            <ul className="ip-problems">
              {page.problems.map((t) => <li key={t}><Icon name="close" size={14} />{t}</li>)}
            </ul>
            {page.solvedLine && <p className="ip-solved"><Icon name="zap" size={16} fill /> {page.solvedLine}</p>}
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
            <ol className="ip-steps">
              {page.steps.map((st, i) => (
                <li key={st.title}><span className="ip-num">{String(i + 1).padStart(2, '0')}</span><h3>{st.title}</h3><p>{st.text}</p></li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {page.specs?.length > 0 && (
        <section className="ip-block">
          <div className="container">
            <Head title={page.specsTitle} />
            <div className="ip-specs">
              {page.specs.map((s) => (
                <div key={s.label} className="ip-spec"><span className="ip-ic"><Icon name={s.icon} size={18} /></span><div><small>{s.label}</small><b>{s.value}</b></div></div>
              ))}
            </div>
          </div>
        </section>
      )}

      {page.faq?.length > 0 && (
        <section className="ip-block">
          <div className="container ip-narrow">
            <Head title={page.faqTitle} />
            <div className="ip-faq">
              {page.faq.map((f) => (
                <details key={f.q}><summary>{f.q}<Icon name="plus" size={16} /></summary><p>{f.a}</p></details>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="ip-block">
        <div className="container">
          <div className="ip-cta">
            <h2>{page.ctaTitle}</h2>
            <p>{page.ctaText}</p>
            <div className="ip-actions">
              <a href={links.demo} data-track="demo" className="btn btn-primary btn-lg">Book a free demo <Icon name="arrow" size={16} /></a>
              <a href={links.whatsapp} data-track="whatsapp" className="btn btn-glass btn-lg"><Icon name="whatsapp" size={16} /> WhatsApp us</a>
            </div>
          </div>
          {related.length > 0 && (
            <div className="ip-related">
              <h4>{pages.relatedTitle}</h4>
              <div>{related.map((p) => <a key={p.slug} href={`/${p.slug}`} className="ip-rel glow"><Icon name={p.icon} size={16} />{p.menu}<Icon name="arrow" size={14} /></a>)}</div>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
