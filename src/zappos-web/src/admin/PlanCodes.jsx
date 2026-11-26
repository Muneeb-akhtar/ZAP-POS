import { useEffect, useMemo, useState } from 'react'
import Icon from '../components/Icons.jsx'
import { Stat } from './Charts.jsx'
import { addMonths, customersOf, dateFmt, daysUntil, supabase, timeAgo, today, useBiz, waLink } from './biz.js'
import { Card, ConfirmButton, Field, PageBar, Sheet, useNotify, TableFoot } from './ui.jsx'

// Licence keys (Plans page). A key unlocks ZAP POS for one shop: how many counters, from when to when.
// It is signed by the edge function make-plan-code (the secret key never reaches the browser). A new key replaces the
// shop's old one (trigger plan_codes_replace). The shop's main PC checks licence_status() every 30 minutes: it picks up
// the newest key by itself, and locks when its key is revoked. When a key's end date has passed, ZAP POS locks the
// next day until a new key is entered; from 7 days before, every PC in the shop shows a warning.
const DURATIONS = [1, 3, 6, 12]
const label = (n) => (n === 12 ? '1 year' : `${n} month${n === 1 ? '' : 's'}`)

// What a key means right now: Active / N days left / Expired / Replaced / Revoked.
export function keyState(k) {
  if (k.status === 'replaced') return { id: 'replaced', text: 'Replaced' }
  if (k.status === 'revoked') return { id: 'revoked', text: 'Revoked' }
  const left = daysUntil(k.paid_until)
  if (left < 0) return { id: 'expired', text: 'Expired · locked' }
  if (left <= 7) return { id: 'expiring', text: left === 0 ? 'Last day' : `${left} day${left === 1 ? '' : 's'} left` }
  return { id: 'active', text: 'Active' }
}

