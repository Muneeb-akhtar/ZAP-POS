import { useEffect, useState } from 'react'
import Icon from '../components/Icons.jsx'
import { Stat } from './Charts.jsx'
import { supabase, telLink, timeAgo, waLink } from './biz.js'
import { PageBar, Sheet, TableFoot, useNotify } from './ui.jsx'
import HelpThreads from './HelpThreads.jsx'

// Help desk: requests shops send from ZAP POS (Support) or the website, through send_help_request(). You answer them
// by phone or WhatsApp, keep a note of what you did, and mark them waiting (on the shop) or solved.
const TOPICS = { billing: 'Billing', setup: 'Setup', printer: 'Printer', licence: 'Licence key', bug: 'Something broken', other: 'Other' }
const STATES = [['open', 'Open'], ['waiting', 'Waiting on shop'], ['solved', 'Solved'], ['all', 'All']]

export default function HelpDesk() {
  const notify = useNotify()
  const [list, setList] = useState(null)
  const [show, setShow] = useState('open')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(null)
  const [tab, setTab] = useState('app')   // 'app' = branch messages from ZAP POS Support, 'web' = requests through send_help_request()
  const [appWaiting, setAppWaiting] = useState(null)

  const load = () => supabase.from('help_requests').select('*').order('created_at', { ascending: false }).then(({ data, error }) => {
    if (error) notify(error.message, 'error'); else setList(data ?? [])
  })
  useEffect(() => { load() }, [])

  const all = list ?? []
  const count = (s) => all.filter((h) => s === 'all' || h.status === s).length
  const shown = all.filter((h) => (show === 'all' || h.status === show) && (!q || `${h.name} ${h.shop ?? ''} ${h.phone} ${h.message}`.toLowerCase().includes(q.toLowerCase())))
  const solvedWeek = all.filter((h) => h.status === 'solved' && Date.now() - new Date(h.updated_at) < 7 * 864e5).length

  return (
    <>
      <PageBar icon="call" title="Help desk" sub="Messages from shops, from ZAP POS and the website" />
      <div className="adm-panel wide">
        <div className="adm-chips adm-tabs">
          <button className={tab === 'app' ? 'on' : ''} onClick={() => setTab('app')}>From ZAP POS{appWaiting ? <em>{appWaiting}</em> : null}</button>
          <button className={tab === 'web' ? 'on' : ''} onClick={() => setTab('web')}>From the website <em>{count('open')}</em></button>
        </div>
        <div hidden={tab !== 'app'}><HelpThreads onCount={setAppWaiting} /></div>
        <div hidden={tab !== 'web'}>
        <div className="adm-stats">
          <Stat icon="mail" label="Open requests" value={list ? count('open') : '…'} sub="need an answer" onClick={() => setShow('open')} />
          <Stat icon="close" label="Urgent" value={list ? all.filter((h) => h.priority === 'urgent' && h.status !== 'solved').length : '…'} sub="shop can't bill" />
          <Stat icon="calendar" label="Waiting on shop" value={list ? count('waiting') : '…'} sub="you replied" onClick={() => setShow('waiting')} />
          <Stat hero icon="check" label="Solved this week" value={list ? solvedWeek : '…'} sub={`${count('solved')} solved in all`} onClick={() => setShow('solved')} />
        </div>
        <div className="adm-toolbar">
          <div className="adm-chips">{STATES.map(([id, t]) => <button key={id} className={show === id ? 'on' : ''} onClick={() => setShow(id)}>{t} <em>{count(id)}</em></button>)}</div>
          <div className="adm-search"><Icon name="search" size={16} /><input type="search" placeholder="Search shop, phone or message…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        </div>
        {!list ? <div className="adm-skel" /> : !shown.length ? (
          <div className="adm-blank"><Icon name="call" size={28} /><p>{all.length ? 'Nothing here.' : 'No help requests yet. When a shop asks for help from ZAP POS or the website, it shows up here.'}</p></div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead><tr><th>Shop</th><th>Topic</th><th>Message</th><th>Received</th><th>Status</th><th className="adm-th-actions">Actions</th></tr></thead>
              <tbody>
                {shown.map((h) => (
                  <tr key={h.id}>
                    <td data-label="Shop" className="lead-cell"><b>{h.shop || h.name}</b><small>{h.shop ? `${h.name} · ` : ''}{h.phone}{h.branch_code ? ` · ${h.branch_code}` : ''}</small></td>
                    <td data-label="Topic"><span className="adm-kind bill">{TOPICS[h.topic]}</span>{h.priority === 'urgent' && <span className="adm-bill late">Urgent</span>}</td>
                    <td data-label="Message"><span className="adm-clip">{h.message}</span></td>
                    <td data-label="Received">{timeAgo(h.created_at)}</td>
                    <td data-label="Status"><span className={`adm-bill ${h.status === 'solved' ? 'paid' : h.status === 'waiting' ? 'proof' : 'open'}`}>{STATES.find((s) => s[0] === h.status)[1]}</span></td>
                    <td className="adm-td-actions">
                      <button className="btn btn-outline btn-sm" onClick={() => setOpen(h)}>Open</button>
                      <a className="adm-icon-btn" title="Call" href={telLink(h.phone)}><Icon name="call" size={15} /></a>
                      <a className="adm-icon-btn" title="WhatsApp" href={waLink(h.phone, `Assalam o Alaikum ${h.name}, this is ZAP POS support about your message: "${h.message.slice(0, 80)}"`)} target="_blank" rel="noreferrer"><Icon name="whatsapp" size={15} /></a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <TableFoot count={shown.length} noun="requests" />
          </div>
        )}
        </div>
      </div>
      {open && <HelpSheet req={open} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); load() }} />}
    </>
  )
}

function HelpSheet({ req, onClose, onSaved }) {
  const notify = useNotify()
  const [f, setF] = useState({ status: req.status, priority: req.priority, reply: req.reply ?? '' })
  const save = async () => {
    const { error } = await supabase.from('help_requests').update({ ...f, reply: f.reply.trim() || null, updated_at: new Date().toISOString() }).eq('id', req.id)
    if (error) notify(error.message, 'error'); else { notify('Saved'); onSaved() }
  }
  return (
    <Sheet title={req.shop || req.name} onClose={onClose}>
      <div className="adm-form">
        <p className="adm-hint">{req.name} · {req.phone}{req.branch_code ? ` · shop code ${req.branch_code}` : ''} · {TOPICS[req.topic]} · {timeAgo(req.created_at)}</p>
        <blockquote className="adm-quote">{req.message}</blockquote>
        <label className="adm-field"><span className="adm-label">What you did / told them</span><textarea rows={4} value={f.reply} onChange={(e) => setF({ ...f, reply: e.target.value })} placeholder="Called, reinstalled the printer driver, working now." /></label>
        <div className="adm-chips">{STATES.slice(0, 3).map(([id, t]) => <button type="button" key={id} className={f.status === id ? 'on' : ''} onClick={() => setF({ ...f, status: id })}>{t}</button>)}</div>
        <div className="adm-chips">{[['normal', 'Normal'], ['urgent', 'Urgent']].map(([id, t]) => <button type="button" key={id} className={f.priority === id ? 'on' : ''} onClick={() => setF({ ...f, priority: id })}>{t}</button>)}</div>
        <div className="adm-form-actions">
          <button type="button" className="btn btn-quiet btn-sm" onClick={onClose}>Close</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={save}>Save</button>
        </div>
      </div>
    </Sheet>
  )
}
