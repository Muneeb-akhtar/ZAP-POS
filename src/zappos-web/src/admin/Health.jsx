import { useEffect, useState } from 'react'
import Icon from '../components/Icons.jsx'
import { Stat } from './Charts.jsx'
import { supabase, timeAgo } from './biz.js'
import { Card, PageBar, TableFoot, useNotify } from './ui.jsx'

// System health: is the cloud side of ZAP POS in good shape? Database size against Supabase's free 500 MB, rows and
// newest entry per table, storage per bucket, and which ZAP POS version each shop's main PC last reported.
const MB = 1024 * 1024
const size = (b) => (b >= 1024 * MB ? `${(b / 1024 / MB).toFixed(1)} GB` : b >= MB ? `${(b / MB).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`)
const FREE_DB = 500 * MB

export default function Health() {
  const notify = useNotify()
  const [h, setH] = useState(null)
  const [busy, setBusy] = useState(false)
  const load = () => { setBusy(true); supabase.rpc('admin_health').then(({ data, error }) => { setBusy(false); if (error) notify(error.message, 'error'); else setH(data) }) }
  useEffect(() => { load() }, [])

  const used = h ? h.db_bytes / FREE_DB : 0
  const behind = h ? h.shops.filter((s) => h.latest_release && s.version !== h.latest_release).length : 0

  return (
    <>
      <PageBar icon="server" title="System health" sub={h ? `Checked ${timeAgo(h.checked_at)}` : 'Checking…'}>
        <button className="btn btn-quiet btn-sm" onClick={load} disabled={busy}><Icon name="chart" size={14} /> {busy ? 'Checking…' : 'Check again'}</button>
      </PageBar>
      <div className="adm-panel wide">
        <div className="adm-stats">
          <Stat hero icon="check" label="Database" value={h ? 'Online' : '…'} sub="Supabase answered" />
          <Stat icon="server" label="Database size" value={h ? size(h.db_bytes) : '…'} sub={h ? `${Math.round(used * 100)}% of the free 500 MB` : ''} />
          <Stat icon="layers" label="Rows stored" value={h ? h.tables.reduce((s, t) => s + t.rows, 0).toLocaleString('en-PK') : '…'} sub={h ? `${h.tables.length} tables` : ''} />
          <Stat icon="download" label="Files stored" value={h ? size(h.buckets.reduce((s, b) => s + b.bytes, 0)) : '…'} sub={h ? `${h.buckets.reduce((s, b) => s + b.files, 0)} files` : ''} />
          <Stat icon="monitor" label="Shops reporting" value={h ? h.shops.length : '…'} sub={h ? (behind ? `${behind} not on ${h.latest_release}` : 'all up to date') : ''} />
          <Stat icon="call" label="Open help requests" value={h ? h.open_help : '…'} sub="Help desk" />
        </div>
        {h && <div className={`adm-meter ${used > 0.8 ? 'warn' : ''}`}><span style={{ width: `${Math.min(100, used * 100)}%` }} /></div>}
        <div className="adm-two">
          <Card title="Tables">
            {!h ? <div className="adm-skel short" /> : (
              <div className="adm-table-wrap flat">
                <table className="adm-table">
                  <thead><tr><th>Table</th><th className="num">Rows</th><th>Newest</th></tr></thead>
                  <tbody>{h.tables.map((t) => <tr key={t.name}><td data-label="Table"><b>{t.label}</b><small className="adm-mono">{t.name}</small></td><td data-label="Rows" className="num">{t.rows.toLocaleString('en-PK')}</td><td data-label="Newest">{t.newest ? timeAgo(t.newest) : '–'}</td></tr>)}</tbody>
                </table>
                <TableFoot count={h.tables.length} noun="tables" />
              </div>
            )}
          </Card>
          <Card title="Shops' ZAP POS version">
            {!h ? <div className="adm-skel short" /> : !h.shops.length ? <p className="adm-empty">No shop has reported a version yet. Main PCs report after their first automatic update.</p> : (
              <div className="adm-table-wrap flat">
                <table className="adm-table">
                  <thead><tr><th>Shop code</th><th>Version</th><th>Last seen</th></tr></thead>
                  <tbody>{h.shops.map((s) => <tr key={s.branch}><td data-label="Shop code"><code>{s.branch}</code></td><td data-label="Version"><span className={`adm-bill ${s.version === h.latest_release ? 'paid' : 'late'}`}>{s.version}</span></td><td data-label="Last seen">{timeAgo(s.seen_at)}</td></tr>)}</tbody>
                </table>
                <TableFoot count={h.shops.length} noun="shops" />
              </div>
            )}
            {h?.buckets.length > 0 && <ul className="adm-buckets">{h.buckets.map((b) => <li key={b.name}><Icon name="download" size={14} /> <b>{b.name}</b> <span>{b.files} files · {size(b.bytes)}</span></li>)}</ul>}
          </Card>
        </div>
      </div>
    </>
  )
}
