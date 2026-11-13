import { useEffect, useRef, useState } from 'react'
import Icon from './Icons.jsx'
import { SUPABASE_URL, SUPABASE_ANON_KEY, supabaseConfigured } from '../lib/content.js'
import { leadSource } from '../lib/track.js'

// "Book a free demo" form. Opens from any link to #demo (App.jsx); pricing buttons pass their plan.
// Saves to Supabase `leads` (visitors may only insert), shown in the admin Leads inbox.
async function sendLead(lead) {
  if (!supabaseConfigured) throw new Error('not configured')
  const res = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json', Prefer: 'return=minimal',
    },
    body: JSON.stringify(lead),
  })
  if (!res.ok) throw new Error(`Supabase ${res.status}`)
}

const digits = (s) => s.replace(/\D/g, '')

export default function LeadForm({ plan, plans, data, links, brand, onClose }) {
  const [f, setF] = useState({ name: '', phone: '', shop: '', city: '', plan: plan ?? '', branches: '1', message: '', website: '' })
  const [state, setState] = useState('idle') // idle | sending | done | error
  const [phoneError, setPhoneError] = useState(false)
  const box = useRef(null)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  // Focus the first field (mouse users), close on Esc, lock page scroll while open.
  useEffect(() => {
    const opener = document.activeElement
    if (matchMedia('(pointer: fine)').matches) box.current?.querySelector('input')?.focus() // no pop-up keyboard on phones
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.documentElement.classList.add('modal-open')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.documentElement.classList.remove('modal-open')
      opener?.focus?.()
    }
  }, [onClose])

  const submit = async (e) => {
    e.preventDefault()
    const n = digits(f.phone)
    if (n.length < 10 || n.length > 13) { setPhoneError(true); return }
    if (f.website) { setState('done'); return } // hidden field only bots fill in
    setState('sending')
    try {
      await sendLead({
        name: f.name.trim(), phone: f.phone.trim(), shop: f.shop.trim() || null, city: f.city.trim() || null,
        plan: f.plan || null, branches: Number(f.branches) || null, message: f.message.trim() || null, source: leadSource(),
      })
      setState('done')
    } catch {
      setState('error')
    }
  }

  return (
    <div className="lead-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lead-modal" role="dialog" aria-modal="true" aria-labelledby="lead-title" ref={box}>
        <button className="lead-close" onClick={onClose} aria-label="Close"><Icon name="close" size={18} /></button>

        {state === 'done' ? (
          <div className="lead-done">
            <span className="lead-done-ic"><Icon name="check" size={30} /></span>
            <h3 id="lead-title">{data.successTitle}</h3>
            <p>{data.successText}</p>
            <a href={links.whatsapp} data-track="whatsapp" className="btn btn-outline"><Icon name="whatsapp" size={16} /> {brand.phone}</a>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="lead-head">
              <span className="lead-bolt"><Icon name="zap" size={20} fill /></span>
              <div>
                <h3 id="lead-title">{data.title}</h3>
                <p>{data.description}</p>
              </div>
            </div>

            <div className="lead-grid">
              <label><span>{data.nameLabel}</span>
                <input required minLength={2} maxLength={80} autoComplete="name" value={f.name} onChange={set('name')} />
              </label>
              <label className={phoneError ? 'bad' : ''}><span>{data.phoneLabel}</span>
                <input required type="tel" inputMode="tel" maxLength={20} autoComplete="tel" placeholder={data.phonePlaceholder}
                  value={f.phone} onChange={(e) => { setPhoneError(false); set('phone')(e) }} />
                {phoneError && <small role="alert">{data.phoneError}</small>}
              </label>
              <label><span>{data.shopLabel}</span>
                <input maxLength={100} autoComplete="organization" value={f.shop} onChange={set('shop')} />
              </label>
              <label><span>{data.cityLabel}</span>
                <input maxLength={60} autoComplete="address-level2" value={f.city} onChange={set('city')} />
              </label>
              <label><span>{data.planLabel}</span>
                <select value={f.plan} onChange={set('plan')}>
                  <option value="">{data.notSure}</option>
                  {plans.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
                </select>
              </label>
              <label><span>{data.branchesLabel}</span>
                <input type="number" min={1} max={999} value={f.branches} onChange={set('branches')} />
              </label>
              <label className="wide"><span>{data.messageLabel}</span>
                <textarea rows={2} maxLength={1000} placeholder={data.messagePlaceholder} value={f.message} onChange={set('message')} />
              </label>
              <input className="lead-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={f.website} onChange={set('website')} />
            </div>

            {state === 'error' && (
              <p className="lead-error" role="alert">{data.errorText} <a href={links.whatsapp} data-track="whatsapp">WhatsApp {brand.phone}</a></p>
            )}
            <button className="btn btn-primary btn-block btn-lg" disabled={state === 'sending'}>
              {state === 'sending' ? data.sending : <>{data.submit} <Icon name="arrow" size={16} /></>}
            </button>
            <small className="lead-privacy"><Icon name="lock" size={12} /> {data.privacy}</small>
          </form>
        )}
      </div>
    </div>
  )
}
