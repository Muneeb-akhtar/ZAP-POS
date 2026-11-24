import { useEffect, useState } from 'react'
import Icon from '../components/Icons.jsx'
import { supabase, timeAgo, telLink, waLink } from './biz.js'
import { Sheet, TableFoot, useNotify } from './ui.jsx'

// Branch messages: the Support threads a shop writes inside ZAP POS (Support screen). They reach ZAP cloud with the branch's
// next sync; your reply goes back the same way and shows in that screen. Read and reply through admin_support_threads(),
// admin_support_thread() and admin_support_reply() (desktop repo cloud/0007), admin only.
const FILTERS = [['wait', 'Needs a reply'], ['open', 'Open'], ['solved', 'Solved'], ['all', 'All']]

export default function HelpThreads({ onCount }) {
  const notify = useNotify()
  const [list, setList] = useState(null)
  const [show, setShow] = useState('wait')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(null)

  const load = () => supabase.rpc('admin_support_threads').then(({ data, error }) => {
    if (error) notify(error.message, 'error'); else { setList(data ?? []); onCount?.((data ?? []).filter((t) => t.status !== 'solved' && t.needsReply).length) }
  })
  useEffect(() => { load(); const timer = setInterval(load, 60000); return () => clearInterval(timer) }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  const all = list ?? []
  const match = (t, f) => f === 'all' || (f === 'wait' ? t.status !== 'solved' && t.needsReply : t.status === f)
  const shown = all.filter((t) => match(t, show) && (!q || `${t.shop} ${t.branchName} ${t.subject} ${t.preview ?? ''}`.toLowerCase().includes(q.toLowerCase())))

  return (
    <>
      <div className="adm-toolbar">
        <div className="adm-chips">{FILTERS.map(([id, t]) => <button key={id} className={show === id ? 'on' : ''} onClick={() => setShow(id)}>{t} <em>{all.filter((x) => match(x, id)).length}</em></button>)}</div>
        <div className="adm-search"><Icon name="search" size={16} /><input type="search" placeholder="Search shop, branch or message…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>
      {!list ? <div className="adm-skel" /> : !shown.length ? (
        <div className="adm-blank"><Icon name="call" size={28} /><p>{all.length ? 'Nothing here.' : 'No messages from ZAP POS yet. When a shop writes to you from the Support screen, it shows here within a minute or two of their next sync.'}</p></div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead><tr><th>Shop</th><th>Subject</th><th>Last message</th><th>Updated</th><th>Status</th><th className="adm-th-actions">Actions</th></tr></thead>
            <tbody>
              {shown.map((t) => (
                <tr key={t.id}>
                  <td data-label="Shop" className="lead-cell"><b>{t.shop}</b><small>{t.branchName} · {t.branchCode} · #{t.no}</small></td>
                  <td data-label="Subject"><b>{t.subject}</b></td>
                  <td data-label="Last message"><span className="adm-clip">{t.preview}</span></td>
                  <td data-label="Updated">{timeAgo(t.last_at ?? t.updatedAt)}</td>
                  <td data-label="Status"><span className={`adm-bill ${t.status === 'solved' ? 'paid' : t.needsReply ? 'open' : 'proof'}`}>{t.status === 'solved' ? 'Solved' : t.needsReply ? 'Needs reply' : 'Replied'}</span></td>
                  <td className="adm-td-actions">
                    <button className="btn btn-outline btn-sm" onClick={() => setOpen(t)}>Open</button>
                    {t.phone && <a className="adm-icon-btn" title="Call" href={telLink(t.phone)}><Icon name="call" size={15} /></a>}
                    {t.phone && <a className="adm-icon-btn" title="WhatsApp" href={waLink(t.phone, `Assalam o Alaikum, this is ZAP POS support about "${t.subject}".`)} target="_blank" rel="noreferrer"><Icon name="whatsapp" size={15} /></a>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <TableFoot count={shown.length} noun="messages" />
        </div>
      )}
      {open && <Thread req={open} onClose={() => { setOpen(null); load() }} />}
    </>
  )
}

function Thread({ req, onClose }) {
  const notify = useNotify()
  const [msgs, setMsgs] = useState(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [msgId, setMsgId] = useState(() => crypto.randomUUID())   // chosen once per reply, so a double click sends it once
  const [status, setStatus] = useState(req.status)

  const read = () => supabase.rpc('admin_support_thread', { p_id: req.id }).then(({ data, error }) => { if (error) notify(error.message, 'error'); else setMsgs(data ?? []) })
  useEffect(() => { read() }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  const send = async (nextStatus) => {
    if (sending) return
    setSending(true)
    const { error } = await supabase.rpc('admin_support_reply', { p_id: req.id, p_body: text, p_status: nextStatus ?? null, p_msg: msgId })
    setSending(false)
    if (error) { notify(error.message, 'error'); return }
    if (nextStatus) setStatus(nextStatus)
    if (text.trim()) { setText(''); setMsgId(crypto.randomUUID()); notify('Reply saved. The shop gets it at its next sync.') } else notify('Saved')
    read()
  }

  return (
    <Sheet title={`${req.shop} · ${req.subject}`} onClose={onClose}>
      <div className="adm-form">
        <p className="adm-hint">{req.branchName} ({req.branchCode}) · request #{req.no} · {status === 'solved' ? 'Solved' : 'Open'}</p>
        <div className="adm-thread">
          {!msgs ? <div className="adm-skel" /> : msgs.map((m) => (
            <div key={m.id} className={`adm-msg ${m.fromZap ? 'zap' : 'shop'}`}>
              <small>{m.fromZap ? 'ZAP support' : m.author || 'Shop'} · {timeAgo(m.createdAt)}</small>
              {m.body && <p>{m.body}</p>}
              {m.photo && <img alt="Attached by the shop" src={`data:image/jpeg;base64,${m.photo}`} />}
            </div>
          ))}
        </div>
        <label className="adm-field"><span className="adm-label">Your reply</span>
          <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write what the shop should do next…" /></label>
        <div className="adm-form-actions">
          <button type="button" className="btn btn-quiet btn-sm" onClick={onClose}>Close</button>
          {status === 'solved'
            ? <button type="button" className="btn btn-outline btn-sm" disabled={sending} onClick={() => send('open')}>Open again</button>
            : <button type="button" className="btn btn-outline btn-sm" disabled={sending} onClick={() => send('solved')}>{text.trim() ? 'Reply and mark solved' : 'Mark solved'}</button>}
          <button type="button" className="btn btn-primary btn-sm" disabled={sending || !text.trim()} onClick={() => send(null)}>Send reply</button>
        </div>
      </div>
    </Sheet>
  )
}
