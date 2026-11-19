import { useEffect, useState } from 'react'
import Icon from '../components/Icons.jsx'
import { customersOf, dateFmt, supabase, timeAgo, today, useBiz, waLink } from './biz.js'
import { Field, Sheet, useNotify } from './ui.jsx'

// Make a plan code for a customer (Customers → Plan code). The code unlocks what they paid for in their
// ZAP POS: how many counters, and until when. It is signed by the edge function make-plan-code (the secret
// key never reaches the browser); the shop's owner pastes it into ZAP POS → Settings → Plan.
export function PlanCodeSheet({ leadId, onClose }) {
  const { leads, payments } = useBiz()
  const notify = useNotify()
  const customer = customersOf(leads, payments).find((c) => c.lead.id === leadId)
  const lead = customer?.lead ?? leads.find((l) => l.id === leadId)
  const [history, setHistory] = useState([])
  const [f, setF] = useState({ branch_code: lead?.pos_branch_code ?? '', counters: 1, paid_until: customer?.paidUntil ?? '' })
  const [busy, setBusy] = useState(false)
  const [made, setMade] = useState(null)

  useEffect(() => {
    supabase.from('plan_codes').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }).limit(20).then(({ data }) => {
      setHistory(data ?? [])
      if (data?.[0]) setF((x) => ({ ...x, counters: data[0].counters, branch_code: x.branch_code || data[0].branch_code }))
    })
  }, [leadId])

  const change = (k) => (e) => setF({ ...f, [k]: k === 'branch_code' ? e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') : e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    const { data, error } = await supabase.functions.invoke('make-plan-code', {
      body: { lead_id: leadId, branch_code: f.branch_code, counters: Number(f.counters), paid_until: f.paid_until },
    })
    setBusy(false)
    if (error) {
      let msg = error.message
      try { msg = (await error.context.json()).error ?? msg } catch { /* not a JSON reply */ }
      notify(msg, 'error'); return
    }
    setMade(data)
    setHistory((h) => [{ id: data.code, created_at: new Date().toISOString(), ...data }, ...h])
    notify('Plan code made')
  }

  const copy = async () => {
    try { await navigator.clipboard.writeText(made.code); notify('Code copied') } catch { notify('Select the code and copy it by hand.', 'error') }
  }
  const message = made && `Assalam o Alaikum ${lead?.name ?? ''}, here is your ZAP POS plan code (${made.counters} counter${made.counters === 1 ? '' : 's'}, paid until ${dateFmt(made.paid_until)}).\n\nOn the main PC open ZAP POS → Settings → Plan, paste the whole code and press Apply plan:\n\n${made.code}`

  return (
    <Sheet title={`Plan code · ${lead?.name ?? 'customer'}`} onClose={onClose}>
      {made ? (
        <div className="adm-form">
          <p className="adm-hint">Send this to the shop owner. It works only for shop <b>{made.branch_code}</b> and only in ZAP POS.</p>
          <textarea className="adm-plancode" readOnly rows={5} value={made.code} onFocus={(e) => e.target.select()} />
          <div className="adm-form-actions">
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => setMade(null)}>Make another</button>
            {lead?.phone && <a className="btn btn-outline btn-sm" href={waLink(lead.phone, message)} target="_blank" rel="noreferrer"><Icon name="whatsapp" size={14} /> Send on WhatsApp</a>}
            <button type="button" className="btn btn-primary btn-sm" onClick={copy}>Copy code</button>
          </div>
        </div>
      ) : (
        <form className="adm-form" onSubmit={submit}>
          <div className="adm-grid">
            <Field label="Shop code" hint="As shown in their ZAP POS: Settings → Plan → Shop code.">
              <input type="text" required minLength={2} maxLength={20} value={f.branch_code} onChange={change('branch_code')} placeholder="BALOCH" />
            </Field>
            <Field label="Counters allowed" hint="Every PC that bills counts, the main PC too.">
              <input type="number" required min={1} max={50} step={1} value={f.counters} onChange={change('counters')} />
            </Field>
            <Field label="Paid until" wide hint={customer?.paidUntil ? `From their payments: ${dateFmt(customer.paidUntil)}.` : 'No paid period recorded yet: record their payment first.'}>
              <input type="date" required min={today()} value={f.paid_until} onChange={change('paid_until')} />
            </Field>
          </div>
          <div className="adm-form-actions">
            <button type="button" className="btn btn-quiet btn-sm" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary btn-sm" disabled={busy}>{busy ? 'Making…' : 'Make code'}</button>
          </div>
        </form>
      )}
      {history.length > 0 && (
        <div className="adm-plancode-history">
          <h3>Codes made for this customer</h3>
          <ul>
            {history.map((h) => (
              <li key={h.id}><b>{h.branch_code}</b> · {h.counters} counter{h.counters === 1 ? '' : 's'} · until {dateFmt(h.paid_until)}<small>{timeAgo(h.created_at)}</small></li>
            ))}
          </ul>
        </div>
      )}
    </Sheet>
  )
}
