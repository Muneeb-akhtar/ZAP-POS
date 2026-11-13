import { useCallback, useEffect, useMemo, useState } from 'react'
import Icon, { Logo } from '../components/Icons.jsx'
import { ThemeToggle } from '../components/Sections.jsx'
import { CONTENT_ID, defaultContent, mergeContent } from '../lib/content.js'
import { NO_TRACK_KEY } from '../lib/track.js'
import { SECTIONS } from './sections.js'
import { RootContext, Value } from './Fields.jsx'
import { BizContext, customersOf, supabase, timeAgo, useBizStore } from './biz.js'
import { PageBar, ToastContext, Toasts } from './ui.jsx'
import Dashboard from './Dashboard.jsx'
import Leads, { LeadSheet } from './Leads.jsx'
import Payments, { PaymentSheet } from './Payments.jsx'
import Analytics from './Analytics.jsx'

// ---------- screens ----------
function Shell({ children }) {
  return (
    <div className="adm-center">
      <div className="adm-center-top"><span className="adm-brand"><Logo size={30} /> ZAP <span>POS</span> <em>Admin</em></span><ThemeToggle /></div>
      {children}
    </div>
  )
}

function SetupNeeded() {
  return (
    <Shell>
      <div className="adm-box wide">
        <h1>Connect Supabase</h1>
        <p>The admin panel needs your Supabase project. Do this once:</p>
        <ol className="adm-steps">
          <li>In <b>Supabase → SQL Editor</b>, run the file <code>supabase/schema.sql</code> from the project.</li>
          <li>In <b>Authentication → Users → Add user</b>, create your login (turn on <i>Auto Confirm User</i>).</li>
          <li>Back in the SQL Editor, run the last statement of <code>schema.sql</code> with your email to make yourself admin.</li>
          <li>Copy <code>src/zappos-web/.env.example</code> to <code>.env.local</code> and paste your <b>Project URL</b> and <b>anon key</b> (Project Settings → API). Restart <code>npm run dev</code>.</li>
          <li>On Vercel, add the same two values under <b>Settings → Environment Variables</b> and redeploy.</li>
        </ol>
      </div>
    </Shell>
  )
}

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) setError(error.message === 'Invalid login credentials' ? 'Email or password is incorrect.' : error.message)
    setBusy(false)
  }
  return (
    <Shell>
      <form className="adm-box" onSubmit={submit}>
        <span className="adm-lock"><Icon name="lock" size={20} /></span>
        <h1>Sign in</h1>
        <p>Leads, payments, analytics and everything on the ZAP POS website.</p>
        <label className="adm-field"><span className="adm-label">Email</span>
          <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="adm-field"><span className="adm-label">Password</span>
          <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="adm-error" role="alert">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <small className="adm-muted">Forgot your password? Reset it in Supabase → Authentication → Users.</small>
      </form>
    </Shell>
  )
}

function NotAdmin({ email }) {
  return (
    <Shell>
      <div className="adm-box">
        <h1>No admin access</h1>
        <p><b>{email}</b> is signed in but isn't an admin. Add this account to the <code>admins</code> table (last step of <code>supabase/schema.sql</code>), then sign in again.</p>
        <button className="btn btn-outline btn-block" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>
    </Shell>
  )
}

// ---------- website content editor (one section at a time) ----------
function ContentPage({ section, draft, setDraft, saved, dirty, published, updatedAt, status, publish }) {
  const [confirmReset, setConfirmReset] = useState(false)
  useEffect(() => { if (!confirmReset) return; const t = setTimeout(() => setConfirmReset(false), 3000); return () => clearTimeout(t) }, [confirmReset])
  return (
    <>
      <PageBar
        title={section.label}
        sub={status === 'saving' ? 'Publishing…'
          : status === 'saved' ? <span className="ok"><Icon name="check" size={13} /> Published, live on the site</span>
          : status.startsWith('error:') ? <span className="err">Couldn't publish: {status.slice(6)}</span>
          : dirty ? <span className="warn">Unsaved changes</span>
          : published ? `All changes published · ${timeAgo(updatedAt)}`
          : <span className="warn">Not published yet: showing the built-in content. Publish to go live.</span>}
      >
        <a className="btn btn-quiet btn-sm" href="/" target="_blank" rel="noreferrer"><Icon name="external" size={14} /> View site</a>
        {dirty && <button className="btn btn-outline btn-sm" onClick={() => setDraft(saved)}>Discard</button>}
        <button className="btn btn-primary btn-sm" onClick={publish} disabled={!(dirty || !published) || status === 'saving'}>
          {status === 'saving' ? 'Publishing…' : 'Publish'}
        </button>
      </PageBar>

      <section className="adm-panel">
        {section.hint && <p className="adm-intro">{section.hint}</p>}
        {section.keys.filter((k) => k in draft).map((k) => (
          <div className="adm-block" key={k}>
            {section.keys.length > 1 && <h2>{k === 'reviewsSection' ? 'Heading' : 'Reviews'}</h2>}
            <Value name={section.keys.length > 1 || Array.isArray(draft[k]) ? k : ''} value={draft[k]} onChange={(v) => setDraft({ ...draft, [k]: v })} />
          </div>
        ))}
      </section>

      <footer className="adm-foot">
        {confirmReset
          ? <button className="adm-link danger" onClick={() => { setDraft(defaultContent); setConfirmReset(false) }}>Yes, load the built-in content (you still need to Publish)</button>
          : <button className="adm-link" onClick={() => setConfirmReset(true)}>Reset everything to the built-in content…</button>}
        <span className="adm-muted">Tip: Ctrl + S publishes.</span>
      </footer>
    </>
  )
}