export default function Plans({ onNewKey }) {
  const { leads } = useBiz()
  const notify = useNotify()
  const [keys, setKeys] = useState(null)
  const [show, setShow] = useState('current')
  const byLead = useMemo(() => Object.fromEntries(leads.map((l) => [l.id, l])), [leads])

  const load = () => supabase.from('plan_codes').select('*').order('created_at', { ascending: false }).then(({ data, error }) => {
    if (error) notify(error.message, 'error'); else setKeys(data ?? [])
  })
  useEffect(() => { load() }, [])
  useEffect(() => { const again = () => load(); window.addEventListener('zap:keys-changed', again); return () => window.removeEventListener('zap:keys-changed', again) }, [])

  const all = keys ?? []
  const states = all.map((k) => ({ k, s: keyState(k) }))
  const count = (id) => states.filter((x) => x.s.id === id).length
  const shown = states.filter(({ s }) => show === 'all' || (show === 'current' ? ['active', 'expiring', 'expired'].includes(s.id) : s.id === show))

  const copy = async (code) => { try { await navigator.clipboard.writeText(code); notify('Key copied') } catch { notify('Select the key and copy it by hand.', 'error') } }
  const revoke = async (k) => {
    const { error } = await supabase.from('plan_codes').update({ status: 'revoked', changed_at: new Date().toISOString() }).eq('id', k.id)
    if (error) notify(error.message, 'error'); else { notify('Key revoked. The shop locks when its main PC is next online.'); load() }
  }
  const restore = async (k) => {
    if (all.some((x) => x.branch_code === k.branch_code && x.status === 'active')) { notify('This shop already has a newer active key.', 'error'); return }
    const { error } = await supabase.from('plan_codes').update({ status: 'active', changed_at: new Date().toISOString() }).eq('id', k.id)
    if (error) notify(error.message, 'error'); else { notify('Key restored'); load() }
  }

  return (
    <>
      <PageBar icon="lock" title="Plans" sub="Licence keys: what each shop paid for, and until when.">
        <button className="btn btn-primary btn-sm" onClick={() => onNewKey(null)}><Icon name="plus" size={14} /> New licence key</button>
      </PageBar>
      <div className="adm-stats">
        <Stat icon="check" label="Active keys" value={count('active') + count('expiring')} sub="shops that can bill" />
        <Stat icon="calendar" label="Expiring in 7 days" value={count('expiring')} sub="they see a warning now" />
        <Stat icon="lock" label="Expired (locked)" value={count('expired')} sub="waiting for a new key" />
        <Stat icon="close" label="Revoked" value={count('revoked')} sub="switched off early" />
      </div>
      <Card>
        <div className="adm-chips">
          {[['current', 'Current'], ['expiring', 'Expiring'], ['expired', 'Expired'], ['revoked', 'Revoked'], ['all', 'All, with replaced']].map(([id, t]) => (
            <button key={id} className={`adm-chip ${show === id ? 'on' : ''}`} onClick={() => setShow(id)}>{t}</button>
          ))}
        </div>
        {!keys ? <p className="adm-hint">Loading…</p> : !shown.length ? (
          <div className="adm-blank"><Icon name="lock" size={28} /><p>{all.length ? 'No keys here.' : 'No licence keys yet. Press New licence key to make the first one.'}</p></div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead><tr><th>Client</th><th className="num">Counters</th><th>Valid</th><th>Status</th><th /></tr></thead>
              <tbody>
                {shown.map(({ k, s }) => {
                  const lead = byLead[k.lead_id]
                  return (
                    <tr key={k.id} className={s.id === 'replaced' ? 'adm-row-faded' : ''}>
                      <td className="lead-cell"><b>{lead?.shop || lead?.name || 'Client'}</b><small>{k.branch_code}{lead?.name && lead?.shop ? ` · ${lead.name}` : ''}</small></td>
                      <td data-label="Counters" className="num">{k.counters}</td>
                      <td data-label="Valid">{k.starts_on ? `${dateFmt(k.starts_on)} → ` : ''}{dateFmt(k.paid_until)}<small>made {timeAgo(k.created_at)}</small></td>
                      <td data-label="Status"><span className={`adm-key ${s.id}`}>{s.text}</span></td>
                      <td className="adm-td-actions">
                        {s.id !== 'replaced' && s.id !== 'revoked' && <button className="btn btn-quiet btn-sm" onClick={() => copy(k.code)}><Icon name="check" size={14} /> Copy</button>}
                        {(s.id === 'expiring' || s.id === 'expired' || s.id === 'active') && <button className="btn btn-outline btn-sm" onClick={() => onNewKey(k.lead_id)}>Renew</button>}
                        {(s.id === 'active' || s.id === 'expiring') && <ConfirmButton onConfirm={() => revoke(k)} confirmText="Sure? Revoke">Revoke</ConfirmButton>}
                        {s.id === 'revoked' && <button className="btn btn-quiet btn-sm" onClick={() => restore(k)}>Restore</button>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <TableFoot count={shown.length} noun="keys" />
          </div>
        )}
      </Card>
    </>
  )
}

// New licence key (also Renew, and Customers → Plan code). The key starts when the shop's current key ends, so paid
// periods never overlap; its end comes from the duration (or a date you pick).
export function PlanCodeSheet({ leadId, onClose }) {
  const { leads, payments } = useBiz()
  const notify = useNotify()
  const clients = useMemo(() => customersOf(leads, payments).map((c) => c.lead).sort((a, b) => (a.shop || a.name).localeCompare(b.shop || b.name)), [leads, payments])
  const [lead, setLead] = useState(leadId ?? '')
  const [keys, setKeys] = useState([])
  const [f, setF] = useState({ branch_code: '', counters: 1, months: 12, paid_until: '' })
  const [busy, setBusy] = useState(false)
  const [made, setMade] = useState(null)
  const chosen = leads.find((l) => l.id === lead)

  useEffect(() => {
    if (!lead) { setKeys([]); return }
    supabase.from('plan_codes').select('*').eq('lead_id', lead).order('created_at', { ascending: false }).limit(20).then(({ data }) => {
      const list = data ?? []
      setKeys(list)
      const last = list[0]
      setF((x) => ({ ...x, branch_code: chosen?.pos_branch_code || last?.branch_code || '', counters: last?.counters ?? 1 }))
    })
  }, [lead])

  const current = keys.find((k) => k.status === 'active')
  const startsOn = current && current.paid_until >= today() ? current.paid_until : today()
  const until = f.months ? addMonths(startsOn, f.months) : f.paid_until

  const submit = async (e) => {
    e.preventDefault()
    if (!lead) { notify('Choose the client.', 'error'); return }
    if (!until || until <= startsOn) { notify('The key must end after it starts.', 'error'); return }
    setBusy(true)
    const { data, error } = await supabase.functions.invoke('make-plan-code', {
      body: { lead_id: lead, branch_code: f.branch_code, counters: Number(f.counters), starts_on: startsOn, paid_until: until },
    })
    setBusy(false)
    if (error) { let msg = error.message; try { msg = (await error.context.json()).error ?? msg } catch { /* not JSON */ } notify(msg, 'error'); return }
    setMade(data)
    window.dispatchEvent(new Event('zap:keys-changed'))
    notify('Licence key made. Their old key is replaced.')
  }

  const copy = async () => { try { await navigator.clipboard.writeText(made.code); notify('Key copied') } catch { notify('Select the key and copy it by hand.', 'error') } }
  const message = made && `Assalam o Alaikum ${chosen?.name ?? ''}, here is your ZAP POS licence key (${made.counters} counter${made.counters === 1 ? '' : 's'}, valid until ${dateFmt(made.paid_until)}).\n\nIf your main PC is online it picks this up by itself. Otherwise open ZAP POS on the main PC → Settings → Plan, paste the whole key and press Apply plan:\n\n${made.code}`

  return (
    <Sheet title={made ? 'Licence key ready' : 'New licence key'} onClose={onClose}>
      {made ? (
        <div className="adm-form">
          <p className="adm-hint">For shop <b>{made.branch_code}</b> · {made.counters} counter{made.counters === 1 ? '' : 's'} · valid until <b>{dateFmt(made.paid_until)}</b>. Their main PC gets it by itself within 30 minutes when online.</p>
          <textarea className="adm-plancode" readOnly rows={5} value={made.code} onFocus={(e) => e.target.select()} />
          <div className="adm-form-actions">
            <button type="button" className="btn btn-quiet btn-sm" onClick={onClose}>Done</button>
            {chosen?.phone && <a className="btn btn-outline btn-sm" href={waLink(chosen.phone, message)} target="_blank" rel="noreferrer"><Icon name="whatsapp" size={14} /> Send on WhatsApp</a>}
            <button type="button" className="btn btn-primary btn-sm" onClick={copy}>Copy key</button>
          </div>
        </div>
      ) : (
        <form className="adm-form" onSubmit={submit}>
          <div className="adm-grid">
            <Field label="Client" wide>
              <select required value={lead} onChange={(e) => setLead(e.target.value)}>
                <option value="" disabled>Choose a client…</option>
                {clients.map((l) => <option key={l.id} value={l.id}>{l.shop || l.name}{l.shop ? ` · ${l.name}` : ''}</option>)}
              </select>
            </Field>
            <Field label="Shop code" hint="2 to 6 letters or digits, as shown in their ZAP POS: Settings → Plan → Shop code.">
              <input type="text" required minLength={2} maxLength={6} pattern="[A-Z0-9]{2,6}" value={f.branch_code} onChange={(e) => setF({ ...f, branch_code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })} placeholder="BALOCH" />
            </Field>
            <Field label="Counters allowed" hint="Every PC that bills, the main PC too.">
              <input type="number" required min={1} max={50} step={1} value={f.counters} onChange={(e) => setF({ ...f, counters: e.target.value })} />
            </Field>
            <Field label="Duration" wide>
              <div className="adm-chips">
                {DURATIONS.map((n) => <button type="button" key={n} className={`adm-chip ${f.months === n ? 'on' : ''}`} onClick={() => setF({ ...f, months: n })}>{label(n)}</button>)}
                <button type="button" className={`adm-chip ${!f.months ? 'on' : ''}`} onClick={() => setF({ ...f, months: 0, paid_until: f.paid_until || addMonths(startsOn, 1) })}>Pick a date</button>
              </div>
              {!f.months && <input type="date" required min={startsOn} value={f.paid_until} onChange={(e) => setF({ ...f, paid_until: e.target.value })} />}
            </Field>
          </div>
          <p className="adm-keyline">Starts <b>{dateFmt(startsOn)}</b>{current && current.paid_until >= today() ? ' (when the current key ends)' : ''} → expires <b>{dateFmt(until)}</b>. ZAP POS locks the day after.</p>
          <div className="adm-form-actions">
            <button type="button" className="btn btn-quiet btn-sm" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary btn-sm" disabled={busy}>{busy ? 'Making…' : 'Make key'}</button>
          </div>
        </form>
      )}
      {keys.length > 0 && !made && (
        <div className="adm-plancode-history">
          <h3>Keys made for this client</h3>
          <ul>{keys.map((k) => <li key={k.id}><b>{k.branch_code}</b> · {k.counters} counter{k.counters === 1 ? '' : 's'} · until {dateFmt(k.paid_until)} <span className={`adm-key ${keyState(k).id}`}>{keyState(k).text}</span></li>)}</ul>
        </div>
      )}
    </Sheet>
  )
}
