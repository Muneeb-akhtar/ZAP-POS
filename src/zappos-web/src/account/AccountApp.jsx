import { useEffect, useState } from 'react'
import Icon, { Logo } from '../components/Icons.jsx'
import { ThemeToggle } from '../components/Sections.jsx'
import { CONTENT_ID, defaultContent, mergeContent } from '../lib/content.js'
import { BILLING, METHODS, dateFmt, phoneKey, rs, supabase } from '../admin/biz.js'

// Customer account at /account/: sign up, log in, reset password, and "My account"
// (plan, renewal date, payments). The same email + password works in the ZAP POS app.
// Sign-up details go into the user's metadata; a database trigger links the account to the
// shop's lead (same email, else same mobile number). Customers read only their own data,
// through my_account() (see supabase/schema.sql §10). Text: `account` in landing-content.json.

const fill = (text, vals) => text.replace(/\{(\w+)\}/g, (_, k) => vals[k] ?? '')

function Shell({ brand, children }) {
  return (
    <div className="adm-center">
      <div className="adm-center-top acc-top">
        <a className="adm-brand" href="/"><Logo size={30} /> {brand.name}</a>
        <ThemeToggle />
      </div>
      {children}
    </div>
  )
}

function Auth({ t, mode, setMode }) {
  const [f, setF] = useState({ name: '', phone: '', shop: '', city: '', email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState('') // email the confirmation / reset link went to
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const email = f.email.trim().toLowerCase()

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (mode === 'signup' && (phoneKey(f.phone).length < 10 || phoneKey(f.phone).length > 13)) { setError(t.phoneError); return }
    setBusy(true)
    const back = `${location.origin}/account/`
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password: f.password })
      if (error) setError(/confirm/i.test(error.message) ? t.notConfirmed : error.message === 'Invalid login credentials' ? t.wrongLogin : error.message)
    } else if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email, password: f.password,
        options: { emailRedirectTo: back, data: { name: f.name.trim(), phone: f.phone.trim(), shop: f.shop.trim(), city: f.city.trim() } },
      })
      if (error) setError(/already registered/i.test(error.message) ? t.emailTaken : /database error/i.test(error.message) ? t.shopTaken : error.message)
      else if (data.user && !data.user.identities?.length) setError(t.emailTaken) // existing email (Supabase hides it)
      else if (!data.session) setSent(email) // email confirmation is on
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: back })
      if (error) setError(error.message); else setSent(email)
    }
    setBusy(false)
  }

  if (sent) {
    return (
      <div className="adm-box">
        <span className="adm-lock"><Icon name="mail" size={20} /></span>
        <h1>{mode === 'forgot' ? t.forgotTitle : t.checkEmailTitle}</h1>
        <p>{mode === 'forgot' ? t.forgotSent : fill(t.checkEmailText, { email: sent })}</p>
        <button className="btn btn-outline btn-block" onClick={() => { setSent(''); setMode('login') }}>{t.backToLogin}</button>
      </div>
    )
  }

  return (
    <form className="adm-box" onSubmit={submit}>
      {mode !== 'forgot' && (
        <div className="adm-tabs acc-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'on' : ''} onClick={() => setMode('login')}>{t.loginTab}</button>
          <button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'on' : ''} onClick={() => setMode('signup')}>{t.signupTab}</button>
        </div>
      )}
      <h1>{mode === 'login' ? t.loginTitle : mode === 'signup' ? t.signupTitle : t.forgotTitle}</h1>
      <p>{mode === 'login' ? t.loginText : mode === 'signup' ? t.signupText : t.forgotText}</p>
      {mode === 'signup' && (
        <>
          <label className="adm-field"><span className="adm-label">{t.nameLabel}</span>
            <input required minLength={2} maxLength={80} autoComplete="name" value={f.name} onChange={set('name')} /></label>
          <label className="adm-field"><span className="adm-label">{t.phoneLabel}</span>
            <input required type="tel" inputMode="tel" maxLength={20} autoComplete="tel" placeholder={t.phonePlaceholder} value={f.phone} onChange={set('phone')} /></label>
          <div className="acc-pair">
            <label className="adm-field"><span className="adm-label">{t.shopLabel}</span>
              <input maxLength={100} autoComplete="organization" value={f.shop} onChange={set('shop')} /></label>
            <label className="adm-field"><span className="adm-label">{t.cityLabel}</span>
              <input maxLength={60} autoComplete="address-level2" value={f.city} onChange={set('city')} /></label>
          </div>
        </>
      )}
      <label className="adm-field"><span className="adm-label">{t.emailLabel}</span>
        <input type="email" required maxLength={120} autoComplete="email" value={f.email} onChange={set('email')} /></label>
      {mode !== 'forgot' && (
        <label className="adm-field"><span className="adm-label">{t.passwordLabel}</span>
          <input type="password" required minLength={mode === 'signup' ? 8 : undefined} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={f.password} onChange={set('password')} />
          {mode === 'signup' && <small className="adm-muted">{t.passwordHint}</small>}
        </label>
      )}
      {error && <p className="adm-error" role="alert">{error}</p>}
      <button className="btn btn-primary btn-block" disabled={busy}>
        {busy ? '…' : mode === 'login' ? t.loginButton : mode === 'signup' ? t.signupButton : t.forgotButton}
      </button>
      {mode === 'login' && <button type="button" className="adm-link" onClick={() => setMode('forgot')}>{t.forgotLink}</button>}
      {mode === 'forgot' && <button type="button" className="adm-link" onClick={() => setMode('login')}>{t.backToLogin}</button>}
    </form>
  )
}

