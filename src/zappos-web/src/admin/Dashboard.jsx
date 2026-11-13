import { useMemo } from 'react'
import Icon from '../components/Icons.jsx'
import { customersOf, daysUntil, dateFmt, rs, rsShort, timeAgo, today, useBiz, useStats } from './biz.js'
import { Bars, Stat } from './Charts.jsx'
import { dailySeries, StatsError } from './Analytics.jsx'
import { Card, PageBar, StatusPill } from './ui.jsx'

const isPlaceholderLink = (v) => !v || v === '#'

// Website checklist: things still showing placeholder content.
function checklist(c, published) {
  const links = [
    ['Windows download', c.links?.windowsInstaller], ['WhatsApp', c.links?.whatsapp], ['Google Play', c.links?.googlePlay],
    ['App Store', c.links?.appStore], ['Customer portal', c.links?.portal],
  ].filter(([, v]) => isPlaceholderLink(v)).map(([n]) => n)
  const socials = Object.values(c.links?.social ?? {}).filter(isPlaceholderLink).length
  return [
    { done: published, label: 'Publish your website content', go: 'brand' },
    { done: !/x{3}/i.test(c.brand?.phone ?? ''), label: 'Add your real phone number', go: 'brand' },
    { done: !/\.example$/i.test(c.brand?.email ?? ''), label: 'Add your real email', go: 'brand' },
    { done: !/office address/i.test(c.brand?.address ?? ''), label: 'Add your office address', go: 'brand' },
    { done: !links.length, label: links.length ? `Add links: ${links.join(', ')}` : 'Download, WhatsApp and app links', go: 'links' },
    { done: !socials, label: socials ? `Add ${socials} social media link${socials > 1 ? 's' : ''}` : 'Social media links', go: 'links' },
    { done: !(c.reviews ?? []).some((r) => /placeholder|customer name/i.test(`${r.text} ${r.name}`)), label: 'Replace placeholder reviews with real ones', go: 'reviews' },
  ]
}

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' }