// ---------- panel: sidebar + pages ----------
const BUSINESS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { id: 'leads', label: 'Leads', icon: 'users' },
  { id: 'payments', label: 'Payments', icon: 'card' },
  { id: 'customers', label: 'Customers', icon: 'receipt' },
  { id: 'analytics', label: 'Analytics', icon: 'chart' },
]

function Panel({ session }) {
  // Website content
  const [saved, setSaved] = useState(null) // last published content
  const [draft, setDraft] = useState(null)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [published, setPublished] = useState(true)
  const [status, setStatus] = useState('') // '', 'saving', 'saved', 'error:…'
  const [loadError, setLoadError] = useState('')
  // Business data, navigation, toasts, sheets
  const biz = useBizStore()
  const [route, setRoute] = useState(() => location.hash.slice(1) || 'dashboard')
  const [toasts, setToasts] = useState([])
  const [sheet, setSheet] = useState(null) // { type: 'lead' | 'payment', value }

  useEffect(() => {
    supabase.from('site_content').select('data, updated_at').eq('id', CONTENT_ID).maybeSingle().then(({ data, error }) => {
      if (error) { setLoadError(error.message); return }
      const content = mergeContent(defaultContent, data?.data)
      setSaved(content); setDraft(content)
      setUpdatedAt(data?.updated_at ?? null); setPublished(Boolean(data))
    })
  }, [])

  const dirty = useMemo(() => draft && saved && JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved])

  const publish = useCallback(async () => {
    if (!draft || status === 'saving') return
    setStatus('saving')
    const { data, error } = await supabase.from('site_content').upsert({ id: CONTENT_ID, data: draft }).select('updated_at').single()
    if (error) { setStatus(`error:${error.message}`); return }
    setSaved(draft); setUpdatedAt(data.updated_at); setPublished(true); setStatus('saved')
    setTimeout(() => setStatus((s) => (s === 'saved' ? '' : s)), 2500)
  }, [draft, status])

  // Ctrl/Cmd + S publishes; warn before leaving with unpublished website changes.
  useEffect(() => {
    const onKey = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); publish() } }
    const onLeave = (e) => { if (dirty) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('keydown', onKey); window.addEventListener('beforeunload', onLeave)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('beforeunload', onLeave) }
  }, [publish, dirty])

  // Hash routing: #dashboard, #leads, #leads/<id>, #payments, #customers, #analytics, #<website section>.
  useEffect(() => {
    const onHash = () => setRoute(location.hash.slice(1) || 'dashboard')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  const go = useCallback((r) => {
    if (location.hash.slice(1) !== r) history.pushState(null, '', `#${r}`)
    setRoute(r); window.scrollTo(0, 0)
  }, [])

  const notify = useCallback((text, kind = 'ok') => {
    const id = Math.random()
    setToasts((t) => [...t.slice(-2), { id, text, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 6000 : 2800)
  }, [])

  if (loadError || biz.error) {
    return <Shell><div className="adm-box"><h1>Couldn't load your data</h1><p className="adm-error">{loadError || biz.error}</p><p>Run the latest <code>supabase/schema.sql</code> in Supabase → SQL Editor, then reload.</p></div></Shell>
  }
  if (!draft || !biz.leads) return <Shell><div className="adm-box"><p className="adm-muted">Loading…</p></div></Shell>

  const known = new Set(SECTIONS.flatMap((s) => s.keys))
  const extra = Object.keys(draft).filter((k) => !known.has(k) && !k.startsWith('_'))
  const sections = extra.length ? [...SECTIONS, { id: 'other', label: 'Other', icon: 'layers', keys: extra, hint: 'Content not grouped elsewhere.' }] : SECTIONS
  const changed = (s) => s.keys.some((k) => JSON.stringify(draft[k]) !== JSON.stringify(saved[k]))
  const [page, param] = route.split('/')
  const section = sections.find((s) => s.id === page)
  const current = section ? page : BUSINESS.some((b) => b.id === page) ? page : 'dashboard'

  const plans = draft.pricing?.plans ?? []
  const newLeads = biz.leads.filter((l) => l.status === 'new').length
  const lateRenewals = customersOf(biz.leads, biz.payments).filter((c) => c.state === 'overdue').length
  const badge = { leads: newLeads, customers: lateRenewals }

  const openLead = (id) => go(`leads/${id}`)
  const pay = (leadId) => setSheet({ type: 'payment', value: leadId ? { lead_id: leadId } : {} })
  const addLead = () => setSheet({ type: 'lead', value: {} })

  return (
    <BizContext.Provider value={biz}>
      <ToastContext.Provider value={notify}>
        <RootContext.Provider value={draft}>
          <div className="adm">
            <aside className="adm-side">
              <a className="adm-brand" href="/" target="_blank" rel="noreferrer"><Logo size={30} /> ZAP <span>POS</span> <em>Admin</em></a>
              <nav className="adm-nav">
                <span className="adm-nav-group">Business</span>
                {BUSINESS.map((b) => (
                  <button key={b.id} className={current === b.id ? 'on' : ''} onClick={() => go(b.id)}>
                    <Icon name={b.icon} size={16} /> {b.label}{badge[b.id] > 0 && <em className={`adm-badge ${b.id === 'customers' ? 'red' : ''}`}>{badge[b.id]}</em>}
                  </button>
                ))}
                <span className="adm-nav-group">Website{dirty && <em className="adm-badge amber" title="Unpublished changes">unsaved</em>}</span>
                {sections.map((s) => (
                  <button key={s.id} className={current === s.id ? 'on' : ''} onClick={() => go(s.id)}>
                    <Icon name={s.icon} size={16} /> {s.label}{changed(s) && <i className="adm-dot" title="Unsaved changes" />}
                  </button>
                ))}
              </nav>
              <div className="adm-side-foot">
                <span className="adm-user" title={session.user.email}>{session.user.email}</span>
                <span className="adm-side-actions">
                  <ThemeToggle />
                  <button className="adm-icon-btn" title="Sign out" onClick={() => supabase.auth.signOut()}><Icon name="logout" size={17} /></button>
                </span>
              </div>
            </aside>

            <main className="adm-main">
              {current === 'dashboard' && <Dashboard content={draft} published={published} updatedAt={updatedAt} go={go} onAddLead={addLead} onPay={pay} onOpenLead={openLead} />}
              {current === 'leads' && <Leads key={param ?? 'list'} focus={param} plans={plans.map((p) => p.name)} onPay={pay} />}
              {(current === 'payments' || current === 'customers') && (
                <Payments tab={current} go={go} onPay={pay} onEditPayment={(p) => setSheet({ type: 'payment', value: p })} onOpenLead={openLead} />
              )}
              {current === 'analytics' && <Analytics />}
              {section && (
                <ContentPage section={section} draft={draft} setDraft={setDraft} saved={saved} dirty={dirty}
                  published={published} updatedAt={updatedAt} status={status} publish={publish} />
              )}
            </main>
          </div>

          {sheet?.type === 'lead' && <LeadSheet lead={sheet.value} plans={plans.map((p) => p.name)} onClose={() => setSheet(null)} />}
          {sheet?.type === 'payment' && <PaymentSheet payment={sheet.value} plans={plans} onClose={() => setSheet(null)} onAddLead={addLead} />}
          <Toasts items={toasts} />
        </RootContext.Provider>
      </ToastContext.Provider>
    </BizContext.Provider>
  )
}

// ---------- root ----------
export default function AdminApp() {
  const [session, setSession] = useState(undefined) // undefined = loading
  const [isAdmin, setIsAdmin] = useState(null)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  // Check the signed-in user is in the admins table. Admin browsers are left out of the visitor stats.
  useEffect(() => {
    if (!session) { setIsAdmin(null); return }
    supabase.from('admins').select('user_id').eq('user_id', session.user.id).maybeSingle()
      .then(({ data }) => {
        setIsAdmin(Boolean(data))
        if (data) try { localStorage.setItem(NO_TRACK_KEY, '1') } catch { /* storage unavailable */ }
      })
  }, [session])

  if (!supabase) return <SetupNeeded />
  if (session === undefined || (session && isAdmin === null)) return <Shell><div className="adm-box"><p className="adm-muted">Loading…</p></div></Shell>
  if (!session) return <Login />
  if (!isAdmin) return <NotAdmin email={session.user.email} />
  return <Panel session={session} />
}