function NewPassword({ t, onDone }) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setBusy(false) } else onDone()
  }
  return (
    <form className="adm-box" onSubmit={submit}>
      <span className="adm-lock"><Icon name="lock" size={20} /></span>
      <h1>{t.newPasswordTitle}</h1>
      <label className="adm-field"><span className="adm-label">{t.passwordLabel}</span>
        <input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <small className="adm-muted">{t.passwordHint}</small>
      </label>
      {error && <p className="adm-error" role="alert">{error}</p>}
      <button className="btn btn-primary btn-block" disabled={busy}>{t.newPasswordButton}</button>
    </form>
  )
}

function MyAccount({ t, links, session }) {
  const [acc, setAcc] = useState(undefined) // undefined = loading, null = not linked to a shop
  const [isAdmin, setIsAdmin] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    supabase.rpc('my_account').then(({ data, error }) => { if (error) setError(error.message); else setAcc(data) })
    supabase.from('admins').select('user_id').eq('user_id', session.user.id).maybeSingle().then(({ data }) => setIsAdmin(Boolean(data)))
  }, [session.user.id])
  const signOut = <button className="btn btn-quiet btn-sm" onClick={() => supabase.auth.signOut()}><Icon name="logout" size={14} /> {t.signOut}</button>

  if (error) return <div className="adm-box"><p className="adm-error">{t.error}</p>{signOut}</div>
  if (acc === undefined) return <div className="adm-box"><p className="adm-muted">…</p></div>
  if (acc === null) {
    return (
      <div className="adm-box">
        <h1>{session.user.email}</h1>
        <p>{isAdmin ? t.adminText : t.notLinkedText}</p>
        {isAdmin
          ? <a className="btn btn-primary btn-block" href="/admin/">{t.adminLink}</a>
          : <a className="btn btn-outline btn-block" href={links.whatsapp}><Icon name="whatsapp" size={16} /> WhatsApp</a>}
        {signOut}
      </div>
    )
  }

  return (
    <div className="adm-box wide acc-main">
      <div className="acc-head">
        <div>
          <h1>{fill(t.hello, { name: acc.name })}</h1>
          <p className="adm-muted">{[acc.shop, acc.city].filter(Boolean).join(' · ')}{acc.shop || acc.city ? ' · ' : ''}{acc.email}</p>
        </div>
        {signOut}
      </div>

      <div className={`acc-plan ${acc.active ? 'on' : acc.paid_until ? 'late' : ''}`}>
        <span className="acc-plan-label">{t.planLabel}</span>
        <b>{acc.plan ?? t.noPlan}{acc.branches > 1 ? ` · ${acc.branches} branches` : ''}{acc.billing ? ` · ${BILLING[acc.billing]}` : ''}</b>
        <span>{acc.paid_until ? fill(acc.active ? t.activeUntil : t.expiredOn, { date: dateFmt(acc.paid_until) }) : t.noPlanText}</span>
      </div>

      <div className="acc-actions">
        <a className="btn btn-primary" href={links.windowsInstaller} data-track="download"><Icon name="windows" size={14} fill /> {t.downloadButton}</a>
        <a className="btn btn-outline" href={links.whatsapp} data-track="whatsapp"><Icon name="whatsapp" size={16} /> {t.payButton}</a>
        {!acc.paid_until && <a className="btn btn-quiet" href="/#pricing">{t.pricingLink}</a>}
      </div>

      <h2 className="acc-sub">{t.paymentsTitle}</h2>
      {acc.payments.length ? (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead><tr><th>{t.paidOnCol}</th><th>{t.planCol}</th><th>{t.periodCol}</th><th>{t.methodCol}</th><th className="num">{t.amountCol}</th></tr></thead>
            <tbody>
              {acc.payments.map((p, i) => (
                <tr key={i}>
                  <td data-label={t.paidOnCol}>{dateFmt(p.paid_on)}</td>
                  <td data-label={t.planCol}>{p.plan ?? BILLING[p.billing]}{p.plan && <small>{BILLING[p.billing]}</small>}</td>
                  <td data-label={t.periodCol}>{p.starts_on ? `${dateFmt(p.starts_on)} – ${dateFmt(p.paid_until)}` : '–'}</td>
                  <td data-label={t.methodCol}>{METHODS[p.method]}</td>
                  <td data-label={t.amountCol} className="num"><b>{rs(p.amount)}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="adm-muted">{t.noPayments}</p>}
    </div>
  )
}

export default function AccountApp() {
  const [content, setContent] = useState(defaultContent)
  const [session, setSession] = useState(undefined) // undefined = loading
  const [mode, setMode] = useState(() => (location.hash === '#signup' ? 'signup' : 'login'))
  const [recovering, setRecovering] = useState(false)

  useEffect(() => {
    if (!supabase) return
    supabase.from('site_content').select('data').eq('id', CONTENT_ID).maybeSingle()
      .then(({ data }) => data?.data && setContent(mergeContent(defaultContent, data.data)))
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
      setSession(s)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const t = content.account
  let body
  if (!supabase) body = <div className="adm-box"><p>{t.error}</p></div>
  else if (session === undefined) body = <div className="adm-box"><p className="adm-muted">…</p></div>
  else if (recovering) body = <NewPassword t={t} onDone={() => setRecovering(false)} />
  else if (!session) body = <Auth t={t} mode={mode} setMode={setMode} />
  else body = <MyAccount key={session.user.id} t={t} links={content.links} session={session} />
  return <Shell brand={content.brand}>{body}</Shell>
}