export default function Dashboard({ content, published, updatedAt, go, onAddLead, onPay, onOpenLead }) {
  const { leads, payments } = useBiz()
  const { stats, error } = useStats(30)

  const week = useMemo(() => (stats?.daily ?? []).slice(-7), [stats])
  const prevWeek = useMemo(() => (stats?.daily ?? []).slice(-14, -7), [stats])
  const sumOf = (rows, k) => rows.reduce((s, d) => s + d[k], 0)

  const month = today().slice(0, 7)
  const lastMonthKey = (() => { const d = new Date(`${month}-01T00:00:00`); d.setMonth(d.getMonth() - 1); return d.toLocaleDateString('en-CA').slice(0, 7) })()
  const received = (k) => payments.filter((p) => p.paid_on.startsWith(k)).reduce((s, p) => s + p.amount, 0)

  const customers = useMemo(() => customersOf(leads, payments), [leads, payments])
  const renewals = customers.filter((c) => c.state === 'due' || c.state === 'overdue').sort((a, b) => a.left - b.left)
  const overdue = renewals.filter((c) => c.state === 'overdue').length
  const dueSoon = renewals.length - overdue
  const fresh = leads.filter((l) => l.status === 'new')
  const callbacks = leads.filter((l) => l.follow_up && daysUntil(l.follow_up) <= 0 && l.status !== 'won' && l.status !== 'lost')
  const checks = checklist(content, published)
  const done = checks.filter((x) => x.done).length

  const attention = [
    fresh.length && { icon: 'users', tone: 'blue', text: `${fresh.length} new lead${fresh.length > 1 ? 's' : ''} waiting for a call`, go: 'leads' },
    callbacks.length && { icon: 'calendar', tone: 'amber', text: `${callbacks.length} call-back${callbacks.length > 1 ? 's' : ''} due today`, go: 'leads' },
    overdue && { icon: 'close', tone: 'red', text: `${overdue} customer${overdue > 1 ? 's' : ''} overdue on payment`, go: 'customers' },
    dueSoon && { icon: 'card', tone: 'amber', text: `${dueSoon} renewal${dueSoon > 1 ? 's' : ''} due this week`, go: 'customers' },
    done < checks.length && { icon: 'settings', tone: 'grey', text: `${checks.length - done} website item${checks.length - done > 1 ? 's' : ''} still placeholder`, go: '#checklist' },
  ].filter(Boolean)

  return (
    <>
      <PageBar title={greeting()} sub={new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}>
        <button className="btn btn-quiet btn-sm" onClick={onAddLead}><Icon name="plus" size={14} /> Add lead</button>
        <button className="btn btn-primary btn-sm" onClick={() => onPay(null)}><Icon name="card" size={14} /> Record payment</button>
      </PageBar>

      <div className="adm-panel wide">
        {error && <StatsError error={error} />}
        <div className="adm-stats">
          <Stat icon="users" label="Visitors, 7 days" value={stats ? sumOf(week, 'visitors').toLocaleString('en-PK') : '…'} cur={sumOf(week, 'visitors')} prev={sumOf(prevWeek, 'visitors')} sub="vs week before" onClick={() => go('analytics')} />
          <Stat icon="mail" label="Demo requests, 7 days" value={stats ? sumOf(week, 'leads') : '…'} cur={sumOf(week, 'leads')} prev={sumOf(prevWeek, 'leads')} sub="vs week before" onClick={() => go('leads')} />
          <Stat icon="card" label="Received this month" value={rs(received(month))} cur={received(month)} prev={received(lastMonthKey)} sub="vs last month" onClick={() => go('payments')} />
          <Stat icon="receipt" label="Customers" value={customers.length} sub={renewals.length ? `${renewals.length} renewal${renewals.length > 1 ? 's need' : ' needs'} attention` : 'all renewals on time'} onClick={() => go('customers')} />
        </div>

        <div className="adm-two">
          <Card title="Needs your attention">
            {attention.length ? (
              <ul className="adm-todo">
                {attention.map((a) => (
                  <li key={a.text}>
                    <button onClick={() => (a.go === '#checklist' ? document.getElementById('checklist')?.scrollIntoView({ behavior: 'smooth' }) : go(a.go))}>
                      <span className={`adm-todo-ic ${a.tone}`}><Icon name={a.icon} size={15} /></span>{a.text}<Icon name="arrow" size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="adm-allgood"><Icon name="check" size={16} /> All caught up. Nothing needs you right now.</p>}
          </Card>

          <Card title="Visitors, last 30 days" action={<button className="adm-link" onClick={() => go('analytics')}>Analytics</button>}>
            {stats ? <Bars data={dailySeries(stats, 'visitors')} name="visitors" height={130} /> : <div className="adm-skel short" />}
          </Card>

          <Card title="Latest leads" action={<button className="adm-link" onClick={() => go('leads')}>All leads</button>}>
            {leads.length ? (
              <ul className="adm-mini">
                {leads.slice(0, 5).map((l) => (
                  <li key={l.id}>
                    <button onClick={() => onOpenLead(l.id)}>
                      <span className="adm-avatar sm">{l.name.trim()[0]?.toUpperCase()}</span>
                      <span className="adm-mini-main"><b>{l.name}</b><small>{[l.shop, l.city, l.plan].filter(Boolean).join(' · ') || l.phone}</small></span>
                      <StatusPill status={l.status} />
                      <small className="adm-mini-time">{timeAgo(l.created_at)}</small>
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="adm-empty">No leads yet. Demo requests from the website will show up here.</p>}
          </Card>

          <Card title="Renewals" action={<button className="adm-link" onClick={() => go('customers')}>All customers</button>}>
            {renewals.length ? (
              <ul className="adm-mini">
                {renewals.slice(0, 5).map((c) => (
                  <li key={c.lead.id}>
                    <button onClick={() => onPay(c.lead.id)}>
                      <span className="adm-mini-main"><b>{c.lead.name}</b><small>{c.plan ?? 'Plan'} · paid until {dateFmt(c.paidUntil)}</small></span>
                      <span className={`adm-renew ${c.state}`}>{c.state === 'overdue' ? `${-c.left} d overdue` : c.left === 0 ? 'Due today' : `In ${c.left} d`}</span>
                      <small className="adm-mini-time">{rsShort(c.last?.amount ?? 0)}</small>
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="adm-empty">{customers.length ? 'No renewals due in the next 7 days.' : 'No customers yet.'}</p>}
          </Card>

          <Card title="Website checklist" className="span2" action={<span className="adm-progress"><span><i style={{ width: `${(done / checks.length) * 100}%` }} /></span><small>{done}/{checks.length}</small></span>}>
            <ul className="adm-checks" id="checklist">
              {checks.map((x) => (
                <li key={x.label} className={x.done ? 'done' : ''}>
                  <span className="adm-check-ic">{x.done ? <Icon name="check" size={13} /> : null}</span>
                  <span>{x.label}</span>
                  {!x.done && <button className="adm-link" onClick={() => go(x.go)}>Fix</button>}
                </li>
              ))}
            </ul>
            <p className="adm-muted adm-note">{published ? `Website last published ${timeAgo(updatedAt)}.` : 'Your website still shows the built-in content.'} <a className="adm-link" href="/" target="_blank" rel="noreferrer">View site</a></p>
          </Card>
        </div>
      </div>
    </>
  )
}
